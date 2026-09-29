// knowledge/*.md → 切块 → bge-m3 向量 → pgvector。用法:pnpm kb:ingest(先 pnpm kb:up)。
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { chunkMarkdown, embedText } from '../src/business/triage/kb/chunk.ts'
import { closeKnowledge, embed, replaceKnowledge, searchKnowledge } from '../src/business/triage/kb/kb.ts'

const DIR = join(import.meta.dirname, '..', 'knowledge')

const files = (await readdir(DIR)).filter(f => f.endsWith('.md')).sort()
const chunks = (await Promise.all(files.map(async f => chunkMarkdown(f, await readFile(join(DIR, f), 'utf8'))))).flat()
console.log(`${files.length} 个文件,切出 ${chunks.length} 块,向量化中…`)

const embeddings = await embed(chunks.map(embedText))
await replaceKnowledge(chunks, embeddings)
console.log(`已入库 ${chunks.length} 块`)

// 冒烟:随手问一句,确认能检索回来
const [top] = await searchKnowledge('看医美能不能用医保')
console.log(`冒烟检索「看医美能不能用医保」→ ${top?.title ?? '无结果'}(${top?.score.toFixed(3) ?? '-'})`)
await closeKnowledge()
