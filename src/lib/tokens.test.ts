import { describe, expect, it } from 'vitest'
import { fmtDuration, fmtMin, simulateTokens, sub } from './tokens'

describe('Access + Refresh Token (6-16, p.30)', () => {
  it('15분마다 Access가 만료되고, Refresh로 재발급하며 계속 쓴다', () => {
    const { events, blockedAt } = simulateTokens({ accessMin: 15, durationMin: 60 })
    const refreshes = events.filter((e) => e.kind === 'refresh')
    expect(refreshes.map((e) => e.at)).toEqual([15, 30, 45, 60])
    expect(events.filter((e) => e.kind === 'expired')).toHaveLength(4)
    expect(blockedAt).toBeUndefined()
    expect(refreshes[0].text).toContain('RT₁ 폐기')
    expect(simulateTokens({ accessMin: 15, durationMin: 60 }).segments.map((g) => [g.n, g.from, g.to])).toEqual([
      [1, 0, 15],
      [2, 15, 30],
      [3, 30, 45],
      [4, 45, 60],
      [5, 60, 60],
    ])
  })

  it('로그아웃(RT 삭제) 뒤에도 남은 Access는 만료까지 쓰이고, 그다음 재발급이 막힌다 (15분 안에 끊김)', () => {
    const r = simulateTokens({ accessMin: 15, durationMin: 60, logoutAt: 20 })
    // 15분에 재발급된 AT₂는 30분까지 유효 → 로그아웃 뒤 10분 더
    expect(r.graceAfterLogout).toBe(10)
    expect(r.blockedAt).toBe(30)
    expect(r.segments.at(-1)).toMatchObject({ n: 2, from: 15, to: 30 })
    expect(r.graceAfterLogout!).toBeLessThanOrEqual(15)
  })

  it('Access 수명이 1일이면 로그아웃해도 하루 가까이 그대로 쓰인다', () => {
    const r = simulateTokens({ accessMin: 1440, durationMin: 60, logoutAt: 20 })
    expect(r.graceAfterLogout).toBe(1420)
    expect(r.blockedAt).toBeUndefined()
  })

  it('표기', () => {
    expect(sub(12)).toBe('₁₂')
    expect([fmtMin(15), fmtMin(60), fmtMin(1440)]).toEqual(['15분', '1시간', '1일'])
    expect([fmtDuration(10), fmtDuration(1420), fmtDuration(0), fmtDuration(1500)]).toEqual(['10분', '23시간 40분', '0분', '1일 1시간'])
  })
})
