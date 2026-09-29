import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { chunkMarkdown, embedText } from './chunk'

const MD = `# 就诊须知

> 给维护者的说明,不入库

## 挂号

### 怎么挂号?

健康160 或公众号。

### 能当天治疗吗?

有空位可以。

## 医保

只能自费。
`

describe('chunkMarkdown', () => {
  it('one chunk per ### section, a ## section without ### is one chunk, notes skipped', () => {
    const chunks = chunkMarkdown('faq.md', MD)
    expect(chunks.map(c => [c.section, c.title, c.content])).toEqual([
      ['挂号', '怎么挂号?', '健康160 或公众号。'],
      ['挂号', '能当天治疗吗?', '有空位可以。'],
      ['医保', '医保', '只能自费。'],
    ])
    expect(chunks.every(c => c.doc === '就诊须知' && c.source === 'faq.md')).toBe(true)
  })

  it('prefixes the embedding text with doc and section path', () => {
    const chunks = chunkMarkdown('faq.md', MD)
    expect(chunks.map(embedText)).toEqual([
      '就诊须知 · 挂号 · 怎么挂号?\n健康160 或公众号。',
      '就诊须知 · 挂号 · 能当天治疗吗?\n有空位可以。',
      '就诊须知 · 医保\n只能自费。',
    ])
  })

  it('chunks every real knowledge file into non-empty pieces', () => {
    const dir = join(import.meta.dirname, '../../../../knowledge')
    for (const file of readdirSync(dir).filter(f => f.endsWith('.md'))) {
      const chunks = chunkMarkdown(file, readFileSync(join(dir, file), 'utf8'))
      expect(chunks.length, file).toBeGreaterThan(0)
      expect(chunks.every(c => c.content.length > 0 && !c.content.includes('ingest')), file).toBe(true)
    }
  })
})
