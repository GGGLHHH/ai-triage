// pgvector 知识库 → JSON 文件(文字 + 向量 + 生成向量用的模型),带去服务器用 pnpm kb:import 灌进去。
// 用法:pnpm kb:export [文件,默认 kb-dump.json]
import { writeFile } from 'node:fs/promises'
import process from 'node:process'

import { closeKnowledge, EMBED_MODEL, exportKnowledge } from '../src/business/triage/kb/kb.ts'

const file = process.argv[2] ?? 'kb-dump.json'
const { chunks, embeddings } = await exportKnowledge()
await writeFile(file, JSON.stringify({ model: EMBED_MODEL, exportedAt: new Date().toISOString(), chunks, embeddings }))
console.log(`已导出 ${chunks.length} 块(向量模型 ${EMBED_MODEL})→ ${file}`)
await closeKnowledge()
