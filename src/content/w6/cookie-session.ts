import type { TopoBeat, TopoLink, TopoNode, TopoTag, TopologyState } from '../../scenes/topology/types'
import type { Step } from '../types'

// 출처: Week06 PDF p.22 (HTTP는 기억하지 못한다 → Cookie · 특징 표 · 자동첨부의 편리함과 위험),
//       p.23 (Session을 '세탁소 번호표'로 · 장부 · 로그아웃 · 여러 지점 · Session ID 조건)
// 패널 글은 배경과 흐름이 보이게 풀어 쓴다. 강의자료에 없는 설명은 // 보충

const SID = 'a91f…'
const tags = (id: string, ...list: TopoTag[]): TopoBeat => ({ kind: 'tags', id, tags: list })

const GAP = 300
const NODES: TopoNode[] = [
  { id: 'browser', label: '브라우저', kind: 'browser', t: 0 },
  { id: 'server', label: '서버', kind: 'server', t: GAP },
  { id: 'store', label: '세션 저장소', sub: 'Redis · DB', kind: 'db', t: GAP * 2 },
]
const LINKS: TopoLink[] = [
  { from: 'browser', to: 'server' },
  { from: 'server', to: 'store' },
]
const scene = (s: Omit<TopologyState, 'kind' | 'nodes' | 'links'>, extra: { nodes?: TopoNode[]; links?: TopoLink[] } = {}): TopologyState => ({
  kind: 'topology',
  nodes: [...NODES, ...(extra.nodes ?? [])],
  links: [...LINKS, ...(extra.links ?? [])],
  ...s,
})

const JAR: TopoTag = { node: 'browser', text: `쿠키 보관함: sid=${SID}`, tone: 'term' }
/** 서버 장부 (p.23 표) */
const LEDGER: TopoTag[] = [
  { node: 'store', text: `${SID} → 김인천 (2026001) · student · 18:30까지`, tone: 'info' },
  { node: 'store', text: '7c2e… → 이교수 (P0012) · professor', tone: 'info' },
]
const withCookie = (id: string, path: string): TopoBeat => ({
  kind: 'flow',
  id,
  path: ['browser', 'server'],
  label: path,
  detail: `Cookie: sid=${SID} (자동)`,
  tone: 'request',
})
const LOOKUP: TopoBeat[] = [
  { kind: 'flow', id: 'lookup', path: ['server', 'store'], label: '장부 조회', detail: `sid=${SID}`, tone: 'request' },
  { kind: 'flow', id: 'found', path: ['store', 'server'], label: '김인천 · student', tone: 'response' },
]

export const cookieSession: Step = {
  id: 'cookie-session',
  no: '6-12',
  title: 'Cookie와 Session',
  slides: [22, 23],
  scene: 'topology',
  star: true,
  easy: {
    title: "Session을 '세탁소 번호표'로 이해하기",
    body: `번호표에는 아무 정보도 없다. 진짜 정보는 가게 장부에 있다.\n\n**번호표 (Session ID)**: No. ${SID} — 의미 없는 무작위 번호. 잃어버리면 누구든 옷을 찾아갈 수 있다.\n\n**가게 장부 = 서버의 세션 저장소** (메모리 · Redis · DB)\n· ${SID} → 김인천 (2026001) · student · 18:30까지\n· 7c2e… → 이교수 (P0012) · professor · 19:00까지\n· d04b… → 박조교 (T0451) · assistant · 만료됨\n\n세탁소와 Session 방식\n· 번호표만 보고 장부에서 찾는다 = Cookie: sid → 저장소 조회 → 사용자 확인 (요청마다 저장소 조회 1번)\n· 주인이 장부에서 번호를 지운다 = 로그아웃 · 강제 종료 = 저장소에서 삭제 → 즉시 무효화가 쉽다\n· 지점이 여러 개면 장부를 공유해야 = 서버가 여러 대면 Redis 등 공유 저장소 필요 (Week 5 Stateless 문제)`,
  },
  phases: [
    {
      label: '이름표',
      title: 'HTTP는 기억하지 못한다 → 서버가 이름표를 준다',
      // 보충: "요청 하나하나를 따로 처리한다"
      body: 'HTTP는 요청 하나하나를 따로 처리해서, 방금 로그인한 사람을 **기억하지 못한다.** 그래서 서버는 로그인에 성공하면 Set-Cookie로 작은 **이름표(쿠키)**를 준다. 브라우저는 이것을 사이트별 보관함에 넣어 둔다.\n· 저장 위치: 브라우저 (사이트별 보관함)\n· 크기: 쿠키 하나 약 4KB 이하\n· 주체: 서버가 만들고, 브라우저가 보관·전송',
      state: scene({
        beats: [
          { kind: 'flow', id: 'login', path: ['browser', 'server'], label: 'POST /login', detail: '{id, pw}', tone: 'request' },
          { kind: 'flow', id: 'set', path: ['server', 'browser'], label: '200 OK', detail: `Set-Cookie: sid=${SID}; HttpOnly; Secure`, tone: 'response' },
          tags('jar', JAR),
        ],
        notes: [{ text: '서버가 Set-Cookie로 이름표를 준다', after: 'jar' }],
      }),
    },
    {
      label: '자동 첨부',
      title: '브라우저가 매 요청에 알아서 붙인다',
      body: '그 뒤로 브라우저는 같은 사이트로 갈 때마다 쿠키를 **자동으로** 붙인다.\n\n개발자가 매번 헤더를 붙이지 않아도 로그인 상태가 유지된다. 이것이 쿠키의 편리함이다.',
      state: scene({
        tags: [JAR],
        beats: [
          withCookie('grades', 'GET /v1/grades'),
          { kind: 'flow', id: 'grades-ok', path: ['server', 'browser'], label: '200 OK', detail: '내 성적', tone: 'response' },
          withCookie('profile', 'GET /v1/profile'),
          tags('easy', { node: 'browser', text: '개발자가 헤더를 붙이지 않아도 됨', tone: 'defense' }),
        ],
        notes: [{ text: '자동 첨부 = 편리함', after: 'easy' }],
      }),
    },
    {
      label: '위험',
      title: '다른 사이트가 만든 요청에도 붙는다',
      // 보충: (→ 6-13, 6-22) 앞뒤 Step과 잇기
      body: '자동 첨부는 위험하기도 하다. **다른 사이트가 만든 요청**이라도 조건이 맞으면 쿠키가 붙어 간다. 서버는 쿠키만 보고 진짜 사용자의 요청이라고 믿는다.\n\n이것이 **CSRF 공격**의 원인이다. 막는 방법(SameSite)은 6-13에서, 공격 실습은 6-22에서 본다.',
      state: scene(
        {
          tags: [JAR],
          beats: [
            { kind: 'flow', id: 'trap', path: ['evil', 'browser'], label: '숨은 자동 제출 form', detail: 'evil.example', tone: 'danger' },
            { kind: 'flow', id: 'forged', path: ['browser', 'server'], label: 'POST /transfer', detail: `Cookie: sid=${SID} (자동!)`, tone: 'danger' },
            tags('csrf', { node: 'server', text: '누가 만든 요청인지 모름 → CSRF', tone: 'threat' }),
          ],
          notes: [{ text: '자동 첨부 = 위험: 다른 사이트의 요청에도 붙는다', after: 'csrf' }],
        },
        {
          nodes: [{ id: 'evil', label: '다른 사이트', sub: 'evil.example', kind: 'attacker', t: 0, side: 320 }],
          links: [{ from: 'evil', to: 'browser', style: 'danger' }],
        },
      ),
    },
    {
      label: '번호표',
      title: 'Session ID는 번호표, 진짜 정보는 서버 장부에',
      body: '세션 쿠키에 든 값(**Session ID**)은 세탁소 번호표처럼 **아무 정보도 없는 무작위 번호**다. 누구인지, 어떤 역할인지는 서버의 **세션 저장소(장부)**에 있다.\n\n요청이 오면 서버는 번호로 장부를 찾아 사용자를 확인한다(요청마다 저장소 조회 1번).',
      keyPoint: '쿠키에 담기는 것 = 의미 없는 Session ID, 사용자 정보는 서버의 세션 저장소에 (Quick Check Q5)',
      state: scene({
        tags: [JAR, ...LEDGER],
        beats: [withCookie('req', 'GET /v1/grades'), ...LOOKUP, tags('who', { node: 'server', text: '김인천 (student) 확인', tone: 'defense' })],
        notes: [{ text: '번호표(sid)로 장부를 찾아 사용자 확인', after: 'who' }],
      }),
    },
    {
      label: '로그아웃',
      title: '로그아웃 = 장부에서 지우기',
      body: '세탁소 주인이 장부에서 번호를 지우면 그 번호표로는 옷을 찾을 수 없다. 세션도 같다.\n\n로그아웃이나 강제 종료는 저장소에서 지우기만 하면 **즉시 무효**가 된다. 세션 방식의 큰 장점이다.',
      state: scene({
        tags: [JAR, ...LEDGER],
        beats: [
          withCookie('logout', 'POST /logout'),
          { kind: 'flow', id: 'delete', path: ['server', 'store'], label: '장부에서 삭제', detail: `DELETE ${SID}`, tone: 'request' },
          tags('deleted', { node: 'store', text: `${SID} 삭제됨 → 즉시 무효`, tone: 'warn' }),
          withCookie('again', 'GET /v1/grades'),
          { kind: 'flow', id: 'miss', path: ['server', 'store'], label: '장부 조회', detail: `sid=${SID}`, tone: 'request' },
          { kind: 'flow', id: 'none', path: ['store', 'server'], label: '없음', tone: 'danger' },
          { kind: 'flow', id: 'unauth', path: ['server', 'browser'], label: '401', detail: '다시 로그인하세요', tone: 'danger' },
        ],
        notes: [{ text: '장부에서 지우면 그 번호표는 즉시 무효', after: 'unauth' }],
      }),
    },
    {
      label: '여러 서버',
      title: '지점이 여러 개면 장부를 공유해야 한다',
      body: '세탁소 지점이 여러 개면 모든 지점이 장부를 같이 봐야 한다.\n\n서버가 여러 대면 세션을 **공유 저장소(Redis 등)**에 두어야 어느 서버로 가도 같은 사용자로 인식된다(Week 5의 Stateless 문제).',
      pitfall: 'Session ID는 추측할 수 없을 만큼 **길고 무작위**여야 하며(128비트 이상), 로그인 성공 시 **새로 발급**해야 한다(Session Fixation 방지).',
      state: {
        kind: 'topology',
        nodes: [
          { id: 'browser', label: '브라우저', kind: 'browser', t: 0 },
          { id: 'a', label: '서버 A', kind: 'server', t: GAP, side: -170 },
          { id: 'b', label: '서버 B', kind: 'server', t: GAP, side: 170 },
          { id: 'store', label: '공유 저장소', sub: 'Redis', kind: 'db', t: GAP * 2 },
        ],
        links: [
          { from: 'browser', to: 'a' },
          { from: 'browser', to: 'b' },
          { from: 'a', to: 'store' },
          { from: 'b', to: 'store' },
        ],
        beats: [
          { kind: 'flow', id: 'login', path: ['browser', 'a'], label: 'POST /login', tone: 'request' },
          { kind: 'flow', id: 'save', path: ['a', 'store'], label: '세션 저장', detail: `${SID} → 김인천`, tone: 'request' },
          { kind: 'flow', id: 'set', path: ['a', 'browser'], label: 'Set-Cookie', detail: `sid=${SID}`, tone: 'response' },
          { kind: 'flow', id: 'next', path: ['browser', 'b'], label: 'GET /v1/grades', detail: `Cookie: sid=${SID}`, tone: 'request' },
          { kind: 'flow', id: 'lookup', path: ['b', 'store'], label: '장부 조회', detail: `sid=${SID}`, tone: 'request' },
          { kind: 'flow', id: 'found', path: ['store', 'b'], label: '김인천 · student', tone: 'response' },
          tags('ok', { node: 'b', text: '김인천 확인 ✓', tone: 'defense' }),
        ],
        notes: [{ text: '서버 A에서 로그인해도, 서버 B가 공유 장부에서 찾는다', after: 'ok' }],
      },
    },
  ],
  quiz: [
    {
      q: 'Session 방식에서 쿠키에 담기는 값은 무엇이고, 사용자 정보는 어디에 있는가? (Quick Check Q5)',
      answer:
        '쿠키에는 의미 없는 무작위 번호인 Session ID만 담긴다(세탁소 번호표). 사용자가 누구인지, 역할과 만료 시각 같은 정보는 서버의 세션 저장소(메모리·Redis·DB)에 있고, 서버는 요청마다 Session ID로 저장소를 조회해 사용자를 확인한다.',
      why: 'p.23 세탁소 번호표 비유: 번호표에는 아무 정보도 없다. 진짜 정보는 가게 장부(서버의 세션 저장소)에 있다.',
    },
  ],
}
