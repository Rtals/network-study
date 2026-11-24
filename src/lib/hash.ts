/**
 * 6-4 해시와 전자서명 · 6-10 비밀번호 저장에서 쓰는 해시 계산.
 * SHA-256은 브라우저 기본 암호 기능(Web Crypto)으로 이 컴퓨터 안에서만 계산한다 (어디로도 보내지 않음).
 */

/**
 * 강의자료 p.10의 예시 입력과 그 실제 SHA-256 값.
 * 강의자료에 적힌 9b1f3c…e42a / 57d0aa…19c3은 설명용 값이라 실제 결과와 다르다. 화면에는 실제 값을 쓴다.
 * (hash.test.ts에서 Node crypto로 다시 계산해 맞는지 확인한다)
 */
export const HASH_EXAMPLES = {
  inu1234: '5c6d613d659a57e81d36575afea3265bbbfab6687cbfcadae11310d3a907d380',
  inu1235: '3dc7d82287f356ace3a2f4c482e3dcde55a1d44e89c7ddb8967b25c969375e77',
} as const

/** SHA-256 결과의 길이: 256비트 = 16진수 64자리 */
export const SHA256_BITS = 256
export const SHA256_HEX_LENGTH = SHA256_BITS / 4

/** 문자열(UTF-8)의 SHA-256을 16진수 소문자로 */
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** 긴 해시를 앞뒤만 남겨 줄인다: 5c6d613d…a907d380 */
export const shortHex = (hex: string, n = 8) => (hex.length <= n * 2 ? hex : `${hex.slice(0, n)}…${hex.slice(-n)}`)

/** 16진수 한 자리씩 다른지 (같은 길이의 두 해시) */
export function hexDiffMask(a: string, b: string): boolean[] {
  const len = Math.max(a.length, b.length)
  return Array.from({ length: len }, (_, i) => a[i] !== b[i])
}

/** 두 해시에서 서로 다른 비트 수 (눈사태 효과를 숫자로 보기) */
export function bitDifference(a: string, b: string): number {
  if (a.length !== b.length) throw new Error('같은 길이의 해시끼리만 비교할 수 있다')
  let count = 0
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16)
    while (x) {
      count += x & 1
      x >>= 1
    }
  }
  return count
}

// ───────────────────────── 6-10 비밀번호 저장 ─────────────────────────

/** p.20 표의 Salt 예시 (Salt는 비밀이 아니며 해시와 함께 저장된다) */
export const SALT_EXAMPLES = { kim: 'Qx9', lee: 'Lm2p' } as const

/**
 * Salt + 비밀번호의 실제 SHA-256 (강의자료 p.20의 3e7a… / c81d… 는 설명용 값).
 * hash.test.ts에서 다시 계산해 맞는지 확인한다.
 */
export const SALTED_EXAMPLES = {
  kim: '5cc5c53c27024300e9e7e1fcb8eb787cb90b086fd4d45a598aaca86370360f12',
  lee: '91d4495691a7738e9642a344afb35c754030e09163bacdbfe7afa5d3a062cf7c',
} as const

/** Salt를 앞에 붙여 SHA-256 (빠른 해시 + Salt) */
export const saltedSha256Hex = (salt: string, password: string) => sha256Hex(salt + password)

/** 무작위 Salt (16진수) */
export function randomSalt(bytes = 4): string {
  const a = new Uint8Array(bytes)
  globalThis.crypto.getRandomValues(a)
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 일부러 느린 해시: PBKDF2-SHA256 (Salt + 여러 번 반복).
 * 브라우저 기본 암호 기능에는 Argon2id가 없어서, 같은 원리의 PBKDF2로 실제 계산한다 (직접 해보기용).
 */
export async function pbkdf2Hex(password: string, salt: string, iterations: number): Promise<string> {
  const enc = new TextEncoder()
  const key = await globalThis.crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await globalThis.crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations }, key, 256)
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const SECONDS_PER_YEAR = 365 * 24 * 60 * 60

/** 한 번 대입에 perGuessSec초 걸릴 때 guesses번 대입하는 데 걸리는 해 (p.19: 0.1초 × 10억 = 3년) */
export const crackYears = (perGuessSec: number, guesses: number) => (perGuessSec * guesses) / SECONDS_PER_YEAR
