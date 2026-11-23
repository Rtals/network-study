import { GAP_MS, LEAD_MS, READ_MS } from '../sequence/timeline'
import { flowMs, layoutNodes, type LaidNode } from './layout'
import type { TopoBeat, TopologyState } from './types'

/** 알약 하나가 붙는 간격 */
export const TAG_MS = 220
/** 알약 묶음 하나가 다 붙은 뒤 쉬는 시간 */
export const TAGS_TAIL_MS = 300
/** 구역 표시 */
export const ZONE_MS = 600

/** 상태별 노드 배치 (같은 상태면 다시 계산하지 않는다) */
const laid = new WeakMap<TopologyState, LaidNode[]>()
const nodesOf = (state: TopologyState) => {
  let n = laid.get(state)
  if (!n) laid.set(state, (n = layoutNodes(state.nodes)))
  return n
}

/** 비트 하나의 재생 시간 (배속 적용 전). 흐름은 화면 거리 ÷ 공통 속도 */
export function beatMs(b: TopoBeat, state: TopologyState): number {
  if (b.kind === 'flow') return flowMs(nodesOf(state), b.path)
  if (b.kind === 'tags') return b.tags.length * TAG_MS + TAGS_TAIL_MS
  return ZONE_MS
}

/** 설명 칩이 붙은 비트 id (그 비트 뒤에는 읽을 시간만큼 쉰다) */
const explained = (state: TopologyState) => new Set((state.notes ?? []).map((n) => n.after).filter(Boolean))

/**
 * 진행 단계 s: 짝수 2k = k번째 비트 시작 전, 홀수 2k+1 = k번째 비트 진행 중. 2 × 비트 수 = 끝.
 * (sequence 엔진과 같은 규칙)
 */
export const finalStep = (state: TopologyState) => state.beats.length * 2
export const hasStarted = (s: number, k: number) => s >= 2 * k + 1
export const hasEnded = (s: number, k: number) => s >= 2 * k + 2

/** 단계 s를 지나 다음 단계로 가기까지 걸리는 시간 (배속 적용 전) */
export function stepDelay(state: TopologyState, s: number): number {
  if (s % 2 === 1) return beatMs(state.beats[(s - 1) / 2], state)
  if (s === 0) return LEAD_MS
  const prev = state.beats[s / 2 - 1]
  return GAP_MS + (explained(state).has(prev.id) ? READ_MS : 0)
}

/** 한 Phase의 전체 재생 시간 (마지막 설명을 읽을 시간 포함). 자동재생이 쓴다 */
export function timelineMs(state: TopologyState): number {
  let total = 0
  for (let s = 0; s < finalStep(state); s++) total += stepDelay(state, s)
  const last = state.beats[state.beats.length - 1]
  return total + (last && explained(state).has(last.id) ? READ_MS : 0)
}

/** 설명 칩이 보이는가: after 비트가 끝난 뒤부터 */
export function noteVisible(state: TopologyState, s: number, after?: string): boolean {
  if (!after) return true
  const k = state.beats.findIndex((b) => b.id === after)
  return k < 0 || hasEnded(s, k)
}
