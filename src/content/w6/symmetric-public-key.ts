import type { TopoBeat, TopoLink, TopoNode, TopoTag, TopologyState } from '../../scenes/topology/types'
import type { Step } from '../types'

// 출처: Week06 PDF p.8 (대칭키와 공개키 · TLS의 하이브리드 전략 · Forward Secrecy),
//       p.9 (공개키를 '열린 자물쇠'로 이해하기 · 남은 문제)
// 패널 글은 배경과 흐름이 보이게 풀어 쓴다. 강의자료에 없는 설명은 // 보충

const GAP = 320
const NODES: TopoNode[] = [
  { id: 'client', label: '클라이언트', sub: '나', kind: 'browser', t: 0 },
  { id: 'net', label: '네트워크', sub: '공개된 길', kind: 'network', t: GAP },
  { id: 'server', label: '서버', sub: '은행', kind: 'server', t: GAP * 2 },
]
const THIEF: TopoNode = { id: 'thief', label: '도둑', sub: '엿보는 사람', kind: 'attacker', t: GAP, side: 300 }
const LINKS: TopoLink[] = [
  { from: 'client', to: 'net' },
  { from: 'net', to: 'server' },
]
const THIEF_LINK: TopoLink = { from: 'net', to: 'thief', style: 'danger', both: true }

const TO_SERVER = ['client', 'net', 'server']
const TO_CLIENT = ['server', 'net', 'client']
const tags = (id: string, ...list: TopoTag[]): TopoBeat => ({ kind: 'tags', id, tags: list })
const copy = (id: string, detail: string, label = '복사'): TopoBeat => ({
  kind: 'flow',
  id,
  path: ['net', 'thief'],
  label,
  detail,
  tone: 'danger',
})

const scene = (withThief: boolean, s: Omit<TopologyState, 'kind' | 'nodes' | 'links'>): TopologyState => ({
  kind: 'topology',
  nodes: withThief ? [...NODES, THIEF] : NODES,
  links: withThief ? [...LINKS, THIEF_LINK] : LINKS,
  ...s,
})

/** ③에서 서버가 갖게 된 열쇠 한 쌍 (④에서 이어받는다) */
const KEY_PAIR: TopoTag[] = [
  { node: 'server', text: '공개키 = 열린 자물쇠', tone: 'term' },
  { node: 'server', text: '개인키 = 금고 속 열쇠', tone: 'term' },
]

export const symmetricPublicKey: Step = {
  id: 'symmetric-public-key',
  no: '6-3',
  title: '대칭키와 공개키',
  slides: [8, 9],
  scene: 'topology',
  easy: {
    title: '공개키는 열린 자물쇠',
    body: '누구나 잠글 수 있지만, 열쇠를 가진 사람만 열 수 있다.\n\n· 서버(은행)는 **열린 자물쇠**(공개키)를 수천 개 만들어 누구에게나 나눠 주고, **열쇠**(개인키)는 금고에 보관한다.\n· 네트워크(공개된 길)에서는 누구나 상자를 볼 수 있지만, 자물쇠가 잠겨 있어 열 수 없다. 도둑: "열쇠가 없네…"\n· 클라이언트(나)는 받은 자물쇠로 상자를 잠근다. 상자 안에는 **세션 키**(비밀 쪽지)가 있다. 잠근 나도 다시 못 연다!\n\n비유와 실제 기술\n· 열린 자물쇠 = 공개키: 공개돼도 안전. 잠그기(암호화)·서명 검증만 가능\n· 자물쇠의 열쇠 = 개인키: 유출되면 끝. 서버의 key.pem 파일, 절대 Git에 올리지 않음\n· 상자 속 쪽지 = 세션 키: 이후 대화는 이 대칭키로 빠르게 암호화\n· 자물쇠가 진짜 은행 것인가? = 인증서: 가짜 자물쇠를 나눠 주는 사기꾼을 막는 장치',
  },
  phases: [
    {
      label: '대칭키',
      title: '대칭키: 같은 열쇠 하나로 잠그고 연다',
      body: '대칭키 암호는 잠글 때와 열 때 **같은 열쇠**를 쓴다(AES, ChaCha20). 매우 빨라서 실제 데이터를 암호화하는 데 쓴다.\n\n그런데 양쪽이 같은 열쇠를 가지려면, 먼저 열쇠를 건네야 한다.',
      state: scene(false, {
        beats: [
          tags('key-c', { node: 'client', text: '열쇠 K', tone: 'term' }),
          tags('key-s', { node: 'server', text: '열쇠 K', tone: 'term' }),
          { kind: 'flow', id: 'data', path: TO_SERVER, label: 'K로 잠근 데이터', detail: 'AES', tone: 'request' },
          { kind: 'flow', id: 'reply', path: TO_CLIENT, label: 'K로 잠근 응답', detail: 'AES', tone: 'response' },
          tags('fast', { node: 'net', text: '빠르다 → 실제 데이터 암호화', tone: 'info' }),
        ],
        notes: [{ text: '같은 열쇠 하나: 빠르지만, 먼저 열쇠를 건네야 한다', after: 'fast' }],
      }),
    },
    {
      label: '열쇠 전달',
      title: '처음 만난 상대에게 열쇠를 어떻게 건네나',
      body: '처음 만난 상대에게 열쇠를 보내면, 보내는 **그 순간** 도청당할 수 있다. 열쇠를 빼앗기면 이후의 암호문은 모두 풀린다.\n\n대칭키만으로는 **열쇠를 안전하게 나눌 방법이 없다.**',
      state: scene(true, {
        tags: [{ node: 'client', text: '열쇠 K', tone: 'term' }],
        beats: [
          { kind: 'flow', id: 'send-key', path: TO_SERVER, label: '열쇠 K', detail: '처음 건네는 중', tone: 'request' },
          copy('copy-key', '열쇠 K'),
          tags('stolen-key', { node: 'thief', text: '열쇠 K 손에 넣음', tone: 'threat' }),
          { kind: 'flow', id: 'data', path: TO_SERVER, label: 'K로 잠근 데이터', detail: 'AES', tone: 'request' },
          copy('copy-data', 'K로 잠근 데이터'),
          tags('read-all', { node: 'thief', text: '데이터도 다 풀어 봄', tone: 'threat' }),
        ],
        notes: [{ text: '열쇠를 보내는 순간 도청당하면 끝', after: 'read-all' }],
      }),
    },
    {
      label: '공개키',
      title: '공개키: 누구나 잠글 수 있는 열린 자물쇠',
      body: '공개키 암호는 열쇠가 **한 쌍**이다(RSA, ECDSA, X25519). 공개키는 모두에게 나눠 주고, 개인키는 나만 보관한다.\n\n서버는 열린 자물쇠(공개키)를 수천 개 만들어 누구에게나 나눠 주고, 열쇠(개인키)는 금고에 둔다. 자물쇠는 **공개돼도 안전**하다.',
      state: scene(true, {
        beats: [
          tags('pair', ...KEY_PAIR),
          { kind: 'flow', id: 'lock', path: TO_CLIENT, label: '열린 자물쇠', detail: '공개키', tone: 'response' },
          copy('copy-lock', '공개키'),
          tags('only-lock', { node: 'thief', text: '자물쇠만 있음 → 안전', tone: 'defense' }),
        ],
        notes: [{ text: '공개키는 공개돼도 안전하다', after: 'only-lock' }],
      }),
    },
    {
      label: '잠가 보내기',
      title: '공개키로 잠근 것은 개인키로만 열린다',
      // 보충: (→ 6-4) 다음 Step과 잇기
      body: '클라이언트는 받은 자물쇠로 상자를 잠근다. 상자 안에는 앞으로 쓸 **세션 키**(비밀 쪽지)가 들어 있다.\n\n네트워크에서 누구나 상자를 볼 수 있지만 잠겨 있어 열 수 없다. 잠근 나조차 다시 못 열고, **개인키를 가진 서버만** 연다. 반대로 개인키로 서명한 것은 공개키로 누구나 검증할 수 있다(→ 6-4).',
      state: scene(true, {
        tags: KEY_PAIR,
        beats: [
          tags('box', { node: 'client', text: '상자 안 = 세션 키', tone: 'info' }),
          { kind: 'flow', id: 'send-box', path: TO_SERVER, label: '잠긴 상자', detail: '공개키로 잠근 세션 키', tone: 'request' },
          copy('copy-box', '잠긴 상자'),
          tags('cannot-open', { node: 'thief', text: '열쇠가 없어 못 엶', tone: 'defense' }),
          tags('me-neither', { node: 'client', text: '잠근 나도 못 엶', tone: 'info' }),
          tags('opened', { node: 'server', text: '개인키로 엶 → 세션 키', tone: 'defense' }),
        ],
        notes: [{ text: '공개키로 잠근 것은 개인키로만 열린다', after: 'opened' }],
      }),
    },
    {
      label: '하이브리드',
      title: 'TLS는 둘의 장점만 골라 쓴다',
      body: '공개키는 열쇠 나누기 문제를 풀지만 대칭키보다 **수백~수천 배 느리다.** 그래서 TLS는 둘을 섞는다.\n① 공개키 기술로 키 교환(ECDHE)\n② 양쪽이 같은 세션 키 계산\n③ 세션 키로 대칭 암호화(AES)\n④ 연결 종료 시 세션 키 폐기',
      keyPoint: '공개키로 **열쇠를 안전하게 나누고**, 대칭키로 **빠르게 암호화**한다.',
      state: scene(false, {
        beats: [
          tags('slow', { node: 'server', text: '공개키: 수백~수천 배 느림', tone: 'warn' }),
          { kind: 'flow', id: 'ks-c', path: TO_SERVER, label: 'key_share', detail: '1. 키 교환 (ECDHE)', tone: 'request' },
          { kind: 'flow', id: 'ks-s', path: TO_CLIENT, label: 'key_share', detail: '1. 키 교환 (ECDHE)', tone: 'response' },
          tags(
            'same-key',
            { node: 'client', text: '2. 같은 세션 키 계산', tone: 'term' },
            { node: 'server', text: '2. 같은 세션 키 계산', tone: 'term' },
          ),
          { kind: 'flow', id: 'aes-c', path: TO_SERVER, label: '3. AES 암호화', detail: '세션 키로 잠근 데이터', tone: 'request' },
          { kind: 'flow', id: 'aes-s', path: TO_CLIENT, label: '3. AES 암호화', detail: '세션 키로 잠근 응답', tone: 'response' },
          tags(
            'discard',
            { node: 'client', text: '4. 연결 끝 → 세션 키 폐기', tone: 'info' },
            { node: 'server', text: '4. 연결 끝 → 세션 키 폐기', tone: 'info' },
          ),
        ],
        notes: [{ text: '공개키로 열쇠를 나누고, 대칭키로 빠르게', after: 'discard' }],
      }),
    },
    {
      label: '과거 대화',
      title: '개인키가 털려도 과거 대화는 안전하다',
      body: '세션 키는 **연결마다 새로** 만들고, 연결이 끝나면 버린다.\n\n그래서 나중에 서버 개인키가 유출돼도, 예전에 녹화해 둔 대화는 풀 수 없다. 이것을 **Forward Secrecy**라고 한다.',
      state: scene(true, {
        beats: [
          { kind: 'flow', id: 'talk', path: TO_SERVER, label: '암호문', detail: '이번 연결의 세션 키', tone: 'request' },
          copy('record', '암호문', '녹화'),
          tags('recorded', { node: 'thief', text: '대화를 녹화해 둠', tone: 'threat' }),
          tags(
            'discard',
            { node: 'client', text: '연결 끝 → 세션 키 폐기', tone: 'info' },
            { node: 'server', text: '연결 끝 → 세션 키 폐기', tone: 'info' },
          ),
          tags('leak', { node: 'server', text: '훗날 개인키 유출!', tone: 'warn' }),
          tags('safe', { node: 'thief', text: '과거 대화는 못 풂', tone: 'defense' }),
        ],
        notes: [{ text: '세션 키는 연결마다 새로 → 과거 대화는 안전 (Forward Secrecy)', after: 'safe' }],
      }),
    },
    {
      label: '남은 문제',
      title: '그 자물쇠, 진짜 은행 것인가?',
      // 보충: (→ 6-5) 다음 Step과 잇기
      body: "도둑이 자기 자물쇠를 '은행 자물쇠'라고 속여 나눠 주면 어떻게 될까? 클라이언트는 도둑의 자물쇠로 세션 키를 잠가 보내고, 도둑은 자기 열쇠로 연다.\n\n그래서 '이 자물쇠는 진짜 은행 것'이라는 **보증서**가 필요하다. 그것이 **인증서**다(→ 6-5).",
      pitfall: '개인키(서버의 key.pem 파일)는 유출되면 끝이다. 절대 Git에 올리지 않는다.',
      state: scene(true, {
        beats: [
          tags('pretend', { node: 'thief', text: "'은행 자물쇠'라고 속임", tone: 'threat' }),
          { kind: 'flow', id: 'fake-lock', path: ['thief', 'net', 'client'], label: '가짜 자물쇠', detail: '도둑의 공개키', tone: 'danger' },
          tags('unsure', { node: 'client', text: '진짜인지 모름', tone: 'warn' }),
          { kind: 'flow', id: 'send-box', path: ['client', 'net', 'thief'], label: '잠긴 상자', detail: '도둑 자물쇠로 잠근 세션 키', tone: 'request' },
          tags('opened', { node: 'thief', text: '자기 열쇠로 엶 → 세션 키', tone: 'threat' }),
        ],
        notes: [{ text: '자물쇠가 진짜 은행 것이라는 보증서가 필요하다 → 인증서', after: 'opened' }],
      }),
    },
  ],
  quiz: [
    {
      q: 'TLS는 왜 공개키 암호와 대칭키 암호를 둘 다 쓰는가?',
      answer:
        '대칭키는 매우 빠르지만, 처음 만난 상대에게 열쇠를 안전하게 건넬 방법이 없다. 공개키는 열쇠를 안전하게 나눌 수 있지만 대칭키보다 수백~수천 배 느리다. 그래서 공개키 기술(ECDHE)로 세션 키를 나누고, 실제 데이터는 그 세션 키로 대칭 암호화(AES)한다.',
      why: 'p.8 대칭키·공개키의 장단점과 TLS의 하이브리드 전략. (Quick Check 문항이 아니라 이 Step의 확인 문제)',
    },
  ],
}
