/**
 * 6-14 토큰 방식과 JWT 해부 (Week06 p.26, p.28–29).
 * Base64URL 인코딩과 HS256(HMAC-SHA256) 서명·검증. 직접 해보기에서 브라우저 안(Web Crypto)으로만 계산한다.
 * 강의자료 p.26의 서명 값은 비밀키가 공개되지 않아 검증할 수 없으므로, 연습용 비밀키(DEMO_SECRET)로 서명한다.
 */

/** 화면에 공개하는 연습용 비밀키 (실제 서비스 키가 아니다) */
export const DEMO_SECRET = 'network-study-demo-secret'

/** p.26 예시 */
export const LECTURE_HEADER = { alg: 'HS256', typ: 'JWT' } as const
export const LECTURE_PAYLOAD = { sub: '2026001', role: 'student', exp: 1794380400 } as const
/** p.26 예시 토큰의 앞 두 덩어리 (서명 부분은 비밀키를 몰라 검증할 수 없다) */
export const LECTURE_HEADER_B64 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
export const LECTURE_PAYLOAD_B64 = 'eyJzdWIiOiIyMDI2MDAxIiwicm9sZSI6InN0dWRlbnQiLCJleHAiOjE3OTQzODA0MDB9'

const enc = new TextEncoder()
const dec = new TextDecoder()

export function base64UrlEncode(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64UrlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)
  const bin = atob(b64)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/** 객체 → JSON → Base64URL */
export const encodePart = (obj: unknown) => base64UrlEncode(enc.encode(JSON.stringify(obj)))
/** Base64URL → 문자열 (디코딩은 누구나 할 수 있다) */
export const decodePart = (s: string) => dec.decode(base64UrlDecode(s))

async function hmac(secret: string, data: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return base64UrlEncode(new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(data))))
}

/** HS256 서명 → header.payload.signature */
export async function signHS256(payload: object, secret = DEMO_SECRET): Promise<string> {
  const head = `${encodePart(LECTURE_HEADER)}.${encodePart(payload)}`
  return `${head}.${await hmac(secret, head)}`
}

export type VerifyResult =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; status: 401; reason: 'invalid format' | 'invalid token' | 'token expired' }

/** 서버의 검증: 형식 → 서명(서버 키로 다시 계산해 비교) → 만료 (p.28 순서의 일부) */
export async function verifyHS256(token: string, nowSec: number, secret = DEMO_SECRET): Promise<VerifyResult> {
  const parts = token.split('.')
  if (parts.length !== 3) return { ok: false, status: 401, reason: 'invalid format' }
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(decodePart(parts[1]))
  } catch {
    return { ok: false, status: 401, reason: 'invalid format' }
  }
  if ((await hmac(secret, `${parts[0]}.${parts[1]}`)) !== parts[2]) return { ok: false, status: 401, reason: 'invalid token' }
  if (typeof payload.exp === 'number' && payload.exp <= nowSec) return { ok: false, status: 401, reason: 'token expired' }
  return { ok: true, payload }
}

/** exp(Unix 초) → "2026-11-11 16:00 (KST)" */
export function expToKst(exp: number): string {
  const d = new Date((exp + 9 * 3600) * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} (KST)`
}

// ───────────────────────── 6-15 서버의 JWT 검증 순서 (p.28) ─────────────────────────

/** 검문소 순서: 1 형식 → 2 알고리즘 → 3 서명 → 4 시간 → 5 발급자·대상 (그다음 6 인가) */
export const VERIFY_STAGES = ['format', 'alg', 'signature', 'time', 'issuer'] as const
export type VerifyStage = (typeof VERIFY_STAGES)[number]

export const STAGE_LABEL: Record<VerifyStage, string> = {
  format: '1. 형식',
  alg: '2. 알고리즘',
  signature: '3. 서명',
  time: '4. 시간',
  issuer: '5. 발급자·대상',
}

/** 이 API가 기대하는 발급자·대상 (p.28 코드 예시) */
export const EXPECTED_ISS = 'auth.inu.ac.kr'
export const EXPECTED_AUD = 'grade-api'
/** 검증기의 "지금" 시각: 예시 토큰 만료 10분 전 */
export const VERIFY_NOW = LECTURE_PAYLOAD.exp - 600

export type PipelineResult = {
  /** 멈춘 검문소, 모두 통과하면 'pass' */
  stop: VerifyStage | 'pass'
  reason: string
  payload?: Record<string, unknown>
}

export type PipelineOptions = {
  now?: number
  secret?: string
  algorithms?: string[]
  iss?: string
  aud?: string
  /** 검증 없이 decode만 하는 (잘못된) 서버 */
  decodeOnly?: boolean
}

/** 서버의 검증 순서대로 검사하고, 처음 실패한 곳에서 멈춘다 */
export async function verifyPipeline(token: string, o: PipelineOptions = {}): Promise<PipelineResult> {
  const { now = VERIFY_NOW, secret = DEMO_SECRET, algorithms = ['HS256'], iss = EXPECTED_ISS, aud = EXPECTED_AUD } = o
  const parts = token.split('.')
  let header: Record<string, unknown>
  let payload: Record<string, unknown>
  try {
    if (parts.length !== 3) throw new Error()
    header = JSON.parse(decodePart(parts[0]))
    payload = JSON.parse(decodePart(parts[1]))
  } catch {
    return { stop: 'format', reason: '세 덩어리가 아니거나 Base64URL·JSON으로 안 풀림' }
  }
  if (o.decodeOnly) return { stop: 'pass', reason: 'decode만 함 → 검증 없이 통과', payload }
  if (typeof header.alg !== 'string' || !algorithms.includes(header.alg)) {
    return { stop: 'alg', reason: `alg: ${String(header.alg)} → ${algorithms.join('·')}만 허용`, payload }
  }
  if ((await hmac(secret, `${parts[0]}.${parts[1]}`)) !== parts[2]) return { stop: 'signature', reason: '서버 키로 다시 서명 → 불일치', payload }
  if (typeof payload.exp === 'number' && payload.exp <= now) return { stop: 'time', reason: 'exp 지남 → token expired', payload }
  if (typeof payload.nbf === 'number' && payload.nbf > now) return { stop: 'time', reason: 'nbf 전 → 아직 못 씀', payload }
  if (payload.iss !== iss) return { stop: 'issuer', reason: `iss: ${String(payload.iss)} → 우리 인증 서버 아님`, payload }
  if (payload.aud !== aud) return { stop: 'issuer', reason: `aud: ${String(payload.aud)} → 이 API용 아님`, payload }
  return { stop: 'pass', reason: '모든 검증 통과', payload }
}

const BASE_CLAIMS = { ...LECTURE_PAYLOAD, iss: EXPECTED_ISS, aud: EXPECTED_AUD }

/** 검증기 샘플 토큰 다섯 가지 */
export const SAMPLE_TOKENS = {
  valid: { title: '정상 토큰', header: LECTURE_HEADER, payload: BASE_CLAIMS },
  none: { title: 'alg: none 토큰', header: { alg: 'none', typ: 'JWT' }, payload: BASE_CLAIMS, unsigned: true },
  forged: { title: 'role 변조 토큰', header: LECTURE_HEADER, payload: { ...BASE_CLAIMS, role: 'professor' }, signedAs: BASE_CLAIMS },
  expired: { title: '만료된 토큰', header: LECTURE_HEADER, payload: { ...BASE_CLAIMS, exp: VERIFY_NOW - 60 } },
  otherAud: { title: '다른 서비스용 토큰', header: LECTURE_HEADER, payload: { ...BASE_CLAIMS, aud: 'chat-api' } },
} as const
export type SampleId = keyof typeof SAMPLE_TOKENS

/** 샘플 토큰 만들기: 변조 토큰은 원래 내용으로 서명한 뒤 payload만 바꾸고, none 토큰은 서명이 없다 */
export async function buildSample(id: SampleId, secret = DEMO_SECRET): Promise<string> {
  const s = SAMPLE_TOKENS[id]
  const h = encodePart(s.header)
  if ('unsigned' in s) return `${h}.${encodePart(s.payload)}.`
  const signedPayload = 'signedAs' in s ? s.signedAs : s.payload
  const sig = await hmac(secret, `${h}.${encodePart(signedPayload)}`)
  return `${h}.${encodePart(s.payload)}.${sig}`
}
