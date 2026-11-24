/// <reference types="node" />
import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  decodePart,
  DEMO_SECRET,
  encodePart,
  expToKst,
  LECTURE_HEADER,
  LECTURE_HEADER_B64,
  LECTURE_PAYLOAD,
  LECTURE_PAYLOAD_B64,
  signHS256,
  verifyHS256,
} from './jwt'

const NOW = 1794380400 - 600 // 만료 10분 전

describe('JWT (6-14)', () => {
  it('p.26 예시: 앞 두 덩어리는 강의자료와 같은 Base64URL, 디코딩하면 그대로 읽힌다', () => {
    expect(encodePart(LECTURE_HEADER)).toBe(LECTURE_HEADER_B64)
    expect(encodePart(LECTURE_PAYLOAD)).toBe(LECTURE_PAYLOAD_B64)
    expect(JSON.parse(decodePart(LECTURE_PAYLOAD_B64))).toEqual(LECTURE_PAYLOAD)
  })

  it('exp 1794380400 = 2026-11-11 16:00 (KST)', () => {
    expect(expToKst(1794380400)).toBe('2026-11-11 16:00 (KST)')
  })

  it('HS256 서명은 Node crypto의 HMAC-SHA256과 같다', async () => {
    const token = await signHS256(LECTURE_PAYLOAD)
    const [h, p, s] = token.split('.')
    const node = createHmac('sha256', DEMO_SECRET).update(`${h}.${p}`).digest('base64url')
    expect(s).toBe(node)
  })

  it('그대로면 통과, payload를 고치면 invalid token, exp가 지나면 token expired', async () => {
    const token = await signHS256(LECTURE_PAYLOAD)
    expect((await verifyHS256(token, NOW)).ok).toBe(true)
    const [h, , s] = token.split('.')
    const forged = `${h}.${encodePart({ ...LECTURE_PAYLOAD, role: 'professor' })}.${s}`
    expect(await verifyHS256(forged, NOW)).toMatchObject({ ok: false, status: 401, reason: 'invalid token' })
    expect(await verifyHS256(token, 1794380400 + 1)).toMatchObject({ ok: false, reason: 'token expired' })
    expect(await verifyHS256('a.b', NOW)).toMatchObject({ ok: false, reason: 'invalid format' })
  })

  it('다른 비밀키로 서명한 토큰은 통과하지 못한다', async () => {
    const other = await signHS256(LECTURE_PAYLOAD, 'other-secret')
    expect(await verifyHS256(other, NOW)).toMatchObject({ ok: false, reason: 'invalid token' })
  })
})
