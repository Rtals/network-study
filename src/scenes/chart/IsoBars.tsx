import { motion, useReducedMotion } from 'motion/react'
import type { Protocol } from '../../theme'
import { boxString, cameraFor } from '../iso/camera'
import { ENTER, INK, MONO, SANS, TAG } from '../iso/constants'
import { BLOCK_PALETTE, boxOutline, type BlockColor } from '../iso/draw'
import { boundsOf, estimateTextWidth, iso } from '../iso/geometry'
import { PanHint } from '../iso/PanHint'
import { IsoBlock, IsoGrid, IsoStyles, PillBox, SoftShadow } from '../iso/primitives'
import { usePan } from '../iso/usePan'
import type { IsoBarsState } from './types'

const GAP = 140
const SIZE = 64
const UNIT = 56
/** 막대는 화면 왼쪽 아래 → 오른쪽 위로 놓는다 (월드 -y 방향). i번째 막대의 바닥 모서리 y */
const barY = (i: number) => -i * GAP
/** 이름표는 막대의 오른쪽 아래(+x) 빈 곳에, 왼쪽 정렬 */
const labelAt = (i: number) => iso(SIZE + 26, barY(i) + SIZE / 2 + 30)
/** 왼쪽 위 제목·범례 상자가 차지하는 자리 (viewBox 단위). 오브젝트가 그 밑에 깔리지 않게 비워 둔다 */
const OVERLAY = { w: 520, h: 150 }

/** 프로토콜 → 블록 색 (같은 색 계열의 파스텔) */
const BLOCK_OF: Partial<Record<Protocol, BlockColor>> = { tcp: 'green', tls: 'yellow', udp: 'orange', ip: 'blue', http: 'violet' }
const blockOf = (p: Protocol): BlockColor => BLOCK_OF[p] ?? 'slab'

/** 막대 이름표: 알약 상자 (이름 + 값 두 줄) */
function BarTag({ at, label, value }: { at: { x: number; y: number }; label: string; value: string }) {
  const w = Math.max(estimateTextWidth(label, TAG.FONT, true), estimateTextWidth(value, TAG.MONO, true)) + TAG.PAD * 2
  const h = 52
  return (
    <g>
      <PillBox x={at.x} y={at.y - h / 2} w={w} h={h} tone="paper" />
      <text x={at.x + TAG.PAD} y={at.y - 4} fontFamily={SANS} fontSize={TAG.FONT} fontWeight={800} fill={INK}>
        {label}
      </text>
      <text x={at.x + TAG.PAD} y={at.y + 17} fontFamily={MONO} fontSize={TAG.MONO} fontWeight={600} fill="#52525b">
        {value}
      </text>
    </g>
  )
}

export function IsoBars({ state, speed = 1 }: { state: IsoBarsState; speed?: number }) {
  const reduce = useReducedMotion()
  const n = state.bars.length
  const step = reduce ? 0 : 0.18 / speed

  // 화면에 담을 영역: 막대 꼭대기부터 이름표까지 + 왼쪽 위 범례 자리
  const zone = state.bars.flatMap((bar, i) => {
    const y = barY(i)
    const total = bar.segments.reduce((s, seg) => s + seg.value, 0)
    const top = iso(SIZE / 2, y + SIZE / 2, total * UNIT + 20)
    const label = labelAt(i)
    return [{ x: top.x - 70, y: top.y }, { x: top.x + 70, y: top.y }, iso(0, y + SIZE + 30), { x: label.x + 200, y: label.y + 36 }]
  })
  const b = boundsOf(zone, 40)
  const camera = cameraFor({ ...b, minX: b.minX - OVERLAY.w * 0.15, minY: b.minY - OVERLAY.h })
  const pan = usePan('isoBars', camera)

  return (
    <div className="absolute inset-0">
      <svg
        viewBox={boxString(camera)}
        width="100%"
        height="100%"
        role="img"
        aria-label={`${state.title}: ${state.bars.map((bar) => `${bar.label} ${bar.value}`).join(', ')}`}
        {...pan.svgProps}
      >
        <IsoStyles />
        <g transform={pan.transform}>
          <IsoGrid cx={SIZE / 2} cy={barY(n - 1) / 2 + SIZE / 2} />
          {/* 먼 막대(오른쪽 위)부터 그려야 가까운 막대가 앞을 가린다 */}
          {state.bars
            .map((bar, i) => ({ bar, i }))
            .reverse()
            .map(({ bar, i }) => {
              const y = barY(i)
              const total = bar.segments.reduce((s, seg) => s + seg.value, 0)
              let z = 0
              return (
                <g key={bar.id}>
                  <SoftShadow d={boxOutline(0, y, 0, SIZE, SIZE, total * UNIT, 10)} />
                  {bar.segments.map((seg, j) => {
                    const segH = seg.value * UNIT
                    const block = (
                      <motion.g
                        key={j}
                        initial={reduce ? false : { opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...ENTER, delay: i * step + j * step * 0.6 }}
                      >
                        <IsoBlock x={0} y={y} z={z} w={SIZE} d={SIZE} h={segH} color={blockOf(seg.protocol)} r={10} />
                      </motion.g>
                    )
                    z += segH
                    return block
                  })}
                  <BarTag at={labelAt(i)} label={bar.label} value={bar.value} />
                </g>
              )
            })}
        </g>
      </svg>
      <PanHint panned={pan.panned} onReset={pan.reset} />
      <div className="stage-chip pointer-events-none absolute top-3 left-3 max-w-[48%] flex-col items-start gap-1.5">
        <p className="m-0 text-[12.5px] font-bold text-ink">{state.title}</p>
        <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-[11px] font-medium text-muted">
          {state.legend.map((l) => (
            <li key={l.protocol} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] border-[1.5px] border-ink" style={{ background: BLOCK_PALETTE[blockOf(l.protocol)].side[1] }} />
              {l.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
