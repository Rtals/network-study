import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useStudyStore } from '../../store/useStudyStore'
import { directionColors, highlightColors } from '../../theme'
import { DEVICE_SCALE, EASE, ENTER, INK, MONO, SANS, TAG } from '../iso/constants'
import { PILL_TONES, roundedPath, type PillTone } from '../iso/draw'
import { estimateTextWidth, iso, type Pt } from '../iso/geometry'
import { StageTools } from '../iso/StageTools'
import { DeviceShadow, FailMark, FloorRipple, IsoArrow, IsoDevice, IsoGrid, IsoStyles, PacketDot, PillBox, Shadow } from '../iso/primitives'
import { usePan } from '../iso/usePan'
import {
  BUBBLE,
  GEO,
  SIGN,
  boxString,
  bubbleTone,
  cameraBox,
  directionFill,
  endpoints,
  fieldColor,
  lanePoint,
  laneWorld,
  layoutActors,
  linkSegments,
  packetPoint,
  type LaidActor,
} from './layout'
import { activeActors, buildBeats, DROP_MS, finalStep, hasEnded, hasStarted, isRunning, noteVisible, statesAt, stepDelay } from './timeline'
import type { ActorState, SeqMessage, SequenceState } from './types'

type Props = {
  state: SequenceState
  speed?: number
  /** 바뀌면 처음부터 다시 재생 (Phase 번호, 직접 해보기 설정 등) */
  playKey: string | number
}

/** 처음 등장할 때 내려앉는 높이 (화면 단위) */
const DROP_H = 60
/** 왼쪽 정렬 알약: 기기 중심에서 알약 오른쪽 끝까지 */
const SIGN_INSET = 30

/** 상태 알약 색. 평소 상태는 종이색, 완료·대기·오류·모름만 색을 쓴다 */
const SIGN_TONE: Record<NonNullable<ActorState['tone']>, PillTone> = {
  state: 'paper',
  success: 'green',
  wait: 'amber',
  error: 'red',
  note: 'gray',
}
const signKey = (s: ActorState) => `${s.label}|${s.icon ?? ''}|${s.tone ?? ''}`

/** 알약 안의 작은 아이콘 (중심 c) */
function MiniIcon({ kind, c, color }: { kind: 'question' | 'cross' | 'clock'; c: Pt; color: string }) {
  const r = 7.5
  const k = r * 0.45
  return (
    <g stroke={color} strokeWidth={1.9} strokeLinecap="round" fill="none">
      <circle cx={c.x} cy={c.y} r={r} />
      {kind === 'cross' && <path d={`M${c.x - k} ${c.y - k}L${c.x + k} ${c.y + k}M${c.x + k} ${c.y - k}L${c.x - k} ${c.y + k}`} />}
      {kind === 'clock' && <path d={`M${c.x} ${c.y - r * 0.55}V${c.y}L${c.x + r * 0.45} ${c.y + r * 0.3}`} />}
      {kind === 'question' && (
        <text x={c.x} y={c.y + r * 0.45} textAnchor="middle" fontFamily={SANS} fontSize={r * 1.4} fontWeight={800} fill={color} stroke="none">
          ?
        </text>
      )}
    </g>
  )
}

/**
 * 기기 위 상태 알약. align='left'면 기기 중심 왼쪽으로 몰아,
 * 오른쪽 위 연결선에서 오는 패킷 알약과 겹치지 않게 한다.
 */
function StatePill({ at, state, align = 'center' }: { at: Pt; state: ActorState; align?: 'center' | 'left' }) {
  const tone = SIGN_TONE[state.tone ?? 'state']
  const fg = PILL_TONES[tone].fg
  const icon = state.icon ? 22 : 0
  const w = estimateTextWidth(state.label, SIGN.FONT, true) + SIGN.PAD * 2 + icon
  const h = SIGN.H
  const x = align === 'left' ? at.x + SIGN_INSET - w : at.x - w / 2
  const y = at.y - h / 2
  return (
    <g>
      <PillBox x={x} y={y} w={w} h={h} tone={tone} />
      {state.icon && <MiniIcon kind={state.icon} c={{ x: x + SIGN.PAD + 7, y: at.y }} color={fg} />}
      <text x={x + w / 2 + icon / 2} y={at.y + SIGN.FONT * 0.36} textAnchor="middle" fontFamily={MONO} fontSize={SIGN.FONT} fontWeight={700} fill={fg}>
        {state.label}
      </text>
    </g>
  )
}

/** 패킷 위 알약 (원점 = 패킷 중심): 이름 + 필드. 과거 패킷은 시계 아이콘, 보내지 않은 패킷은 점선 */
function PacketPill({ m, forward }: { m: SeqMessage; forward: boolean }) {
  const tone = bubbleTone(m, forward)
  const fg = PILL_TONES[tone].fg
  const fields = m.fields ?? []
  const fieldsText = fields.map((x) => x.text).join(', ')
  const icon = m.stale ? 22 : 0
  const labelW = estimateTextWidth(m.label, BUBBLE.LABEL, true) + icon
  const w = Math.max(labelW, fieldsText ? estimateTextWidth(fieldsText, BUBBLE.FIELD, true) : 0) + BUBBLE.PAD * 2
  const h = fieldsText ? BUBBLE.H : SIGN.H
  const y = -BUBBLE.LIFT - h
  const labelY = y + (fieldsText ? 21 : h / 2 + BUBBLE.LABEL * 0.36)
  return (
    <g>
      <PillBox x={-w / 2} y={y} w={w} h={h} tone={tone} dashed={m.fate === 'withheld' || m.stale} />
      {m.stale && <MiniIcon kind="clock" c={{ x: -labelW / 2 + 7, y: labelY - BUBBLE.LABEL * 0.36 }} color={fg} />}
      <text x={icon / 2} y={labelY} textAnchor="middle" fontFamily={SANS} fontSize={BUBBLE.LABEL} fontWeight={800} fill={fg}>
        {m.label}
      </text>
      {fieldsText && (
        <text y={y + 41} textAnchor="middle" fontFamily={MONO} fontSize={BUBBLE.FIELD} fill={INK}>
          {fields.map((x, i) => (
            <tspan key={i} fill={fieldColor(x.tone)} fontWeight={x.tone ? 800 : 500}>
              {i > 0 ? ', ' : ''}
              {x.text}
            </tspan>
          ))}
        </text>
      )}
    </g>
  )
}

/** RTO 같은 대기: 기기 옆 호박색 알약 + 줄어드는 링 */
function WaitTimer({ actor, label, seconds }: { actor: LaidActor; label: string; seconds: number }) {
  const c = iso(actor.wx, actor.wy, actor.top * 0.5)
  const w = estimateTextWidth(label, TAG.MONO, true) + 54
  const h = TAG.H
  const x = c.x - 140 - w / 2
  const y = c.y - h / 2
  const r = 8.5
  const fg = PILL_TONES.amber.fg
  return (
    <motion.g initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={ENTER}>
      <PillBox x={x} y={y} w={w} h={h} tone="amber" />
      <circle cx={x + 20} cy={c.y} r={r} fill="none" stroke="#f1d08f" strokeWidth={3.4} />
      <motion.circle
        cx={x + 20}
        cy={c.y}
        r={r}
        fill="none"
        stroke={fg}
        strokeWidth={3.4}
        strokeLinecap="round"
        transform={`rotate(-90 ${x + 20} ${c.y})`}
        initial={{ pathLength: 1 }}
        animate={{ pathLength: 0 }}
        transition={{ duration: seconds, ease: 'linear' }}
      />
      <text x={x + 38} y={c.y + TAG.MONO * 0.36} fontFamily={MONO} fontSize={TAG.MONO} fontWeight={700} fill={fg}>
        {label}
      </text>
    </motion.g>
  )
}

export function SequenceDiagram({ state, speed = 1, playKey }: Props) {
  const reduce = useReducedMotion()
  const actors = useMemo(() => layoutActors(state.actors), [state.actors])
  const byId = useMemo(() => new Map(actors.map((a) => [a.id, a])), [actors])
  const beats = useMemo(() => buildBeats(state), [state])
  const last = finalStep(beats)

  // 재생 단계. playKey가 바뀌면 렌더 중에 처음으로 되돌린다 (이전 값과 비교해 상태를 조정하는 React 패턴)
  const [run, setRun] = useState({ key: playKey, s: 0 })
  if (run.key !== playKey) setRun({ key: playKey, s: 0 })
  const s = reduce ? last : Math.min(run.key === playKey ? run.s : 0, last)

  // 처음 장면에 들어오면 기기가 바닥으로 내려앉은 뒤에 상태 알약과 메시지를 시작한다
  const [dropped, setDropped] = useState(false)
  const landed = !!reduce || dropped
  useEffect(() => {
    const t = window.setTimeout(() => setDropped(true), DROP_MS / speed)
    return () => window.clearTimeout(t)
  }, [speed])

  useEffect(() => {
    if (reduce || !landed || s >= last) return
    const t = window.setTimeout(
      () => setRun((r) => (r.key === playKey ? { ...r, s: r.s + 1 } : r)),
      stepDelay(beats, s) / speed,
    )
    return () => window.clearTimeout(t)
  }, [s, last, beats, speed, playKey, reduce, landed])

  // Phase가 바뀌면 끌어서 옮긴 위치를 되돌려 카메라가 상황에 맞게 잡히도록
  const setStagePan = useStudyStore((st) => st.setStagePan)
  useEffect(() => {
    setStagePan('sequence', { x: 0, y: 0 })
  }, [playKey, setStagePan])

  const nowStates = statesAt(state, beats, s)
  const camera = useMemo(() => cameraBox(state, activeActors(beats, s)), [state, beats, s])
  const pan = usePan('sequence', camera)
  const segments = linkSegments(actors)

  /** k번째 비트 이후에 다른 패킷이 출발했으면 이전 패킷은 사라진다 */
  const consumed = (k: number) => beats.some((b, j) => j > k && b.kind === 'travel' && hasStarted(s, j))
  const hasFailure = state.messages.some((m) => m.fate === 'lost' || m.fate === 'withheld')
  const directions = new Set(state.messages.map((m) => endpoints(actors, m).forward))
  const first = state.actors[0]?.label
  const lastName = state.actors[state.actors.length - 1]?.label

  return (
    <div className="absolute inset-0">
      <motion.svg
        width="100%"
        height="100%"
        role="img"
        aria-label={describe(state)}
        initial={false}
        animate={{ viewBox: boxString(camera) }}
        transition={{ duration: reduce ? 0 : 0.9, ease: EASE }}
        {...pan.svgProps}
      >
        <IsoStyles />
        <g transform={pan.transform} data-testid="stage-content">
          <IsoGrid cx={0} cy={-(actors.length ? actors[actors.length - 1].t / 2 : 0)} />

          {/* 연결선: 검은 양방향 화살표 */}
          {segments.map((seg, i) => (
            <IsoArrow key={i} from={laneWorld(seg.t0)} to={laneWorld(seg.t1)} both />
          ))}

          {/* 왕복 고리 (1 RTT) */}
          {state.rttLoop && segments[0] && <RttLoop seg={segments[0]} label={state.rttLoop} reduce={!!reduce} />}

          {/* 상태 알약이 바뀌는 기기 바닥의 물결 (Phase 시작 상태 그대로면 없음) */}
          {landed &&
            actors.map((a) => {
              const st = nowStates[a.id]
              const base = state.states[a.id]
              if (!st || (base && signKey(st) === signKey(base))) return null
              return <FloorRipple key={`${run.key}-${a.id}-${signKey(st)}`} x={a.wx} y={a.wy} color={PILL_TONES[SIGN_TONE[st.tone ?? 'state']].fg} />
            })}

          {/* 기기 블록 (먼 것부터). 처음에는 살짝 위에서 내려앉는다 */}
          {actors
            .map((a, i) => ({ a, i }))
            .reverse()
            .map(({ a, i }) => {
              const c = iso(a.wx, a.wy)
              const land = { duration: 0.7, delay: i * 0.12, ease: EASE }
              return (
                <g key={a.id} transform={`translate(${c.x} ${c.y}) scale(${DEVICE_SCALE}) translate(${-c.x} ${-c.y})`}>
                  <motion.g initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={land}>
                    <DeviceShadow device={a.device} x={a.wx} y={a.wy} />
                  </motion.g>
                  <motion.g initial={reduce ? false : { y: -DROP_H, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={land}>
                    <IsoDevice device={a.device} x={a.wx} y={a.wy} label={a.label} shadow={false} />
                  </motion.g>
                </g>
              )
            })}

          {/* 상태 알약: 바뀌는 순간 아래에서 올라온다 */}
          {actors.map((a, i) => {
            const st = nowStates[a.id]
            if (!st || !landed) return null
            return (
              <AnimatePresence key={a.id} mode="wait">
                <motion.g
                  key={signKey(st)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={reduce ? { duration: 0 } : ENTER}
                >
                  <StatePill at={a.signAt} state={st} align={i < actors.length - 1 ? 'left' : 'center'} />
                </motion.g>
              </AnimatePresence>
            )
          })}

          {/* 대기 타이머 */}
          {beats.map((b, k) =>
            b.kind === 'wait' && isRunning(s, k) && byId.get(b.who) ? (
              <WaitTimer key={`wait-${run.key}-${k}`} actor={byId.get(b.who)!} label={b.label} seconds={b.ms / 1000 / speed} />
            ) : null,
          )}

          {/* 패킷 + 알약 */}
          {beats.map((b, k) => {
            if (b.kind !== 'travel' || !hasStarted(s, k) || consumed(k)) return null
            return <Packet key={`pkt-${run.key}-${k}`} msg={b.msg} actors={actors} ms={b.ms / speed} reduce={!!reduce} />
          })}

          {/* 손실·보내지 않음: 터지는 빨간 ✕ */}
          {beats.map((b, k) => {
            if (b.kind !== 'travel' || !hasEnded(s, k) || consumed(k)) return null
            const e = endpoints(actors, b.msg)
            if (b.msg.fate === 'lost') return <FailMark key={`x-${run.key}-${k}`} at={packetPoint(e.lossT)} />
            if (b.msg.fate === 'withheld') return <FailMark key={`x-${run.key}-${k}`} at={packetPoint(e.startT + (e.forward ? 60 : -60))} />
            return null
          })}
        </g>
      </motion.svg>

      <StageTools changed={pan.changed} onReset={pan.reset} />

      {/* 범례: 패킷 색의 뜻 */}
      {state.messages.length > 0 && (
        <ul aria-label="범례" className="pointer-events-none absolute bottom-3 left-3.5 m-0 flex list-none gap-4 p-0 text-[11px] text-muted">
          {directions.has(true) && (
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full border-[1.5px] border-ink" style={{ background: directionColors.forwardFill }} />
              {first} → {lastName}
            </li>
          )}
          {directions.has(false) && (
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full border-[1.5px] border-ink" style={{ background: directionColors.backwardFill }} />
              {lastName} → {first}
            </li>
          )}
          {hasFailure && (
            <li className="flex items-center gap-1.5">
              <span className="grid size-3 place-items-center rounded-full border-[1.5px] border-ink bg-[#e5534b] text-[7px] leading-none font-bold text-white">
                ✕
              </span>
              전달 안 됨
            </li>
          )}
        </ul>
      )}

      {/* 설명 상자: 그림과 함께 차례로 등장 */}
      {state.notes && state.notes.length > 0 && (
        <ul aria-label="무대 설명" className="pointer-events-none absolute top-3 left-3 m-0 flex max-w-[48%] list-none flex-col gap-2 p-0">
          <AnimatePresence initial={!reduce}>
            {state.notes.map((n, i) =>
              landed && noteVisible(beats, s, n.after) ? (
                <motion.li
                  key={`${run.key}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={reduce ? { duration: 0 } : ENTER}
                  className="stage-chip"
                  style={{ ['--chip' as string]: n.tone ? highlightColors[n.tone] : '#7fc278' }}
                >
                  <span style={n.tone ? { color: highlightColors[n.tone] } : undefined}>{n.text}</span>
                </motion.li>
              ) : null,
            )}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}

/** 한 패킷: 출발 → (도착 | 중간 손실 | 보내지 않음). 알약이 함께 움직인다 */
function Packet({ msg, actors, ms, reduce }: { msg: SeqMessage; actors: LaidActor[]; ms: number; reduce: boolean }) {
  const e = endpoints(actors, msg)
  const a = packetPoint(e.startT)
  const b = packetPoint(e.endT)
  const l = packetPoint(e.lossT)
  const sec = reduce ? 0 : ms / 1000
  const fate = msg.fate ?? 'delivered'
  const motionProps =
    fate === 'lost'
      ? {
          initial: { x: a.x, y: a.y, opacity: 0 },
          animate: { x: [a.x, l.x, l.x], y: [a.y, l.y, l.y + 40], opacity: [1, 1, 0] },
          transition: { duration: sec, times: [0, 0.72, 1], ease: 'easeInOut' as const },
        }
      : fate === 'withheld'
        ? {
            initial: { x: a.x, y: a.y, opacity: 0 },
            animate: { x: a.x, y: a.y, opacity: 1 },
            transition: { duration: sec * 0.4, ease: EASE },
          }
        : {
            initial: { x: a.x, y: a.y, opacity: 0 },
            animate: { x: b.x, y: b.y, opacity: 1 },
            transition: { duration: sec, ease: 'easeInOut' as const, opacity: { duration: Math.min(0.2, sec) } },
          }
  const faded = fate === 'withheld' || !!msg.stale
  return (
    <motion.g {...motionProps} style={{ pointerEvents: 'none' }}>
      <g transform={`translate(0 ${GEO.FLOAT})`}>
        <Shadow x={0} y={0} r={7} />
      </g>
      <PacketDot fill={directionFill(e.forward)} opacity={faded ? 0.5 : 1} dashed={faded} />
      <PacketPill m={msg} forward={e.forward} />
    </motion.g>
  )
}

/** 연결선을 감싸는 왕복 고리: 점이 클라이언트 → 서버 → 클라이언트로 돈다 */
function RttLoop({ seg, label, reduce }: { seg: { t0: number; t1: number }; label: string; reduce: boolean }) {
  const pad = 56
  const d = roundedPath([lanePoint(seg.t0, -pad), lanePoint(seg.t1 - 10, -pad), lanePoint(seg.t1 - 10, pad), lanePoint(seg.t0, pad)], 56)
  // 알약은 고리 바깥 왼쪽 위에
  const mid = lanePoint((seg.t0 + seg.t1) / 2, -(pad + 60))
  const w = estimateTextWidth(label, TAG.FONT, true) + TAG.PAD * 2
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={ENTER}>
      <path d={d} fill="none" stroke="#8b847a" strokeWidth={2} strokeDasharray="7 6" />
      {!reduce && (
        <circle r={6} fill="#fbf6ef" stroke={INK} strokeWidth={2}>
          <animateMotion dur="3.2s" repeatCount="indefinite" path={d} />
        </circle>
      )}
      <PillBox x={mid.x - w / 2} y={mid.y - TAG.H / 2} w={w} h={TAG.H} tone="paper" />
      <text x={mid.x} y={mid.y + TAG.FONT * 0.36} textAnchor="middle" fontFamily={SANS} fontSize={TAG.FONT} fontWeight={800} fill={INK}>
        {label}
      </text>
    </motion.g>
  )
}

/** 화면 낭독기용 요약 */
function describe(state: SequenceState): string {
  const names = new Map(state.actors.map((a) => [a.id, a.label]))
  const parts = state.messages.map((m) => {
    if (m.fate === 'withheld') return `${m.label} (보내지 않음)`
    const what = `${names.get(m.from)}에서 ${names.get(m.to)}로 ${m.stale ? '과거의 ' : ''}${m.label}`
    return m.fate === 'lost' ? `${what} (손실)` : what
  })
  return `연결 다이어그램: ${parts.join(', ') || '아직 메시지 없음'}`
}
