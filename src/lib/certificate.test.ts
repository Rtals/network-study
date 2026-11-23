import { describe, expect, it } from 'vitest'
import { CERT_ERROR_INFO, diagnoseConnection, INU_CERT, isWithinValidity, nameMatches, OK_CONNECTION } from './certificate'

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

describe('인증서 경고 판정 (6-7, p.15)', () => {
  it('정상 접속이면 경고 없음', () => {
    expect(diagnoseConnection(OK_CONNECTION)).toEqual([])
  })
  it('PC 시계가 만료일 다음이면 DATE_INVALID, www 누락이면 COMMON_NAME_INVALID', () => {
    expect(diagnoseConnection({ ...OK_CONNECTION, today: '2027-04-01' })).toEqual(['NET::ERR_CERT_DATE_INVALID'])
    expect(diagnoseConnection({ ...OK_CONNECTION, host: 'inu.ac.kr' })).toEqual(['NET::ERR_CERT_COMMON_NAME_INVALID'])
  })
  it('체인 누락이면 AUTHORITY_INVALID, http 리소스면 Mixed Content', () => {
    expect(diagnoseConnection({ ...OK_CONNECTION, chainComplete: false })).toEqual(['NET::ERR_CERT_AUTHORITY_INVALID'])
    expect(diagnoseConnection({ ...OK_CONNECTION, loadsHttpResource: true })).toEqual(['Mixed Content 차단'])
  })
  it('경고마다 원인과 조치가 있다', () => {
    for (const info of Object.values(CERT_ERROR_INFO)) expect(info.cause && info.fix).toBeTruthy()
  })
})
