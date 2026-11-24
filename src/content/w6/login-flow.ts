import type { TopoBeat, TopoLink, TopoNode, TopoTag, TopologyState } from '../../scenes/topology/types'
import type { Step } from '../types'

// 출처: Week06 PDF p.21 (로그인 한 번의 전체 흐름 ①~⑤ · 로그인 API 체크리스트)
// 패널 글은 배경과 흐름이 보이게 풀어 쓴다. 강의자료에 없는 설명은 // 보충

const tags = (id: string, ...list: TopoTag[]): TopoBeat => ({ kind: 'tags', id, tags: list })

const GAP = 320
const NODES: TopoNode[] = [
  { id: 'browser', label: '브라우저', kind: 'browser', t: 0 },
  { id: 'api', label: 'API 서버', sub: '/login', kind: 'server', t: GAP },
  { id: 'db', label: 'User DB', kind: 'db', t: GAP * 2 },
]
const LINKS: TopoLink[] = [
  { from: 'browser', to: 'api' },
  { from: 'api', to: 'db' },
]
const scene = (s: Omit<TopologyState, 'kind' | 'nodes' | 'links'>): TopologyState => ({ kind: 'topology', nodes: NODES, links: LINKS, ...s })

const LOGIN: TopoBeat = { kind: 'flow', id: 'login', path: ['browser', 'api'], label: 'POST /login', detail: '{id, pw} · HTTPS', tone: 'request' }
const LOOKUP: TopoBeat[] = [
  { kind: 'flow', id: 'select', path: ['api', 'db'], label: 'SELECT hash, role', detail: 'WHERE id = ?', tone: 'request' },
  { kind: 'flow', id: 'hash', path: ['db', 'api'], label: '$argon2id$…', detail: '저장된 해시 + role', tone: 'response' },
]

export const loginFlow: Step = {
  id: 'login-flow',
  no: '6-11',
  title: '로그인 한 번의 전체 흐름',
  slides: [21],
  scene: 'topology',
  phases: [
    {
      label: '전송',
      title: '① 비밀번호는 HTTPS 위로 한 번 보낸다',
      body: '로그인은 **TLS(HTTPS) 위에서** 아이디와 비밀번호를 보내는 데서 시작한다(6-2~6-7). 평문 HTTP로는 절대 받지 않는다.',
      // 보충: URL에 넣으면 로그와 기록에 남는다는 설명
      pitfall: '비밀번호는 **로그·URL·쿼리에 남기지 않는다.** GET /login?pw=…처럼 URL에 넣으면 서버 로그와 브라우저 기록에 그대로 남는다.',
      state: scene({
        beats: [LOGIN, tags('https', { node: 'api', text: 'HTTPS로만 받음', tone: 'defense' }, { node: 'api', text: '로그·URL에 비밀번호 ✕', tone: 'defense' })],
        notes: [{ text: '아이디·비밀번호는 HTTPS 위로', after: 'https' }],
      }),
    },
    {
      label: '해시 비교',
      title: '② 저장된 해시를 꺼내 비교한다',
      body: '서버는 DB에서 그 아이디의 **해시와 역할(role)**을 꺼낸다. 그리고 입력받은 비밀번호를 같은 방식으로 해시해 저장된 값과 비교한다(verify(입력, 저장된 해시), 6-10).\n\n서버는 비밀번호 원문을 저장하지도, 되돌리지도 않는다.',
      state: scene({
        beats: [...LOOKUP, tags('verify', { node: 'api', text: 'verify(입력, 저장된 해시) ✓', tone: 'defense' })],
        notes: [{ text: '입력을 해시해 저장된 해시와 비교한다', after: 'verify' }],
      }),
    },
    {
      label: '출입증',
      title: '③ 성공하면 출입증(세션·토큰)을 준다',
      // 보충: (→ 6-12, 6-14) 다음 Step과 잇기
      body: '비교에 성공하면 서버는 **출입증**을 발급한다. 세션 쿠키(Set-Cookie)나 토큰이다(→ 6-12, 6-14). 체크리스트에서 두 가지를 지킨다.\n· 성공할 때마다 **새** 세션/토큰을 발급한다 (기존 값 재사용 ✕)\n· 응답에 해시·role 같은 내부 정보를 넣지 않는다',
      state: scene({
        tags: [{ node: 'api', text: 'verify ✓', tone: 'defense' }],
        beats: [
          tags('issue', { node: 'api', text: '새 세션/토큰 발급 (재사용 ✕)', tone: 'term' }),
          { kind: 'flow', id: 'ok', path: ['api', 'browser'], label: '200 OK', detail: 'Set-Cookie 또는 token', tone: 'response' },
          tags('keep', { node: 'browser', text: '출입증 보관', tone: 'term' }, { node: 'browser', text: '응답에 해시·role ✕', tone: 'defense' }),
        ],
        notes: [{ text: '성공 → 새 출입증(세션·토큰) 발급', after: 'keep' }],
      }),
    },
    {
      label: '실패',
      title: '④ 실패는 401, 메시지는 모호하게',
      body: '비교에 실패하면 **401**을 돌려준다. 이때 "아이디 없음"과 "비밀번호 틀림"을 구분해 알려 주지 않는다. 구분해 주면 어떤 계정이 존재하는지 드러나기 때문이다.\n\n실패가 반복되면 횟수를 제한하고 지연시킨다(Rate limit, 429 → 6-24).',
      state: scene({
        beats: [
          { kind: 'flow', id: 'login', path: ['browser', 'api'], label: 'POST /login', detail: '{id, 틀린 pw}', tone: 'request' },
          ...LOOKUP,
          tags('fail', { node: 'api', text: 'verify ✕', tone: 'threat' }),
          { kind: 'flow', id: 'unauth', path: ['api', 'browser'], label: '401', detail: '메시지는 모호하게', tone: 'danger' },
          tags(
            'checklist',
            { node: 'api', text: '아이디 없음 / 비번 틀림 구분 ✕', tone: 'defense' },
            { node: 'api', text: '실패 횟수 제한 → 429', tone: 'defense' },
          ),
        ],
        notes: [{ text: '실패는 401, 계정이 있는지 드러내지 않는다', after: 'checklist' }],
      }),
    },
    {
      label: '이후 요청',
      title: '⑤ 그다음부터는 출입증만 보낸다',
      body: '비밀번호는 로그인할 때 **한 번만** 네트워크를 지난다. 이후의 모든 요청은 쿠키나 Authorization: Bearer 헤더에 담긴 **세션 ID 또는 토큰**만 보낸다.',
      keyPoint: '이후에는 세션 ID·토큰이 비밀번호 역할을 대신한다. 그래서 **이 값들도 비밀번호처럼 보호해야** 한다.',
      state: scene({
        tags: [{ node: 'browser', text: '출입증 보관', tone: 'term' }],
        beats: [
          { kind: 'flow', id: 'req1', path: ['browser', 'api'], label: 'GET /v1/grades', detail: 'Cookie / Bearer 헤더만', tone: 'request' },
          { kind: 'flow', id: 'res1', path: ['api', 'browser'], label: '200 OK', detail: '내 성적', tone: 'response' },
          { kind: 'flow', id: 'req2', path: ['browser', 'api'], label: 'GET /v1/profile', detail: 'Cookie / Bearer 헤더만', tone: 'request' },
          tags('no-pw', { node: 'browser', text: '비밀번호는 다시 안 보냄', tone: 'info' }),
        ],
        notes: [{ text: '이후엔 출입증이 비밀번호 역할 → 똑같이 지켜야 한다', after: 'no-pw' }],
      }),
    },
  ],
  quiz: [
    {
      q: '로그인한 뒤의 요청에서는 무엇이 비밀번호 역할을 하며, 왜 그것도 보호해야 하는가?',
      answer:
        '비밀번호는 로그인 때 한 번만 보내고, 이후 요청은 쿠키나 Authorization: Bearer 헤더의 세션 ID 또는 토큰만 보낸다. 이 값이 있으면 누구든 그 사용자로 요청할 수 있으므로, 세션 ID·토큰도 비밀번호처럼 보호해야 한다(HTTPS, 안전한 저장, 짧은 수명).',
      why: 'p.21: 비밀번호는 로그인 \'한 번\'만 네트워크를 지난다. 이후의 모든 요청은 세션 ID 또는 토큰이 비밀번호 역할을 대신한다. (Quick Check 문항이 아니라 이 Step의 확인 문제)',
    },
  ],
}
