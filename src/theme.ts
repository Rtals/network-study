/**
 * 시각 규칙 (docs/DESIGN.md 4절). 모든 장면이 이 파일의 색만 쓴다.
 * fg: 흰 배경 위 글자·선 색 (명도 대비 4.5:1 이상), bg: 옅은 채움 색.
 */
export const protocolColors = {
  l2: { label: 'L2 / MAC', fg: '#52525b', bg: '#f4f4f5' },
  ip: { label: 'L3 / IP', fg: '#1d4ed8', bg: '#eff6ff' },
  tcp: { label: 'TCP', fg: '#15803d', bg: '#f0fdf4' },
  udp: { label: 'UDP', fg: '#c2410c', bg: '#fff7ed' },
  http: { label: 'HTTP', fg: '#7e22ce', bg: '#faf5ff' },
  tls: { label: 'TLS / 암호화', fg: '#a16207', bg: '#fefce8' },
  dns: { label: 'DNS', fg: '#0f766e', bg: '#f0fdfa' },
  error: { label: '손실 / 오류 / 차단', fg: '#b91c1c', bg: '#fef2f2' },
} as const

export type Protocol = keyof typeof protocolColors

/** 짝 강조색 (예: seq = x ↔ ack = x+1). 프로토콜 색과 겹치지 않게 고른다. */
export const highlightColors = {
  a: '#be185d',
  b: '#0369a1',
} as const

/**
 * sequence 장면의 패킷 방향색. 같은 연결선 위에서 가는 패킷과 오는 패킷을 구별한다.
 * forward: 왼쪽 기기 → 오른쪽 기기 (클라이언트 → 서버), backward: 그 반대 (응답).
 */
export const directionColors = {
  /** 글자·선 색 */
  forward: '#2f7a3d',
  backward: '#b0582a',
  /** 패킷 점 채움 색 (파스텔) */
  forwardFill: '#9fd28f',
  backwardFill: '#f3b47f',
} as const

/** 무대 바닥 (종이색) */
export const STAGE_FLOOR = '#faf3e9'

/** 애니메이션 기본 길이 (ms) */
export const ANIM_MS = 600
/** 자동재생 시 Phase 사이 쉼 (ms) */
export const AUTOPLAY_PAUSE_MS = 1500
