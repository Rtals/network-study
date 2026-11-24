import type { StageNote } from '../../scenes/sequence/types'
import type { TopoBeat, TopoLink, TopoNode, TopoTag, TopologyState } from '../../scenes/topology/types'
import type { Step } from '../types'

// 출처: Week06 PDF p.32 (토큰은 브라우저 어디에 저장하는가 · 저장 위치 표 · 권장 조합(SPA) · 주의),
//       p.33 (Design Choice — Session vs JWT 비교표 · 선택 기준)
// 패널 글은 배경과 흐름이 보이게 풀어 쓴다. 강의자료에 없는 설명은 // 보충

const tags = (id: string, ...list: TopoTag[]): TopoBeat => ({ kind: 'tags', id, tags: list })

/* ── Phase 1~5: 저장소 4곳 · 페이지 · 서버 (· 공격자) ── */

// 위 줄: 저장소 4곳 (왼쪽 아래 → 오른쪽 위), 아래 줄: 공격자 · 페이지 · 서버
const UP = -210
const DOWN = 230
const STORES: TopoNode[] = [
  { id: 'local', label: 'localStorage', kind: 'storage', t: 0, side: UP },
  { id: 'session', label: 'sessionStorage', kind: 'storage', t: 250, side: UP },
  { id: 'memory', label: '메모리', sub: 'JS 변수', kind: 'memory', t: 500, side: UP },
  { id: 'cookie', label: 'HttpOnly 쿠키', kind: 'cookie', t: 750, side: UP },
]
const PAGE: TopoNode = { id: 'page', label: '브라우저 페이지', sub: 'SPA', kind: 'browser', t: 375, side: DOWN }
const SERVER: TopoNode = { id: 'server', label: '서버', sub: 'API', kind: 'server', t: 750, side: DOWN }

function storageScene(
  beats: TopoBeat[],
  notes: StageNote[],
  o: { attacker?: { label: string; sub: string }; tags?: TopoTag[] } = {},
): TopologyState {
  const nodes = [...STORES, PAGE, SERVER]
  const links: TopoLink[] = [...STORES.map((s) => ({ from: s.id, to: 'page' })), { from: 'page', to: 'server' }]
  if (o.attacker) {
    nodes.push({ id: 'attacker', ...o.attacker, kind: 'attacker', t: 0, side: DOWN })
    links.push({ from: 'page', to: 'attacker', style: 'danger', both: true })
  }
  return { kind: 'topology', nodes, links, tags: o.tags, beats, notes }
}

const XSS_RUN: TopoTag = { node: 'page', text: 'XSS 스크립트 실행 중', tone: 'threat' }
const THIEF = { label: '공격자 서버', sub: '훔친 것을 받음' }

/* ── Phase 6~7: Session vs JWT ── */

const ROW = 230
const s = (n: Omit<TopoNode, 'side'>, row: -1 | 1): TopoNode => ({ ...n, side: row * ROW })

export const tokenStorage: Step = {
  id: 'token-storage',
  no: '6-17',
  title: '토큰 저장 위치와 Session vs JWT',
  slides: [32, 33],
  scene: 'topology',
  // 보충: 강의자료에 이 주제의 비유가 없어 열쇠 보관 비유를 만들었다
  easy: {
    title: '토큰을 집 열쇠라고 생각하면',
    body: '로그인 토큰은 집 열쇠와 같다. 어디에 두느냐에 따라 잃어버리는 방식이 달라진다.\n\n**localStorage · sessionStorage = 우편함 속 열쇠**\n· 손을 넣는 사람은 누구나 가져간다 (XSS 스크립트가 읽음)\n· 대신 내가 들고 다니지 않으니 남이 내 손을 빌려 문을 열 수는 없다 (자동 전송 없음 → CSRF 안전)\n\n**메모리 = 손에 쥔 열쇠**\n· 빼앗기 어렵다\n· 내려놓으면 사라진다 (새로고침 시 사라짐)\n\n**HttpOnly 쿠키 = 경비원에게 맡긴 열쇠**\n· 열쇠를 꺼내 갈 수는 없다 (JS로 읽기 불가)\n· 하지만 경비원은 문 앞에 온 사람에게 문을 열어 준다 (자동 전송 → CSRF 주의, 그 페이지의 스크립트도 요청 가능)\n\n그래서 권장 조합은 자주 쓰는 출입증(Access)은 손에, 재발급용 열쇠(Refresh)는 경비원에게.',
  },
  phases: [
    {
      label: '4곳',
      title: '토큰은 어디에 둘까',
      body: '로그인해서 받은 토큰은 브라우저 어딘가에 보관해야 한다. 후보는 네 곳이다.\n\n**정답은 하나가 아니다.** 어디에 두든 **XSS와 CSRF 중 무엇을 더 막을지의 트레이드오프**다.',
      state: storageScene(
        [
          { kind: 'flow', id: 'login', path: ['server', 'page'], label: '200 OK', detail: '토큰', tone: 'response' },
          tags('local', { node: 'local', text: 'JS로 읽기 가능', tone: 'info' }),
          tags('session', { node: 'session', text: 'JS로 읽기 가능', tone: 'info' }, { node: 'session', text: '탭 닫으면 사라짐', tone: 'info' }),
          tags('memory', { node: 'memory', text: 'JS로 읽기 가능', tone: 'info' }, { node: 'memory', text: '새로고침 시 사라짐', tone: 'info' }),
          tags('cookie', { node: 'cookie', text: 'JS로 읽기 불가', tone: 'term' }),
        ],
        [{ text: '네 곳 모두 장단점이 있다: XSS냐 CSRF냐', after: 'cookie' }],
      ),
    },
    {
      label: 'XSS 시',
      title: '심어진 스크립트가 토큰을 읽으면',
      body: 'XSS로 페이지에 스크립트가 심어지면, 그 스크립트는 JS가 읽을 수 있는 것을 모두 읽는다.\n· localStorage · sessionStorage: 그대로 읽혀 **XSS 한 번이면 끝**\n· 메모리: 페이지가 실행 중일 때만 있어 **탈취가 어렵다**\n· HttpOnly 쿠키: JS가 읽지 못해 **탈취할 수 없다**',
      state: storageScene(
        [
          tags('xss', XSS_RUN),
          { kind: 'flow', id: 'steal-local', path: ['local', 'page', 'attacker'], label: '토큰 탈취', tone: 'danger' },
          tags('local', { node: 'local', text: '탈취 ✕', tone: 'threat' }),
          { kind: 'flow', id: 'steal-session', path: ['session', 'page', 'attacker'], label: '토큰 탈취', tone: 'danger' },
          tags('session', { node: 'session', text: '탈취 ✕', tone: 'threat' }),
          tags('memory', { node: 'memory', text: '탈취 어려움 △', tone: 'warn' }),
          tags('cookie', { node: 'cookie', text: '읽을 수 없음 → 탈취 불가', tone: 'defense' }),
        ],
        [{ text: 'JS가 읽을 수 있으면 XSS가 가져간다', after: 'cookie' }],
        { attacker: THIEF },
      ),
    },
    {
      label: 'CSRF 시',
      title: '남의 사이트가 요청을 보내게 하면',
      body: 'CSRF는 반대다. 공격자 사이트가 사용자의 브라우저로 요청을 보내게 만든다(6-12).\n· localStorage · sessionStorage · 메모리의 토큰은 **자동으로 전송되지 않아** 안전하다\n· 쿠키는 **자동으로 붙기** 때문에 SameSite로 막아야 한다(6-13)',
      state: storageScene(
        [
          { kind: 'flow', id: 'forge', path: ['attacker', 'page'], label: '숨은 요청', detail: 'POST /transfer', tone: 'danger' },
          { kind: 'flow', id: 'attach', path: ['cookie', 'page'], label: '쿠키 자동 첨부', tone: 'request' },
          { kind: 'flow', id: 'send', path: ['page', 'server'], label: 'POST /transfer', detail: '쿠키 붙음', tone: 'danger' },
          tags(
            'safe',
            { node: 'local', text: '자동 전송 없음 → 안전', tone: 'defense' },
            { node: 'session', text: '자동 전송 없음 → 안전', tone: 'defense' },
            { node: 'memory', text: '자동 전송 없음 → 안전', tone: 'defense' },
          ),
          tags('cookie', { node: 'cookie', text: 'SameSite로 방어 필요', tone: 'warn' }),
        ],
        [{ text: '자동으로 붙는 쿠키만 CSRF에 쓰인다', after: 'cookie' }],
        { attacker: { label: 'evil.com', sub: '공격자 사이트' } },
      ),
    },
    {
      label: '권장 조합',
      title: 'SPA라면 Access는 메모리, Refresh는 쿠키',
      body: 'SPA의 권장 조합은 이렇다.\n· **Access Token → 메모리**: XSS로 훔치기 어렵고, 자동 전송이 없어 CSRF에도 안전\n· **Refresh Token → HttpOnly · Secure · SameSite=Strict 쿠키**: JS가 못 읽고, 다른 사이트 요청엔 붙지 않음\n\n메모리는 새로고침하면 비워지므로, refresh endpoint로 Access Token을 다시 받는다(6-16).',
      state: storageScene(
        [
          { kind: 'flow', id: 'at', path: ['server', 'page', 'memory'], label: 'Access Token', tone: 'response' },
          tags('at-tag', { node: 'memory', text: 'Access Token', tone: 'term' }),
          { kind: 'flow', id: 'rt', path: ['server', 'page', 'cookie'], label: 'Set-Cookie', detail: 'Refresh Token', tone: 'response' },
          tags('rt-tag', { node: 'cookie', text: 'Refresh Token', tone: 'term' }, { node: 'cookie', text: 'HttpOnly; Secure; SameSite=Strict', tone: 'info' }),
          tags('reload', { node: 'memory', text: '새로고침 → AT 사라짐', tone: 'warn' }),
          { kind: 'flow', id: 'refresh', path: ['cookie', 'page', 'server'], label: 'POST /token/refresh', detail: '쿠키: RT', tone: 'request' },
          { kind: 'flow', id: 'again', path: ['server', 'page', 'memory'], label: '200 OK', detail: '새 Access Token', tone: 'response' },
        ],
        [{ text: 'Access는 메모리, Refresh는 HttpOnly 쿠키 → 새로고침엔 재발급', after: 'again' }],
      ),
    },
    {
      label: 'HttpOnly',
      title: '훔치진 못해도, 그 페이지에서 요청은 보낸다',
      body: 'HttpOnly 쿠키도 **XSS를 \'해결\'하지는 않는다.** 쿠키를 꺼내 가는 것은 막지만, 스크립트가 **그 페이지에서 요청을 보내는 것은 가능**하다. 쿠키는 자동으로 붙으니 서버는 사용자의 요청으로 믿는다.\n\n그래서 **XSS 자체를 막는 것(출력 이스케이프 · CSP)이 먼저**다(6-21).',
      pitfall: 'AI가 만든 React 코드의 localStorage.setItem("token", …)은 가장 흔한 패턴이다. 학습용으로는 괜찮지만, 배포 전에는 저장 위치를 다시 결정하자.',
      state: storageScene(
        [
          tags('xss', XSS_RUN),
          tags('read', { node: 'cookie', text: '읽기 시도 → 실패', tone: 'defense' }),
          { kind: 'flow', id: 'attach', path: ['cookie', 'page'], label: '쿠키 자동 첨부', tone: 'request' },
          { kind: 'flow', id: 'req', path: ['page', 'server'], label: 'GET /grades', detail: '스크립트가 보냄', tone: 'danger' },
          { kind: 'flow', id: 'res', path: ['server', 'page'], label: '200 OK', detail: '[성적]', tone: 'response' },
          { kind: 'flow', id: 'leak', path: ['page', 'attacker'], label: '[성적] 유출', tone: 'danger' },
          tags('fix', { node: 'page', text: '출력 이스케이프 · CSP가 먼저', tone: 'defense' }),
        ],
        [{ text: '토큰은 못 훔쳐도, 사용자인 척 요청은 보낸다', after: 'leak' }],
        { attacker: THIEF },
      ),
    },
    {
      label: '상태·차단',
      title: 'Session은 지우면 끝, JWT는 만료까지',
      // 보충: 첫 문장 (6-12·6-14와 잇기)
      body: '6-12의 세션과 6-14의 JWT는 로그인 상태를 어디에 두느냐가 다르다.\n· **Session**: Stateful. 서버 저장소가 필요하지만, 지우기만 하면 되므로 **즉시 로그아웃 · 강제 차단이 쉽다**\n· **JWT**: Stateless. 키만 있으면 검증되지만, 서버가 지울 것이 없어 **만료 전에 끊기 어렵다** (블랙리스트가 필요)',
      state: {
        kind: 'topology',
        nodes: [
          s({ id: 'sb', label: '브라우저', sub: 'Session', kind: 'browser', t: 0 }, -1),
          s({ id: 'ss', label: '서버', sub: 'Session', kind: 'server', t: 330 }, -1),
          s({ id: 'sdb', label: '세션 저장소', kind: 'db', t: 660 }, -1),
          s({ id: 'jb', label: '브라우저', sub: 'JWT', kind: 'browser', t: 0 }, 1),
          s({ id: 'js', label: '서버', sub: 'JWT', kind: 'server', t: 330 }, 1),
        ],
        links: [
          { from: 'sb', to: 'ss' },
          { from: 'ss', to: 'sdb' },
          { from: 'jb', to: 'js' },
        ],
        tags: [
          { node: 'sdb', text: 'sid=abc → user 42', tone: 'info' },
          { node: 'js', text: '키만으로 검증 (Stateless)', tone: 'info' },
        ],
        beats: [
          { kind: 'flow', id: 's-del', path: ['ss', 'sdb'], label: 'sid=abc 삭제', detail: '로그아웃 · 강제 차단', tone: 'request' },
          tags('s-gone', { node: 'sdb', text: '삭제됨', tone: 'warn' }),
          { kind: 'flow', id: 's-req', path: ['sb', 'ss', 'sdb'], label: 'GET /grades', detail: 'sid=abc', tone: 'request' },
          { kind: 'flow', id: 's-res', path: ['ss', 'sb'], label: '401', detail: '없는 세션', tone: 'danger' },
          tags('s-ok', { node: 'ss', text: '즉시 차단', tone: 'defense' }),
          { kind: 'flow', id: 'j-req', path: ['jb', 'js'], label: 'GET /grades', detail: '로그아웃한 JWT', tone: 'request' },
          { kind: 'flow', id: 'j-res', path: ['js', 'jb'], label: '200 OK', detail: '서명·exp 정상', tone: 'response' },
          tags('j-warn', { node: 'js', text: '만료까지 유효 → 블랙리스트 필요', tone: 'warn' }),
        ],
        notes: [
          { text: 'Session: 저장소에서 지우면 바로 끊긴다', after: 's-ok' },
          { text: 'JWT: 서버엔 지울 것이 없어 만료까지 통과', after: 'j-warn' },
        ],
      },
    },
    {
      label: '확장·크기',
      title: '서버를 늘리면, 그리고 매 요청의 크기',
      body: '· **Scale-out**: Session은 서버가 늘면 Redis 같은 **공유 저장소**를 함께 봐야 한다. JWT는 서버를 늘려도 그대로다\n· **여러 서비스**: JWT는 공개키(RS256)로 서비스마다 **독립 검증**한다(6-15)\n· **요청 크기**: sid는 수십 바이트, JWT는 수백 바이트~수 KB이고 **매 요청**에 실린다',
      signal: '대표 위험 — Session: 세션 탈취 · CSRF / JWT: 토큰 탈취 · 검증 누락 · 긴 만료',
      state: {
        kind: 'topology',
        nodes: [
          { id: 'b', label: '브라우저', kind: 'browser', t: 0 },
          { id: 'a1', label: '서버 A', kind: 'server', t: 340, side: -190 },
          { id: 'a2', label: '서버 B', kind: 'server', t: 340, side: 190 },
          { id: 'redis', label: '공유 세션 저장소', sub: 'Redis', kind: 'db', t: 680 },
        ],
        links: [
          { from: 'b', to: 'a1' },
          { from: 'b', to: 'a2' },
          { from: 'a1', to: 'redis' },
          { from: 'a2', to: 'redis' },
        ],
        beats: [
          { kind: 'flow', id: 's1', path: ['b', 'a1', 'redis'], label: 'Cookie: sid', detail: '수십 바이트', tone: 'request' },
          { kind: 'flow', id: 's2', path: ['b', 'a2', 'redis'], label: 'Cookie: sid', detail: '수십 바이트', tone: 'request' },
          tags('s-need', { node: 'redis', text: 'Session: 공유 저장소 필요', tone: 'warn' }),
          { kind: 'flow', id: 'j1', path: ['b', 'a1'], label: 'Bearer eyJ…', detail: '수백 B~수 KB', tone: 'request' },
          tags('j1v', { node: 'a1', text: '공개키로 검증', tone: 'term' }),
          { kind: 'flow', id: 'j2', path: ['b', 'a2'], label: 'Bearer eyJ…', detail: '수백 B~수 KB', tone: 'request' },
          tags('j2v', { node: 'a2', text: '공개키로 검증', tone: 'term' }),
          tags('size', { node: 'b', text: 'JWT는 매 요청마다 크다', tone: 'info' }),
        ],
        notes: [
          { text: 'Session: 서버가 늘면 같은 저장소를 봐야 한다', after: 's-need' },
          { text: 'JWT: 저장소 없이 각자 검증, 대신 요청이 크다', after: 'size' },
        ],
      },
    },
    {
      label: '선택 기준',
      title: "'항상 좋은 기술'은 없다",
      body: '서비스의 요구사항이 선택을 정한다.\n· 같은 도메인의 웹사이트, 즉시 차단이 중요 → **Session**\n· 모바일 앱 · 마이크로서비스 · 여러 API → **JWT (짧은 만료 + Refresh)**\n· IoT 기기 · 서버 간 자동 호출 → **API Key 또는 mTLS**\n\n실무에서는 섞어 쓴다. 웹은 세션 쿠키, 내부 서비스는 JWT, 외부 파트너는 API Key · OAuth.',
      keyPoint: "Session과 JWT는 어느 쪽이 '좋다'가 아니라 '언제' 쓰느냐의 문제다.",
      state: {
        kind: 'topology',
        nodes: [
          { id: 'web', label: '웹 브라우저', sub: '같은 도메인', kind: 'browser', t: 0, side: -300 },
          { id: 'app', label: '모바일 앱', sub: '여러 API', kind: 'phone', t: 0, side: 0 },
          { id: 'iot', label: 'IoT 기기', sub: '서버 간 호출', kind: 'network', t: 0, side: 300 },
          { id: 'w-srv', label: '웹 서버', kind: 'server', t: 360, side: -300 },
          { id: 'a-srv', label: '마이크로서비스', kind: 'server', t: 360, side: 0 },
          { id: 'i-srv', label: '수집 API', kind: 'server', t: 360, side: 300 },
        ],
        links: [
          { from: 'web', to: 'w-srv' },
          { from: 'app', to: 'a-srv' },
          { from: 'iot', to: 'i-srv' },
        ],
        beats: [
          { kind: 'flow', id: 'web', path: ['web', 'w-srv'], label: 'Cookie: sid', tone: 'request' },
          tags('web-t', { node: 'w-srv', text: 'Session', tone: 'term' }),
          { kind: 'flow', id: 'app', path: ['app', 'a-srv'], label: 'Bearer JWT', tone: 'request' },
          tags('app-t', { node: 'a-srv', text: 'JWT (짧은 만료 + Refresh)', tone: 'term' }),
          { kind: 'flow', id: 'iot', path: ['iot', 'i-srv'], label: 'API Key / mTLS', tone: 'request' },
          tags('iot-t', { node: 'i-srv', text: 'API Key 또는 mTLS', tone: 'term' }),
        ],
        notes: [{ text: '요구사항이 고른다. 실무에서는 섞어 쓴다', after: 'iot-t' }],
      },
    },
  ],
  quiz: [
    {
      q: '토큰을 HttpOnly 쿠키에 두어도 XSS가 해결되지 않는 이유는?',
      answer:
        'HttpOnly는 자바스크립트가 쿠키를 읽지 못하게 해 토큰을 꺼내 가는 것(탈취)만 막는다. 심어진 스크립트는 여전히 그 페이지에서 요청을 보낼 수 있고, 쿠키는 자동으로 붙으므로 서버는 사용자의 요청으로 믿고 응답한다. 그래서 출력 이스케이프와 CSP로 XSS 자체를 막는 것이 먼저다.',
      why: 'p.32 주의 "HttpOnly 쿠키도 XSS를 해결하지 않는다 — 탈취는 막지만 그 페이지에서 요청을 보내는 것은 가능". (Quick Check 문항이 아니라 이 Step의 확인 문제)',
    },
  ],
}
