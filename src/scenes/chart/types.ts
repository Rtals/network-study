import type { Protocol } from '../../theme'

/** 아이소메트릭 누적 막대 (연결 비용 비교 등) */
export type IsoBarsState = {
  kind: 'isoBars'
  /** 무대 왼쪽 위 제목 (범례와 함께) */
  title: string
  bars: {
    id: string
    label: string
    /** 막대 위 값 표시: "2 RTT · 60ms" */
    value: string
    /** 보충 메모. 무대에는 글로 띄우지 않고 오른쪽 패널에서 설명한다 */
    note?: string
    segments: { protocol: Protocol; value: number }[]
  }[]
  legend: { protocol: Protocol; label: string }[]
}

export function isIsoBarsState(s: unknown): s is IsoBarsState {
  return typeof s === 'object' && s !== null && (s as { kind?: unknown }).kind === 'isoBars'
}
