/**
 * 6-9 MFA와 OTP: TOTP 계산 (Week06 p.18 "비밀값 + 현재 시각(30초 단위)을 해시해 6자리").
 * 정확히는 RFC 6238(TOTP) = HMAC-SHA1(비밀값, 30초 단위 시각 칸) → 6자리.
 * 계산은 브라우저 기본 암호 기능(Web Crypto)으로 이 컴퓨터 안에서만 한다.
 */

/** 시각을 30초 단위로 자른다 */
export const TOTP_STEP_S = 30
export const TOTP_DIGITS = 6

/** RFC 6238 부록 B의 공식 시험 값: 비밀값 "12345678901234567890", 시각 59초 → 94287082 (끝 6자리 287082) */
export const RFC_EXAMPLE = { secret: '12345678901234567890', time: 59, code: '287082' } as const

/** 지금이 몇 번째 30초 칸인가 */
export const timeStep = (unixSeconds: number) => Math.floor(unixSeconds / TOTP_STEP_S)
/** 지금 칸이 끝나기까지 남은 초 (1~30) */
export const secondsLeft = (unixSeconds: number) => TOTP_STEP_S - (Math.floor(unixSeconds) % TOTP_STEP_S)

/** HOTP (RFC 4226): HMAC-SHA1(비밀값, 칸 번호) → 동적 잘라내기 → digits자리 */
export async function hotp(secret: Uint8Array<ArrayBuffer>, counter: number, digits = TOTP_DIGITS): Promise<string> {
  const msg = new Uint8Array(8)
  let c = counter
  for (let i = 7; i >= 0; i--) {
    msg[i] = c & 0xff
    c = Math.floor(c / 256)
  }
  const key = await globalThis.crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const mac = new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', key, msg))
  const off = mac[mac.length - 1] & 0x0f
  const bin = ((mac[off] & 0x7f) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3]
  return String(bin % 10 ** digits).padStart(digits, '0')
}

/** TOTP: 비밀값(문자열)과 시각(유닉스 초)으로 6자리 */
export function totp(secret: string, unixSeconds: number, digits = TOTP_DIGITS): Promise<string> {
  return hotp(new TextEncoder().encode(secret), timeStep(unixSeconds), digits)
}
