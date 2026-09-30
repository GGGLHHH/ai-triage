// JSON 文件(pnpm kb:export 导出)→ KB_DATABASE_URL 指向的 pgvector,整表替换。服务器上不需要 embedding key 和 knowledge/ 源文件,
// 但运行时检索仍要调 embedding 服务把问题转成向量 —— 那边配的 KB_EMBED_MODEL 必须和导出时同一个模型。
// 用法:pnpm kb:import [文件,默认 kb-dump.json]
import type { Chunk } from '../src/business/triage/kb/chunk.ts'

import { readFile } from 'node:fs/promises'
import process from 'node:process'

import { closeKnowledge, EMBED_MODEL, replaceKnowledge } from '../src/business/triage/kb/kb.ts'

const file = process.argv[2] ?? 'kb-dump.json'
const dump = JSON.parse(await readFile(file, 'utf8')) as { model: string, chunks: Chunk[], embeddings: number[][] }
if (dump.chunks.length !== dump.embeddings.length) {
  throw new Error(`${file} 损坏:${dump.chunks.length} 块文字对 ${dump.embeddings.length} 条向量`)
}
await replaceKnowledge(dump.chunks, dump.embeddings)
console.log(`已导入 ${dump.chunks.length} 块(向量模型 ${dump.model})`)
// 模型名各家写法不同(BAAI/bge-m3 与 bge-m3 是同一个),只提示不拦
if (dump.model.split('/').at(-1) !== EMBED_MODEL.split('/').at(-1)) {
  console.warn(`注意:导出时的向量模型是 ${dump.model},当前 KB_EMBED_MODEL 是 ${EMBED_MODEL}。检索要求两边同一个模型,否则结果不可信。`)
}
await closeKnowledge()
