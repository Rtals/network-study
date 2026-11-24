/**
 * 6-8 인증과 인가 (Week06 p.16–17, 인가 규칙은 p.38의 RBAC·소유권 검사 예시).
 * 요청이 인증(AuthN) → 인가(AuthZ) → Handler 중 어디서 멈추고 몇 번 상태 코드를 받는지 계산한다.
 */

export type Role = 'student' | 'professor'
export type TokenState = 'none' | 'expired' | 'valid'

export type AuthRequest = {
  method: 'GET' | 'POST'
  path: string
  /** 성적 조회(read) / 입력(write) */
  action: 'read' | 'write'
  /** 대상 학생의 학번 */
  targetSid: string
  token: TokenState
  /** 토큰 안의 사용자 (sub, role) — 토큰이 유효할 때만 의미가 있다 */
  sub?: string
  role?: Role
}

export type AuthResult = {
  status: 200 | 401 | 403
  /** 요청이 멈춘 곳 */
  stop: 'authn' | 'authz' | 'handler'
  /** 멈춘(또는 통과한) 이유 한 줄 */
  reason: string
}

export const STATUS_TEXT: Record<AuthResult['status'], string> = {
  200: '200 OK',
  401: '401 Unauthorized',
  403: '403 Forbidden',
}

/** 인증 먼저(누구?), 그다음 인가(해도 되나?) — p.16 순서 */
export function authorize(req: AuthRequest): AuthResult {
  if (req.token === 'none') return { status: 401, stop: 'authn', reason: '토큰 없음 → 누구인지 모름' }
  if (req.token === 'expired') return { status: 401, stop: 'authn', reason: '토큰 만료 → 누구인지 모름' }
  if (req.role === 'professor') return { status: 200, stop: 'handler', reason: '교수: 조회 + 입력 가능' }
  if (req.action === 'write') return { status: 403, stop: 'authz', reason: '학생은 성적 입력 권한 없음' }
  if (req.sub !== req.targetSid) return { status: 403, stop: 'authz', reason: '남의 성적 → 소유권 없음' }
  return { status: 200, stop: 'handler', reason: '자기 성적 조회 ✓' }
}

export type AuthCard = { id: string; title: string; req: AuthRequest }

const STUDENT = { sub: '2026001', role: 'student' as const }
const PROFESSOR = { sub: 'P0012', role: 'professor' as const }

/** 직접 해보기 상황 카드 (p.16–17 예시) */
export const AUTH_CARDS: AuthCard[] = [
  { id: 'no-token', title: '토큰 없이 성적 조회', req: { method: 'GET', path: '/v1/grades', action: 'read', targetSid: '2026001', token: 'none' } },
  { id: 'expired', title: '만료된 토큰으로 조회', req: { method: 'GET', path: '/v1/grades/7', action: 'read', targetSid: '2026001', token: 'expired', ...STUDENT } },
  { id: 'other-read', title: '학생 토큰으로 남의 성적 조회', req: { method: 'GET', path: '/v1/students/1002/grades', action: 'read', targetSid: '2026002', token: 'valid', ...STUDENT } },
  { id: 'student-write', title: '학생 토큰으로 성적 입력', req: { method: 'POST', path: '/v1/grades', action: 'write', targetSid: '2026001', token: 'valid', ...STUDENT } },
  { id: 'prof-write', title: '교수 토큰으로 성적 입력', req: { method: 'POST', path: '/v1/grades', action: 'write', targetSid: '2026001', token: 'valid', ...PROFESSOR } },
  { id: 'own-read', title: '학생 토큰으로 자기 성적 조회', req: { method: 'GET', path: '/v1/grades/7', action: 'read', targetSid: '2026001', token: 'valid', ...STUDENT } },
]

export const cardById = (id: string) => AUTH_CARDS.find((c) => c.id === id)!
