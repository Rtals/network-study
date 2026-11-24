import { authorize, STATUS_TEXT, type AuthCard } from '../../../lib/authz'
import type { TopoBeat, TopoLink, TopoNode, TopologyState } from '../../topology/types'

// 6-8 인증과 인가 (Week06 p.16 요청 흐름) — 따라가기 Phase와 직접 해보기가 함께 쓰는 시나리오.
// 그림 위의 시뮬레이션이다. 실제 요청을 보내지 않는다.

const GAP = 260
export const AUTH_NODES: TopoNode[] = [
  { id: 'client', label: '클라이언트', kind: 'browser', t: 0 },
  { id: 'authn', label: '인증', sub: 'AuthN · 토큰 검증', kind: 'desk', t: GAP },
  { id: 'authz', label: '인가', sub: 'AuthZ · 역할·소유권', kind: 'auth', t: GAP * 2 },
  { id: 'handler', label: 'Handler', sub: '성적 API', kind: 'server', t: GAP * 3 },
]
export const AUTH_LINKS: TopoLink[] = [
  { from: 'client', to: 'authn' },
  { from: 'authn', to: 'authz' },
  { from: 'authz', to: 'handler' },
]

const PATH = ['client', 'authn', 'authz', 'handler']
const TOKEN_TEXT = { none: '토큰 없음', expired: 'Bearer eyJ… (만료)', valid: 'Bearer eyJ…' }

export type AuthScenario = { beats: TopoBeat[]; log: string[]; status: 200 | 401 | 403 }

/** 카드 하나: 요청이 멈출 곳까지 가고, 거기서 응답이 돌아온다 */
export function authScenario(card: AuthCard): AuthScenario {
  const { req } = card
  const res = authorize(req)
  const until = PATH.slice(0, PATH.indexOf(res.stop) + 1)
  const who = `${req.sub} (${req.role})`
  const ok = res.status === 200
  const beats: TopoBeat[] = [
    { kind: 'flow', id: 'req', path: until, label: `${req.method} ${req.path}`, detail: TOKEN_TEXT[req.token], tone: 'request' },
  ]
  const log = [`클라이언트 → ${req.method} ${req.path} (${TOKEN_TEXT[req.token]})`]
  if (res.stop === 'authn') {
    beats.push({ kind: 'tags', id: 'authn', tags: [{ node: 'authn', text: res.reason, tone: 'threat' }] })
    log.push(`인증: ${res.reason}`)
  } else {
    beats.push({ kind: 'tags', id: 'authn', tags: [{ node: 'authn', text: `누구? → ${who}`, tone: 'term' }] })
    log.push(`인증: ${who} 확인`)
    beats.push({
      kind: 'tags',
      id: 'authz',
      tags: [{ node: 'authz', text: ok ? `해도 되나? → ${res.reason}` : res.reason, tone: ok ? 'defense' : 'threat' }],
    })
    log.push(`인가: ${res.reason}`)
  }
  beats.push(
    { kind: 'flow', id: 'res', path: [...until].reverse(), label: STATUS_TEXT[res.status], tone: ok ? 'response' : 'danger' },
    { kind: 'tags', id: 'result', tags: [{ node: 'client', text: STATUS_TEXT[res.status], tone: ok ? 'defense' : 'threat' }] },
  )
  log.push(`응답: ${STATUS_TEXT[res.status]}`)
  return { beats, log, status: res.status }
}

export const authState = (beats: TopoBeat[], notes?: TopologyState['notes']): TopologyState => ({
  kind: 'topology',
  nodes: AUTH_NODES,
  links: AUTH_LINKS,
  beats,
  notes,
})
