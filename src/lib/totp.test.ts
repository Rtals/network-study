import { describe, expect, it } from 'vitest'
import { RFC_EXAMPLE, secondsLeft, timeStep, totp } from './totp'

describe('TOTP (6-9, RFC 6238)', () => {
  it('RFC 6238 부록 B 시험 값과 같다', async () => {
    expect(await totp(RFC_EXAMPLE.secret, 59, 8)).toBe('94287082')
    expect(await totp(RFC_EXAMPLE.secret, 1111111109, 8)).toBe('07081804')
    expect(await totp(RFC_EXAMPLE.secret, 1234567890, 8)).toBe('89005924')
    expect(await totp(RFC_EXAMPLE.secret, RFC_EXAMPLE.time)).toBe(RFC_EXAMPLE.code)
  })

  it('같은 30초 칸이면 같은 코드, 칸이 바뀌면 다른 코드', async () => {
    expect(await totp('k', 60)).toBe(await totp('k', 89))
    expect(await totp('k', 89)).not.toBe(await totp('k', 90))
  })

  it('30초 칸 번호와 남은 시간', () => {
    expect(timeStep(59)).toBe(1)
    expect(timeStep(60)).toBe(2)
    expect(secondsLeft(60)).toBe(30)
    expect(secondsLeft(89)).toBe(1)
  })
})
