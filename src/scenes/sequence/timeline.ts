import type { ActorState, SeqEffect, SeqMessage, SequenceState } from './types'

/** 패킷이 연결선을 건너는 시간 */
export const TRAVEL_MS = 1000
/** 보내지 않음(withheld) 연출 시간 */
export const WITHHELD_MS = 700
/** RTO 대기 연출 시간 (실제 1s·16s를 그대로 기다리지 않는다) */
export const WAIT_MS = 1100
/** 비트 사이 쉼 */
export const GAP_MS = 800
/** 시작 전 잠깐 */
export const LEAD_MS = 250
/** 설명 상자가 나타난 뒤 읽을 시간. 이만큼 기다렸다가 다음 메시지를 보낸다 */
export const READ_MS = 800
/** 장면에 처음 들어올 때 기기가 바닥으로 떨어지는 시간. 끝난 뒤 첫 비트를 시작한다 */
export const DROP_MS = 900

export type Beat =
  | { kind: 'travel'; msg: SeqMessage; ms: number; /** 도착 뒤 설명을 읽을 시간 (설명 상자가 붙은 메시지만) */ hold?: number }
  | { kind: 'wait'; who: string; label: string; ms: number; effects?: SeqEffect[] }

/** 상태 → 차례로 재생할 비트 (기다림 → 이동 → 기다림 → …) */
export function buildBeats(state: SequenceState): Beat[] {
  const beats: Beat[] = []
  const explained = new Set((state.notes ?? []).map((n) => n.after).filter(Boolean))
  for (const msg of state.messages) {
    if (msg.waitBefore) beats.push({ kind: 'wait', who: msg.waitBefore.who, label: msg.waitBefore.label, ms: WAIT_MS })
    beats.push({
      kind: 'travel',
      msg,
      ms: msg.fate === 'withheld' ? WITHHELD_MS : TRAVEL_MS,
      ...(explained.has(msg.id) ? { hold: READ_MS } : {}),
    })
  }
  if (state.tail) beats.push({ kind: 'wait', who: state.tail.wait.who, label: state.tail.wait.label, ms: WAIT_MS, effects: state.tail.effects })
  return beats
}

/**
 * 진행 단계 s: 짝수 2k = k번째 비트 시작 전, 홀수 2k+1 = k번째 비트 진행 중. 2 × 비트 수 = 끝.
 */
export const finalStep = (beats: Beat[]) => beats.length * 2
export const isRunning = (s: number, k: number) => s === 2 * k + 1
export const hasStarted = (s: number, k: number) => s >= 2 * k + 1
export const hasEnded = (s: number, k: number) => s >= 2 * k + 2

/** 비트가 끝난 뒤 머무는 시간 (설명 읽을 시간) */
const holdOf = (b: Beat | undefined) => (b && b.kind === 'travel' ? (b.hold ?? 0) : 0)

/**
 * 단계 s를 지나 다음 단계로 가기까지 걸리는 시간 (배속 적용 전).
 * 앞 메시지에 설명 상자가 붙어 있으면 읽을 시간만큼 더 기다렸다가 다음 메시지를 보낸다.
 */
export function stepDelay(beats: Beat[], s: number): number {
  if (s % 2 === 1) return beats[(s - 1) / 2].ms
  return s === 0 ? LEAD_MS : GAP_MS + holdOf(beats[s / 2 - 1])
}

/** 단계 s 시점의 기기별 상태 */
export function statesAt(state: SequenceState, beats: Beat[], s: number): Record<string, ActorState> {
  const out = { ...state.states }
  beats.forEach((b, k) => {
    if (b.kind === 'travel') {
      for (const e of b.msg.effects ?? []) {
        const due = (e.at ?? 'arrive') === 'send' ? hasStarted(s, k) : hasEnded(s, k)
        if (due) out[e.actor] = e.state
      }
    } else if (hasEnded(s, k)) {
      for (const e of b.effects ?? []) out[e.actor] = e.state
    }
  })
  return out
}

/** 한 Phase의 전체 재생 시간 (배속 적용 전). 자동재생이 장면 끝까지 기다리는 데 쓴다 */
export function timelineMs(state: SequenceState): number {
  const beats = buildBeats(state)
  let total = 0
  for (let s = 0; s < finalStep(beats); s++) total += stepDelay(beats, s)
  // 마지막 설명도 읽고 나서 자동재생이 다음 Phase로 넘어가게
  return total + holdOf(beats[beats.length - 1])
}

/** 단계 s에서 카메라가 챙겨야 할 기기 (진행 중이거나 막 끝난 비트의 양 끝) */
export function activeActors(beats: Beat[], s: number): string[] {
  if (beats.length === 0) return []
  const k = Math.min(Math.max(Math.ceil(s / 2) - 1, 0), beats.length - 1)
  const b = beats[k]
  return b.kind === 'wait' ? [b.who] : [b.msg.from, b.msg.to]
}

/** 설명 상자가 보이는가: after 메시지가 도착(또는 보내지 않음 연출이 끝)한 뒤부터 */
export function noteVisible(beats: Beat[], s: number, after?: string): boolean {
  if (!after) return true
  const k = beats.findIndex((b) => b.kind === 'travel' && b.msg.id === after)
  return k < 0 || hasEnded(s, k)
}
