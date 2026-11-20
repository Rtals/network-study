import { describe, expect, it } from 'vitest'
import { httpVsHttps } from '../../../content/w6/http-vs-https'
import { isTopologyState, type TopologyState } from '../../topology/types'
import { ATTACK_GOAL, attackScenario, envelopeState, type Attack, type Protocol } from './scenario'

const ATTACKS: Attack[] = ['eavesdrop', 'tamper', 'impersonate']
const PROTOCOLS: Protocol[] = ['http', 'https']

describe('6-2 공격 시나리오 (p.7)', () => {
  it('HTTP에서는 세 공격이 모두 통하고, HTTPS에서는 모두 막힌다', () => {
    for (const a of ATTACKS) {
      expect(attackScenario(a, 'http').blocked).toBe(false)
      expect(attackScenario(a, 'https').blocked).toBe(true)
    }
  })

  it('공격마다 p.7 표의 보안 목표와 짝이 맞는다', () => {
    expect(ATTACK_GOAL).toEqual({ eavesdrop: '기밀성', tamper: '무결성', impersonate: '인증' })
    for (const a of ATTACKS) for (const p of PROTOCOLS) expect(attackScenario(a, p).log.at(-1)).toContain(ATTACK_GOAL[a])
  })

  it('HTTP로 엿보면 비밀번호가 평문, HTTPS면 암호문 바이트만 보인다', () => {
    const http = attackScenario('eavesdrop', 'http').beats.find((b) => b.id === 'eavesdrop-copy')
    const https = attackScenario('eavesdrop', 'https').beats.find((b) => b.id === 'eavesdrop-copy')
    expect(http?.kind === 'flow' && http.detail).toBe('pw=inu1234')
    expect(https?.kind === 'flow' && https.detail).toMatch(/^17 03 03/)
  })

  it('비트는 장면에 있는 노드만 가리키고, 세 공격을 이어 붙여도 id가 겹치지 않는다', () => {
    const all = ATTACKS.flatMap((a) => attackScenario(a, 'https').beats)
    const st = envelopeState(all)
    const ids = new Set(st.nodes.map((n) => n.id))
    expect(new Set(all.map((b) => b.id)).size).toBe(all.length)
    for (const b of all) {
      if (b.kind === 'flow') for (const id of b.path) expect(ids.has(id), id).toBe(true)
      if (b.kind === 'tags') for (const t of b.tags) expect(ids.has(t.node)).toBe(true)
    }
  })
})

describe('6-2 장면 데이터', () => {
  const phases = httpVsHttps.phases.map((p) => p.state as TopologyState)
  it('6개 Phase, 모두 topology. 설명 칩의 after는 그 Phase의 비트', () => {
    expect(phases).toHaveLength(6)
    for (const st of phases) {
      expect(isTopologyState(st)).toBe(true)
      const beatIds = st.beats.map((b) => b.id)
      for (const n of st.notes ?? []) if (n.after) expect(beatIds).toContain(n.after)
    }
  })

  it('엽서 Phase에는 공격자가 없고, 엿보기부터 공격자가 등장한다', () => {
    expect(phases[0].nodes.some((n) => n.id === 'attacker')).toBe(false)
    expect(phases[1].nodes.some((n) => n.id === 'attacker')).toBe(true)
  })
})
