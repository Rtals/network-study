import { DEFAULT_ACCESS_MIN, REFRESH_DAYS } from '../../lib/tokens'
import type { TopoBeat, TopoLink, TopoNode, TopoTag, TopologyState } from '../../scenes/topology/types'
import type { Step } from '../types'

// 출처: Week06 PDF p.30 (Access Token + Refresh Token 표 · 만료 → 재발급 흐름 · Refresh Token Rotation),
//       p.31 (두 토큰을 '놀이공원 이용권'으로)
// 패널 글은 배경과 흐름이 보이게 풀어 쓴다. 강의자료에 없는 설명은 // 보충

const AT_MIN = DEFAULT_ACCESS_MIN
const tags = (id: string, ...list: TopoTag[]): TopoBeat => ({ kind: 'tags', id, tags: list })

const GAP = 310
const NODES: TopoNode[] = [
  { id: 'client', label: '클라이언트', kind: 'browser', t: 0 },
  { id: 'server', label: 'API · Auth', sub: '서버', kind: 'server', t: GAP },
  { id: 'db', label: 'RT 기록', sub: 'DB', kind: 'db', t: GAP * 2 },
]
const LINKS: TopoLink[] = [
  { from: 'client', to: 'server' },
  { from: 'server', to: 'db' },
]
const scene = (s: Omit<TopologyState, 'kind' | 'nodes' | 'links'>, extra: { nodes?: TopoNode[]; links?: TopoLink[] } = {}): TopologyState => ({
  kind: 'topology',
  nodes: [...NODES, ...(extra.nodes ?? [])],
  links: [...LINKS, ...(extra.links ?? [])],
  ...s,
})

const HELD = (n: 1 | 2): TopoTag[] => [
  { node: 'client', text: `AT${n === 1 ? '₁' : '₂'} (Access): ${AT_MIN}분 · 메모리`, tone: 'term' },
  { node: 'client', text: `RT${n === 1 ? '₁' : '₂'} (Refresh): ${REFRESH_DAYS}일 · HttpOnly 쿠키`, tone: 'info' },
]
const DB_RT1: TopoTag = { node: 'db', text: 'RT₁ 기록됨', tone: 'info' }

export const accessRefresh: Step = {
  id: 'access-refresh',
  no: '6-16',
  title: 'Access + Refresh Token',
  slides: [30, 31],
  scene: 'topology',
  star: true,
  sandbox: true,
  easy: {
    title: "두 토큰을 '놀이공원 이용권'으로 이해하기",
    body: '놀이기구 앞에서는 당일 손목밴드만, 매표소에서만 연간 회원권.\n\n**당일 손목밴드 = Access Token**\n· 놀이기구마다 보여 준다 (모든 API 요청)\n· 오늘 18시까지만 유효 (짧은 수명)\n· 잃어버려도 오늘 하루치 피해\n\n**연간 회원권 = Refresh Token**\n· 매표소에서만 꺼낸다 (refresh endpoint만)\n· 1년간 유효, 매일 새 손목밴드를 받는 데 사용\n· 지갑 깊이 보관 (HttpOnly 쿠키)\n· 분실 신고하면 즉시 정지 (DB에서 폐기)\n\n만약 이렇게 하면?\n· 회원권을 놀이기구마다 보여 준다 → 직원 수십 명이 회원권을 보게 됨 = 긴 수명 토큰이 모든 요청·로그에 노출\n· 손목밴드 유효기간을 1년으로 → 주운 사람이 1년 내내 무료 입장 = 탈취된 Access Token이 오래 유효\n· 회원권을 정지할 수 없다 → 도난 회원권으로 계속 재발급 = Refresh Token을 서버에 기록해 폐기 가능하게',
  },
  phases: [
    {
      label: '두 토큰',
      title: '짧은 출입증과 긴 재발급권',
      // 보충: 첫 문장 (왜 둘로 나누는가), 14일 예시
      body: `토큰 하나로 오래 버티면 훔쳐 갔을 때 피해가 크고, 짧게 하면 사용자가 자주 다시 로그인해야 한다. 그래서 둘로 나눈다.\n· **Access Token**: API 호출에 쓴다. 수명은 **짧게**(5~15분). 메모리(JS 변수)에 두고, 서버는 보통 기록하지 않는다(Stateless)\n· **Refresh Token**: 새 Access Token을 받는 데만 쓴다. 수명은 **길게**(수 일~수 주). /token/refresh 한 곳에만 보내고, HttpOnly·Secure 쿠키에 둔다. 서버 DB에 기록해서 **폐기할 수 있다**`,
      state: scene({
        beats: [
          { kind: 'flow', id: 'login', path: ['client', 'server'], label: 'POST /login', tone: 'request' },
          { kind: 'flow', id: 'record', path: ['server', 'db'], label: 'RT₁ 기록', tone: 'request' },
          tags('db', DB_RT1),
          { kind: 'flow', id: 'issue', path: ['server', 'client'], label: '200 OK', detail: 'AT₁ + RT₁', tone: 'response' },
          tags('held', ...HELD(1)),
        ],
        notes: [{ text: 'Access는 짧게(API 호출용), Refresh는 길게(재발급용)', after: 'held' }],
      }),
    },
    {
      label: 'Access',
      title: '평소에는 Access Token만 보낸다',
      body: '평소 API 요청에는 **Access Token만** Authorization: Bearer로 붙인다. Refresh Token은 꺼내지 않는다.',
      state: scene({
        tags: [...HELD(1), DB_RT1],
        beats: [
          { kind: 'flow', id: 'req', path: ['client', 'server'], label: 'GET /grades', detail: 'Bearer AT₁', tone: 'request' },
          { kind: 'flow', id: 'res', path: ['server', 'client'], label: '200 OK', detail: '[성적]', tone: 'response' },
        ],
        notes: [{ text: '모든 API 요청엔 Access Token만', after: 'res' }],
      }),
    },
    {
      label: '만료 401',
      title: `${AT_MIN}분이 지나면 401`,
      // 보충: "조용히 재발급을 받는다"
      body: `${AT_MIN}분이 지나면 Access Token은 만료되어, 같은 요청에 **401 token expired**가 돌아온다.\n\n사용자에게 다시 로그인하라고 하는 대신, 클라이언트는 조용히 재발급을 받는다.`,
      state: scene({
        tags: [...HELD(1), DB_RT1],
        beats: [
          tags('time', { node: 'client', text: `(${AT_MIN}분 후)`, tone: 'warn' }),
          { kind: 'flow', id: 'req', path: ['client', 'server'], label: 'GET /grades', detail: 'Bearer AT₁', tone: 'request' },
          { kind: 'flow', id: 'res', path: ['server', 'client'], label: '401', detail: 'token expired', tone: 'danger' },
        ],
        notes: [{ text: 'Access 만료 → 401 token expired', after: 'res' }],
      }),
    },
    {
      label: '재발급',
      title: 'Refresh Token으로 새 Access Token을 받는다',
      body: '클라이언트는 /token/refresh에 Refresh Token(쿠키)을 보내 **새 Access Token(AT₂)**을 받고, 실패했던 요청을 다시 보낸다.\n\n이때 Refresh Token도 **새것(RT₂)으로 바꾸고 이전 것(RT₁)은 폐기**한다. 이것이 **Refresh Token Rotation**이다.',
      state: scene({
        tags: [DB_RT1],
        beats: [
          { kind: 'flow', id: 'refresh', path: ['client', 'server'], label: 'POST /token/refresh', detail: '쿠키: RT₁', tone: 'request' },
          { kind: 'flow', id: 'check', path: ['server', 'db'], label: 'RT₁ 확인', tone: 'request' },
          tags('rotate', { node: 'db', text: 'RT₁ 폐기 · RT₂ 기록', tone: 'term' }),
          { kind: 'flow', id: 'new', path: ['server', 'client'], label: '200 OK', detail: 'AT₂ + 새 RT₂', tone: 'response' },
          tags('held', ...HELD(2)),
          { kind: 'flow', id: 'retry', path: ['client', 'server'], label: 'GET /grades', detail: 'Bearer AT₂', tone: 'request' },
          { kind: 'flow', id: 'ok', path: ['server', 'client'], label: '200 OK', tone: 'response' },
        ],
        notes: [{ text: 'Refresh로 새 Access를 받고, Refresh도 새것으로 교체 (Rotation)', after: 'ok' }],
      }),
    },
    {
      label: '도난 탐지',
      title: '폐기된 Refresh Token이 다시 오면 도난이다',
      body: 'Rotation 덕분에 이미 폐기된 Refresh Token이 다시 들어오면 서버는 그것을 **\'도난\'으로 본다.** 정상 사용자라면 쓸 일이 없는 토큰이기 때문이다.\n\n그래서 그 사용자의 **모든 토큰을 끊는다.**',
      state: scene(
        {
          tags: [{ node: 'db', text: 'RT₁ 폐기됨 · RT₂ 유효', tone: 'info' }],
          beats: [
            { kind: 'flow', id: 'stolen', path: ['attacker', 'server'], label: 'POST /token/refresh', detail: '훔친 RT₁', tone: 'danger' },
            { kind: 'flow', id: 'check', path: ['server', 'db'], label: 'RT₁ 확인', tone: 'request' },
            tags('reuse', { node: 'server', text: '이미 폐기된 RT₁ 재사용 → 도난', tone: 'threat' }),
            tags('kill', { node: 'db', text: '이 사용자의 모든 토큰 끊음', tone: 'defense' }),
            { kind: 'flow', id: 'deny', path: ['server', 'attacker'], label: '401', tone: 'danger' },
          ],
          notes: [{ text: '폐기된 RT 재사용 = 도난 신호 → 모든 토큰 끊음', after: 'deny' }],
        },
        {
          nodes: [{ id: 'attacker', label: '공격자', sub: '예전 RT₁을 훔침', kind: 'attacker', t: 0, side: 330 }],
          links: [{ from: 'attacker', to: 'server', style: 'danger', both: true }],
        },
      ),
    },
    {
      label: '짧게·길게',
      title: '자주 보여 주는 것은 짧게, 오래가는 것은 깊이',
      body: `Access Token을 짧게 하면 도난당해도 **피해 시간이 짧다.**\n\n로그아웃·비밀번호 변경 때 Refresh Token을 DB에서 지우면, 남은 Access Token도 곧 만료되어 **${AT_MIN}분 안에 모든 접근이 끊긴다.**`,
      keyPoint: '자주 보여 주는 것(Access)은 짧게, 오래가는 것(Refresh)은 드물게 보여 주고 깊이 보관한다. (Quick Check Q8)',
      state: scene({
        tags: [...HELD(2), { node: 'db', text: 'RT₂ 기록됨', tone: 'info' }],
        beats: [
          { kind: 'flow', id: 'logout', path: ['client', 'server'], label: 'POST /logout', tone: 'request' },
          { kind: 'flow', id: 'delete', path: ['server', 'db'], label: 'RT₂ 삭제', tone: 'request' },
          tags('deleted', { node: 'db', text: 'RT₂ 삭제 → 재발급 불가', tone: 'warn' }),
          tags('soon', { node: 'client', text: `남은 AT₂도 ${AT_MIN}분 안에 만료 → 모든 접근 끊김`, tone: 'defense' }),
        ],
        notes: [{ text: `Refresh를 지우면 ${AT_MIN}분 안에 모든 접근이 끊긴다`, after: 'soon' }],
      }),
    },
  ],
  quiz: [
    {
      q: 'Access Token은 짧게, Refresh Token은 길게 두는 이유는? (Quick Check Q8)',
      answer:
        'Access Token은 모든 API 요청에 실려 자주 노출되므로, 짧게 두어 도난당해도 피해 시간을 줄인다. Refresh Token은 새 Access Token을 받을 때 /token/refresh 한 곳에만 보내고 HttpOnly 쿠키에 깊이 보관하므로 길게 두어 사용자가 자주 다시 로그인하지 않게 한다. 대신 서버 DB에 기록해 로그아웃·도난 시 폐기할 수 있게 하고, Rotation으로 재사용을 탐지한다.',
      why: 'p.30 Access/Refresh 표와 p.31 "자주 보여 주는 것은 짧게, 오래가는 것은 드물게 보여 주고 깊이 보관한다".',
    },
  ],
}
