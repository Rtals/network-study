import { cameraFor, type Box } from '../iso/camera'
import { TAG, TILE } from '../iso/constants'
import type { BlockColor, PillTone } from '../iso/draw'
import { boundsOf, boxPoints, estimateTextWidth, iso, type Pt } from '../iso/geometry'
import type { GlyphKind } from '../iso/glyphs'
import { laneWorld } from '../sequence/layout'
import type { FlowTone, TagTone, TopoNode, TopoNodeKind, TopologyState } from './types'

/** 노드 종류별 블록 모양 */
export const NODE_STYLE: Record<TopoNodeKind, { glyph: GlyphKind; color: BlockColor; h: number }> = {
  browser: { glyph: 'browser', color: 'violet', h: 60 },
  network: { glyph: 'wifi', color: 'yellow', h: 52 },
  isp: { glyph: 'globe', color: 'blue', h: 56 },
  server: { glyph: 'server', color: 'blue', h: 70 },
  auth: { glyph: 'shield', color: 'orange', h: 62 },
  db: { glyph: 'db', color: 'green', h: 70 },
  attacker: { glyph: 'spy', color: 'rose', h: 56 },
  person: { glyph: 'person', color: 'slab', h: 52 },
  gate: { glyph: 'door', color: 'blue', h: 60 },
  desk: { glyph: 'idcard', color: 'violet', h: 60 },
  card: { glyph: 'card', color: 'yellow', h: 60 },
  floor: { glyph: 'elevator', color: 'orange', h: 60 },
  log: { glyph: 'clipboard', color: 'green', h: 60 },
}

export const TAG_TONE: Record<TagTone, PillTone> = {
  threat: 'red',
  defense: 'green',
  term: 'violet',
  warn: 'amber',
  info: 'paper',
}

/** 패킷 점 채움 / 알약 색 */
export const FLOW_STYLE: Record<FlowTone, { fill: string; tone: PillTone }> = {
  request: { fill: '#9fd28f', tone: 'green' },
  response: { fill: '#f3b47f', tone: 'orange' },
  danger: { fill: '#e5534b', tone: 'red' },
}

/** 패킷이 떠 있는 높이 */
export const FLOAT = 26
/** 알약 사이 간격 (세로) */
const TAG_STEP = TAG.H + 9

export type LaidNode = TopoNode & { wx: number; wy: number; h: number }

export function layoutNodes(nodes: TopoNode[]): LaidNode[] {
  return nodes.map((n) => {
    const w = laneWorld(n.t, n.side ?? 0)
    return { ...n, wx: w.x, wy: w.y, h: NODE_STYLE[n.kind].h }
  })
}

export const tagWidth = (text: string) => estimateTextWidth(text, TAG.FONT, true) + TAG.PAD * 2

/**
 * 알약 자리 (가운데 좌표). 위쪽 묶음은 블록 꼭대기 위로 쌓고,
 * 방어(defense) 묶음은 블록 오른쪽 아래에 왼쪽 정렬로 쌓는다.
 */
export function tagSlot(n: LaidNode, tone: TagTone, index: number, text: string): Pt {
  if (tone === 'defense') {
    const c = iso(n.wx, n.wy)
    return { x: c.x + TILE + 12 + tagWidth(text) / 2, y: c.y - n.h * 0.35 + index * TAG_STEP }
  }
  const top = iso(n.wx, n.wy, n.h)
  return { x: top.x, y: top.y - TILE / 2 - 30 - index * TAG_STEP }
}

/**
 * 연결선·패킷이 블록에 닿는 자리 (월드). 블록에서 dir 쪽으로 나가는 점.
 * 보이는 면(+x, +y 쪽)으로 나가면 면 바로 앞, 가려진 면으로 나가면 블록 화면 윤곽 바깥까지 물러난다.
 */
export function portWorld(n: LaidNode, toward: { x: number; y: number }) {
  const dx = toward.x - n.wx
  const dy = toward.y - n.wy
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const visible = ux + uy > 0
  const r = visible ? TILE / 2 + 20 : TILE + 20
  return { x: n.wx + ux * r, y: n.wy + uy * r }
}

/** 패킷이 path를 따라갈 때의 화면 좌표 목록과 각 점에서 보이는지 (노드 안을 지날 때는 숨긴다) */
export function flowPoints(nodes: LaidNode[], path: string[]): { pts: Pt[]; visible: boolean[] } {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const ns = path.map((id) => byId.get(id)).filter((n): n is LaidNode => !!n)
  const pts: Pt[] = []
  const visible: boolean[] = []
  const at = (w: { x: number; y: number }) => iso(w.x, w.y, FLOAT)
  for (let i = 0; i < ns.length - 1; i++) {
    const a = ns[i]
    const b = ns[i + 1]
    const out = portWorld(a, { x: b.wx, y: b.wy })
    const inn = portWorld(b, { x: a.wx, y: a.wy })
    pts.push(at(out))
    visible.push(true)
    pts.push(at(inn))
    visible.push(i === ns.length - 2)
  }
  return { pts, visible }
}

/** 전체 보기: 모든 블록 + 나올 수 있는 모든 알약 + 구역 */
export function overviewBox(state: TopologyState): Box {
  const nodes = layoutNodes(state.nodes)
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const pts: Pt[] = []
  for (const n of nodes) pts.push(...boxPoints(n.wx - TILE / 2, n.wy - TILE / 2, 0, TILE, TILE, n.h))
  const counts = new Map<string, number>()
  const allTags = [...(state.tags ?? []), ...state.beats.flatMap((b) => (b.kind === 'tags' ? b.tags : []))]
  for (const tag of allTags) {
    const n = byId.get(tag.node)
    if (!n) continue
    const key = `${tag.node}:${tag.tone === 'defense'}`
    const i = counts.get(key) ?? 0
    counts.set(key, i + 1)
    const c = tagSlot(n, tag.tone, i, tag.text)
    const w = tagWidth(tag.text)
    pts.push({ x: c.x - w / 2, y: c.y - TAG.H / 2 }, { x: c.x + w / 2, y: c.y + TAG.H / 2 + TAG.DROP })
  }
  for (const b of state.beats) {
    if (b.kind !== 'zone') continue
    const ns = b.nodes.map((id) => byId.get(id)).filter((n): n is LaidNode => !!n)
    if (ns.length) pts.push(...zoneCorners(ns))
  }
  return { ...cameraFor(boundsOf(pts, 50)) }
}

/** 카메라: 기본 배율 고정, 넘치면 살짝 축소 */
export const cameraBox = (state: TopologyState): Box => overviewBox(state)

/** 패킷이 블록에 들어가거나(흐려짐) 나올 때(선명해짐) 걸리는 시간 */
export const FADE_MS = 180

/**
 * 패킷 이동 키프레임. 블록 사이 구간은 보이며 움직이고, 블록 안(숨는 구간)은 짧게 친다.
 * 블록에서 나올 때는 FADE_MS 동안 선명해지고, 블록에 들어갈 때는 FADE_MS 동안 흐려진다
 * (출발 블록, 중간에 지나는 블록, 끝 블록 모두 같은 규칙).
 */
export function flowKeyframes(pts: Pt[], visible: boolean[], totalMs: number, fadeMs = FADE_MS) {
  const seg: number[] = []
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    seg.push(visible[i - 1] ? d : Math.min(d, 60))
  }
  const total = seg.reduce((a, b) => a + b, 0) || 1
  const fade = Math.min(0.45, fadeMs / Math.max(1, totalMs))
  const frames: { t: number; x: number; y: number; o: number }[] = []
  const lerpPt = (a: Pt, b: Pt, k: number) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k })
  let t0 = 0
  for (let i = 0; i < seg.length; i++) {
    const t1 = t0 + seg[i] / total
    const a = pts[i]
    const b = pts[i + 1]
    if (!visible[i]) {
      // 블록 안: 계속 안 보인다
      frames.push({ t: t0, ...a, o: 0 }, { t: t1, ...b, o: 0 })
    } else {
      const span = t1 - t0
      const f = Math.min(fade, span / 2)
      const p1 = lerpPt(a, b, f / span)
      const p2 = lerpPt(a, b, 1 - f / span)
      // 구간 시작은 항상 블록에서 나오는 순간, 끝은 항상 블록에 들어가는 순간
      frames.push({ t: t0, ...a, o: 0 }, { t: t0 + f, ...p1, o: 1 }, { t: t1 - f, ...p2, o: 1 }, { t: t1, ...b, o: 0 })
    }
    t0 = t1
  }
  // 같은 시각의 키프레임은 아주 조금씩 밀어 순서를 지킨다
  for (let i = 1; i < frames.length; i++) if (frames[i].t <= frames[i - 1].t) frames[i].t = Math.min(1, frames[i - 1].t + 1e-4)
  frames[frames.length - 1].t = 1
  return {
    xs: frames.map((k) => k.x),
    ys: frames.map((k) => k.y),
    op: frames.map((k) => k.o),
    times: frames.map((k) => Math.min(1, k.t)),
  }
}

/** 구역 바닥의 네 모서리 (화면 좌표): 노드들을 감싸는 월드 직사각형 + 여유 */
export function zoneCorners(ns: LaidNode[]): Pt[] {
  const r = TILE * 1.05
  const x0 = Math.min(...ns.map((n) => n.wx)) - r
  const x1 = Math.max(...ns.map((n) => n.wx)) + r
  const y0 = Math.min(...ns.map((n) => n.wy)) - r
  const y1 = Math.max(...ns.map((n) => n.wy)) + r
  return [iso(x0, y0), iso(x1, y0), iso(x1, y1), iso(x0, y1)]
}
