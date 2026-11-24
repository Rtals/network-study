import { describe, expect, it } from 'vitest'
import { AUTH_CARDS, authorize, cardById } from './authz'

describe('인증과 인가 판정 (6-8)', () => {
  it('인증 실패는 401에서 멈추고, 인가 실패는 403에서 멈춘다', () => {
    expect(authorize(cardById('no-token').req)).toMatchObject({ status: 401, stop: 'authn' })
    expect(authorize(cardById('expired').req)).toMatchObject({ status: 401, stop: 'authn' })
    expect(authorize(cardById('other-read').req)).toMatchObject({ status: 403, stop: 'authz' })
    expect(authorize(cardById('student-write').req)).toMatchObject({ status: 403, stop: 'authz' })
  })

  it('교수는 입력 가능, 학생은 자기 성적만 조회 가능 (p.16 예)', () => {
    expect(authorize(cardById('prof-write').req)).toMatchObject({ status: 200, stop: 'handler' })
    expect(authorize(cardById('own-read').req)).toMatchObject({ status: 200, stop: 'handler' })
  })

  it('토큰이 없으면 role이 무엇이든 인가까지 가지 않는다 (인증이 먼저)', () => {
    expect(authorize({ ...cardById('prof-write').req, token: 'none' }).status).toBe(401)
  })

  it('카드 6장, id는 겹치지 않는다', () => {
    expect(AUTH_CARDS).toHaveLength(6)
    expect(new Set(AUTH_CARDS.map((c) => c.id)).size).toBe(6)
  })
})
