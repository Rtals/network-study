import { connectionCost, formatMs } from '../../lib/handshake'
import type { IsoBarsState } from '../../scenes/chart/types'
import { HANDSHAKE_ACTORS } from '../../scenes/sandbox/handshake/toSequence'
import type { ActorState, SeqLogEntry, SeqMessage, SequenceState } from '../../scenes/sequence/types'
import type { Step } from '../types'

// 출처: Week03 PDF p.8 (TCP vs UDP), p.9 (연결 = 양쪽의 상태), p.10 (3-Way Handshake),
//       p.11 (왜 3번인가, 연결 수립 비용), p.12 (순서번호는 바이트를 센다)
// 직접 해보기: p.19 (RTO·지수 백오프), p.36 (Connection timed out)
// 패널 글은 강의자료를 그대로 옮기지 않고, 배경과 흐름이 보이게 풀어 쓴다. 강의자료에 없는 설명은 // 보충

/** p.10의 Client / Server 상태 */
const S = {
  closed: { label: 'CLOSED' },
  synSent: { label: 'SYN_SENT' },
  listen: { label: 'LISTEN' },
  synRcvd: { label: 'SYN_RCVD' },
  established: { label: 'ESTABLISHED', tone: 'success' },
} satisfies Record<string, ActorState>

/** p.10 다이어그램의 메시지. 한 연결선 위를 오간다 */
const SYN: SeqMessage = {
  id: 'syn',
  from: 'client',
  to: 'server',
  label: 'SYN',
  fields: [{ text: 'seq = x' }, { text: 'SYN=1' }],
  effects: [{ actor: 'client', state: S.synSent, at: 'send' }],
  note: 'Client의 시작 번호 x를 알리며 연결을 요청한다.',
}
const SYN_ACK: SeqMessage = {
  id: 'synAck',
  from: 'server',
  to: 'client',
  label: 'SYN+ACK',
  fields: [{ text: 'seq = y' }, { text: 'ack = x+1' }],
  effects: [{ actor: 'server', state: S.synRcvd, at: 'send' }],
  note: 'x를 받았다고 확인하고(ack = x+1), Server의 시작 번호 y를 알린다.',
}
const ACK: SeqMessage = {
  id: 'ack',
  from: 'client',
  to: 'server',
  label: 'ACK',
  fields: [{ text: 'seq = x+1' }, { text: 'ack = y+1' }],
  effects: [
    { actor: 'client', state: S.established, at: 'send' },
    { actor: 'server', state: S.established, at: 'arrive' },
  ],
  note: 'y를 받았다고 확인한다(ack = y+1). 이제 양쪽 모두 ESTABLISHED.',
}
const DATA: SeqMessage = {
  id: 'data',
  from: 'client',
  to: 'server',
  label: '데이터',
  fields: [{ text: 'seq = x+1 부터 payload' }],
  note: '맞춰 둔 번호에 이어 x+1번 바이트부터 실제 데이터를 보낸다.',
}

const logOf = (...ms: SeqMessage[]): SeqLogEntry[] => ms.map(({ from, to, label, fields, note }) => ({ from, to, label, fields, note }))

function phaseState(partial: Omit<SequenceState, 'kind' | 'actors'>): SequenceState {
  return { kind: 'sequence', actors: HANDSHAKE_ACTORS, ...partial }
}

// p.11 "서울–도쿄 30ms면 30ms"
const EXAMPLE_RTT = 30
const costBars: IsoBarsState = {
  kind: 'isoBars',
  title: `RTT ${EXAMPLE_RTT}ms 기준 연결 수립 비용`,
  bars: connectionCost(EXAMPLE_RTT).map((c) => ({
    id: c.id,
    label: c.label,
    value: `${c.totalRtt} RTT · ${formatMs(c.ms)}`,
    note: c.note,
    segments: c.combined
      ? [{ protocol: 'udp', value: c.totalRtt }]
      : [
          { protocol: 'tcp', value: c.transportRtt },
          ...(c.cryptoRtt ? [{ protocol: 'tls' as const, value: c.cryptoRtt }] : []),
        ],
  })),
  legend: [
    { protocol: 'tcp', label: 'TCP 핸드셰이크' },
    { protocol: 'tls', label: 'TLS 암호화 협상' },
    { protocol: 'udp', label: 'QUIC (전송+암호)' },
  ],
}

export const handshake: Step = {
  id: 'handshake',
  no: '3-4',
  title: '3-Way Handshake',
  slides: [8, 9, 10, 11, 12, 19, 36],
  scene: 'sequence',
  star: true,
  sandbox: true,
  // 보충: 전화 통화 비유
  easy: {
    title: '전화 통화로 생각하기',
    body: '전화를 걸면 바로 용건부터 말하지 않는다.\n\n나: "여보세요, 내 말 들려?" (SYN)\n상대: "응 잘 들려. 너도 내 말 들려?" (SYN+ACK)\n나: "응 잘 들려." (ACK)\n\n이 세 마디가 끝나야 양쪽 모두 "내 말이 상대에게 가고, 상대 말도 나에게 온다"는 걸 안다. 두 마디에서 끊으면, 상대는 자기 목소리가 나에게 들렸는지 모른 채 말을 시작해야 한다.\n\nTCP는 "들려?" 대신 시작 순서번호를 주고받는다. 그 번호가 이후 모든 데이터의 순서와 누락을 확인하는 기준이 된다.',
  },
  // 패널 글: 한 화면에 들어오게 짧게. 첫 문장은 앞 단계와 잇고, 끝 문장은 다음 단계로 넘긴다 (내용 흐름)
  // 무대 notes: 그림 옆에서 지금 일어난 일을 한 줄로
  phases: [
    {
      label: '준비',
      title: '왜 연결부터 만들까?',
      // 보충: IP가 전달을 보장하지 않는다는 배경 (p.8 TCP vs UDP의 신뢰성 항목에서 출발)
      body: 'IP는 패킷을 상대까지 옮길 뿐, 사라지거나 순서가 바뀌어도 책임지지 않는다. TCP는 그 위에서 **빠짐없이, 순서대로** 전달을 약속한다.\n\n그러려면 양쪽이 같은 **순서번호** 기준을 가져야 한다. 그래서 데이터보다 먼저 서로의 시작 번호를 주고받는다. 이것이 **3-Way Handshake**다.',
      keyPoint: '지금 Client는 CLOSED(연결 없음), Server는 LISTEN(접속 대기). 메시지는 SYN → SYN+ACK → ACK, 3개.',
      pitfall: '연결은 전선이 이어지는 게 아니다. 양쪽 OS 메모리에 상태(순서번호·타이머·버퍼)가 생기는 것이다.',
      state: phaseState({
        states: { client: S.closed, server: S.listen },
        messages: [],
        log: [],
        notes: [{ text: '데이터를 보내기 전에, 시작 번호부터 맞춘다' }],
      }),
    },
    {
      label: 'SYN',
      title: 'SYN: "연결하자. 내 번호는 x부터야"',
      // 보충: SYN = synchronize
      body: '먼저 Client가 말을 건다. **SYN**(synchronize, 동기화) 세그먼트에 자기 **시작 번호 x**를 담아 보낸다. 데이터는 아직 없다.\n\n보낸 Client는 **SYN_SENT**(답 기다리는 중)가 된다. 이제 Server가 답할 차례다.',
      keyPoint: 'x는 0이 아닌 난수(ISN)다. 예전 연결의 늦은 패킷과 겹치지 않고, 공격자가 번호를 맞히기 어렵게 하려는 것.',
      state: phaseState({
        states: { client: S.closed, server: S.listen },
        messages: [SYN],
        log: [],
        notes: [{ text: 'Client: "나는 x번부터 셀게"', after: 'syn' }],
      }),
    },
    {
      label: 'SYN+ACK',
      title: 'SYN+ACK: "잘 받았어. 내 번호는 y부터야"',
      // 보충: 두 답을 한 세그먼트에 합쳐서 4번이 아니라 3번이 된다는 설명
      body: 'SYN을 받은 Server는 답 두 개를 **한 세그먼트에** 담는다.\n① ACK: x 잘 받았다 → ack = x+1\n② SYN: 내 시작 번호는 y → seq = y\n\n둘을 합쳐서 메시지가 4개가 아니라 **3개**가 된다. Server는 **SYN_RCVD**가 되어 마지막 확인을 기다린다.',
      keyPoint: 'ACK 번호 = 다음에 받고 싶은 번호. SYN도 번호 1개를 쓰므로 x+1이다.',
      state: phaseState({
        states: { client: S.synSent, server: S.listen },
        messages: [SYN_ACK],
        log: logOf(SYN),
        notes: [{ text: 'Server: "x 받았어(ack = x+1), 나는 y부터"', after: 'synAck' }],
      }),
    },
    {
      label: 'ACK',
      title: 'ACK: "너의 y도 받았어" → 연결 완료',
      body: '마지막으로 Client가 y도 잘 받았다고 답한다(ack = y+1). Client는 보내는 순간, Server는 받는 순간 **ESTABLISHED**가 된다.\n\nClient는 SYN을 보내고 SYN+ACK가 오기까지 **왕복 한 번(1 RTT)**을 기다린 셈이다. 이제 데이터를 보낼 수 있다.',
      keyPoint: 'RTT = 갔다가 답이 돌아오는 시간. 새 연결마다 최소 1 RTT가 든다.',
      state: phaseState({
        states: { client: S.synSent, server: S.synRcvd },
        messages: [ACK],
        log: logOf(SYN, SYN_ACK),
        rttLoop: '1 RTT',
        notes: [{ text: 'Client: "y 받았어(ack = y+1)" → 양쪽 모두 연결됨', after: 'ack' }],
      }),
    },
    {
      label: '데이터',
      title: '이제 진짜 데이터를 보낸다',
      body: '연결이 열리면 **seq = x+1**부터 데이터를 보낸다. 이후 번호는 보낸 바이트 수만큼 늘고, 받는 쪽은 번호로 순서를 맞추고 빠진 곳을 다시 요청한다.\n\n즉 핸드셰이크에서 맞춘 번호가 TCP 신뢰성(**번호 + 확인 + 재전송**)의 출발점이다. 그런데 왜 꼭 3번이어야 할까?',
      keyPoint: 'SYN이 번호 1개를 썼으므로 첫 데이터 바이트는 x+1이다.',
      state: phaseState({
        states: { client: S.established, server: S.established },
        messages: [DATA],
        log: logOf(SYN, SYN_ACK, ACK),
        notes: [{ text: '첫 데이터는 x+1번 바이트부터', after: 'data' }],
      }),
    },
    {
      label: '왜 3번?',
      title: '왜 2번으로는 안 될까 ① 양방향 확인',
      body: '통신은 **양방향**이라 번호도 두 개(x, y)다. 번호마다 "보냄"과 "받았음 확인"이 짝을 이뤄야 한다.\n· x → SYN+ACK의 ack = x+1로 확인\n· y → 마지막 ACK의 ack = y+1로 확인\n\n2개로 끝내면 **y를 확인해 주는 메시지가 없다**. 이유는 하나 더 있다.',
      keyPoint: '2번이면 Server는 자기 번호 y가 Client에 닿았는지 모른다.',
      state: phaseState({
        states: { client: S.closed, server: S.listen },
        messages: [
          { ...SYN, fields: [{ text: 'seq = x', tone: 'a' }, { text: 'SYN=1' }] },
          { ...SYN_ACK, fields: [{ text: 'seq = y', tone: 'b' }, { text: 'ack = x+1', tone: 'a' }] },
          { ...ACK, fields: [{ text: 'seq = x+1' }, { text: 'ack = y+1', tone: 'b' }] },
        ],
        log: [],
        notes: [
          { tone: 'a', text: 'Client의 x → ack = x+1로 확인', after: 'synAck' },
          { tone: 'b', text: 'Server의 y → ack = y+1로 확인', after: 'ack' },
        ],
      }),
    },
    {
      label: '옛 SYN',
      title: '왜 3번인가 ② 뒤늦게 도착한 옛 SYN',
      // 보충: Server가 옛 SYN을 구별할 수 없다는 점, 2번 방식이면 Server가 착각한다는 정리
      body: '길에서 지체됐던 **옛 SYN**이 뒤늦게 Server에 도착했다. Server는 구별할 수 없어 평소처럼 SYN+ACK로 답한다.\n\n하지만 Client는 요청한 적이 없으니 **마지막 ACK를 보내지 않고**, 연결은 성립하지 않는다. 2번 방식이었다면 Server는 이미 연결됐다고 착각했을 것이다.',
      keyPoint: '세 번째 ACK = "이 연결은 내가 원한 게 맞다"는 Client의 최종 확인.',
      state: phaseState({
        states: { client: S.closed, server: S.listen },
        messages: [
          {
            id: 'stale',
            from: 'client',
            to: 'server',
            label: 'SYN',
            fields: [{ text: 'seq = 옛 번호' }],
            stale: true,
            note: '예전에 보냈다가 네트워크에서 지체된 SYN이 이제야 도착했다.',
            effects: [{ actor: 'server', state: S.synRcvd }],
          },
          {
            id: 'staleReply',
            from: 'server',
            to: 'client',
            label: 'SYN+ACK',
            fields: [{ text: 'seq = y' }, { text: 'ack = 옛 번호+1' }],
            note: 'Server는 옛것인지 모르고 평소처럼 응답한다.',
            // 글 대신 ? 표시: Client는 이 요청을 모른다
            effects: [{ actor: 'client', state: { label: 'CLOSED', tone: 'note', icon: 'question' } }],
          },
          {
            id: 'noAck',
            from: 'client',
            to: 'server',
            label: 'ACK',
            fate: 'withheld',
            note: 'Client는 요청한 적 없는 연결이라 확인해 주지 않는다.',
            // 글 대신 ✕ 표시: ESTABLISHED로 넘어가지 못한다
            effects: [{ actor: 'server', state: { label: 'SYN_RCVD', tone: 'error', icon: 'cross' } }],
          },
        ],
        log: [],
        notes: [
          { text: 'Server는 옛 SYN인지 구별하지 못한다', after: 'stale' },
          { text: 'Client가 확인하지 않으니 연결 성립 안 됨', after: 'noAck' },
        ],
      }),
    },
    {
      label: '연결 비용',
      title: '연결 하나에 드는 시간',
      body: '핸드셰이크 동안은 데이터를 못 보내고 왕복을 기다린다.\n· TCP만: 1 RTT\n· TCP + TLS 1.3: 2 RTT\n· TCP + TLS 1.2: 3 RTT\n· QUIC: 1 RTT (재방문 0-RTT)\n\nRTT 30ms면 TLS 1.3까지 60ms를 빈손으로 기다린다. 그래서 연결을 재사용하는 **Keep-Alive·커넥션 풀**과 왕복을 줄인 **QUIC**가 나왔다.',
      signal:
        '"왜 우리 API 첫 호출만 유난히 느린가?" — 연결 수립 RTT가 매 요청마다 반복되고 있을 가능성이 크다. Keep-Alive와 커넥션 풀이 여기서 등장한다.',
      scene: 'chart',
      state: costBars,
    },
  ],
  quiz: [
    {
      q: '3-way handshake는 왜 3번인가? 2번으로는 무엇이 부족한가? (Quick Check Q1)',
      answer:
        '통신이 양방향이라 Client→Server, Server→Client 두 방향의 시작 순서번호가 각각 상대에게 확인되어야 한다. 2번으로는 Server의 시작 번호 y가 Client에게 도착했는지 Server가 확인할 수 없다. 또 마지막 ACK가 있어야, 뒤늦게 도착한 오래된 SYN 때문에 연결이 잘못 성립하는 것을 막을 수 있다.',
      why: 'p.11의 이유 ① 양방향 확인, ② 오래된 중복 SYN 차단. (강의자료 Quick Check에는 모범답안이 없어 이 근거로 작성)',
    },
  ],
}
