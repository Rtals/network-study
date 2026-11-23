import { describe, expect, it } from 'vitest'
import { INU_CERT, isWithinValidity, nameMatches } from './certificate'

describe('인증서 검사 (6-5)', () => {
  it('p.11 예시: 유효 기간 2026-03-01 ~ 2027-03-31', () => {
    expect(INU_CERT.notBefore).toBe('2026-03-01')
    expect(INU_CERT.notAfter).toBe('2027-03-31')
    // p.26 JWT 예시의 시각(2026-11-11)에도 유효하다
    expect(isWithinValidity(INU_CERT, '2026-11-11')).toBe(true)
  })

  it('기간 밖이면 실패 — PC 시계가 틀려도 여기서 실패한다', () => {
    expect(isWithinValidity(INU_CERT, '2026-02-28')).toBe(false)
    expect(isWithinValidity(INU_CERT, '2027-04-01')).toBe(false)
    expect(isWithinValidity(INU_CERT, '2026-03-01')).toBe(true)
    expect(isWithinValidity(INU_CERT, '2027-03-31')).toBe(true)
  })

  it('이름(SAN)이 주소창 도메인과 같아야 한다 (www 누락도 실패)', () => {
    expect(nameMatches(INU_CERT, 'www.inu.ac.kr')).toBe(true)
    expect(nameMatches(INU_CERT, 'WWW.INU.AC.KR')).toBe(true)
    expect(nameMatches(INU_CERT, 'inu.ac.kr')).toBe(false)
    expect(nameMatches(INU_CERT, 'inu-login.example')).toBe(false)
  })

  it('와일드카드 *.inu.ac.kr은 한 단계 하위 도메인만', () => {
    const wild = { san: ['*.inu.ac.kr'] }
    expect(nameMatches(wild, 'portal.inu.ac.kr')).toBe(true)
    expect(nameMatches(wild, 'a.b.inu.ac.kr')).toBe(false)
    expect(nameMatches(wild, 'inu.ac.kr')).toBe(false)
  })
})
