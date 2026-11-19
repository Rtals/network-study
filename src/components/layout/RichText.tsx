import type { ReactNode } from 'react'

/**
 * 오른쪽 패널 본문. 빈 줄로 문단을 나누고, 다음 표기만 해석한다.
 * - `**굵게**` → 강조
 * - `· ` 로 시작하는 줄 → 글머리 목록
 * - `①` ~ `⑳` 로 시작하는 줄 → 번호 목록
 */
const CIRCLED = /^[①-⑳]/

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-bold text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  )
}

type Block = { kind: 'p'; lines: string[] } | { kind: 'list'; items: { marker: string; text: string }[] }

function blocksOf(paragraph: string): Block[] {
  const out: Block[] = []
  for (const line of paragraph.split('\n')) {
    const bullet = line.startsWith('· ')
    const numbered = CIRCLED.test(line)
    const last = out[out.length - 1]
    if (bullet || numbered) {
      const item = bullet ? { marker: '•', text: line.slice(2) } : { marker: line[0], text: line.slice(1).trim() }
      if (last?.kind === 'list') last.items.push(item)
      else out.push({ kind: 'list', items: [item] })
    } else if (last?.kind === 'p') last.lines.push(line)
    else out.push({ kind: 'p', lines: [line] })
  }
  return out
}

export function RichText({ text, size = 'body' }: { text: string; size?: 'body' | 'note' }) {
  const textClass = size === 'body' ? 'text-[12.8px] leading-[1.65]' : 'text-[12.2px] leading-[1.55]'
  return (
    <div className={`flex flex-col ${size === 'body' ? 'gap-2' : 'gap-1'} text-ink-2 ${textClass}`}>
      {text.split(/\n{2,}/).flatMap((para, i) =>
        blocksOf(para).map((b, j) =>
          b.kind === 'p' ? (
            <p key={`${i}-${j}`} className="m-0 break-keep">
              {b.lines.map((l, k) => (
                <span key={k}>
                  {k > 0 && <br />}
                  {inline(l)}
                </span>
              ))}
            </p>
          ) : (
            <ul key={`${i}-${j}`} className="m-0 flex list-none flex-col gap-0.5 p-0">
              {b.items.map((it, k) => (
                <li key={k} className="flex gap-2 break-keep">
                  <span className="w-3 shrink-0 text-center font-bold text-ink" aria-hidden>
                    {it.marker}
                  </span>
                  <span>{inline(it.text)}</span>
                </li>
              ))}
            </ul>
          ),
        ),
      )}
    </div>
  )
}
