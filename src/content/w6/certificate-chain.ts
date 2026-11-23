import { CHAIN_EXAMPLE, INU_CERT } from '../../lib/certificate'
import type { TopoBeat, TopoLink, TopoNode, TopoTag, TopologyState } from '../../scenes/topology/types'
import type { Step } from '../types'

// 출처: Week06 PDF p.11 (인증서를 여권으로 이해하기 · 신뢰의 위임 · 주의),
//       p.12 (인증서 체인 · 브라우저의 검증 순서 · openssl 확인)
// 패널 글은 배경과 흐름이 보이게 풀어 쓴다. 강의자료에 없는 설명은 // 보충

const DOMAIN = INU_CERT.san[0]
const GAP = 280
const tags = (id: string, ...list: TopoTag[]): TopoBeat => ({ kind: 'tags', id, tags: list })
const chain = (ids: string[]): TopoLink[] => ids.slice(0, -1).map((from, i) => ({ from, to: ids[i + 1] }))

// ── ① 여권 · ② 신뢰의 위임 ─────────────────────────────────
const BROWSER: TopoNode = { id: 'browser', label: '브라우저', sub: '입국 심사관', kind: 'browser', t: 0 }
const SERVER: TopoNode = { id: 'server', label: '서버', sub: DOMAIN, kind: 'server', t: GAP }
const CA: TopoNode = { id: 'ca', label: 'CA', sub: '인증 기관', kind: 'ca', t: GAP * 2 }

/** p.11 디지털 여권의 다섯 칸 */
const PASSPORT: TopoTag[] = [
  { node: 'server', text: `이름 (SAN): ${DOMAIN}`, tone: 'term' },
  { node: 'server', text: `발급 기관: ${INU_CERT.issuer}`, tone: 'term' },
  { node: 'server', text: `유효: ${INU_CERT.notBefore} ~ ${INU_CERT.notAfter}`, tone: 'term' },
  { node: 'server', text: `공개키: ${INU_CERT.publicKey}`, tone: 'term' },
  { node: 'server', text: 'CA의 서명 (CA 개인키로)', tone: 'term' },
]

// ── ③~⑥ 신뢰 체인: 브라우저 → Leaf → Intermediate → Root ─────
const CHAIN_NODES: TopoNode[] = [
  BROWSER,
  { id: 'leaf', label: '서버 인증서', sub: 'Leaf', kind: 'cert', t: GAP },
  { id: 'inter', label: 'Intermediate', sub: CHAIN_EXAMPLE.intermediate, kind: 'ca', t: GAP * 2 },
  { id: 'root', label: 'Root CA', sub: CHAIN_EXAMPLE.root, kind: 'rootca', t: GAP * 3 },
]
const CHAIN_LINKS = chain(CHAIN_NODES.map((n) => n.id))
const chainScene = (s: Omit<TopologyState, 'kind' | 'nodes' | 'links'>): TopologyState => ({
  kind: 'topology',
  nodes: CHAIN_NODES,
  links: CHAIN_LINKS,
  ...s,
})
const SEND_CHAIN: TopoBeat = { kind: 'flow', id: 'send-chain', path: ['leaf', 'browser'], label: '인증서 체인', detail: 'TLS Handshake에서 전송', tone: 'response' }

/** p.12 브라우저의 검증 순서 (각 단계를 통과한 자리에 붙는 알약) */
const CHECK: Record<1 | 2 | 3 | 4 | 5 | 6, TopoTag> = {
  1: { node: 'browser', text: '1. 이름(SAN) = 주소창 도메인 ✓', tone: 'defense' },
  2: { node: 'browser', text: '2. 유효 기간 안 ✓', tone: 'defense' },
  3: { node: 'leaf', text: '3. 서명 ✓ (Intermediate 공개키)', tone: 'defense' },
  4: { node: 'inter', text: '4. 서명 ✓ (Root 공개키)', tone: 'defense' },
  5: { node: 'root', text: '5. Trust Store에 있음 ✓', tone: 'defense' },
  6: { node: 'leaf', text: '6. 폐기 안 됨 ✓ (OCSP·CRL)', tone: 'defense' },
}

export const certificateChain: Step = {
  id: 'certificate-chain',
  no: '6-5',
  title: '인증서와 신뢰 체인',
  slides: [11, 12],
  scene: 'topology',
  star: true,
  easy: {
    title: '인증서를 여권으로 이해하기',
    body: `인증서 = "이 공개키는 ${DOMAIN}의 것"이라고 믿을 만한 기관이 서명한 신분증.\n\n여권과 인증서, 그리고 브라우저가 확인하는 것\n· 이름 = Subject · SAN → 접속한 주소와 일치하는가?\n· 발급 국가·외교부 = Issuer (CA) → 믿을 수 있는 CA인가?\n· 유효 기간 = Not Before / After → 만료되지 않았는가?\n· 사진 = 공개키 → 이 키로 서버가 서명했나?\n· 위조 방지 홀로그램 = CA의 전자서명 → 서명이 CA 공개키로 검증되나?\n· 분실 신고 = 폐기 (OCSP · CRL) → 취소된 인증서는 아닌가?\n\n**신뢰의 위임**: 입국 심사관(브라우저)은 여권 소지자(서버)를 직접 알지 못한다. 외교부(CA)를 믿기 때문에 여권을 믿는다.`,
  },
  phases: [
    {
      label: '디지털 여권',
      title: '인증서는 서버의 디지털 여권',
      // 보충: 6-3과 잇는 문장
      body: `인증서는 **"이 공개키는 ${DOMAIN}의 것"**이라고 믿을 만한 기관(CA)이 서명한 신분증이다. 6-3의 "그 자물쇠가 진짜 은행 것인가?"에 대한 답이 바로 이것이다.\n\n여권처럼 이름(Subject·SAN), 발급 기관(Issuer), 유효 기간, 소지자의 공개키, 그리고 발급 기관의 도장(CA의 전자서명)이 들어 있다.`,
      state: {
        kind: 'topology',
        nodes: [BROWSER, SERVER],
        links: [{ from: 'browser', to: 'server' }],
        beats: [
          tags('passport', ...PASSPORT),
          { kind: 'flow', id: 'send', path: ['server', 'browser'], label: '인증서', detail: DOMAIN, tone: 'response' },
        ],
        notes: [{ text: `"이 공개키는 ${DOMAIN}의 것" — CA가 서명한 신분증`, after: 'send' }],
      },
    },
    {
      label: '신뢰의 위임',
      title: '브라우저는 서버가 아니라 CA를 믿는다',
      body: '입국 심사관은 여권 소지자를 직접 알지 못한다. 외교부를 믿기 때문에 여권을 믿는다.\n\n브라우저도 마찬가지다. 처음 보는 서버를 직접 믿는 것이 아니라, 그 인증서에 서명한 **CA를 믿어서** 인증서를 믿는다.',
      state: {
        kind: 'topology',
        nodes: [BROWSER, SERVER, CA],
        links: chain(['browser', 'server', 'ca']),
        beats: [
          { kind: 'flow', id: 'sign', path: ['ca', 'server'], label: '서명', detail: 'CA 개인키로', tone: 'response' },
          tags('signed', { node: 'server', text: '인증서 (CA가 서명)', tone: 'term' }),
          { kind: 'flow', id: 'send', path: ['server', 'browser'], label: '인증서', detail: DOMAIN, tone: 'response' },
          tags('trust', { node: 'browser', text: '서버는 모르지만 CA는 믿는다', tone: 'info' }),
        ],
        notes: [{ text: '외교부를 믿어서 여권을 믿는다 = CA를 믿어서 인증서를 믿는다', after: 'trust' }],
      },
    },
    {
      label: '신뢰 체인',
      title: '신뢰는 Root에서 한 단계씩 내려온다',
      body: '인증서는 혼자가 아니라 **사슬**로 이어진다.\n· Root CA: OS·브라우저에 미리 내장(Trust Store). 자기 자신이 서명한다\n· Intermediate CA: Root가 서명. 평소 발급 업무를 맡는다(Root 개인키는 오프라인 금고에)\n· 서버 인증서(Leaf): Intermediate가 서명. 서버가 TLS Handshake 때 보낸다',
      signal: `openssl s_client -connect ${DOMAIN}:443 -showcerts 결과에서 s:는 누구의 인증서(subject), i:는 누가 서명했는지(issuer)다. i:가 위의 s:로 이어지는지 보면 체인이 끊기지 않았는지 알 수 있다.`,
      state: chainScene({
        beats: [
          tags(
            'root',
            { node: 'root', text: 'OS·브라우저에 미리 내장 (Trust Store)', tone: 'term' },
            { node: 'root', text: '자기 자신이 서명 (Self-signed)', tone: 'term' },
            { node: 'root', text: '개인키는 오프라인 금고', tone: 'info' },
          ),
          { kind: 'flow', id: 'sign-inter', path: ['root', 'inter'], label: '서명함', detail: 'Root 개인키', tone: 'response' },
          tags('inter', { node: 'inter', text: 'Root가 서명 · 평소 발급 담당', tone: 'term' }),
          { kind: 'flow', id: 'sign-leaf', path: ['inter', 'leaf'], label: '서명함', detail: 'Intermediate 개인키', tone: 'response' },
          tags('leaf', { node: 'leaf', text: 'Intermediate가 서명', tone: 'term' }),
          SEND_CHAIN,
        ],
        notes: [{ text: 'Root → Intermediate → 서버 인증서, 서명이 사슬처럼 이어진다', after: 'send-chain' }],
      }),
    },
    {
      label: '이름·기간',
      title: '검증 ①② 이름과 기간',
      body: '인증서를 받은 브라우저는 먼저 두 가지를 본다.\n① 인증서의 이름(SAN)이 주소창 도메인과 같은가?\n② 유효 기간 안인가?\n\n②는 내 PC 시계로 판단한다. 그래서 PC 시계가 틀리면 멀쩡한 인증서도 여기서 실패한다.',
      state: chainScene({
        beats: [
          SEND_CHAIN,
          tags('address', { node: 'browser', text: `주소창: ${DOMAIN}`, tone: 'info' }),
          tags('check-1', CHECK[1]),
          tags('check-2', CHECK[2]),
        ],
        notes: [{ text: 'PC 시계가 틀리면 ②에서 실패한다', after: 'check-2' }],
      }),
    },
    {
      label: '서명 검증',
      title: '검증 ③④ 서명을 한 단계씩 따라 올라간다',
      body: '이제 서명을 확인한다. 6-4에서 본 전자서명 검증을 사슬을 따라 반복하는 것이다.\n③ 서버 인증서의 서명을 Intermediate의 공개키로 검증\n④ Intermediate의 서명을 Root의 공개키로 검증',
      state: chainScene({
        tags: [CHECK[1], CHECK[2]],
        beats: [
          { kind: 'flow', id: 'verify-leaf', path: ['leaf', 'inter'], label: '검증', detail: 'Leaf 서명 ← Intermediate 공개키', tone: 'request' },
          tags('check-3', CHECK[3]),
          { kind: 'flow', id: 'verify-inter', path: ['inter', 'root'], label: '검증', detail: 'Intermediate 서명 ← Root 공개키', tone: 'request' },
          tags('check-4', CHECK[4]),
        ],
        notes: [{ text: '서명을 따라 Root까지 한 단계씩 올라간다', after: 'check-4' }],
      }),
    },
    {
      label: 'Root',
      title: '검증 ⑤⑥ 출발점은 미리 설치된 Root',
      body: '⑤ 사슬 끝의 Root가 내 Trust Store에 있는가?\n⑥ 폐기(revoked)된 인증서는 아닌가? (분실 신고된 여권처럼, OCSP·CRL로 확인)\n\n여섯 가지를 모두 통과하면, 이 서버가 www.inu.ac.kr의 진짜 주인이라고 믿는다.',
      keyPoint: '브라우저가 **처음부터 믿는 것은 OS·브라우저에 미리 설치된 Root CA**뿐이다. 나머지 신뢰는 모두 서명을 따라 내려온다. (Quick Check Q3)',
      state: chainScene({
        tags: [CHECK[1], CHECK[2], CHECK[3], CHECK[4]],
        beats: [
          tags('check-5', CHECK[5]),
          tags('check-6', CHECK[6]),
          tags('trusted', { node: 'browser', text: `신뢰 성립: 진짜 ${DOMAIN}`, tone: 'term' }),
        ],
        notes: [{ text: '처음부터 믿는 것은 Trust Store의 Root뿐', after: 'trusted' }],
      }),
    },
    {
      label: '피싱?',
      title: "인증서는 '착한 사이트'를 보증하지 않는다",
      // 보충: 피싱 도메인 예시 inu-login.example (실제로 없는 예약 도메인)
      body: "인증서는 '이 서버가 그 도메인의 주인'임을 보증할 뿐, '착한 사이트'임을 보증하지 않는다. 피싱 사이트도 **자기 도메인의 인증서는 쉽게** 받는다.\n\n자물쇠 아이콘이 있어도, 주소의 도메인이 맞는지 직접 확인해야 한다.",
      state: {
        kind: 'topology',
        nodes: [BROWSER, { id: 'phish', label: '피싱 서버', sub: 'inu-login.example', kind: 'attacker', t: GAP }, CA],
        links: chain(['browser', 'phish', 'ca']),
        beats: [
          { kind: 'flow', id: 'sign', path: ['ca', 'phish'], label: '서명', detail: '도메인 주인인지만 확인', tone: 'response' },
          { kind: 'flow', id: 'send', path: ['phish', 'browser'], label: '인증서', detail: 'inu-login.example', tone: 'response' },
          tags('valid', { node: 'browser', text: '인증서 정상 ✓ (자물쇠)', tone: 'defense' }),
          tags('but', { node: 'browser', text: '하지만 피싱 사이트', tone: 'threat' }),
        ],
        notes: [{ text: '인증서 = 도메인 주인 보증, 착한 사이트 보증 ✕', after: 'but' }],
      },
    },
  ],
  quiz: [
    {
      q: '인증서 체인에서 브라우저가 처음부터 믿는 것은 무엇인가? (Quick Check Q3)',
      answer:
        'OS·브라우저에 미리 설치된 Root CA(Trust Store)다. 서버 인증서는 Intermediate CA가, Intermediate는 Root가 서명했으므로, 브라우저는 서명을 한 단계씩 따라 올라가 Trust Store의 Root에 닿으면 서버 인증서를 믿는다.',
      why: 'p.12 인증서 체인: Root CA는 OS·브라우저에 미리 내장(Trust Store)되어 있고, 검증 ⑤ "Root가 내 Trust Store에 있는가?"',
    },
  ],
}
