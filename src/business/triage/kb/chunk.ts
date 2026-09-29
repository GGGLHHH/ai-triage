export interface Chunk {
  source: string // 文件名
  doc: string // 文档标题(# 行)
  section: string // 所在 ## 小节
  title: string // 块标题(### 行;没有 ### 的 ## 小节用 ## 标题)
  content: string
}

// 知识库 md 按标题切块:每个 ### 一块;没有 ### 子节的 ## 小节整节一块。# 标题与 > 给维护者的说明不入库。
// 小节本来就是「一个问题一段答案」的粒度,不再按字数切。
export function chunkMarkdown(source: string, md: string): Chunk[] {
  const chunks: Chunk[] = []
  let doc = ''
  let section = ''
  let current: { title: string, lines: string[] } | undefined

  const flush = () => {
    const content = current?.lines.join('\n').trim() ?? ''
    if (current && content !== '') {
      chunks.push({ source, doc, section, title: current.title, content })
    }
    current = undefined
  }

  for (const line of md.split('\n')) {
    if (line.startsWith('### ')) {
      flush()
      current = { title: line.slice(4).trim(), lines: [] }
    }
    else if (line.startsWith('## ')) {
      flush()
      section = line.slice(3).trim()
      current = { title: section, lines: [] }
    }
    else if (line.startsWith('# ')) {
      flush()
      doc = line.slice(2).trim()
    }
    else if (!line.startsWith('>')) {
      current?.lines.push(line)
    }
  }
  flush()
  return chunks
}

// 向量化用的文本:带上文档与小节路径,短问答块也有足够语境
export function embedText(chunk: Chunk): string {
  return `${[chunk.doc, chunk.section === chunk.title ? '' : chunk.section, chunk.title].filter(s => s !== '').join(' · ')}\n${chunk.content}`
}
