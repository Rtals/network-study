import type { TopoBeat, TopoNode, TopoTag, TopologyState } from '../../scenes/topology/types'
import type { Step } from '../types'

// 출처: Week06 PDF p.5 (보안을 회사 건물로 이해하기), p.6 (공격은 어디에서 일어나는가), p.46 (Defense in Depth)
// 제작 제외: p.1–4 (표지·Learning Objectives·지난주에서 이번주로·Core Vocabulary)
// 패널 글은 배경과 흐름이 보이게 풀어 쓴다. 강의자료에 없는 설명은 // 보충

/** 레인 위 간격 (왼쪽 아래 → 오른쪽 위) */
const GAP = 250

// ── 회사 건물 (p.5) ────────────────────────────────────────
const BUILDING: TopoNode[] = [
  { id: 'visitor', label: '방문객', kind: 'person', t: 0 },
  { id: 'gate', label: '경비 정문', kind: 'gate', t: GAP },
  { id: 'desk', label: '안내 데스크', kind: 'desk', t: GAP * 2 },
  { id: 'card', label: '출입카드 발급', kind: 'card', t: GAP * 3 },
  { id: 'floor', label: '층별 게이트', kind: 'floor', t: GAP * 4 },
  { id: 'log', label: '출입 기록', kind: 'log', t: GAP * 5 },
]
const chain = (ids: string[]) => ids.slice(0, -1).map((from, i) => ({ from, to: ids[i + 1] }))

/** 방문객이 문을 하나 지날 때마다: 건물의 질문(위) → 웹에서는(맨 위) */
const STATIONS: { id: string; question: string; web: string }[] = [
  { id: 'gate', question: '진짜 우리 회사인가?', web: 'TLS + 인증서' },
  { id: 'desk', question: '당신은 누구인가?', web: '인증 (Authentication)' },
  { id: 'card', question: '매번 신분증 대신 카드로', web: '세션 · JWT' },
  { id: 'floor', question: '7층에 가도 되나?', web: '인가 (Authorization)' },
  { id: 'log', question: '누가 언제 드나들었나?', web: '로그 · 감사' },
]
const walk: TopoBeat[] = STATIONS.flatMap((st, i) => [
  { kind: 'flow', id: `walk-${st.id}`, path: [BUILDING[i].id, st.id], label: '방문객' },
  {
    kind: 'tags',
    id: `tag-${st.id}`,
    tags: [
      { node: st.id, text: st.question, tone: 'info' },
      { node: st.id, text: st.web, tone: 'term' },
    ],
  },
])

// ── 요청 경로 (p.6) ───────────────────────────────────────
const ROUTE: TopoNode[] = [
  { id: 'browser', label: '브라우저', sub: '사용자', kind: 'browser', t: 0 },
  { id: 'network', label: '네트워크', sub: 'Wi-Fi · ISP', kind: 'network', t: GAP },
  { id: 'server', label: '웹 서버', sub: 'API', kind: 'server', t: GAP * 2 },
  { id: 'auth', label: '인증·인가', sub: '로직', kind: 'auth', t: GAP * 3 },
  { id: 'db', label: 'DB', sub: 'Database', kind: 'db', t: GAP * 4 },
]
const ROUTE_IDS = ROUTE.map((n) => n.id)
const ROUTE_LINKS = chain(ROUTE_IDS)

/** p.6 표: 구간별 공격 (Threat) */
const THREATS: TopoTag[] = [
  ...['XSS로 토큰 탈취', '피싱 사이트', '약한 비밀번호'].map((text) => ({ node: 'browser', text, tone: 'threat' as const })),
  ...['도청 (Sniffing)', '중간자 공격 (MITM)', '가짜 인증서'].map((text) => ({ node: 'network', text, tone: 'threat' as const })),
  ...['CSRF 위조 요청', '무차별 대입', 'Secret 노출'].map((text) => ({ node: 'server', text, tone: 'threat' as const })),
  ...['권한 검사 누락', 'IDOR (남의 id 조회)', '토큰 서명 미검증'].map((text) => ({ node: 'auth', text, tone: 'threat' as const })),
  ...['SQL Injection', '평문 비밀번호 유출', '과다 데이터 노출'].map((text) => ({ node: 'db', text, tone: 'threat' as const })),
]
/** p.6 표: 구간별 방어 (Control) */
const DEFENSES: TopoTag[] = [
  ...['HttpOnly 쿠키 · CSP', 'MFA · 출력 이스케이프'].map((text) => ({ node: 'browser', text, tone: 'defense' as const })),
  ...['TLS (HTTPS)', '인증서 검증 · HSTS'].map((text) => ({ node: 'network', text, tone: 'defense' as const })),
  ...['SameSite · CSRF 토큰', 'Rate limit (429)'].map((text) => ({ node: 'server', text, tone: 'defense' as const })),
  ...['서버측 RBAC', '소유권 검사 · 403'].map((text) => ({ node: 'auth', text, tone: 'defense' as const })),
  ...['파라미터 바인딩', 'Argon2/bcrypt 해시'].map((text) => ({ node: 'db', text, tone: 'defense' as const })),
]
/** 노드마다 알약 묶음을 하나씩 차례로 붙이는 비트 */
const tagBeats = (tags: TopoTag[], prefix: string): TopoBeat[] =>
  ROUTE_IDS.map((id) => ({ kind: 'tags', id: `${prefix}-${id}`, tags: tags.filter((t) => t.node === id) }))

const toDb = ROUTE_IDS
const toBrowser = [...ROUTE_IDS].reverse()

const state = (s: Omit<TopologyState, 'kind'>): TopologyState => ({ kind: 'topology', ...s })

export const securityMap: Step = {
  id: 'security-map',
  no: '6-1',
  title: '보안의 큰 그림',
  slides: [5, 6, 46],
  scene: 'topology',
  easy: {
    title: '회사 건물로 보는 웹 보안',
    body: '웹 보안은 회사 건물에 드나드는 절차와 같다.\n\n① 경비 정문: 건물이 진짜 우리 회사인가? 간판·사업자등록증을 확인한다 → **TLS + 인증서** (서버 신원 확인, 암호화된 통로)\n② 안내 데스크: 당신은 누구인가? 신분증을 보여 달라 → **Authentication** (ID/비밀번호, MFA)\n③ 출입카드 발급: 매번 신분증 대신 카드만 찍고 다닌다 → **Session · JWT** (로그인 상태 유지)\n④ 층별 게이트: 이 카드로 7층 연구실에 들어갈 수 있나? → **Authorization** (역할·소유권 검사)\n⑤ 출입 기록: 누가 언제 어디를 드나들었나? → **Logging · Audit** (이상 징후 탐지)\n\n빠지면 어떻게 될까?\n· ①이 없으면 가짜 건물에 들어가 정보를 넘긴다 → 피싱·중간자(MITM)가 비밀번호와 토큰을 가로챈다\n· ④가 없으면 1층 카드로 사장실까지 열린다 → 학생 토큰으로 /admin, 남의 /grades/1002까지 조회된다 (IDOR)',
  },
  phases: [
    {
      label: '회사 건물',
      title: '보안을 회사 건물로 보기',
      body: '웹 보안은 회사 건물의 출입 절차와 닮았다. 방문객은 다섯 곳을 차례로 지난다.\n① 경비 정문: 진짜 우리 회사 건물인가? → **TLS + 인증서**\n② 안내 데스크: 당신은 누구인가? → **인증**\n③ 출입카드 발급: 매번 신분증 대신 카드로 → **세션 · JWT**\n④ 층별 게이트: 이 카드로 7층에 가도 되나? → **인가**\n⑤ 출입 기록: 누가 언제 드나들었나? → **로그 · 감사**',
      // 보충: Week 6 Step 순서와 잇는 문장
      keyPoint: '이번 주 Step들은 이 다섯 곳을 하나씩 열어 보는 순서다.',
      state: state({
        nodes: BUILDING,
        links: chain(BUILDING.map((n) => n.id)),
        beats: walk,
        notes: [{ text: '웹 보안도 이 다섯 단계를 차례로 지난다', after: 'tag-log' }],
      }),
    },
    {
      label: '요청 경로',
      title: '요청 하나가 지나가는 길',
      body: "이제 건물을 실제 시스템으로 바꿔 보자. '내 성적 조회' 요청은 **브라우저 → 네트워크(Wi-Fi·ISP) → 웹 서버 → 인증·인가 로직 → DB**를 지나고, 응답은 같은 길로 돌아온다.\n\n공격은 이 길 위 **어디서든** 일어날 수 있다. 그래서 방어도 구간마다 따로 둔다.",
      state: state({
        nodes: ROUTE,
        links: ROUTE_LINKS,
        beats: [
          { kind: 'flow', id: 'req', path: toDb, label: 'GET /v1/grades', detail: '내 성적 조회', tone: 'request' },
          { kind: 'flow', id: 'res', path: toBrowser, label: '200 OK', detail: '성적 데이터', tone: 'response' },
        ],
        notes: [{ text: '요청은 다섯 구간을 지나고, 응답은 같은 길로 돌아온다', after: 'res' }],
      }),
    },
    {
      label: '공격 지점',
      title: '구간마다 다른 공격',
      // 보충: 마지막 문장 (뒤 Step과 잇기)
      body: '같은 요청이라도 지나는 구간마다 노리는 공격이 다르다.\n· 브라우저: XSS로 토큰 탈취 · 피싱 · 약한 비밀번호\n· 네트워크: 도청 · 중간자(MITM) · 가짜 인증서\n· 웹 서버: CSRF · 무차별 대입 · Secret 노출\n· 인증·인가: 권한 검사 누락 · IDOR · 서명 미검증\n· DB: SQL Injection · 평문 비밀번호 유출 · 과다 노출\n\n지금은 이름만 익혀 두자. 뒤 Step에서 하나씩 직접 해 본다.',
      state: state({
        nodes: ROUTE,
        links: ROUTE_LINKS,
        beats: tagBeats(THREATS, 'threat'),
        notes: [{ text: '구간마다 노리는 공격이 다르다', after: 'threat-db' }],
      }),
    },
    {
      label: '방어 장치',
      title: '구간마다 맞는 방어',
      body: '그래서 방어도 구간마다 따로 둔다.\n· 브라우저: HttpOnly 쿠키 · CSP · MFA · 출력 이스케이프\n· 네트워크: TLS(HTTPS) · 인증서 검증 · HSTS\n· 웹 서버: SameSite · CSRF 토큰 · Rate limit(429)\n· 인증·인가: 서버측 RBAC · 소유권 검사(403)\n· DB: 파라미터 바인딩 · Argon2/bcrypt 해시',
      pitfall: '"HTTPS 켰으니 끝"이 아니다. TLS는 **네트워크 구간**만 지킨다. 브라우저 안(XSS), 서버 로직(IDOR), DB(SQLi)는 각자 따로 지켜야 한다.',
      state: state({
        nodes: ROUTE,
        links: ROUTE_LINKS,
        tags: THREATS,
        beats: [...tagBeats(DEFENSES, 'defense'), { kind: 'zone', id: 'tls-zone', nodes: ['network'], label: 'TLS가 지키는 구간' }],
        notes: [{ text: 'TLS(HTTPS)는 네트워크 구간만 지킨다', after: 'tls-zone' }],
      }),
    },
    {
      label: '빠지면?',
      title: '장치 하나가 빠지면 무엇이 깨지나',
      body: '① 정문(TLS)이 없으면 가짜 건물에 정보를 넘기는 셈이다. 같은 Wi-Fi의 중간자가 오가는 **비밀번호와 토큰**을 그대로 가로챈다.\n\n④ 층별 게이트(인가)가 없으면 1층 카드로 사장실까지 열린다. 학생 토큰으로 /admin, 남의 /grades/1002까지 조회된다(**IDOR**).',
      keyPoint: '방어는 한 겹이 아니라 **여러 겹**(Defense in Depth)이다. 한 계층이 뚫려도 다음 계층이 피해를 줄이도록 설계한다.',
      state: state({
        nodes: [...ROUTE, { id: 'attacker', label: '중간자', kind: 'attacker', t: GAP, side: 300 }],
        links: [...ROUTE_LINKS, { from: 'network', to: 'attacker', style: 'danger' }],
        beats: [
          { kind: 'tags', id: 'no-tls', tags: [{ node: 'network', text: 'TLS 없음', tone: 'warn' }] },
          { kind: 'flow', id: 'login', path: ['browser', 'network', 'server'], label: 'POST /login', detail: 'pw=inu1234', tone: 'request' },
          { kind: 'flow', id: 'leak', path: ['network', 'attacker'], label: '그대로 복사', detail: 'pw=inu1234', tone: 'danger' },
          { kind: 'tags', id: 'stolen', tags: [{ node: 'attacker', text: '비밀번호 · 토큰 탈취', tone: 'threat' }] },
          { kind: 'tags', id: 'no-authz', tags: [{ node: 'auth', text: '인가 검사 없음', tone: 'warn' }] },
          { kind: 'flow', id: 'idor-req', path: toDb, label: 'GET /grades/1002', detail: '학생 토큰', tone: 'request' },
          { kind: 'flow', id: 'idor-res', path: toBrowser, label: '200 OK', detail: '남의 성적', tone: 'danger' },
          { kind: 'tags', id: 'idor', tags: [{ node: 'browser', text: '남의 성적 조회 (IDOR)', tone: 'threat' }] },
        ],
        notes: [
          { text: '① TLS가 빠지면: 비밀번호·토큰이 그대로 샌다', after: 'stolen' },
          { text: '④ 인가가 빠지면: 남의 성적까지 조회된다', after: 'idor' },
        ],
      }),
    },
  ],
  quiz: [
    {
      q: 'HTTPS를 켰으면 웹 서비스 보안은 끝났다고 할 수 있는가?',
      answer:
        '아니다. TLS(HTTPS)는 네트워크 구간의 도청·변조·사칭만 막는다. 브라우저 안의 XSS, 서버 로직의 권한 검사 누락(IDOR), DB의 SQL Injection처럼 다른 구간의 공격은 그 구간에서 따로 막아야 한다.',
      why: 'p.6: 보안은 "HTTPS 켰으니 끝"이 아니다 — TLS는 네트워크 구간만 지킨다. (Quick Check 문항이 아니라 이 Step의 확인 문제)',
    },
  ],
}
