import { evaluateCookie, type CookieAttack, type CookieAttrs } from '../../../lib/cookie'
import type { TopoBeat, TopoLink, TopoNode, TopologyState } from '../../topology/types'

// 6-13 Cookie 보안 속성 (Week06 p.24) — 따라가기 Phase와 직접 해보기가 함께 쓰는 시나리오.
// 그림 위의 가짜 시뮬레이션이다. 실제 쿠키·스크립트·요청을 다루지 않는다.

const SID = 'sid=a91f…'
const GAP = 300
const BASE: TopoNode[] = [
  { id: 'browser', label: '브라우저', sub: '쿠키 보관', kind: 'browser', t: 0 },
  { id: 'wifi', label: 'Wi-Fi', kind: 'network', t: GAP },
  { id: 'server', label: '서버', kind: 'server', t: GAP * 2 },
]
const BASE_LINKS: TopoLink[] = [
  { from: 'browser', to: 'wifi' },
  { from: 'wifi', to: 'server' },
]
/** 공격마다 나오는 공격자 블록 */
const ATTACKER: Record<CookieAttack, { node: TopoNode; link: TopoLink }> = {
  xss: { node: { id: 'script', label: 'XSS 스크립트', sub: '페이지에 심어짐', kind: 'attacker', t: 0, side: 320 }, link: { from: 'browser', to: 'script', style: 'danger' } },
  sniff: { node: { id: 'sniffer', label: '도청자', sub: '같은 Wi-Fi', kind: 'attacker', t: GAP, side: 320 }, link: { from: 'wifi', to: 'sniffer', style: 'danger' } },
  csrf: { node: { id: 'evil', label: '다른 사이트', sub: 'evil.example', kind: 'attacker', t: 0, side: 320 }, link: { from: 'evil', to: 'browser', style: 'danger' } },
  link: { node: { id: 'evil', label: '다른 사이트', sub: 'evil.example', kind: 'attacker', t: 0, side: 320 }, link: { from: 'evil', to: 'browser', style: 'danger' } },
}

/** 공격 하나의 재생 비트. prefix로 같은 Phase에서 여러 번 이어 붙일 수 있다 */
export function cookieAttackBeats(attack: CookieAttack, attrs: CookieAttrs, prefix: string = attack, tagLabel?: string): TopoBeat[] {
  const p = (id: string) => `${prefix}-${id}`
  /** 한 Phase에 여러 번 이어 붙일 때 결과 알약 앞에 설정 이름을 붙여 구별한다 */
  const L = (text: string) => (tagLabel ? `${tagLabel}: ${text}` : text)
  const out = evaluateCookie(attrs)
  if (out.rejected) {
    return [{ kind: 'tags', id: p('rejected'), tags: [{ node: 'browser', text: L('None + Secure 없음 → 쿠키 거부됨'), tone: 'warn' }] }]
  }
  const hit = out.result[attack]
  switch (attack) {
    case 'xss':
      return [
        { kind: 'flow', id: p('read'), path: ['browser', 'script'], label: 'document.cookie', detail: hit ? SID : '(빈 값)', tone: hit ? 'danger' : 'request' },
        { kind: 'tags', id: p('result'), tags: [hit ? { node: 'script', text: L('sid 탈취 → 공격자에게 전송'), tone: 'threat' } : { node: 'script', text: L('HttpOnly → 안 보임, 탈취 ✕'), tone: 'defense' }] },
      ]
    case 'sniff':
      return [
        { kind: 'flow', id: p('send'), path: ['browser', 'wifi', 'server'], label: 'GET http://…', detail: hit ? `Cookie: ${SID}` : 'Secure → 쿠키 안 보냄', tone: 'request' },
        { kind: 'flow', id: p('copy'), path: ['wifi', 'sniffer'], label: '엿봄', detail: hit ? SID : '쿠키 없음', tone: 'danger' },
        { kind: 'tags', id: p('result'), tags: [hit ? { node: 'sniffer', text: L('sid 도청 성공'), tone: 'threat' } : { node: 'sniffer', text: L('쿠키가 없다 → 도청 ✕'), tone: 'defense' }] },
      ]
    case 'csrf':
      return [
        { kind: 'flow', id: p('trap'), path: ['evil', 'browser'], label: '숨은 자동 제출 form', tone: 'danger' },
        { kind: 'flow', id: p('forged'), path: ['browser', 'wifi', 'server'], label: 'POST /transfer', detail: hit ? `Cookie: ${SID} (붙음)` : '쿠키 안 붙음', tone: hit ? 'danger' : 'request' },
        { kind: 'tags', id: p('result'), tags: [hit ? { node: 'server', text: L('로그인된 요청으로 처리 → 송금'), tone: 'threat' } : { node: 'server', text: L('로그인 안 된 요청 → 거부'), tone: 'defense' }] },
      ]
    case 'link':
      return [
        { kind: 'flow', id: p('click'), path: ['evil', 'browser'], label: '링크 클릭', detail: 'GET 이동', tone: 'request' },
        { kind: 'flow', id: p('go'), path: ['browser', 'wifi', 'server'], label: 'GET /v1/grades', detail: hit ? `Cookie: ${SID} (붙음)` : '쿠키 안 붙음', tone: 'request' },
        { kind: 'tags', id: p('result'), tags: [{ node: 'server', text: L(hit ? '로그인 상태로 열림' : '로그인 안 된 상태로 열림'), tone: 'info' }] },
      ]
  }
}

export function cookieState(attack: CookieAttack, beats: TopoBeat[], extra?: Pick<TopologyState, 'tags' | 'notes'>): TopologyState {
  const a = ATTACKER[attack]
  return { kind: 'topology', nodes: [...BASE, a.node], links: [...BASE_LINKS, a.link], beats, ...extra }
}

export const cookieBaseState = (beats: TopoBeat[], extra?: Pick<TopologyState, 'tags' | 'notes'>): TopologyState => ({
  kind: 'topology',
  nodes: BASE,
  links: BASE_LINKS,
  beats,
  ...extra,
})
