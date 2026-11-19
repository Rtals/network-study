import type { SeqField, SeqMessage, SequenceState } from './types'

/** 오른쪽 패널 "주고받은 메시지" 한 줄 */
export type ExchangeRow = {
  from: string
  to: string
  /** 왼쪽 기기 → 오른쪽 기기 (클라이언트 → 서버) */
  forward: boolean
  label: string
  fields: SeqField[]
  fate: NonNullable<SeqMessage['fate']>
  note?: string
  /** 이번 Phase에 오가는 메시지 */
  current: boolean
}

/** 이전 Phase까지의 기록 + 이번 Phase의 메시지 */
export function exchangeRows(state: SequenceState): ExchangeRow[] {
  const names = new Map(state.actors.map((a) => [a.id, a.label]))
  const order = new Map(state.actors.map((a, i) => [a.id, i]))
  const row = (
    m: { from: string; to: string; label: string; fields?: SeqField[]; fate?: SeqMessage['fate']; note?: string },
    current: boolean,
  ): ExchangeRow => ({
    from: names.get(m.from) ?? m.from,
    to: names.get(m.to) ?? m.to,
    forward: (order.get(m.to) ?? 0) >= (order.get(m.from) ?? 0),
    label: m.label,
    fields: m.fields ?? [],
    fate: m.fate ?? 'delivered',
    note: m.note,
    current,
  })
  return [...(state.log ?? []).map((m) => row(m, false)), ...state.messages.map((m) => row(m, true))]
}
