import { PanelSection } from '../../components/layout/PanelSection'
import { LogList } from '../../components/ui/icons'
import { directionColors, protocolColors } from '../../theme'
import { exchangeRows, type ExchangeRow } from './exchange'
import { fieldColor } from './layout'
import type { SequenceState } from './types'

const fillOf = (r: ExchangeRow) =>
  r.fate !== 'delivered' ? '#e5534b' : r.forward ? directionColors.forwardFill : directionColors.backwardFill

const colorOf = (r: ExchangeRow) =>
  r.fate !== 'delivered' ? protocolColors.error.fg : r.forward ? directionColors.forward : directionColors.backward

function Fields({ r }: { r: ExchangeRow }) {
  return (
    <span className="font-mono text-[11.5px] text-zinc-600">
      {r.fields.map((f, j) => (
        <span key={j} style={{ color: fieldColor(f.tone) }} className={f.tone ? 'font-bold' : ''}>
          {j > 0 ? ', ' : ''}
          {f.text}
        </span>
      ))}
    </span>
  )
}

/**
 * 오른쪽 패널: 지금까지 주고받은 메시지 (다른 보조 영역과 같은 PanelSection 모양).
 * 지난 메시지는 한 줄, 이번 단계 메시지만 뜻풀이까지. 메시지 이름 색은 무대의 패킷 방향색과 같다.
 */
export function ExchangeList({ state }: { state: SequenceState }) {
  const rows = exchangeRows(state)
  if (rows.length === 0) return null
  return (
    <PanelSection aria-label="주고받은 메시지" icon={<LogList size={14} />} label="주고받은 메시지">
      <ol className="m-0 flex list-none flex-col gap-1 p-0">
        {rows.map((r, i) => {
          const color = colorOf(r)
          return (
            <li key={i} className={r.current ? 'rounded-lg border-[1.3px] border-ink-2 bg-[#fbf6ef] px-2.5 py-1.5 shadow-[0_1.5px_0_var(--color-ink-2)]' : 'px-1'}>
              <div className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="size-2.5 shrink-0 self-center rounded-full border-[1.5px] border-ink" style={{ background: fillOf(r) }} aria-hidden />
                <span className="text-[12.5px] font-bold" style={{ color }}>
                  {r.label}
                </span>
                <Fields r={r} />
                <span className="text-[11px] text-muted">
                  {r.from} → {r.to}
                </span>
                {r.current && <span className="ml-auto text-[10px] font-extrabold tracking-[0.04em] text-muted">이번 단계</span>}
              </div>
              {r.current && r.note && <p className="m-0 mt-0.5 pl-3.5 text-[12.5px] leading-[1.55] text-zinc-800 break-keep">{r.note}</p>}
              {r.fate !== 'delivered' && (
                <p className="m-0 pl-3.5 text-[11.5px] font-bold text-red-700">{r.fate === 'lost' ? '도중에 손실' : '보내지 않음'}</p>
              )}
            </li>
          )
        })}
      </ol>
    </PanelSection>
  )
}
