import type { HTMLAttributes, ReactNode } from 'react'

export type SectionTone = 'tip' | 'warn' | 'insight' | 'plain'

/** 종류별 바탕·테두리·아이콘 칸 색 (모두 옅은 파스텔, 글자는 잉크색) */
const TONE: Record<SectionTone, { box: string; icon: string }> = {
  tip: { box: 'bg-green-tile border-[#c9d6b3]', icon: 'bg-green' },
  warn: { box: 'bg-rose-tile border-[#ebbcb3]', icon: 'bg-[#f6cfc7] text-[#8f2a22]' },
  insight: { box: 'bg-violet-tile border-[#d5c8e2]', icon: 'bg-violet' },
  plain: { box: 'bg-card border-line-strong', icon: 'bg-card' },
}

/**
 * 오른쪽 설명의 보조 상자 (핵심 포인트, 흔한 오해, 실무 신호, 주고받은 메시지).
 * 모두 같은 모양: 왼쪽 아이콘 칸 + 작은 대문자 제목 + 내용. 종류는 바탕색으로만 구별한다.
 */
export function PanelSection({
  icon,
  label,
  tone = 'plain',
  children,
  ...rest
}: {
  icon?: ReactNode
  label: string
  tone?: SectionTone
  children: ReactNode
} & HTMLAttributes<HTMLElement>) {
  const t = TONE[tone]
  return (
    <section {...rest} className={`flex gap-2.5 rounded-[10px] border px-3 pt-2.5 pb-3 ${t.box}`}>
      {icon && (
        <span className={`grid size-7 shrink-0 place-items-center rounded-lg border-[1.3px] border-ink-2 ${t.icon}`} aria-hidden="true">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="m-0 mb-1 text-[10px] font-extrabold tracking-[0.06em] text-muted uppercase">{label}</h3>
        {children}
      </div>
    </section>
  )
}
