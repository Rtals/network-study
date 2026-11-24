import { STAGE_LABEL, VERIFY_STAGES, type VerifyStage } from '../../../lib/jwt'
import type { TopoBeat, TopoLink, TopoNode, TopologyState } from '../../topology/types'

// 6-15 서버의 JWT 검증 순서 (Week06 p.28) — 따라가기 Phase와 검증기가 함께 쓰는 시나리오.
// 그림 위의 시뮬레이션이다. 실제 요청을 보내지 않는다.

const GAP = 250
/** 두 번째 줄까지의 거리 (레인에 수직, 화면 오른쪽 아래). 마주 보는 검문소가 가깝게 */
const ROW = 290
const KIND: Record<VerifyStage, TopoNode['kind']> = { format: 'doc', alg: 'hmac', signature: 'signer', time: 'clock', issuer: 'cert' }
/**
 * 검문소 배치: 첫 줄은 클라이언트 → 1 → 2 → 3(서명), 서명 검문소 다음에서 유턴해
 * 두 번째 줄로 4(시간) → 5 → 6(인가) → Handler가 되돌아온다. 일자로 길게 늘어놓지 않아 블록이 크게 보인다.
 */
export const VERIFY_NODES: TopoNode[] = [
  { id: 'client', label: '클라이언트', kind: 'browser', t: 0 },
  { id: 'format', label: STAGE_LABEL.format, kind: KIND.format, t: GAP },
  { id: 'alg', label: STAGE_LABEL.alg, kind: KIND.alg, t: GAP * 2 },
  { id: 'signature', label: STAGE_LABEL.signature, kind: KIND.signature, t: GAP * 3 },
  { id: 'time', label: STAGE_LABEL.time, kind: KIND.time, t: GAP * 3, side: ROW },
  { id: 'issuer', label: STAGE_LABEL.issuer, kind: KIND.issuer, t: GAP * 2, side: ROW },
  { id: 'authz', label: '6. 인가', sub: 'role·scope', kind: 'auth', t: GAP, side: ROW },
  { id: 'handler', label: 'Handler', kind: 'server', t: 0, side: ROW },
]
const IDS = VERIFY_NODES.map((n) => n.id)
export const VERIFY_LINKS: TopoLink[] = IDS.slice(0, -1).map((from, i) => ({ from, to: IDS[i + 1] }))

export type VerifyRun = {
  stop: VerifyStage | 'pass'
  reason: string
  label: string
  detail?: string
  /** 토큰 안의 role (인가가 보는 값) */
  role?: string
  /** 검증 없이 decode만 하는 서버 */
  decodeOnly?: boolean
  /** 통과한 검문소에 ✓ 알약을 붙일지 (같은 Phase에서 두 번째로 돌릴 때는 끈다) */
  showPassed?: boolean
}

/** 토큰 하나가 검문소를 지나다 멈추는(또는 끝까지 가는) 비트 */
export function verifyBeats(run: VerifyRun, prefix = 'run'): TopoBeat[] {
  const p = (id: string) => `${prefix}-${id}`
  const passed = run.stop === 'pass' ? [...VERIFY_STAGES] : VERIFY_STAGES.slice(0, VERIFY_STAGES.indexOf(run.stop))
  const until = run.stop === 'pass' ? IDS : IDS.slice(0, IDS.indexOf(run.stop) + 1)
  const beats: TopoBeat[] = [{ kind: 'flow', id: p('req'), path: until, label: run.label, detail: run.detail, tone: run.decodeOnly ? 'danger' : 'request' }]
  if (passed.length && run.showPassed !== false) {
    beats.push({
      kind: 'tags',
      id: p('passed'),
      tags: passed.map((s) => ({ node: s, text: run.decodeOnly ? '건너뜀' : '✓', tone: run.decodeOnly ? 'warn' : 'defense' })),
    })
  }
  if (run.stop !== 'pass') {
    beats.push(
      { kind: 'tags', id: p('stop'), tags: [{ node: run.stop, text: run.reason, tone: 'threat' }] },
      { kind: 'flow', id: p('res'), path: [...until].reverse(), label: '401 Unauthorized', tone: 'danger' },
    )
    return beats
  }
  const admin = run.role === 'professor'
  beats.push(
    {
      kind: 'tags',
      id: p('authz'),
      tags: [
        run.decodeOnly && admin
          ? { node: 'authz', text: 'role=professor 그대로 믿음', tone: 'threat' }
          : { node: 'authz', text: `role: ${run.role ?? 'student'} → 허용`, tone: 'defense' },
      ],
    },
    { kind: 'flow', id: p('res'), path: [...IDS].reverse(), label: '200 OK', detail: admin ? '관리자 데이터' : '내 성적', tone: admin && run.decodeOnly ? 'danger' : 'response' },
  )
  return beats
}

export const verifyState = (beats: TopoBeat[], notes?: TopologyState['notes']): TopologyState => ({
  kind: 'topology',
  nodes: VERIFY_NODES,
  links: VERIFY_LINKS,
  beats,
  notes,
})
