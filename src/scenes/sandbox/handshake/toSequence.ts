import { formatMs, type HandshakeKind, type HandshakeSimResult } from '../../../lib/handshake'
import type { SeqActor, SeqEffect, SeqMessage, SequenceState } from '../../sequence/types'

export const HANDSHAKE_ACTORS: SeqActor[] = [
  { id: 'client', label: '클라이언트', device: 'pc' },
  { id: 'server', label: '서버', device: 'server' },
]

export const KIND_LABEL: Record<HandshakeKind, string> = { syn: 'SYN', synAck: 'SYN+ACK', ack: 'ACK' }

// p.10의 표기
export const KIND_FIELDS: Record<HandshakeKind, string[]> = {
  syn: ['seq = x', 'SYN=1'],
  synAck: ['seq = y', 'ack = x+1'],
  ack: ['seq = x+1', 'ack = y+1'],
}

/** 시뮬레이션 결과 → 한 연결선 위를 차례로 오가는 메시지 */
export function toHandshakeSequence(result: HandshakeSimResult): SequenceState {
  const seen = { synSent: false, serverRcvd: false, clientEst: false, serverEst: false }
  let pendingWait: SeqMessage['waitBefore']

  const messages: SeqMessage[] = result.transmissions.map((t, i) => {
    const effects: SeqEffect[] = []
    if (t.kind === 'syn' && !seen.synSent) {
      seen.synSent = true
      effects.push({ actor: 'client', state: { label: 'SYN_SENT' }, at: 'send' })
    }
    if (!t.lost) {
      if (t.kind === 'syn' && !seen.serverRcvd) {
        seen.serverRcvd = true
        effects.push({ actor: 'server', state: { label: 'SYN_RCVD' } })
      }
      if (t.kind === 'synAck' && !seen.clientEst) {
        seen.clientEst = true
        effects.push({ actor: 'client', state: { label: 'ESTABLISHED', tone: 'success' } })
      }
      if (t.kind === 'ack' && !seen.serverEst) {
        seen.serverEst = true
        effects.push({ actor: 'server', state: { label: 'ESTABLISHED', tone: 'success' } })
      }
    }
    const msg: SeqMessage = {
      id: `t${i}`,
      from: t.from,
      to: t.from === 'client' ? 'server' : 'client',
      label: KIND_LABEL[t.kind] + (t.retransmit ? ' 재전송' : ''),
      fields: KIND_FIELDS[t.kind].map((text) => ({ text })),
      fate: t.lost ? 'lost' : 'delivered',
      waitBefore: pendingWait,
      effects,
    }
    pendingWait = t.lost && t.waitAfter ? { who: t.waitAfter.who, label: `RTO ${formatMs(t.waitAfter.ms)}` } : undefined
    return msg
  })

  return {
    kind: 'sequence',
    actors: HANDSHAKE_ACTORS,
    states: { client: { label: 'CLOSED' }, server: { label: 'LISTEN' } },
    messages,
    // 마지막 손실 뒤의 대기가 끝나면 연결 포기
    tail:
      result.outcome === 'timeout' && pendingWait
        ? { wait: pendingWait, effects: [{ actor: 'client', state: { label: 'Connection timed out', tone: 'error' } }] }
        : undefined,
  }
}
