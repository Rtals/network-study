import { describe, expect, it } from 'vitest'
import { handshake } from '../../content/w3/handshake'
import { simulateHandshake } from '../../lib/handshake'
import { toHandshakeSequence } from '../sandbox/handshake/toSequence'
import { MAX_ZOOM_OUT } from '../iso/camera'
import { cameraBox, endpoints, layoutActors, overviewBox, VIEW_W } from './layout'
import { activeActors, buildBeats, finalStep, noteVisible, statesAt, stepDelay, timelineMs, GAP_MS, LEAD_MS, READ_MS, TRAVEL_MS, WAIT_MS } from './timeline'
import { exchangeRows } from './exchange'
import { isSequenceState, type SequenceState } from './types'

const states = handshake.phases.map((p) => p.state).filter(isSequenceState)
const phase = (i: number) => handshake.phases[i].state as SequenceState

describe('3-4 장면 데이터', () => {
  it('sequence Phase는 7개 (8번째는 chart)', () => expect(states).toHaveLength(7))

  it('앞으로 올 메시지는 미리 넣지 않는다: Phase마다 이번에 오가는 메시지만', () => {
    expect(phase(0).messages).toHaveLength(0)
    expect(phase(1).messages.map((m) => m.label)).toEqual(['SYN'])
    expect(phase(2).messages.map((m) => m.label)).toEqual(['SYN+ACK'])
    expect(phase(3).messages.map((m) => m.label)).toEqual(['ACK'])
  })
})

describe('타임라인', () => {
  it('SYN 한 번: 출발 순간 Client는 SYN_SENT', () => {
    const st = phase(1)
    const beats = buildBeats(st)
    expect(statesAt(st, beats, 0).client.label).toBe('CLOSED')
    expect(statesAt(st, beats, 1).client.label).toBe('SYN_SENT') // 출발 (send)
    expect(statesAt(st, beats, finalStep(beats)).server.label).toBe('LISTEN')
  })

  it('ACK: Client는 보낼 때, Server는 받을 때 ESTABLISHED', () => {
    const st = phase(3)
    const beats = buildBeats(st)
    expect(statesAt(st, beats, 1)).toMatchObject({ client: { label: 'ESTABLISHED' }, server: { label: 'SYN_RCVD' } })
    expect(statesAt(st, beats, 2)).toMatchObject({ client: { label: 'ESTABLISHED' }, server: { label: 'ESTABLISHED' } })
  })

  it('재생 시간 = 시작 전 쉼 + 이동 + 비트 사이 쉼 + 설명 읽을 시간', () => {
    // Phase 2: SYN 하나, 도착 뒤 설명 상자 → 읽을 시간
    expect(timelineMs(phase(1))).toBe(LEAD_MS + TRAVEL_MS + READ_MS)
    // Phase 6: SYN+ACK 뒤, ACK 뒤에 설명 상자
    expect(timelineMs(phase(5))).toBe(LEAD_MS + TRAVEL_MS * 3 + GAP_MS * 2 + READ_MS * 2)
  })

  it('설명 상자가 붙은 메시지 다음에는 읽을 시간만큼 쉬었다가 다음 메시지를 보낸다', () => {
    const beats = buildBeats(phase(5))
    expect(stepDelay(beats, 2)).toBe(GAP_MS) // SYN 뒤: 설명 없음
    expect(stepDelay(beats, 4)).toBe(GAP_MS + READ_MS) // SYN+ACK 뒤: 분홍 설명
    const sevenBeats = buildBeats(phase(6))
    expect(stepDelay(sevenBeats, 2)).toBe(GAP_MS + READ_MS) // 옛 SYN 뒤: 설명
    expect(stepDelay(sevenBeats, 4)).toBe(GAP_MS) // SYN+ACK 뒤: 설명 없음
  })

  it('직접 해보기: SYN 계속 손실이면 대기 4번 + 마지막 대기 뒤 Connection timed out', () => {
    const st = toHandshakeSequence(simulateHandshake({ rttMs: 30, blockSyn: true }))
    const beats = buildBeats(st)
    expect(beats.filter((b) => b.kind === 'travel')).toHaveLength(5)
    expect(beats.filter((b) => b.kind === 'wait').map((b) => (b.kind === 'wait' ? b.label : ''))).toEqual([
      'RTO 1s',
      'RTO 2s',
      'RTO 4s',
      'RTO 8s',
      'RTO 16s',
    ])
    expect(statesAt(st, beats, finalStep(beats)).client).toEqual({ label: 'Connection timed out', tone: 'error' })
    expect(timelineMs(st)).toBeGreaterThan(5 * TRAVEL_MS + 5 * WAIT_MS)
  })
})

describe('배치와 카메라', () => {
  const actors = layoutActors(phase(0).actors)

  it('클라이언트에서 서버로 가는 패킷은 앞으로(+x), 응답은 뒤로', () => {
    const go = endpoints(actors, phase(1).messages[0])
    const back = endpoints(actors, phase(2).messages[0])
    expect(go.forward).toBe(true)
    expect(back.forward).toBe(false)
    expect(go.startT).toBeLessThan(go.endT)
    expect(back.startT).toBeGreaterThan(back.endT)
  })

  it('과거의 SYN은 연결선 중간에서 나타난다', () => {
    const stale = phase(6).messages[0]
    const e = endpoints(actors, stale)
    const normal = endpoints(actors, { ...stale, stale: false })
    expect(e.startT).toBeGreaterThan(normal.startT)
    expect(e.startT).toBeLessThan(e.endT)
  })

  it('카메라 상자는 무대 비율(16:10)이고 배율은 고정 (확대하지 않는다)', () => {
    for (const st of states) {
      const beats = buildBeats(st)
      for (let s = 0; s <= finalStep(beats); s++) {
        const c = cameraBox(st, activeActors(beats, s))
        expect(c.w).toBe(VIEW_W)
        expect(c.w / c.h).toBeCloseTo(1.6, 5)
      }
    }
  })

  it('기기 2대는 한 화면에 다 들어오고, 카메라는 그 가운데를 비춘다', () => {
    const o = overviewBox(phase(0))
    expect(o.w).toBeLessThanOrEqual(VIEW_W)
    const c = cameraBox(phase(1), ['client', 'server'])
    expect(c.x + c.w / 2).toBeCloseTo(o.x + o.w / 2, 5)
    expect(c.y + c.h / 2).toBeCloseTo(o.y + o.h / 2, 5)
  })

  const many = (n: number): SequenceState => ({
    ...phase(0),
    actors: Array.from({ length: n }, (_, i) => ({ id: `d${i}`, label: `D${i}`, device: i === 0 ? 'pc' : 'server' })),
  })

  it('기기가 많아지면 카메라를 살짝 축소해 모두 담는다 (최대 MAX_ZOOM_OUT배)', () => {
    const st = many(4)
    const o = overviewBox(st)
    expect(o.w).toBeGreaterThan(VIEW_W)
    const c = cameraBox(st, ['d0', 'd1'])
    expect(c.w).toBeCloseTo(Math.min(o.w, VIEW_W * MAX_ZOOM_OUT), 5)
  })

  it('축소해도 넘치면 지금 주고받는 기기 쪽으로 옮기되, 장면 밖으로 나가지 않는다', () => {
    const st = many(8)
    const o = overviewBox(st)
    expect(o.w).toBeGreaterThan(VIEW_W * MAX_ZOOM_OUT)
    const first = cameraBox(st, ['d0', 'd1'])
    const lastPair = cameraBox(st, ['d6', 'd7'])
    expect(first.w).toBe(VIEW_W * MAX_ZOOM_OUT)
    expect(first.x).toBeCloseTo(o.x, 5)
    expect(lastPair.x + lastPair.w).toBeCloseTo(o.x + o.w, 5)
  })

  it('activeActors: 진행 중이거나 막 끝난 메시지의 양 끝', () => {
    const beats = buildBeats(phase(2))
    expect(activeActors(beats, 0)).toEqual(['server', 'client'])
    expect(activeActors(beats, finalStep(beats))).toEqual(['server', 'client'])
  })
})

describe('배치 방향', () => {
  it('기기는 화면 왼쪽 아래 → 오른쪽 위로 놓인다', () => {
    const [client, server] = layoutActors(phase(0).actors)
    expect(server.focus.x).toBeGreaterThan(client.focus.x)
    expect(server.focus.y).toBeLessThan(client.focus.y)
  })
})

describe('무대 설명 상자', () => {
  it('after 메시지가 도착한 뒤에 나타난다', () => {
    const st = phase(5)
    const beats = buildBeats(st)
    const [a, b] = st.notes!
    // 비트 0: SYN, 1: SYN+ACK, 2: ACK
    expect(noteVisible(beats, 2, a.after)).toBe(false) // SYN만 도착
    expect(noteVisible(beats, 4, a.after)).toBe(true) // SYN+ACK 도착
    expect(noteVisible(beats, 4, b.after)).toBe(false)
    expect(noteVisible(beats, finalStep(beats), b.after)).toBe(true)
    expect(noteVisible(beats, 0, undefined)).toBe(true)
  })

  it('설명 상자의 after는 그 Phase에 있는 메시지를 가리킨다', () => {
    for (const st of states)
      for (const n of st.notes ?? []) if (n.after) expect(st.messages.map((m) => m.id)).toContain(n.after)
  })
})

describe('주고받은 메시지 (오른쪽 패널)', () => {
  it('이전 기록 + 이번 메시지 순서, 방향 구분', () => {
    const rows = exchangeRows(phase(3))
    expect(rows.map((r) => [r.label, r.forward, r.current])).toEqual([
      ['SYN', true, false],
      ['SYN+ACK', false, false],
      ['ACK', true, true],
    ])
    expect(rows[0].from).toBe('클라이언트')
  })

  it('3-4의 모든 메시지에 뜻풀이가 있다', () => {
    for (const st of states) for (const r of exchangeRows(st)) expect(r.note, r.label).toBeTruthy()
  })
})

describe('6-6 TLS 1.3 Handshake 장면', () => {
  it('6개 Phase가 모두 sequence이고, 설명 칩 after는 그 Phase의 메시지, 메시지마다 뜻풀이가 있다', async () => {
    const { tlsHandshake } = await import('../../content/w6/tls-handshake')
    const sts = tlsHandshake.phases.map((p) => p.state as SequenceState)
    expect(sts).toHaveLength(6)
    for (const st of sts) {
      expect(isSequenceState(st)).toBe(true)
      const ids = st.messages.map((m) => m.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const n of st.notes ?? []) if (n.after) expect(ids).toContain(n.after)
      for (const r of exchangeRows(st)) expect(r.note, r.label).toBeTruthy()
    }
  })

  it('키 합의가 끝나면 양쪽 모두 세션 키 계산, 첫 HTTP를 보내면 암호화 통신', async () => {
    const { tlsHandshake } = await import('../../content/w6/tls-handshake')
    const hello = tlsHandshake.phases[2].state as SequenceState
    const b1 = buildBeats(hello)
    expect(statesAt(hello, b1, finalStep(b1))).toMatchObject({ client: { label: '세션 키 계산 (ECDHE)' }, server: { label: '세션 키 계산 (ECDHE)' } })
    const fin = tlsHandshake.phases[4].state as SequenceState
    const b2 = buildBeats(fin)
    expect(statesAt(fin, b2, finalStep(b2))).toMatchObject({ client: { label: '암호화 통신' }, server: { label: '암호화 통신' } })
  })

  it('2 RTT 단계: TCP 3개 + TLS 3개, 본문의 2 RTT·60ms는 connectionCost(30)과 같다', async () => {
    const { tlsHandshake } = await import('../../content/w6/tls-handshake')
    const st = tlsHandshake.phases[5].state as SequenceState
    expect(st.messages.map((m) => m.label.split(' ')[0])).toEqual(['SYN', 'SYN+ACK', 'ACK', 'ClientHello', 'ServerHello', 'Finished'])
    expect(tlsHandshake.phases[5].body).toContain('2 RTT')
    expect(tlsHandshake.phases[5].body).toContain('60ms')
  })
})
