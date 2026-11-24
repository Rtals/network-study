import { describe, expect, it } from 'vitest'
import { evaluateCookie, RECOMMENDED, setCookieHeader } from './cookie'

describe('Cookie 보안 속성 (6-13, p.24)', () => {
  it('HttpOnly는 XSS 탈취, Secure는 도청, SameSite는 CSRF를 막는다', () => {
    const none = evaluateCookie({ httpOnly: false, secure: true, sameSite: 'None' })
    expect(none.result).toMatchObject({ xss: true, sniff: false, csrf: true })
    expect(evaluateCookie({ httpOnly: true, secure: false, sameSite: 'Lax' }).result).toMatchObject({ xss: false, sniff: true, csrf: false })
  })

  it('Lax는 다른 사이트 링크 클릭(GET)엔 쿠키를 보내고, Strict는 보내지 않는다', () => {
    expect(evaluateCookie({ ...RECOMMENDED, sameSite: 'Lax' }).result.link).toBe(true)
    expect(evaluateCookie({ ...RECOMMENDED, sameSite: 'Strict' }).result.link).toBe(false)
  })

  it('권장 조합(HttpOnly · Secure · SameSite=Lax)이면 XSS·도청·CSRF 모두 막힌다', () => {
    expect(evaluateCookie(RECOMMENDED).result).toMatchObject({ xss: false, sniff: false, csrf: false })
  })

  it('SameSite=None인데 Secure가 없으면 브라우저가 쿠키를 거부한다', () => {
    expect(evaluateCookie({ httpOnly: true, secure: false, sameSite: 'None' }).rejected).toBe(true)
  })

  it('p.24 예시 Set-Cookie', () => {
    expect(setCookieHeader(RECOMMENDED)).toBe('sid=a91f3c…; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600')
  })
})
