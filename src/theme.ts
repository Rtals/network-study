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

/** 애니메이션 기본 길이 (ms) */
export const ANIM_MS = 600
/** 자동재생 시 Phase 사이 쉼 (ms) */
export const AUTOPLAY_PAUSE_MS = 1500
