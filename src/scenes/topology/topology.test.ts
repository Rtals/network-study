import { describe, expect, it } from 'vitest'
import { weeks } from '../../content'
import { securityMap } from '../../content/w6/security-map'
import { GAP_MS, LEAD_MS, READ_MS } from '../sequence/timeline'
import { FADE_MS, flowKeyframes, flowMs, flowPoints, flowSegments, layoutNodes, overviewBox } from './layout'
import { FLOW_SPEED } from '../iso/constants'
import { beatMs, finalStep, noteVisible, stepDelay, TAG_MS, TAGS_TAIL_MS, timelineMs } from './timeline'
import { isTopologyState, type TopologyState } from './types'

const phases = securityMap.phases.map((p) => p.state as TopologyState)

describe('6-1 장면 데이터', () => {
  it('5개 Phase 모두 topology 상태', () => {
    expect(phases).toHaveLength(5)
    expect(phases.every(isTopologyState)).toBe(true)
  })

  it('연결선·흐름·알약·구역은 있는 노드만 가리킨다', () => {
    for (const st of phases) {
      const ids = new Set(st.nodes.map((n) => n.id))
      for (const l of st.links) expect([ids.has(l.from), ids.has(l.to)]).toEqual([true, true])
      for (const t of st.tags ?? []) expect(ids.has(t.node)).toBe(true)
      for (const b of st.beats) {
        if (b.kind === 'flow') for (const id of b.path) expect(ids.has(id), id).toBe(true)
        if (b.kind === 'tags') for (const t of b.tags) expect(ids.has(t.node), t.node).toBe(true)
        if (b.kind === 'zone') for (const id of b.nodes) expect(ids.has(id)).toBe(true)
      }
    }
  })

  it('설명 칩의 after는 그 Phase의 비트를 가리키고, 비트 id는 겹치지 않는다', () => {
    for (const st of phases) {
      const beatIds = st.beats.map((b) => b.id)
      expect(new Set(beatIds).size).toBe(beatIds.length)
      for (const n of st.notes ?? []) if (n.after) expect(beatIds).toContain(n.after)
    }
  })

  it('p.6 표: 다섯 구간마다 공격 3개, 방어 2개', () => {
    const attacks = phases[2].beats.flatMap((b) => (b.kind === 'tags' ? b.tags : []))
    const defenses = phases[3].beats.flatMap((b) => (b.kind === 'tags' ? b.tags : []))
    expect(attacks).toHaveLength(15)
    expect(defenses).toHaveLength(10)
    // 방어 Phase는 공격 알약을 이어받아 시작한다
    expect(phases[3].tags).toEqual(attacks)
  })

  it('앞으로 올 것은 미리 보여 주지 않는다: 공격 Phase는 알약 없이 시작', () => {
    expect(phases[2].tags ?? []).toHaveLength(0)
  })
})

describe('타임라인', () => {
  it('비트 시간: 흐름은 화면 거리 ÷ 공통 속도, 알약은 개수 × TAG + 꼬리', () => {
    const [req] = phases[1].beats
    const nodes = layoutNodes(phases[1].nodes)
    expect(beatMs(req, phases[1])).toBe(flowMs(nodes, ['browser', 'network', 'server', 'auth', 'db']))
    const threat = phases[2].beats[0]
    expect(beatMs(threat, phases[2])).toBe(3 * TAG_MS + TAGS_TAIL_MS)
  })

  it('기준 속도: 6-4 1단계(지문)의 입력 → SHA-256 한 칸은 약 0.65초', async () => {
    const { hashSignature } = await import('../../content/w6/hash-signature')
    const st = hashSignature.phases[0].state as TopologyState
    const hop = st.beats[0]
    expect(beatMs(hop, st)).toBeGreaterThan(640)
    expect(beatMs(hop, st)).toBeLessThan(660)
  })

  it('모든 topology Step의 패킷은 같은 화면 속도로 움직인다', () => {
    const steps = weeks.flatMap((w) => w.steps)
    for (const step of steps)
      for (const p of step.phases) {
        if (!isTopologyState(p.state)) continue
        const st = p.state
        const nodes = layoutNodes(st.nodes)
        for (const b of st.beats) {
          if (b.kind !== 'flow') continue
          const { pts, visible } = flowPoints(nodes, b.path)
          const d = flowSegments(pts, visible).reduce((a, c) => a + c, 0)
          expect(Math.abs(d / beatMs(b, st) - FLOW_SPEED)).toBeLessThan(0.005)
        }
      }
  })

  it('설명 칩이 붙은 비트 뒤에는 읽을 시간만큼 쉰다', () => {
    const st = phases[4]
    const k = st.beats.findIndex((b) => b.id === 'stolen')
    expect(stepDelay(st, 2 * k + 2)).toBe(GAP_MS + READ_MS)
    expect(stepDelay(st, 2)).toBe(GAP_MS)
  })

  it('요청 경로 Phase 전체 시간 = 시작 쉼 + 요청 + 쉼 + 응답 + 마지막 설명 읽기', () => {
    const [req, res] = phases[1].beats
    expect(timelineMs(phases[1])).toBe(LEAD_MS + beatMs(req, phases[1]) + GAP_MS + beatMs(res, phases[1]) + READ_MS)
  })

  it('설명 칩은 after 비트가 끝난 뒤에 나타난다', () => {
    const st = phases[1]
    expect(noteVisible(st, 2, 'res')).toBe(false)
    expect(noteVisible(st, finalStep(st), 'res')).toBe(true)
  })
})

describe('배치', () => {
  it('노드는 왼쪽 아래 → 오른쪽 위로 놓인다', () => {
    const nodes = layoutNodes(phases[1].nodes)
    const box = overviewBox(phases[1])
    expect(box.w / box.h).toBeCloseTo(1.6, 5)
    expect(nodes[4].wy).toBeLessThan(nodes[0].wy)
  })

  it('패킷은 지나는 노드 안에서는 숨고, 구간 위에서만 보인다', () => {
    const nodes = layoutNodes(phases[1].nodes)
    const { pts, visible } = flowPoints(nodes, ['browser', 'network', 'server'])
    expect(pts).toHaveLength(4)
    // 나감(보임) → 네트워크 들어감(숨김) → 네트워크 나감(보임) → 서버 들어감(끝)
    expect(visible).toEqual([true, false, true, true])
  })

  it('블록에서 나올 때 선명해지고 들어갈 때 흐려진다: 중간 블록도 같은 짧은 페이드', () => {
    const nodes = layoutNodes(phases[1].nodes)
    const { pts, visible } = flowPoints(nodes, ['browser', 'network', 'server'])
    const total = 2 * 650
    const k = flowKeyframes(pts, visible, total)
    const fade = FADE_MS / total
    // 출발: 0에서 시작해 fade 뒤 1
    expect(k.op[0]).toBe(0)
    expect(k.op[1]).toBe(1)
    expect(k.times[1]).toBeCloseTo(fade, 5)
    // 네트워크에 들어가는 순간 0 (그 직전 fade 동안 흐려짐), 안에서는 계속 0
    const enterNet = k.op.indexOf(0, 2)
    expect(k.op[enterNet - 1]).toBe(1)
    expect(k.times[enterNet] - k.times[enterNet - 1]).toBeCloseTo(fade, 5)
    // 네트워크에서 나와 다시 선명해지고, 끝 블록에 들어가며 0으로 끝난다
    expect(k.op.filter((o) => o === 1).length).toBe(4)
    expect(k.op.at(-1)).toBe(0)
    expect(k.times.at(-1)).toBe(1)
    // 시각은 앞으로만 간다
    for (let i = 1; i < k.times.length; i++) expect(k.times[i]).toBeGreaterThan(k.times[i - 1])
  })
})

describe('모든 topology Step 데이터', () => {
  const steps = weeks.flatMap((w) => w.steps)
  const cases = steps.flatMap((step) =>
    step.phases.flatMap((p, i) => (isTopologyState(p.state) ? [{ name: `${step.no} Phase ${i + 1}`, st: p.state }] : [])),
  )

  it.each(cases)('$name: 연결선·흐름·알약·구역은 있는 노드만, 비트 id는 겹치지 않고, 설명 칩 after는 그 Phase의 비트', ({ st }) => {
    const ids = new Set(st.nodes.map((n) => n.id))
    for (const l of st.links) expect([ids.has(l.from), ids.has(l.to)]).toEqual([true, true])
    for (const t of st.tags ?? []) expect(ids.has(t.node), t.node).toBe(true)
    for (const b of st.beats) {
      if (b.kind === 'flow') {
        expect(b.path.length).toBeGreaterThanOrEqual(2)
        for (const id of b.path) expect(ids.has(id), id).toBe(true)
      }
      if (b.kind === 'tags') for (const t of b.tags) expect(ids.has(t.node), t.node).toBe(true)
      if (b.kind === 'zone') for (const id of b.nodes) expect(ids.has(id), id).toBe(true)
    }
    const beatIds = st.beats.map((b) => b.id)
    expect(new Set(beatIds).size).toBe(beatIds.length)
    for (const n of st.notes ?? []) if (n.after) expect(beatIds).toContain(n.after)
  })
})

describe('6-3 대칭키와 공개키 장면', () => {
  it('7개 Phase. 도둑은 열쇠 전달·공개키·잠가 보내기·과거 대화·남은 문제에만 나온다', async () => {
    const { symmetricPublicKey } = await import('../../content/w6/symmetric-public-key')
    const sts = symmetricPublicKey.phases.map((p) => p.state as TopologyState)
    expect(sts).toHaveLength(7)
    expect(sts.map((s) => s.nodes.some((n) => n.id === 'thief'))).toEqual([false, true, true, true, false, true, true])
  })

  it('잠가 보내기는 앞 Phase에서 받은 열쇠 한 쌍을 이어받아 시작한다', async () => {
    const { symmetricPublicKey } = await import('../../content/w6/symmetric-public-key')
    const [, , pub, lockBox] = symmetricPublicKey.phases.map((p) => p.state as TopologyState)
    const pair = pub.beats.find((b) => b.id === 'pair')
    expect(pair?.kind === 'tags' && pair.tags).toEqual(lockBox.tags)
  })
})

describe('6-5 인증서와 신뢰 체인 장면', () => {
  it('검증 1~6이 순서대로 붙고, 다음 Phase는 앞에서 통과한 것을 이어받는다', async () => {
    const { certificateChain } = await import('../../content/w6/certificate-chain')
    const sts = certificateChain.phases.map((p) => p.state as TopologyState)
    const checksIn = (st: TopologyState) =>
      st.beats.flatMap((b) => (b.kind === 'tags' ? b.tags : [])).map((t) => t.text).filter((t) => /^\d\. /.test(t))
    expect(checksIn(sts[3]).map((t) => t[0])).toEqual(['1', '2'])
    expect(checksIn(sts[4]).map((t) => t[0])).toEqual(['3', '4'])
    expect(checksIn(sts[5]).map((t) => t[0])).toEqual(['5', '6'])
    expect((sts[4].tags ?? []).map((t) => t.text[0])).toEqual(['1', '2'])
    expect((sts[5].tags ?? []).map((t) => t.text[0])).toEqual(['1', '2', '3', '4'])
  })
})

describe('6-8 인증과 인가 장면', () => {
  it('401 Phase는 인가·Handler에 닿지 않고, 403 Phase는 인가에서 멈춘다', async () => {
    const { authnAuthz } = await import('../../content/w6/authn-authz')
    const flows = (i: number) => (authnAuthz.phases[i].state as TopologyState).beats.flatMap((b) => (b.kind === 'flow' ? [b.path] : []))
    expect(flows(2)[0]).toEqual(['client', 'authn'])
    expect(flows(3)[0]).toEqual(['client', 'authn', 'authz'])
    expect(flows(0)[0]).toEqual(['client', 'authn', 'authz', 'handler'])
  })
})

describe('6-15 JWT 검증 순서 장면', () => {
  it('Phase마다 멈추는 검문소가 jwt.ts의 verifyPipeline 결과와 같다', async () => {
    const { jwtVerify } = await import('../../content/w6/jwt-verify')
    const { buildSample, verifyPipeline } = await import('../../lib/jwt')
    const stopOf = (i: number) => {
      const st = jwtVerify.phases[i].state as TopologyState
      const first = st.beats.find((b) => b.kind === 'flow')
      return first?.kind === 'flow' ? first.path.at(-1) : undefined
    }
    expect(stopOf(0)).toBe('handler')
    expect(stopOf(1)).toBe((await verifyPipeline(await buildSample('none'))).stop)
    expect(stopOf(2)).toBe((await verifyPipeline(await buildSample('forged'))).stop)
    expect(stopOf(3)).toBe((await verifyPipeline(await buildSample('expired'))).stop)
    expect(stopOf(4)).toBe((await verifyPipeline(await buildSample('otherAud'))).stop)
  })
})
