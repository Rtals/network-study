import { describe, expect, it } from 'vitest'
import { connectionCost, formatMs, simulateHandshake } from './handshake'

describe('connectionCost (W3 p.11)', () => {
  const byId = Object.fromEntries(connectionCost(30).map((r) => [r.id, r]))

  it('강의자료 예시: 서울–도쿄 30ms면 TCP only는 30ms', () => {
    expect(byId.tcp.totalRtt).toBe(1)
    expect(byId.tcp.ms).toBe(30)
  })
  it('TLS 1.3은 2 RTT, TLS 1.2는 3 RTT', () => {
    expect(byId.tls13.totalRtt).toBe(2)
    expect(byId.tls13.ms).toBe(60)
    expect(byId.tls12.totalRtt).toBe(3)
    expect(byId.tls12.ms).toBe(90)
  })
  it('QUIC은 전송+암호를 합쳐 1 RTT', () => {
    expect(byId.quic.totalRtt).toBe(1)
    expect(byId.quic.combined).toBe(true)
  })
})

describe('formatMs', () => {
  it('1초 미만은 ms', () => expect(formatMs(30)).toBe('30ms'))
  it('1초 이상은 s', () => {
    expect(formatMs(1000)).toBe('1s')
    expect(formatMs(1500)).toBe('1.5s')
    expect(formatMs(31000)).toBe('31s')
  })
})

describe('simulateHandshake', () => {
  it('손실이 없으면 Client는 1 RTT 만에 ESTABLISHED (p.10)', () => {
    const r = simulateHandshake({ rttMs: 30 })
    expect(r.outcome).toBe('established')
    expect(r.transmissions.map((t) => t.kind)).toEqual(['syn', 'synAck', 'ack'])
    expect(r.clientEstablishedAt).toBe(30)
    expect(r.serverEstablishedAt).toBe(45)
  })

  it('SYN이 한 번 손실되면 RTO 1s 후 재전송', () => {
    const r = simulateHandshake({ rttMs: 30, loseFirst: { syn: true } })
    expect(r.transmissions.map((t) => [t.kind, t.lost, t.retransmit])).toEqual([
      ['syn', true, false],
      ['syn', false, true],
      ['synAck', false, false],
      ['ack', false, false],
    ])
    expect(r.transmissions[0].waitAfter).toEqual({ who: 'client', ms: 1000 })
    expect(r.clientEstablishedAt).toBe(1030)
  })

  it('SYN+ACK가 손실되면 Client가 RTO 후 SYN을 다시 보낸다', () => {
    const r = simulateHandshake({ rttMs: 100, loseFirst: { synAck: true } })
    expect(r.transmissions.map((t) => t.kind)).toEqual(['syn', 'synAck', 'syn', 'synAck', 'ack'])
    expect(r.clientEstablishedAt).toBe(1100)
  })

  it('ACK가 손실되면 Client는 이미 ESTABLISHED, Server는 SYN+ACK를 다시 보낸다', () => {
    const r = simulateHandshake({ rttMs: 100, loseFirst: { ack: true } })
    expect(r.transmissions.map((t) => [t.kind, t.from, t.retransmit])).toEqual([
      ['syn', 'client', false],
      ['synAck', 'server', false],
      ['ack', 'client', false],
      ['synAck', 'server', true],
      ['ack', 'client', true],
    ])
    expect(r.clientEstablishedAt).toBe(100)
    // SYN 도착 50ms + Server RTO 1000ms + 편도 50ms ×2
    expect(r.serverEstablishedAt).toBe(1150)
  })

  it('SYN이 계속 막히면 1×·2×·4×·8× 백오프 후 Connection timed out (p.19, p.36)', () => {
    const r = simulateHandshake({ rttMs: 30, blockSyn: true })
    expect(r.outcome).toBe('timeout')
    expect(r.transmissions).toHaveLength(5)
    expect(r.transmissions.every((t) => t.kind === 'syn' && t.lost)).toBe(true)
    expect(r.transmissions.map((t) => t.waitAfter?.ms)).toEqual([1000, 2000, 4000, 8000, 16000])
    expect(r.totalMs).toBe(31000)
    expect(r.events.at(-1)?.text).toContain('Connection timed out')
  })
})
