import type { Chunk } from './chunk.ts'

import process from 'node:process'

import postgres from 'postgres'

// 仅服务端:/ai/chat 的工具与 scripts/kb-ingest.ts 共用。只 import 带 .ts 后缀的本地文件,node 也能直接跑。
// 向量库默认连 docker-compose.yml 的 pgvector;embedding 走 OpenAI 兼容接口,默认硅基流动的 bge-m3
// (与 ai-server 生产同款模型)。换本地模型(ollama / TEI)只需改 KB_EMBED_URL / KB_EMBED_MODEL。
const DB_URL = process.env.KB_DATABASE_URL ?? 'postgres://kb:kb@127.0.0.1:5493/kb'
const EMBED_URL = process.env.KB_EMBED_URL ?? 'https://api.siliconflow.cn/v1'
const EMBED_MODEL = process.env.KB_EMBED_MODEL ?? 'BAAI/bge-m3'
const EMBED_BATCH = 16 // 单次请求的条数上限,留足余量
const DIMENSIONS = 1024 // bge-m3

export interface Hit extends Chunk {
  score: number // 余弦相似度,越接近 1 越相关
}

let client: postgres.Sql | undefined
function sql(): postgres.Sql {
  client ??= postgres(DB_URL, { max: 4, onnotice: () => {} })
  return client
}

export async function closeKnowledge(): Promise<void> {
  await client?.end()
  client = undefined
}

// OpenAI 兼容的 /embeddings,分批请求,结果按原顺序拼回
export async function embed(texts: string[]): Promise<number[][]> {
  const key = process.env.KB_EMBED_API_KEY
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const response = await fetch(`${EMBED_URL}/embeddings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(key === undefined || key === '' ? {} : { authorization: `Bearer ${key}` }) },
      body: JSON.stringify({ model: EMBED_MODEL, input: texts.slice(i, i + EMBED_BATCH) }),
    })
    if (!response.ok) {
      throw new Error(`embedding 服务返回 ${response.status}:${await response.text()}`)
    }
    const { data } = await response.json() as { data: { index: number, embedding: number[] }[] }
    out.push(...data.sort((a, b) => a.index - b.index).map(d => d.embedding))
  }
  return out
}

const vector = (values: number[]) => `[${values.join(',')}]`

// 全量重建:资料量小,每次 ingest 清空重灌,不做增量
export async function replaceKnowledge(chunks: Chunk[], embeddings: number[][]): Promise<void> {
  const db = sql()
  await db`create extension if not exists vector`
  await db`
    create table if not exists kb_chunks (
      id serial primary key,
      source text not null,
      doc text not null,
      section text not null,
      title text not null,
      content text not null,
      embedding vector(${db.unsafe(String(DIMENSIONS))}) not null
    )`
  // HNSW 近似最近邻,cosine 算子类对应检索用的 <=>。行数少时规划器仍会选顺序扫描(更快),资料多了自动走索引
  await db`create index if not exists kb_chunks_embedding_hnsw on kb_chunks using hnsw (embedding vector_cosine_ops)`
  await db.begin(async (tx) => {
    await tx`truncate kb_chunks`
    for (const [i, chunk] of chunks.entries()) {
      await tx`
        insert into kb_chunks (source, doc, section, title, content, embedding)
        values (${chunk.source}, ${chunk.doc}, ${chunk.section}, ${chunk.title}, ${chunk.content}, ${vector(embeddings[i] ?? [])}::vector)`
    }
  })
}

// 低于它的结果不交给模型:实测命中时 top1 ≥ 0.61,无关问题(膝盖疼、资料里没有的双眼皮)全在 0.51 以下。
// 换 embedding 模型要重测这个值。
const MIN_SCORE = 0.52

export async function searchKnowledge(query: string, limit = 4): Promise<Hit[]> {
  const [queryVector = []] = await embed([query])
  const q = vector(queryVector)
  const rows = await sql()<Hit[]>`
    select source, doc, section, title, content, 1 - (embedding <=> ${q}::vector) as score
    from kb_chunks
    order by embedding <=> ${q}::vector
    limit ${limit}`
  return rows.map(row => ({ ...row, score: Number(row.score) })).filter(hit => hit.score >= MIN_SCORE)
}
