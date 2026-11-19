import { directionColors, highlightColors } from '../../theme'
import { cameraFor, fitAspect, type Box } from '../iso/camera'
import { DEVICE_SCALE, PC_EXTENT, SERVER_EXTENT, TAG } from '../iso/constants'
import type { PillTone } from '../iso/draw'
import { boundsOf, boxPoints, iso, type Pt } from '../iso/geometry'
import type { SeqActor, SeqMessage, SequenceState } from './types'

/**
 * 배치 방향: 기기는 화면 왼쪽 아래 → 오른쪽 위로 놓는다.
 * 아이소메트릭에서 그 방향은 월드 -y 축이므로, 기기 순서를 나타내는 "레인 좌표" t를 월드 (0, -t)에 둔다.
 */
export const laneWorld = (t: number, side = 0) => ({ x: side, y: -t })
/** 레인 위 한 점의 화면 좌표. side는 레인에 수직(월드 +x, 화면 오른쪽 아래) 방향 오프셋 */
export const lanePoint = (t: number, side = 0, z = 0) => iso(side, -t, z)

/** 월드 단위 치수 */
export const GEO = {
  /** 기기 사이 거리 (레인 방향) */
  GAP: 680,
  /** 연결선 끝과 기기 사이 여유 */
  LINK_PAD: 18,
  /** 패킷이 멈추는 자리: 연결선 끝에서 이만큼 안쪽 (앞 = 다음 기기 쪽, 뒤 = 이전 기기 쪽) */
  FRONT_GAP: 70,
  BACK_GAP: 110,
  /** 패킷이 바닥에서 뜬 높이 */
  FLOAT: 26,
  /** 기기 꼭대기 위 상태 알약의 중심 높이 */
  SIGN_Z: 74,
}

export { ASPECT, VIEW_W, boxString, type Box } from '../iso/camera'

/** 패킷 위 알약 (이름 + 필드 두 줄). LIFT = 패킷 중심에서 알약 아래 끝까지 */
export const BUBBLE = { LABEL: TAG.FONT, FIELD: TAG.MONO, H: 52, PAD: TAG.PAD, LIFT: 22 }
/** 패킷 점 반지름 */
export const PACKET = 9
export const SIGN = { FONT: TAG.MONO + 1, H: TAG.H, PAD: TAG.PAD }

type Extent = typeof PC_EXTENT
export const extentOf = (device: SeqActor['device']): Extent => (device === 'pc' ? PC_EXTENT : SERVER_EXTENT)

export type LaidActor = SeqActor & {
  /** 레인 좌표 (0, GAP, 2·GAP …) */
  t: number
  /** 바닥 중심 (월드) */
  wx: number
  wy: number
  /** 기기 높이 (월드, 배율 적용) */
  top: number
  /**
   * 연결선이 붙는 앞(다음 기기 쪽)·뒤(이전 기기 쪽) 끝 (레인 좌표).
   * 앞쪽은 기기의 가려진 면(-y)이라, 기기 화면 윤곽(x1 - y0) 바깥에서 멈춰야 화살촉이 보인다.
   * 뒤쪽은 보이는 면(+y)이라 면 바로 앞에서 멈춘다.
   */
  front: number
  back: number
  /** 카메라가 바라볼 화면 좌표 */
  focus: Pt
  /** 상태 알약의 화면 좌표 (가운데) */
  signAt: Pt
}

export function layoutActors(actors: SeqActor[]): LaidActor[] {
  return actors.map((a, i) => {
    const e = extentOf(a.device)
    const k = DEVICE_SCALE
    const t = i * GEO.GAP
    const { x: wx, y: wy } = laneWorld(t)
    const top = e.h * k
    return {
      ...a,
      t,
      wx,
      wy,
      top,
      front: t + (e.x1 - e.y0) * k + GEO.LINK_PAD,
      back: t - e.y1 * k - GEO.LINK_PAD,
      focus: iso(wx, wy, top * 0.4),
      signAt: iso(wx, wy, top + GEO.SIGN_Z),
    }
  })
}

/** 연결선 구간 (이웃한 기기끼리, 레인 좌표) */
export function linkSegments(actors: LaidActor[]) {
  return actors.slice(0, -1).map((a, i) => ({ t0: a.front, t1: actors[i + 1].back }))
}

/** 메시지가 출발·도착하는 자리 (레인 좌표) */
export function endpoints(actors: LaidActor[], m: SeqMessage) {
  const byId = new Map(actors.map((a) => [a.id, a]))
  const from = byId.get(m.from) ?? actors[0]
  const to = byId.get(m.to) ?? actors[actors.length - 1]
  const forward = to.t >= from.t
  const a = forward ? from.front + GEO.FRONT_GAP : from.back - GEO.BACK_GAP
  const b = forward ? to.back - GEO.BACK_GAP : to.front + GEO.FRONT_GAP
  const startT = m.stale ? a + (b - a) * 0.45 : a
  return { from, to, forward, startT, endT: b, lossT: a + (b - a) * 0.58 }
}

/** 패킷이 떠 있는 화면 좌표 */
export const packetPoint = (t: number) => lanePoint(t, 0, GEO.FLOAT)

/** 패킷 색은 방향으로 정한다: 앞으로(클라이언트 → 서버) 초록, 반대 주황 */
export const directionColor = (forward: boolean) => (forward ? directionColors.forward : directionColors.backward)

/** 패킷 점 채움 색 */
export const directionFill = (forward: boolean) => (forward ? directionColors.forwardFill : directionColors.backwardFill)

/** 패킷 위 알약 색: 보내지 않음 빨강, 과거 패킷 회색, 나머지는 방향 (초록 / 주황) */
export const bubbleTone = (m: SeqMessage, forward: boolean): PillTone =>
  m.fate === 'withheld' ? 'red' : m.stale ? 'gray' : forward ? 'green' : 'orange'

export const fieldColor = (tone: 'a' | 'b' | undefined) => (tone ? highlightColors[tone] : undefined)

/** 전체 보기: 모든 기기, 이름표, 상태 표지판, 연결선 위 말풍선 자리 */
export function overviewBox(state: SequenceState): Box {
  const actors = layoutActors(state.actors)
  const pts: Pt[] = actors.flatMap((a) => {
    const e = extentOf(a.device)
    const k = DEVICE_SCALE
    return [
      ...boxPoints(a.wx + e.x0 * k, a.wy + e.y0 * k, 0, (e.x1 - e.x0) * k, (e.y1 - e.y0) * k, e.h * k),
      // 상태 알약
      { x: a.signAt.x - 110, y: a.signAt.y - SIGN.H },
      { x: a.signAt.x + 110, y: a.signAt.y - SIGN.H },
    ]
  })
  for (const seg of linkSegments(actors)) {
    const mid = packetPoint((seg.t0 + seg.t1) / 2)
    pts.push({ x: mid.x, y: mid.y - BUBBLE.LIFT - BUBBLE.H - 10 }, lanePoint(seg.t0, 90), lanePoint(seg.t1, 90), lanePoint((seg.t0 + seg.t1) / 2, 140), lanePoint((seg.t0 + seg.t1) / 2, -140))
  }
  return fitAspect(boundsOf(pts, 50))
}

/**
 * 카메라 상자. 기본 배율 고정(확대하지 않는다), 오브젝트가 많으면 살짝 축소,
 * 그래도 넘치면 지금 주고받는 기기들의 가운데를 비춘다.
 */
export function cameraBox(state: SequenceState, active: string[] = []): Box {
  const o = overviewBox(state)
  const focus = layoutActors(state.actors)
    .filter((a) => active.includes(a.id))
    .map((a) => a.focus)
  return cameraFor({ minX: o.x, minY: o.y, maxX: o.x + o.w, maxY: o.y + o.h }, focus)
}
