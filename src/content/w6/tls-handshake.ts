import { connectionCost, formatMs } from '../../lib/handshake'
import type { ActorState, SeqActor, SeqLogEntry, SeqMessage, SequenceState } from '../../scenes/sequence/types'
import type { Step } from '../types'

// 출처: Week06 PDF p.13 (TLS 1.3 Handshake · SNI · 1-RTT), p.14 (비밀 대화방 · 물감 섞기 비유)
// 패널 글은 배경과 흐름이 보이게 풀어 쓴다. 강의자료에 없는 설명은 // 보충

const ACTORS: SeqActor[] = [
  { id: 'client', label: '브라우저', device: 'pc' },
  { id: 'server', label: '서버', device: 'server' },
]

const S = {
  tcp: { label: 'TCP ESTABLISHED' },
  key: { label: '세션 키 계산 (ECDHE)', tone: 'state' },
  chain: { label: '체인 검증 ✓', tone: 'success' },
  owner: { label: '진짜 주인 확인 ✓', tone: 'success' },
  secure: { label: '암호화 통신', tone: 'success' },
  closed: { label: 'CLOSED' },
  listen: { label: 'LISTEN' },
} satisfies Record<string, ActorState>

// ── TLS 1.3 메시지 (p.13의 ①~⑤) ───────────────────────────
const CLIENT_HELLO: SeqMessage = {
  id: 'clientHello',
  from: 'client',
  to: 'server',
  label: 'ClientHello',
  fields: [{ text: '지원 암호 목록' }, { text: 'key_share' }, { text: 'SNI' }],
  note: '지원하는 암호 목록, 내 임시 공개값(key_share), 받고 싶은 도메인(SNI)을 알린다.',
}
const SERVER_HELLO: SeqMessage = {
  id: 'serverHello',
  from: 'server',
  to: 'client',
  label: 'ServerHello',
  fields: [{ text: '선택한 암호' }, { text: 'key_share' }],
  effects: [
    { actor: 'server', state: S.key, at: 'send' },
    { actor: 'client', state: S.key, at: 'arrive' },
  ],
  note: '쓸 암호를 고르고 서버의 key_share를 보낸다. 양쪽이 같은 세션 키를 각자 계산한다.',
}
const CERTIFICATE: SeqMessage = {
  id: 'certificate',
  from: 'server',
  to: 'client',
  label: 'Certificate',
  fields: [{ text: '서버 인증서 체인 (암호화)' }],
  effects: [{ actor: 'client', state: S.chain }],
  note: '서버 인증서 체인. 브라우저가 6-5의 순서로 검증한다.',
}
const CERT_VERIFY: SeqMessage = {
  id: 'certVerify',
  from: 'server',
  to: 'client',
  label: 'CertificateVerify + Finished',
  fields: [{ text: '개인키로 대화 내용에 서명' }],
  effects: [{ actor: 'client', state: S.owner }],
  note: '서버 개인키로 지금까지의 대화에 서명해, 개인키를 가진 진짜 주인임을 증명한다.',
}
const CLIENT_FINISHED: SeqMessage = {
  id: 'clientFinished',
  from: 'client',
  to: 'server',
  label: 'Finished + GET /login',
  fields: [{ text: '세션 키 (AES-GCM)로 암호화' }],
  effects: [
    { actor: 'client', state: S.secure, at: 'send' },
    { actor: 'server', state: S.secure, at: 'arrive' },
  ],
  note: 'Finished와 함께 첫 HTTP 요청을 바로 보낸다. 이후 HTTP는 모두 암호화된다.',
}
const HTTP_RESPONSE: SeqMessage = {
  id: 'httpResponse',
  from: 'server',
  to: 'client',
  label: 'HTTP 응답',
  fields: [{ text: '암호화된 Application Data' }],
  note: '세션 키로 암호화된 HTTP 응답.',
}

// ── TCP 3-Way (3-4와 같은 메시지, 2 RTT 단계에서 이어 붙인다) ──
const TCP: SeqMessage[] = [
  { id: 'syn', from: 'client', to: 'server', label: 'SYN', fields: [{ text: 'TCP' }], note: 'TCP 연결 요청 (3-4).' },
  { id: 'synAck', from: 'server', to: 'client', label: 'SYN+ACK', fields: [{ text: 'TCP' }], note: 'TCP 응답 (3-4).' },
  {
    id: 'ack',
    from: 'client',
    to: 'server',
    label: 'ACK',
    fields: [{ text: 'TCP' }],
    effects: [
      { actor: 'client', state: S.tcp, at: 'send' },
      { actor: 'server', state: S.tcp, at: 'arrive' },
    ],
    note: 'TCP 연결 완료. 여기까지 1 RTT.',
  },
]

const logOf = (...ms: SeqMessage[]): SeqLogEntry[] => ms.map(({ from, to, label, fields, note }) => ({ from, to, label, fields, note }))
const scene = (s: Omit<SequenceState, 'kind' | 'actors'>): SequenceState => ({ kind: 'sequence', actors: ACTORS, ...s })

// p.11·p.13: 서울–도쿄 RTT 30ms, TCP 1 RTT + TLS 1.3 1 RTT
const EXAMPLE_RTT = 30
const TLS13 = connectionCost(EXAMPLE_RTT).find((c) => c.id === 'tls13')!

export const tlsHandshake: Step = {
  id: 'tls-handshake',
  no: '6-6',
  title: 'TLS 1.3 Handshake',
  slides: [13, 14],
  scene: 'sequence',
  star: true,
  easy: {
    title: 'TLS Handshake를 비밀 대화방 만들기로',
    body: '처음 보는 사이인데, 공개된 광장에서 둘만 아는 암호를 정하는 방법.\n\n① 인사 + 내 재료 공개: "안녕, 나는 이 암호들을 쓸 줄 알아. 내 물감 색은 \'노랑 + 비밀색\'이야" (ClientHello · key_share)\n② 답례 + 신분증 제시: "좋아, AES로 하자. 내 물감은 \'노랑 + 다른 비밀색\'. 그리고 이게 내 여권(인증서)이야" (ServerHello · Certificate)\n③ 진짜 주인임을 증명: "여권 사진 속 인물이 나라는 증거로, 방금 대화에 내 도장을 찍을게" (CertificateVerify)\n④ 같은 색 완성 → 대화 시작: 각자 상대 물감에 자기 비밀색을 섞으면 둘 다 똑같은 갈색이 된다 = 세션 키 (Finished · 암호화 통신)\n\n**물감 섞기 비유 (Diffie–Hellman)**: 섞기는 쉽지만, 섞인 색에서 원래 비밀색을 분리하기는 매우 어렵다. 광장의 구경꾼은 공개 물감만 보므로 최종 색을 만들 수 없다.\n\n**여권이 없다면?** 중간에 끼어든 사기꾼과 물감을 섞어도 \'대화방\'은 만들어진다. 상대가 진짜 은행인지는 인증서·서명(②·③)으로만 알 수 있다.',
  },
  phases: [
    {
      label: 'TCP 다음',
      title: 'HTTPS는 TCP 위에서 한 번 더 악수한다',
      // 보충: 3-4·6-2·6-3·6-5와 잇는 문장
      body: '3-4에서 본 TCP 3-Way Handshake로 연결은 열렸다. 하지만 아직은 엽서(6-2) 상태다. HTTPS는 그 위에서 **TLS Handshake**를 한 번 더 한다.\n\n목표는 두 가지다.\n① 둘만 아는 **세션 키**에 합의하기 (6-3)\n② 상대가 **진짜 서버**인지 확인하기 (6-5)',
      state: scene({
        states: { client: S.tcp, server: S.tcp },
        messages: [],
        log: [],
        notes: [{ text: 'TCP 연결 위에서 TLS Handshake를 시작한다' }],
      }),
    },
    {
      label: 'Hello',
      title: 'ClientHello: 내가 쓸 수 있는 암호와 내 키 재료',
      body: '클라이언트가 먼저 인사한다. 여기에는 세 가지가 들어 있다.\n· 지원하는 암호 목록\n· **key_share**: 키 교환용 내 임시 공개값\n· **SNI**: 하나의 IP에 여러 도메인이 있을 때 "www.inu.ac.kr 인증서 주세요"라고 알려 주는 값',
      // 보충: (→ 6-7) 다음 Step과 잇기
      keyPoint: 'SNI는 ClientHello에 담긴다. 그래서 도메인 이름은 일부 노출된다(→ 6-7).',
      state: scene({
        states: { client: S.tcp, server: S.tcp },
        messages: [CLIENT_HELLO],
        log: [],
        notes: [{ text: '암호 목록 + 내 키 재료(key_share) + 도메인(SNI)', after: 'clientHello' }],
      }),
    },
    {
      label: '키 합의',
      title: 'ServerHello: 같은 세션 키를 각자 계산한다',
      body: '서버는 쓸 암호를 고르고 자기 key_share를 보낸다. 이제 양쪽은 상대의 key_share와 자기 비밀값을 섞어 **같은 세션 키**를 각자 계산한다(ECDHE).\n\n세션 키 자체는 네트워크로 한 번도 오가지 않는다. 이 순간부터 나머지 대화는 **암호화**된다.',
      state: scene({
        states: { client: S.tcp, server: S.tcp },
        messages: [SERVER_HELLO],
        log: logOf(CLIENT_HELLO),
        notes: [{ text: '양쪽이 같은 세션 키를 각자 계산 → 여기부터 암호화', after: 'serverHello' }],
      }),
    },
    {
      label: '인증서·서명',
      title: '인증서를 보이고, 개인키로 진짜 주인임을 증명한다',
      body: '· **Certificate**: 서버가 인증서 체인을 보내면, 브라우저가 6-5의 순서로 검증해 진짜 서버인지 확인한다\n· **CertificateVerify**: 서버가 **자기 개인키로 지금까지의 대화 내용에 서명**한다. 인증서 속 공개키로 이 서명이 검증되면, 인증서를 훔쳐 온 사람이 아니라 개인키를 가진 진짜 주인이라는 뜻이다',
      pitfall: '암호화만으로는 부족하다. **누구와** 암호화했는지가 중요하다. 그래서 인증서 경고를 무시하고 [계속 진행]을 누르면 안 된다.',
      state: scene({
        states: { client: S.key, server: S.key },
        messages: [CERTIFICATE, CERT_VERIFY],
        log: logOf(CLIENT_HELLO, SERVER_HELLO),
        notes: [
          { text: '인증서 체인 검증 → 진짜 서버인가?', after: 'certificate' },
          { text: '개인키 서명 검증 → 그 인증서의 진짜 주인인가?', after: 'certVerify' },
        ],
      }),
    },
    {
      label: '1-RTT',
      title: '1-RTT 만에 암호화 통신 시작',
      body: '클라이언트가 Finished를 보내면서 **첫 HTTP 요청을 바로 붙여** 보낸다. 이후 HTTP 메시지는 모두 세션 키(AES-GCM)로 암호화된다.\n\nTLS 1.3은 키 합의와 서버 인증을 **왕복 한 번(1-RTT)**에 끝낸다. TLS 1.2는 2-RTT였다.',
      state: scene({
        states: { client: S.owner, server: S.key },
        messages: [CLIENT_FINISHED, HTTP_RESPONSE],
        log: logOf(CLIENT_HELLO, SERVER_HELLO, CERTIFICATE, CERT_VERIFY),
        rttLoop: 'TLS 1 RTT',
        notes: [{ text: '키 합의 + 서버 인증을 1-RTT에 끝내고 암호화 통신', after: 'httpResponse' }],
      }),
    },
    {
      label: '2 RTT',
      title: 'HTTPS 첫 연결이 느린 이유',
      body: `Week 3의 TCP 1-RTT와 TLS 1-RTT가 지나야 첫 HTTP 요청이 나간다. 그래서 HTTPS의 **첫 연결은 ${TLS13.totalRtt} RTT**를 기다린다.\n\n서울–도쿄 RTT가 ${EXAMPLE_RTT}ms라면 ${formatMs(TLS13.ms)}다(3-4 연결 비용 계산과 같은 값).`,
      state: scene({
        states: { client: S.closed, server: S.listen },
        messages: [...TCP, { ...CLIENT_HELLO, id: 'ch2' }, { ...SERVER_HELLO, id: 'sh2', label: 'ServerHello … Finished' }, { ...CLIENT_FINISHED, id: 'cf2' }],
        log: [],
        notes: [
          { text: 'TCP 1 RTT', after: 'ack' },
          { text: `+ TLS 1 RTT = ${TLS13.totalRtt} RTT 뒤에 첫 HTTP 요청`, after: 'cf2' },
        ],
      }),
    },
  ],
  quiz: [
    {
      q: 'HTTPS로 처음 접속할 때, 첫 HTTP 요청이 나가기까지 몇 RTT가 걸리는가? 각각 무엇을 하는 시간인가?',
      answer:
        '2 RTT다. 첫 1 RTT는 TCP 3-Way Handshake로 연결을 여는 시간이고, 다음 1 RTT는 TLS 1.3 Handshake로 세션 키에 합의하고(key_share, ECDHE) 서버 인증서·서명을 확인하는 시간이다. 클라이언트는 Finished와 함께 첫 HTTP 요청을 보낸다.',
      why: 'p.13: TLS 1.2는 2-RTT, TLS 1.3은 1-RTT. Week 3의 TCP 1-RTT + TLS 1-RTT가 지나야 첫 HTTP 요청이 나간다. (Quick Check 문항이 아니라 이 Step의 확인 문제)',
    },
  ],
}
