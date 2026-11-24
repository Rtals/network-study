import { cardById } from '../../lib/authz'
import { authScenario, authState } from '../../scenes/sandbox/auth/scenario'
import type { TopoBeat, TopoNode, TopoTag, TopologyState } from '../../scenes/topology/types'
import type { Step } from '../types'

// 출처: Week06 PDF p.16 (Authentication vs Authorization 표 · 요청 흐름 · 헷갈리는 이름),
//       p.17 (인증과 인가를 호텔로 이해하기)
// 판정은 src/lib/authz.ts의 authorize로 계산한다
// 패널 글은 배경과 흐름이 보이게 풀어 쓴다. 강의자료에 없는 설명은 // 보충

const tags = (id: string, ...list: TopoTag[]): TopoBeat => ({ kind: 'tags', id, tags: list })

// ── ⑤ 호텔 ───────────────────────────────────────────────
const HOTEL: TopoNode[] = [
  { id: 'guest', label: '손님', sub: '김인천', kind: 'person', t: 0 },
  { id: 'front', label: '프런트', sub: '인증', kind: 'desk', t: 260 },
  { id: 'elevator', label: '엘리베이터', sub: '인가', kind: 'floor', t: 520 },
  { id: 'r1205', label: '1205호', kind: 'gate', t: 780 },
  { id: 'r1206', label: '1206호', kind: 'gate', t: 620, side: 330 },
]

export const authnAuthz: Step = {
  id: 'authn-authz',
  no: '6-8',
  title: '인증과 인가 (401 vs 403)',
  slides: [16, 17],
  scene: 'topology',
  star: true,
  sandbox: true,
  easy: {
    title: '인증과 인가를 호텔로 이해하기',
    body: '프런트에서 한 번 신분 확인 → 카드키 발급 → 카드키로 갈 수 있는 곳만 열린다.\n\n① 프런트 데스크: 신분증과 예약 확인, "김인천 님 맞으시죠?" → **Authentication** (POST /login)\n② 카드키 발급: 1205호 · 3박 · 조식 포함, 카드에 \'권한\'이 기록됨 → Session / JWT 발급 {sub, role, exp}\n③ 엘리베이터 · 객실: 12층 버튼만 눌림, 1205호만 열림, 다른 방(1206호)은 ✕ → **Authorization** (role · 소유권 검사)\n④ 체크아웃 후: 카드키가 더 이상 작동하지 않음 → 만료(exp) · 로그아웃 · 폐기\n\n호텔 상황과 웹\n· 카드키 없이 12층 버튼을 누름 = 토큰 없이 GET /v1/grades → 401 Unauthorized (로그인부터)\n· 내 카드키로 1206호 문을 엶 = 학생 토큰으로 GET /v1/students/1002/grades → 403 Forbidden (또는 404로 존재 숨김)',
  },
  phases: [
    {
      label: '두 질문',
      title: '인증은 "누구세요?", 인가는 "해도 되나요?"',
      body: '서버는 요청마다 두 가지를 묻는다.\n· **인증(Authentication, AuthN)**: 당신은 누구인가?\n· **인가(Authorization, AuthZ)**: 당신은 이것을 해도 되는가?\n\n둘은 이름이 비슷하지만 질문도, 실패했을 때의 응답도 다르다.',
      state: authState(authScenario(cardById('own-read')).beats, [{ text: '누구인지 확인(인증) → 해도 되는지 확인(인가) → 실행', after: 'result' }]),
    },
    {
      label: '확인 대상',
      title: '인증이 먼저, 인가는 그다음',
      body: '· 인증은 비밀번호·OTP·지문·인증서로 신원을 확인하고, 그 결과로 Session이나 Access Token(신원 증명)을 만든다\n· 인가는 역할(role)·소유권·정책·scope를 보고 허용 또는 거부를 결정한다\n\n순서가 중요하다. **신원이 확인되어야** 그다음에 권한을 판단할 수 있다.',
      keyPoint: '예) 학생은 성적 조회만, 교수는 성적 입력도 가능 → 같은 로그인이라도 할 수 있는 일이 다르다.',
      state: authState(
        [
          tags('authn', { node: 'authn', text: '비밀번호 · OTP · 지문 · 인증서', tone: 'term' }, { node: 'authn', text: '결과물: Session · Access Token', tone: 'info' }),
          { kind: 'flow', id: 'identity', path: ['authn', 'authz'], label: '신원 확인됨', detail: 'sub · role', tone: 'request' },
          tags('authz', { node: 'authz', text: '역할(role) · 소유권 · 정책 · scope', tone: 'term' }, { node: 'authz', text: '결과물: 허용 / 거부', tone: 'info' }),
        ],
        [{ text: '신원이 확인되어야 권한을 판단할 수 있다', after: 'authz' }],
      ),
    },
    {
      label: '401',
      title: '인증 실패 → 401 "로그인하세요"',
      body: '토큰이 없거나 만료되면 서버는 **누구인지 모른다.** 이때 응답은 **401 Unauthorized**, 뜻은 "로그인부터 하세요"다.\n\n다시 로그인하면 해결될 수 있다(토큰 만료 등).',
      pitfall: "401의 이름은 'Unauthorized'지만 실제 뜻은 'Unauthenticated(인증 안 됨)'다. 헤더 이름 Authorization도 사실은 인증 정보를 담는다.",
      state: authState(authScenario(cardById('no-token')).beats, [{ text: '인증에서 멈춤 → 401 (누구인지 모름)', after: 'result' }]),
    },
    {
      label: '403',
      title: '인가 실패 → 403 "당신은 안 됩니다"',
      body: '누구인지는 확인됐지만 그 일을 할 권한이 없으면 **403 Forbidden**이다. 다시 로그인해도 해결되지 않는다. 권한 자체가 없기 때문이다.\n\n남의 자원이라는 사실 자체를 숨기려고 404로 답하기도 한다.',
      keyPoint: '401 = 누구인지 모름 / 403 = 누군지 알지만 안 됨 (Quick Check Q1)',
      state: authState(authScenario(cardById('other-read')).beats, [{ text: '인증은 통과, 인가에서 멈춤 → 403 (권한 없음)', after: 'result' }]),
    },
    {
      label: '호텔',
      title: '프런트는 한 번, 카드키 검사는 문마다',
      body: '호텔 프런트는 신분증을 **한 번** 확인하고 카드키를 준다. 카드키에는 권한이 기록되어 있어서, 엘리베이터와 객실 문은 **문마다** 카드키를 검사한다. 내 카드키로 1206호는 열리지 않고, 체크아웃(만료)하면 더 이상 작동하지 않는다.\n\n웹도 같다. **인증은 로그인 때 한 번, 인가는 요청(endpoint)마다 매번** 한다.',
      state: {
        kind: 'topology',
        nodes: HOTEL,
        links: [
          { from: 'guest', to: 'front' },
          { from: 'front', to: 'elevator' },
          { from: 'elevator', to: 'r1205' },
          { from: 'elevator', to: 'r1206' },
        ],
        beats: [
          { kind: 'flow', id: 'id', path: ['guest', 'front'], label: '신분증', detail: '김인천 (2026001)', tone: 'request' },
          tags('key', { node: 'front', text: '카드키 발급 {sub, role, exp}', tone: 'term' }),
          { kind: 'flow', id: 'go-1205', path: ['front', 'elevator', 'r1205'], label: '카드키', detail: '1205호 · 3박', tone: 'request' },
          tags('floor', { node: 'elevator', text: '12층만 눌림', tone: 'info' }),
          tags('open', { node: 'r1205', text: '열림 ✓', tone: 'defense' }),
          { kind: 'flow', id: 'go-1206', path: ['elevator', 'r1206'], label: '카드키', detail: '1205호 카드', tone: 'danger' },
          tags('denied', { node: 'r1206', text: '✕ 안 열림 (403)', tone: 'threat' }),
          tags('checkout', { node: 'front', text: '체크아웃 후 무효 (exp)', tone: 'warn' }),
        ],
        notes: [
          { text: '프런트(인증)는 한 번', after: 'key' },
          { text: '카드키 검사(인가)는 문마다', after: 'denied' },
        ],
      } satisfies TopologyState,
    },
  ],
  quiz: [
    {
      q: '인증과 인가의 차이는? 각각 실패하면 몇 번 상태 코드인가? (Quick Check Q1)',
      answer:
        '인증(Authentication)은 "누구인가"를 확인하고, 인가(Authorization)는 "이것을 해도 되는가"를 판단한다. 인증이 먼저다. 인증에 실패하면 401 Unauthorized(로그인하세요, 다시 로그인하면 해결될 수 있음), 인가에 실패하면 403 Forbidden(권한 없음, 다시 로그인해도 해결 안 됨)이다.',
      why: 'p.16 Authentication vs Authorization 표.',
    },
  ],
}
