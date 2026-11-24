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
