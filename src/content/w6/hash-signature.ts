import { HASH_EXAMPLES, shortHex } from '../../lib/hash'
import type { TopoBeat, TopoLink, TopoNode, TopoTag, TopologyState } from '../../scenes/topology/types'
import type { Step } from '../types'

// 출처: Week06 PDF p.10 (해시와 전자서명 · 해시의 성질 · 도구 비교)
// 해시 값은 강의자료의 설명용 값(9b1f3c… / 57d0aa…) 대신 실제 SHA-256을 쓴다 (src/lib/hash.ts, 테스트로 확인)
// 패널 글은 배경과 흐름이 보이게 풀어 쓴다. 강의자료에 없는 설명은 // 보충

const H1234 = shortHex(HASH_EXAMPLES.inu1234)
const H1235 = shortHex(HASH_EXAMPLES.inu1235)

const tags = (id: string, ...list: TopoTag[]): TopoBeat => ({ kind: 'tags', id, tags: list })

// ── 해시 파이프라인: 입력 → SHA-256 → 해시값 ─────────────────
const PIPE_GAP = 300
const PIPE: TopoNode[] = [
  { id: 'input', label: '입력', kind: 'doc', t: 0 },
  { id: 'sha', label: 'SHA-256', sub: '해시 함수', kind: 'hasher', t: PIPE_GAP },
  { id: 'digest', label: '해시값', sub: '256비트', kind: 'digest', t: PIPE_GAP * 2 },
]
const PIPE_LINKS: TopoLink[] = [
  { from: 'input', to: 'sha' },
  { from: 'sha', to: 'digest' },
]
const pipe = (s: Omit<TopologyState, 'kind' | 'nodes' | 'links'>): TopologyState => ({ kind: 'topology', nodes: PIPE, links: PIPE_LINKS, ...s })
/** 입력 글자 → 해시 함수 → 해시값 두 칸 */
const hashOf = (id: string, input: string, out: string, detail?: string): TopoBeat[] => [
  { kind: 'flow', id: `${id}-in`, path: ['input', 'sha'], label: input, tone: 'request' },
  { kind: 'flow', id: `${id}-out`, path: ['sha', 'digest'], label: out, detail, tone: 'response' },
]

// ── 서명 경로: 보내는 쪽 → 네트워크 → 받는 쪽 ────────────────
const SIGN_GAP = 300
const ROUTE: TopoNode[] = [
  { id: 'sender', label: '보내는 쪽', sub: '서버·CA·토큰 발급자', kind: 'server', t: 0 },
  { id: 'net', label: '네트워크', kind: 'network', t: SIGN_GAP },
  { id: 'receiver', label: '받는 쪽', kind: 'browser', t: SIGN_GAP * 2 },
]
const ATTACKER: TopoNode = { id: 'attacker', label: '공격자', sub: '중간에서', kind: 'attacker', t: SIGN_GAP, side: 300 }
const ROUTE_LINKS: TopoLink[] = [
  { from: 'sender', to: 'net' },
  { from: 'net', to: 'receiver' },
]
const route = (withAttacker: boolean, s: Omit<TopologyState, 'kind' | 'nodes' | 'links'>): TopologyState => ({
  kind: 'topology',
  nodes: withAttacker ? [...ROUTE, ATTACKER] : ROUTE,
  links: withAttacker ? [...ROUTE_LINKS, { from: 'net', to: 'attacker', style: 'danger', both: true }] : ROUTE_LINKS,
  ...s,
})
const SIGN_STEPS: TopoTag[] = [
  { node: 'sender', text: '1. 문서를 해시', tone: 'term' },
  { node: 'sender', text: '2. 해시에 개인키로 서명', tone: 'term' },
]
const SEND: TopoBeat = { kind: 'flow', id: 'send', path: ['sender', 'net', 'receiver'], label: '문서 + 서명', detail: '서명 = 개인키 도장', tone: 'request' }

export const hashSignature: Step = {
  id: 'hash-signature',
  no: '6-4',
  title: '해시와 전자서명',
  slides: [10],
  scene: 'topology',
  sandbox: true,
  // 보충: 지문·도장 비유를 풀어 쓴 설명 (p.10 부제: 해시는 데이터의 '지문', 서명은 '개인키로 찍은 도장')
  easy: {
    title: '지문과 도장',
    body: '**해시는 데이터의 지문**이다. 사람마다 지문이 다르듯 데이터마다 해시가 다르다. 지문만 보고 그 사람을 만들어 낼 수는 없듯이, 해시만 보고 원래 데이터를 되돌릴 수 없다.\n\n**서명은 개인키로 찍은 도장**이다. 도장은 주인만 찍을 수 있지만, 도장이 진짜인지는 누구나 대조해 볼 수 있다. 개인키로 서명하고, 공개키로 누구나 검증한다.\n\n도장이 찍힌 문서는 누구나 읽을 수 있다. 하지만 글자를 고치면 도장과 맞지 않아 바로 들킨다.',
  },
  phases: [
    {
      label: '지문',
      title: '해시는 데이터의 지문',
      // 보충: 마지막 문장 (강의자료 예시 값이 설명용이라는 안내)
      body: `해시 함수는 어떤 입력이든 **고정 길이의 값**으로 바꾼다. SHA-256은 결과가 항상 256비트(16진수 64자리)다.\n\n사람마다 지문이 다르듯 데이터마다 해시가 다르다. 그래서 해시는 **"바뀌었나?"를 확인하는 재료**가 된다. 인증서, JWT, 비밀번호 저장이 모두 이 재료를 쓴다.\n\n여기 나온 값은 실제 SHA-256이다(강의자료의 9b1f3c…는 설명용 값).`,
      state: pipe({
        beats: [...hashOf('a', 'inu1234', H1234, '16진수 64자리'), tags('length', { node: 'digest', text: '256비트 = 16진수 64자리', tone: 'term' })],
        notes: [{ text: '어떤 입력이든 64자리 지문으로', after: 'length' }],
      }),
    },
    {
      label: '한 글자',
      title: '한 글자만 달라도 완전히 다른 해시',
      body: '입력을 한 글자만 바꿔도 해시는 **완전히 달라진다.** 1비트만 바뀌어도 결과가 크게 바뀌는 이 성질을 **눈사태 효과**라고 한다.\n\n그래서 해시를 비교하면 아주 작은 변조도 바로 드러난다.',
      state: pipe({
        tags: [{ node: 'digest', text: `inu1234 → ${H1234}`, tone: 'info' }],
        beats: [
          ...hashOf('b', 'inu1235', H1235),
          tags(
            'avalanche',
            { node: 'digest', text: `inu1235 → ${H1235}`, tone: 'info' },
            { node: 'digest', text: '한 글자만 달라도 완전히 다름', tone: 'warn' },
          ),
        ],
        notes: [{ text: '1비트만 바뀌어도 결과가 크게 바뀐다 (눈사태 효과)', after: 'avalanche' }],
      }),
    },
    {
      label: '네 가지 성질',
      title: '해시의 네 가지 성질',
      body: '· 단방향: 해시값으로 원문을 되돌릴 수 없다\n· 고정 길이: 1글자든 1GB든 결과는 256비트\n· 눈사태 효과: 1비트만 바뀌어도 결과가 크게 바뀐다\n· 충돌 저항: 같은 해시를 갖는 두 입력을 찾기 어렵다\n\n같은 입력은 항상 같은 출력을 내고, 출력에서 입력은 복원할 수 없다.',
      state: pipe({
        beats: [
          ...hashOf('again', 'inu1234', H1234),
          tags('same', { node: 'digest', text: '같은 입력 → 항상 같은 출력', tone: 'term' }),
          { kind: 'flow', id: 'reverse', path: ['digest', 'sha'], label: '거꾸로?', detail: H1234, tone: 'danger' },
          tags('one-way', { node: 'sha', text: '되돌릴 수 없음 (단방향)', tone: 'term' }),
          ...hashOf('big', '1GB 파일', '해시값', '여전히 64자리'),
          tags('fixed', { node: 'digest', text: '1글자든 1GB든 256비트 (고정 길이)', tone: 'term' }),
          tags('collision', { node: 'sha', text: '같은 해시인 두 입력 찾기 어려움 (충돌 저항)', tone: 'term' }),
        ],
        notes: [{ text: '단방향 · 고정 길이 · 눈사태 효과 · 충돌 저항', after: 'collision' }],
      }),
    },
    {
      label: '서명',
      title: '전자서명은 개인키로 찍은 도장',
      body: '보내는 쪽(서버·CA·토큰 발급자)은 문서의 해시를 구하고, 그 해시에 **자기 개인키로 서명**한다. 그리고 문서와 서명을 함께 보낸다.\n\n6-3에서 본 것처럼, 개인키로 서명한 것은 공개키로 누구나 검증할 수 있다.',
      state: route(false, {
        beats: [tags('sign', ...SIGN_STEPS), SEND],
        notes: [{ text: '문서의 해시에 개인키로 도장을 찍는다', after: 'send' }],
      }),
    },
    {
      label: '검증',
      title: '받는 쪽은 두 값을 비교한다',
      body: '받는 쪽은 두 가지를 한다.\n① 받은 문서를 직접 해시한다\n② 보내는 쪽의 공개키로 서명을 검증해 원래 해시를 꺼낸다\n\n①과 ②가 같으면 **위조되지 않았고(무결성), 진짜 발급자가 보냈다(발급자 증명)**는 뜻이다.',
      state: route(false, {
        tags: SIGN_STEPS,
        beats: [
          SEND,
          tags(
            'verify',
            { node: 'receiver', text: '① 받은 문서를 해시', tone: 'term' },
            { node: 'receiver', text: '② 공개키로 서명 검증 → 원래 해시', tone: 'term' },
          ),
          tags('match', { node: 'receiver', text: '①과 ②가 같다 → 위조 없음 + 진짜 발급자', tone: 'defense' }),
        ],
        notes: [{ text: '같으면: 위조 없음 + 진짜 발급자', after: 'match' }],
      }),
    },
    {
      label: '바꾸면?',
      title: '서명은 숨기지 않는다, 대신 바꾸면 들킨다',
      body: '서명은 데이터를 **숨기지 않는다.** 중간에서 누구나 문서를 읽을 수 있다.\n\n하지만 내용을 바꾸면 받는 쪽이 계산한 해시가 서명 속 해시와 달라져 **바로 들킨다.** 공격자는 개인키가 없어서 새 서명을 만들 수 없다.',
      // 보충: (→ 6-14) 다음 Step과 잇기
      pitfall: '서명은 암호화가 아니다. 누구나 읽을 수 있지만, 바꾸면 들킬 뿐이다. JWT가 "암호화가 아닌" 이유가 바로 이것이다(→ 6-14).',
      state: route(true, {
        tags: SIGN_STEPS,
        beats: [
          { kind: 'flow', id: 'send', path: ['sender', 'net'], label: '문서 + 서명', tone: 'request' },
          { kind: 'flow', id: 'grab', path: ['net', 'attacker'], label: '가로챔', detail: '문서 + 서명', tone: 'danger' },
          tags('readable', { node: 'attacker', text: '문서 내용은 읽을 수 있음', tone: 'info' }),
          tags('edit', { node: 'attacker', text: '문서를 고침 (서명은 그대로)', tone: 'threat' }),
          { kind: 'flow', id: 'forward', path: ['attacker', 'net', 'receiver'], label: '고친 문서 + 원래 서명', tone: 'danger' },
          tags('caught', { node: 'receiver', text: '①과 ②가 다름 → 위조 발견', tone: 'defense' }),
        ],
        notes: [{ text: '읽을 수는 있지만, 바꾸면 들킨다', after: 'caught' }],
      }),
    },
    {
      label: '세 가지 도구',
      title: '해시 · HMAC · 전자서명',
      body: '· 해시: 무결성(바뀌었나?) → 비밀번호 저장, 파일 검증\n· HMAC: 무결성 + 비밀 공유자 → JWT HS256, 웹훅 서명\n· 전자서명: 무결성 + 발급자 증명 → 인증서, JWT RS256/ES256',
      keyPoint: '해시는 지문, 서명은 개인키로 찍은 도장. 셋 다 인증서 · JWT · 비밀번호 저장의 공통 재료다.',
      state: {
        kind: 'topology',
        nodes: [
          { id: 'hash', label: '해시', kind: 'hasher', t: 0 },
          { id: 'hmac', label: 'HMAC', kind: 'hmac', t: 320 },
          { id: 'sig', label: '전자서명', kind: 'signer', t: 640 },
        ],
        links: [],
        beats: [
          tags('hash', { node: 'hash', text: '무결성 (바뀌었나?)', tone: 'term' }, { node: 'hash', text: '비밀번호 저장 · 파일 검증', tone: 'info' }),
          tags('hmac', { node: 'hmac', text: '무결성 + 비밀 공유자', tone: 'term' }, { node: 'hmac', text: 'JWT HS256 · 웹훅 서명', tone: 'info' }),
          tags('sig', { node: 'sig', text: '무결성 + 발급자 증명', tone: 'term' }, { node: 'sig', text: '인증서 · JWT RS256/ES256', tone: 'info' }),
        ],
        notes: [{ text: '셋 다 무결성, 무엇을 더 보장하느냐가 다르다', after: 'sig' }],
      },
    },
  ],
  quiz: [
    {
      q: '서명된 데이터는 누구나 읽을 수 있는데도 왜 안전하다고 하는가?',
      answer:
        '서명은 데이터를 숨기지 않고, 바뀌었는지와 누가 발급했는지를 증명한다. 받는 쪽은 받은 데이터를 직접 해시한 값과, 발급자의 공개키로 서명을 검증해 꺼낸 해시를 비교한다. 내용을 한 글자라도 바꾸면 두 값이 달라지고, 공격자는 개인키가 없어 새 서명을 만들 수 없으므로 위조가 바로 드러난다.',
      why: 'p.10 전자서명과 "서명은 데이터를 숨기지 않는다"는 핵심 문장. Quick Check Q7(JWT)의 토대가 된다.',
    },
  ],
}
