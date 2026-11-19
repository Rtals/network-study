export type DeviceKind = 'pc' | 'server'

export type SeqActor = {
  id: string
  /** 기기 아래 이름표: "클라이언트" */
  label: string
  device: DeviceKind
}

/** 짝을 맞춰 강조할 필드 색 (theme.highlightColors) */
export type FieldTone = 'a' | 'b'
export type SeqField = { text: string; tone?: FieldTone }

export type StateTone = 'state' | 'success' | 'wait' | 'error' | 'note'
/** 기기 위 상태 표지판. icon은 글 대신 뜻을 보태는 작은 표시 (question: 모르는 요청, cross: 성립 안 됨) */
export type ActorState = { label: string; tone?: StateTone; icon?: 'question' | 'cross' }

/** 메시지가 출발(send)하거나 도착(arrive)하는 순간 바뀌는 상태 */
export type SeqEffect = { actor: string; state: ActorState; at?: 'send' | 'arrive' }

/**
 * 한 연결선 위를 오가는 메시지. 이번 Phase에 보여 줄 것만 넣는다 (미리 보여 주지 않는다).
 * fate: delivered(도착) · lost(중간에 손실) · withheld(보내지 않음)
 */
export type SeqMessage = {
  id: string
  from: string
  to: string
  label: string
  fields?: SeqField[]
  fate?: 'delivered' | 'lost' | 'withheld'
  /** 네트워크를 떠돌다 뒤늦게 도착한 과거의 패킷 (연결선 중간에서 흐릿하게 나타남) */
  stale?: boolean
  /** 보내기 전에 기다림 (RTO 등) */
  waitBefore?: { who: string; label: string }
  effects?: SeqEffect[]
  /** 오른쪽 패널 "주고받은 메시지"에 붙는 한 줄 뜻풀이 */
  note?: string
}

/** 오른쪽 패널 "주고받은 메시지"의 한 줄 (이전 Phase에서 오간 메시지) */
export type SeqLogEntry = {
  from: string
  to: string
  label: string
  fields?: SeqField[]
  fate?: SeqMessage['fate']
  note?: string
}

export type SequenceState = {
  kind: 'sequence'
  /** 화면 왼쪽 아래 → 오른쪽 위 순서로 놓인다 */
  actors: SeqActor[]
  /** Phase 시작 시점의 상태 */
  states: Record<string, ActorState>
  messages: SeqMessage[]
  /** 메시지가 끝난 뒤 마지막 대기와 상태 변화 (예: 백오프 끝 → Connection timed out) */
  tail?: { wait: { who: string; label: string }; effects: SeqEffect[] }
  /** 이전 Phase까지 주고받은 메시지. 무대가 아니라 오른쪽 패널에 이번 메시지와 함께 보여 준다 */
  log?: SeqLogEntry[]
  /** 연결선을 감싸는 왕복 고리 (예: "1 RTT") */
  rttLoop?: string
  /** 무대 왼쪽 위에 그림과 함께 등장하는 설명 상자 */
  notes?: StageNote[]
}

/**
 * 무대 설명 상자. after(메시지 id)가 있으면 그 메시지가 도착한 뒤 애니메이션과 함께 나타난다.
 * tone이 있으면 짝 강조색 표시를 붙인다.
 */
export type StageNote = { text: string; tone?: FieldTone; after?: string }

export function isSequenceState(s: unknown): s is SequenceState {
  return typeof s === 'object' && s !== null && (s as { kind?: unknown }).kind === 'sequence'
}
