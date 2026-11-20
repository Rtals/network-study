import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useStudyStore } from '../../store/useStudyStore'
import { highlightColors } from '../../theme'
import { boxString } from '../iso/camera'
import { EASE, ENTER, INK, MONO, SANS, TAG, TILE } from '../iso/constants'
import { PILL_TONES, roundedPath } from '../iso/draw'
import { estimateTextWidth, iso, type Pt } from '../iso/geometry'
import { FloorRipple, IsoArrow, IsoGrid, IsoNode, IsoStyles, PacketDot, Pill, PillBox, Shadow } from '../iso/primitives'
import { StageTools } from '../iso/StageTools'
import { usePan } from '../iso/usePan'
import { DROP_MS } from '../sequence/timeline'
import { cameraBox, FLOAT, FLOW_STYLE, flowPoints, layoutNodes, NODE_STYLE, portWorld, TAG_TONE, tagSlot, type LaidNode } from './layout'
import { beatMs, finalStep, hasEnded, hasStarted, noteVisible, stepDelay, TAG_MS } from './timeline'
import type { FlowTone, TopoBeat, TopoTag, TopologyState } from './types'

type Props = {
  state: TopologyState
  speed?: number
  /** 바뀌면 처음부터 다시 재생 (Phase 번호 + 다시 보기 횟수) */
  playKey: string | number
}

/** 처음 등장할 때 내려앉는 높이 (화면 단위) */
const DROP_H = 60

/**
 * topology 엔진: 경로 위에 놓인 노드(블록), 연결선, 여러 노드를 거쳐 가는 패킷, 노드에 붙는 알약(공격·방어·용어), 바닥 구역.
 * Phase가 바뀌어도 살아 있어서, 노드가 같으면 그대로 두고 새 노드만 내려앉는다.
 */
export function TopologyDiagram({ state, speed = 1, playKey }: Props) {
  const reduce = useReducedMotion()
  const nodes = useMemo(() => layoutNodes(state.nodes), [state.nodes])
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const last = finalStep(state)

  // 재생 단계. playKey가 바뀌면 렌더 중에 처음으로 되돌린다
  const [run, setRun] = useState({ key: playKey, s: 0 })
  if (run.key !== playKey) setRun({ key: playKey, s: 0 })
  const s = reduce ? last : Math.min(run.key === playKey ? run.s : 0, last)

  // 노드 구성이 바뀌면(새 블록이 내려앉는 동안) 재생을 잠깐 미룬다
  const nodesKey = state.nodes.map((n) => n.id).join('|')
  const [drop, setDrop] = useState({ key: nodesKey, done: false })
  if (drop.key !== nodesKey) setDrop({ key: nodesKey, done: false })
  const landed = !!reduce || (drop.key === nodesKey && drop.done)
  useEffect(() => {
    const t = window.setTimeout(() => setDrop((d) => (d.key === nodesKey ? { ...d, done: true } : d)), DROP_MS / speed)
    return () => window.clearTimeout(t)
  }, [nodesKey, speed])

  useEffect(() => {
    if (reduce || !landed || s >= last) return
    const t = window.setTimeout(
      () => setRun((r) => (r.key === playKey ? { ...r, s: r.s + 1 } : r)),
      stepDelay(state, s) / speed,
    )
    return () => window.clearTimeout(t)
  }, [s, last, state, speed, playKey, reduce, landed])

  // Phase가 바뀌면 끌어서 옮긴 위치를 되돌린다
  const setStagePan = useStudyStore((st) => st.setStagePan)
  useEffect(() => {
    setStagePan('topology', { x: 0, y: 0 })
  }, [playKey, setStagePan])

  const camera = useMemo(() => cameraBox(state), [state])
  const pan = usePan('topology', camera)

  // 지금 보이는 알약: 처음부터 있는 것 + 시작된 tags 비트. 노드·묶음별 순번을 매긴다
  const counts = new Map<string, number>()
  const placed = (tag: TopoTag) => {
    const key = `${tag.node}:${tag.tone === 'defense'}`
    const i = counts.get(key) ?? 0
    counts.set(key, i + 1)
    return i
  }
  type ShownTag = TopoTag & { key: string; index: number; delay: number }
  const shown: ShownTag[] = []
  for (const [i, tag] of (state.tags ?? []).entries()) shown.push({ ...tag, key: `s${i}`, index: placed(tag), delay: 0 })
  state.beats.forEach((b, k) => {
    if (b.kind !== 'tags') return
    b.tags.forEach((tag, j) => {
      const index = placed(tag)
      if (hasStarted(s, k) && landed) shown.push({ ...tag, key: `${b.id}-${j}`, index, delay: reduce ? 0 : (j * TAG_MS) / 1000 / speed })
    })
  })

  // 알약이 뜨는 노드 바닥의 물결: tags 비트마다 노드당 한 번, 그 노드의 첫 알약과 같이
  const ripples: { key: string; node: LaidNode; delay: number; color: string }[] = []
  state.beats.forEach((b, k) => {
    if (b.kind !== 'tags' || !hasStarted(s, k) || !landed) return
    const seen = new Set<string>()
    b.tags.forEach((tag, j) => {
      const n = byId.get(tag.node)
      if (!n || seen.has(tag.node)) return
      seen.add(tag.node)
      ripples.push({ key: `${run.key}-${b.id}-${tag.node}`, node: n, delay: (j * TAG_MS) / 1000 / speed, color: PILL_TONES[TAG_TONE[tag.tone]].fg })
    })
  })

  const flowTones = new Set(state.beats.flatMap((b) => (b.kind === 'flow' ? [b.tone ?? 'request'] : [])))

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
          <IsoGrid cx={0} cy={-(Math.max(0, ...nodes.map((n) => n.t)) / 2)} />

          {/* 바닥 구역 */}
          {state.beats.map((b, k) =>
            b.kind === 'zone' && hasStarted(s, k) && byId.get(b.node) ? <Zone key={`${run.key}-${b.id}`} n={byId.get(b.node)!} label={b.label} /> : null,
          )}

          {/* 연결선 */}
          {state.links.map((l) => {
            const a = byId.get(l.from)
            const b = byId.get(l.to)
            if (!a || !b) return null
            return (
              <motion.g key={`${l.from}-${l.to}`} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: landed ? 1 : 0 }} transition={ENTER}>
                <IsoArrow
                  from={portWorld(a, { x: b.wx, y: b.wy })}
                  to={portWorld(b, { x: a.wx, y: a.wy })}
                  both={l.style !== 'danger'}
                  danger={l.style === 'danger'}
                />
              </motion.g>
            )
          })}

          {/* 알약이 뜨는 자리의 바닥 물결 */}
          {ripples.map((r) => (
            <FloorRipple key={r.key} x={r.node.wx} y={r.node.wy} color={r.color} delay={r.delay} />
          ))}

          {/* 노드 블록 (먼 것부터). 새 노드는 살짝 위에서 내려앉는다 */}
          <AnimatePresence>
            {[...nodes]
              .sort((p, q) => p.wy + p.wx - (q.wy + q.wx))
              .map((n, i) => {
                const st = NODE_STYLE[n.kind]
                return (
                  <motion.g
                    key={n.id}
                    initial={reduce ? false : { y: -DROP_H, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.25 } }}
                    transition={{ duration: 0.7, delay: reduce ? 0 : i * 0.06, ease: EASE }}
                  >
                    <IsoNode x={n.wx} y={n.wy} h={st.h} glyph={st.glyph} color={st.color} label={n.label} sub={n.sub} />
                  </motion.g>
                )
              })}
          </AnimatePresence>

          {/* 알약 */}
          {shown.map((tag) => {
            const n = byId.get(tag.node)
            if (!n) return null
            return (
              <motion.g
                key={`${run.key}-${tag.key}`}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...ENTER, delay: tag.delay }}
              >
                <Pill at={tagSlot(n, tag.tone, tag.index, tag.text)} text={tag.text} tone={TAG_TONE[tag.tone]} />
              </motion.g>
            )
          })}

          {/* 지나가는 패킷 (진행 중인 비트만) */}
          {landed &&
            state.beats.map((b, k) =>
              b.kind === 'flow' && hasStarted(s, k) && !hasEnded(s, k) ? (
                <Flow key={`${run.key}-${b.id}`} beat={b} nodes={nodes} ms={beatMs(b) / speed} reduce={!!reduce} />
              ) : null,
            )}
        </g>
      </motion.svg>

      <StageTools changed={pan.changed} onReset={pan.reset} />

      {/* 범례: 패킷 색의 뜻 */}
      {flowTones.size > 0 && (
        <ul aria-label="범례" className="pointer-events-none absolute bottom-3 left-3.5 m-0 flex list-none gap-4 p-0 text-[11px] text-muted">
          {(['request', 'response', 'danger'] as FlowTone[])
            .filter((t) => flowTones.has(t))
            .map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full border-[1.5px] border-ink" style={{ background: FLOW_STYLE[t].fill }} />
                {t === 'request' ? '요청' : t === 'response' ? '응답' : '새거나 뚫린 데이터'}
              </li>
            ))}
        </ul>
      )}

      {/* 설명 칩 */}
      {state.notes && state.notes.length > 0 && (
        <ul aria-label="무대 설명" className="pointer-events-none absolute top-3 left-3 m-0 flex max-w-[48%] list-none flex-col gap-2 p-0">
          <AnimatePresence initial={!reduce}>
            {state.notes.map((n, i) =>
              landed && noteVisible(state, s, n.after) ? (
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

/** 패킷 하나가 path를 따라 이동. 지나는 노드 안에서는 잠깐 사라졌다가 나오고, 끝 노드에 들어가면 사라진다 */
function Flow({ beat, nodes, ms, reduce }: { beat: Extract<TopoBeat, { kind: 'flow' }>; nodes: LaidNode[]; ms: number; reduce: boolean }) {
  const { pts, visible } = flowPoints(nodes, beat.path)
  const style = FLOW_STYLE[beat.tone ?? 'request']
  if (pts.length < 2) return null
  // 이동 거리에 비례한 시간 배분. 노드 안(보이지 않는 구간)은 짧게 친다
  const seg: number[] = []
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    seg.push(visible[i - 1] ? d : Math.min(d, 60))
  }
  const total = seg.reduce((a, b) => a + b, 0) || 1
  const xs: number[] = [pts[0].x]
  const ys: number[] = [pts[0].y]
  const op: number[] = [1]
  const times: number[] = [0]
  let acc = 0
  const eps = 0.001
  for (let i = 1; i < pts.length; i++) {
    acc += seg[i - 1] / total
    const t = Math.min(1, acc)
    const hidden = !visible[i - 1]
    // 노드 안을 지나는 구간: 들어가는 순간 숨기고, 나오는 순간 다시 보인다
    xs.push(pts[i].x)
    ys.push(pts[i].y)
    op.push(hidden ? 0 : 1)
    times.push(t)
    if (i < pts.length - 1 && !visible[i]) {
      // 다음 구간이 숨는 구간이면 도착 직후 숨긴다
      xs.push(pts[i].x)
      ys.push(pts[i].y)
      op.push(0)
      times.push(Math.min(1, t + eps))
    } else if (hidden) {
      xs.push(pts[i].x)
      ys.push(pts[i].y)
      op.push(1)
      times.push(Math.min(1, t + eps))
    }
  }
  // 끝 노드에 들어가면 사라진다
  op[op.length - 1] = 0
  for (let i = 1; i < times.length; i++) if (times[i] <= times[i - 1]) times[i] = Math.min(1, times[i - 1] + eps / 10)
  const sec = reduce ? 0 : ms / 1000
  return (
    <motion.g
      initial={{ x: xs[0], y: ys[0], opacity: 0 }}
      animate={{ x: xs, y: ys, opacity: op.map((o, i) => (i === 0 ? 1 : o)) }}
      transition={{ duration: sec, times, ease: 'linear' }}
      style={{ pointerEvents: 'none' }}
    >
      <g transform={`translate(0 ${FLOAT})`}>
        <Shadow x={0} y={0} r={7} />
      </g>
      <PacketDot fill={style.fill} />
      <FlowPill label={beat.label} detail={beat.detail} tone={style.tone} />
    </motion.g>
  )
}

/** 패킷 위 알약: 이름 + 선택 한 줄 */
function FlowPill({ label, detail, tone }: { label: string; detail?: string; tone: keyof typeof PILL_TONES }) {
  const fg = PILL_TONES[tone].fg
  const w = Math.max(estimateTextWidth(label, TAG.FONT, true), detail ? estimateTextWidth(detail, TAG.MONO, true) : 0) + TAG.PAD * 2
  const h = detail ? 52 : TAG.H
  const y = -22 - h
  return (
    <g>
      <PillBox x={-w / 2} y={y} w={w} h={h} tone={tone} />
      <text y={y + (detail ? 21 : h / 2 + TAG.FONT * 0.36)} textAnchor="middle" fontFamily={SANS} fontSize={TAG.FONT} fontWeight={800} fill={fg}>
        {label}
      </text>
      {detail && (
        <text y={y + 41} textAnchor="middle" fontFamily={MONO} fontSize={TAG.MONO} fontWeight={500} fill={INK}>
          {detail}
        </text>
      )}
    </g>
  )
}

/**
 * 노드 둘레 바닥의 점선 구역 (예: TLS가 지키는 구간). 주변이 알약으로 붐비므로 이름은 무대에 따로 쓰지 않고
 * 설명 칩과 화면 낭독기 요약으로 전한다.
 */
function Zone({ n, label }: { n: LaidNode; label: string }) {
  const r = TILE * 1.05
  const corners: Pt[] = [iso(n.wx - r, n.wy - r), iso(n.wx + r, n.wy - r), iso(n.wx + r, n.wy + r), iso(n.wx - r, n.wy + r)]
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={ENTER} aria-label={label}>
      <path d={roundedPath(corners, 24)} fill="#cfe3b2" fillOpacity={0.4} stroke="#2f7a3d" strokeWidth={2.2} strokeDasharray="8 6" />
    </motion.g>
  )
}

/** 화면 낭독기용 요약 */
function describe(state: TopologyState): string {
  const names = new Map(state.nodes.map((n) => [n.id, n.label]))
  const route = state.nodes.map((n) => n.label).join(', ')
  const flows = state.beats.flatMap((b) => (b.kind === 'flow' ? [`${b.path.map((id) => names.get(id)).join(' → ')}: ${b.label}`] : []))
  return `경로 다이어그램: ${route}${flows.length ? ` · ${flows.join(' · ')}` : ''}`
}
