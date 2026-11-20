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
    const n = byId.get(b.node)
    if (n) pts.push(iso(n.wx + TILE * 1.05, n.wy + TILE * 1.05), iso(n.wx - TILE * 1.05, n.wy + TILE * 1.05))
  }
  return { ...cameraFor(boundsOf(pts, 50)) }
}

/** 카메라: 기본 배율 고정, 넘치면 살짝 축소 */
export const cameraBox = (state: TopologyState): Box => overviewBox(state)
