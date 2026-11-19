/**
 * 3-Way Handshake 계산 (W3 p.10–11, p.19, p.36).
 * 장면과 오른쪽 패널의 숫자는 모두 이 파일의 순수 함수로 만든다.
 */

export type Side = 'client' | 'server'
export type HandshakeKind = 'syn' | 'synAck' | 'ack'

// 보충: 첫 SYN에는 RTT 측정값이 없으므로 RFC 6298의 초기 RTO 1초를 쓴다 (강의자료에는 공식만 있음, p.19)
export const INITIAL_RTO_MS = 1000
// 보충: 강의자료는 "1× → 2× → 4× → 8× … 연결 포기"(p.19). 시뮬레이션은 재전송 4회 후 포기로 단순화한다
export const MAX_SYN_RETRIES = 4

/** 10–999 → "30ms", 1000 이상 → "1s", "1.5s" */
export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  const s = Math.round(ms / 100) / 10
  return `${s}s`
}

// ───────────────────────── 연결 수립 비용 (p.11) ─────────────────────────

export type CostRow = {
  id: 'tcp' | 'tls13' | 'tls12' | 'quic'
  label: string
  /** 전송 계층 연결 수립 RTT */
  transportRtt: number
  /** 암호화 협상으로 추가되는 RTT */
  cryptoRtt: number
  /** 전송+암호 협상을 합친 경우 (QUIC) */
  combined: boolean
  totalRtt: number
  ms: number
  note?: string
}

export function connectionCost(rttMs: number): CostRow[] {
  const rows: Omit<CostRow, 'totalRtt' | 'ms'>[] = [
    { id: 'tcp', label: 'TCP only', transportRtt: 1, cryptoRtt: 0, combined: false },
    { id: 'tls13', label: 'TCP + TLS 1.3', transportRtt: 1, cryptoRtt: 1, combined: false },
    { id: 'tls12', label: 'TCP + TLS 1.2', transportRtt: 1, cryptoRtt: 2, combined: false },
    { id: 'quic', label: 'QUIC (UDP)', transportRtt: 1, cryptoRtt: 0, combined: true, note: '재방문 시 0-RTT' },
  ]
  return rows.map((r) => {
    const totalRtt = r.transportRtt + r.cryptoRtt
    return { ...r, totalRtt, ms: totalRtt * rttMs }
  })
}

// ───────────────────────── 직접 해보기 시뮬레이션 ─────────────────────────

export type Transmission = {
  kind: HandshakeKind
  from: Side
  sendAt: number
  lost: boolean
  /** 타이머 만료로 다시 보낸 것 */
  retransmit: boolean
  /** 이 전송이 손실되어 생긴 대기 (누가, 얼마나) */
  waitAfter?: { who: Side; ms: number }
}

export type SimEvent = {
  at: number
  text: string
  tone: 'ok' | 'loss' | 'wait' | 'fail' | 'done'
}

export type HandshakeSimResult = {
  outcome: 'established' | 'timeout'
  transmissions: Transmission[]
  events: SimEvent[]
  /** Client가 ESTABLISHED가 된 시각 (연결 수립 시간) */
  clientEstablishedAt?: number
  serverEstablishedAt?: number
  /** 마지막 사건까지 걸린 시간 */
  totalMs: number
}

export type HandshakeSimOptions = {
  rttMs: number
  /** 해당 메시지의 첫 전송만 손실 */
  loseFirst?: Partial<Record<HandshakeKind, boolean>>
  /** SYN이 매번 손실 (방화벽 차단) → Connection timed out */
  blockSyn?: boolean
  initialRtoMs?: number
  maxRetries?: number
}

export function simulateHandshake(opts: HandshakeSimOptions): HandshakeSimResult {
  const {
    rttMs,
    loseFirst = {},
    blockSyn = false,
    initialRtoMs = INITIAL_RTO_MS,
    maxRetries = MAX_SYN_RETRIES,
  } = opts
  const oneWay = rttMs / 2
  const transmissions: Transmission[] = []
  const events: SimEvent[] = []
  const lostOnce: Record<HandshakeKind, boolean> = { syn: false, synAck: false, ack: false }

  const shouldLose = (kind: HandshakeKind) => {
    if (kind === 'syn' && blockSyn) return true
    if (loseFirst[kind] && !lostOnce[kind]) {
      lostOnce[kind] = true
      return true
    }
    return false
  }

  let t = 0
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // 지수 백오프: 1× → 2× → 4× → 8× RTO (p.19)
    const rto = initialRtoMs * 2 ** attempt
    const isLastAttempt = attempt === maxRetries

    // ① SYN
    const synLost = shouldLose('syn')
    const syn: Transmission = { kind: 'syn', from: 'client', sendAt: t, lost: synLost, retransmit: attempt > 0 }
    transmissions.push(syn)
    events.push({ at: t, text: attempt > 0 ? 'SYN 재전송' : 'SYN 전송', tone: 'ok' })

    if (synLost) {
      syn.waitAfter = { who: 'client', ms: rto }
      events.push({ at: t + oneWay, text: 'SYN 손실', tone: 'loss' })
      events.push({ at: t, text: `응답 없음 → RTO ${formatMs(rto)} 대기`, tone: 'wait' })
      t += rto
      if (isLastAttempt) {
        // "SYN에 대한 응답이 아예 없다" (p.36)
        events.push({ at: t, text: '연결 포기 → Connection timed out', tone: 'fail' })
        return { outcome: 'timeout', transmissions, events, totalMs: t }
      }
      continue
    }

    // ② SYN+ACK — Server는 SYN을 받은 시각에 응답한다
    const serverRecv = t + oneWay
    const synAckLost = shouldLose('synAck')
    const synAck: Transmission = { kind: 'synAck', from: 'server', sendAt: serverRecv, lost: synAckLost, retransmit: false }
    transmissions.push(synAck)
    events.push({ at: serverRecv, text: 'SYN 도착 → SYN+ACK 전송', tone: 'ok' })

    if (synAckLost) {
      // 보충: Client 입장에서는 SYN에 대한 응답이 없으므로 RTO 후 SYN을 다시 보낸다
      synAck.waitAfter = { who: 'client', ms: rto }
      events.push({ at: serverRecv + oneWay, text: 'SYN+ACK 손실', tone: 'loss' })
      events.push({ at: t, text: `응답 없음 → RTO ${formatMs(rto)} 대기`, tone: 'wait' })
      t += rto
      if (isLastAttempt) {
        events.push({ at: t, text: '연결 포기 → Connection timed out', tone: 'fail' })
        return { outcome: 'timeout', transmissions, events, totalMs: t }
      }
      continue
    }

    // ③ ACK — Client는 SYN+ACK를 받으면 ESTABLISHED
    const clientEst = serverRecv + oneWay
    const ackLost = shouldLose('ack')
    const ack: Transmission = { kind: 'ack', from: 'client', sendAt: clientEst, lost: ackLost, retransmit: false }
    transmissions.push(ack)
    events.push({ at: clientEst, text: 'SYN+ACK 도착 → ACK 전송 · Client ESTABLISHED', tone: 'done' })

    if (!ackLost) {
      const serverEst = clientEst + oneWay
      events.push({ at: serverEst, text: 'ACK 도착 · Server ESTABLISHED', tone: 'done' })
      return {
        outcome: 'established',
        transmissions,
        events,
        clientEstablishedAt: clientEst,
        serverEstablishedAt: serverEst,
        totalMs: serverEst,
      }
    }

    // 보충: ACK가 손실되면 Server는 SYN_RCVD에 머물다 자기 타이머가 만료되면 SYN+ACK를 다시 보낸다
    ack.waitAfter = { who: 'server', ms: initialRtoMs }
    events.push({ at: clientEst + oneWay, text: 'ACK 손실 (Server는 SYN_RCVD)', tone: 'loss' })
    events.push({ at: serverRecv, text: `Server RTO ${formatMs(initialRtoMs)} 대기`, tone: 'wait' })
    const resendAt = serverRecv + initialRtoMs
    transmissions.push({ kind: 'synAck', from: 'server', sendAt: resendAt, lost: false, retransmit: true })
    events.push({ at: resendAt, text: 'SYN+ACK 재전송', tone: 'ok' })
    const reAckAt = resendAt + oneWay
    transmissions.push({ kind: 'ack', from: 'client', sendAt: reAckAt, lost: false, retransmit: true })
    events.push({ at: reAckAt, text: 'ACK 재전송', tone: 'ok' })
    const serverEst = reAckAt + oneWay
    events.push({ at: serverEst, text: 'ACK 도착 · Server ESTABLISHED', tone: 'done' })
    return {
      outcome: 'established',
      transmissions,
      events,
      clientEstablishedAt: clientEst,
      serverEstablishedAt: serverEst,
      totalMs: serverEst,
    }
  }

  // maxRetries < 0 같은 잘못된 입력
  return { outcome: 'timeout', transmissions, events, totalMs: t }
}
