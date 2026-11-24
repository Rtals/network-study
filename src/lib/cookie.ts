/**
 * 6-13 Cookie 보안 속성 (Week06 p.24 표).
 * HttpOnly · Secure · SameSite 조합에 따라 각 공격이 통하는지 계산한다. (그림 위의 시뮬레이션용)
 */

export type SameSite = 'Strict' | 'Lax' | 'None'
export type CookieAttrs = { httpOnly: boolean; secure: boolean; sameSite: SameSite }

export type CookieAttack = 'xss' | 'sniff' | 'csrf' | 'link'

export const ATTACK_INFO: Record<CookieAttack, { label: string; guard: string }> = {
  xss: { label: 'XSS 쿠키 탈취', guard: 'HttpOnly' },
  sniff: { label: 'HTTP 도청', guard: 'Secure' },
  csrf: { label: 'CSRF 위조 POST', guard: 'SameSite' },
  link: { label: '다른 사이트 링크 클릭 (GET)', guard: 'SameSite=Strict' },
}

export type CookieOutcome = {
  /** SameSite=None인데 Secure가 없으면 브라우저가 쿠키를 받지 않는다 (p.24 "반드시 Secure와 함께") */
  rejected: boolean
  /** 공격자에게 유리한 일이 일어나는가 (link는 '쿠키가 붙어 간다'는 사실) */
  result: Record<CookieAttack, boolean>
}

export function evaluateCookie(a: CookieAttrs): CookieOutcome {
  const rejected = a.sameSite === 'None' && !a.secure
  if (rejected) return { rejected, result: { xss: false, sniff: false, csrf: false, link: false } }
  return {
    rejected,
    result: {
      xss: !a.httpOnly,
      sniff: !a.secure,
      csrf: a.sameSite === 'None',
      link: a.sameSite !== 'Strict',
    },
  }
}

/** p.24 권장 세션 쿠키 */
export const RECOMMENDED: CookieAttrs = { httpOnly: true, secure: true, sameSite: 'Lax' }

/** Set-Cookie 한 줄로 */
export const setCookieHeader = (a: CookieAttrs, maxAge = 3600) =>
  ['sid=a91f3c…', a.httpOnly && 'HttpOnly', a.secure && 'Secure', `SameSite=${a.sameSite}`, 'Path=/', `Max-Age=${maxAge}`].filter(Boolean).join('; ')
