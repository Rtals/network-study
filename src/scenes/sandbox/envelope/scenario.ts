import type { TopoBeat, TopoLink, TopoNode, TopologyState } from '../../topology/types'

// 6-2 HTTP는 엽서, HTTPS는 봉투 (Week06 p.7) — 따라가기 Phase와 직접 해보기가 함께 쓰는 시나리오.
// 전부 그림 위의 가짜 시뮬레이션이다. 실제 요청을 보내거나 암호화를 하지 않는다.

export type Protocol = 'http' | 'https'
export type Attack = 'eavesdrop' | 'tamper' | 'impersonate'

export const ATTACK_LABEL: Record<Attack, string> = { eavesdrop: '엿보기', tamper: '고쳐 쓰기', impersonate: '사칭' }
/** 공격이 깨뜨리는(또는 HTTPS가 지키는) 보안 목표 — p.7 표 */
export const ATTACK_GOAL: Record<Attack, string> = { eavesdrop: '기밀성', tamper: '무결성', impersonate: '인증' }

const GAP = 270
export const ENVELOPE_NODES: TopoNode[] = [
  { id: 'browser', label: '브라우저', sub: '내 노트북', kind: 'browser', t: 0 },
  { id: 'wifi', label: '카페 Wi-Fi', kind: 'network', t: GAP },
  { id: 'isp', label: '인터넷', sub: 'ISP', kind: 'isp', t: GAP * 2 },
  { id: 'server', label: '학사 서버', kind: 'server', t: GAP * 3 },
]
export const ATTACKER: TopoNode = { id: 'attacker', label: '공격자', sub: '같은 Wi-Fi', kind: 'attacker', t: GAP, side: 300 }
export const ENVELOPE_LINKS: TopoLink[] = [
  { from: 'browser', to: 'wifi' },
  { from: 'wifi', to: 'isp' },
  { from: 'isp', to: 'server' },
]
export const ATTACK_LINK: TopoLink = { from: 'wifi', to: 'attacker', style: 'danger', both: true }

const TO_SERVER = ['browser', 'wifi', 'isp', 'server']
/** p.7: 같은 Wi-Fi에서도 의미 없는 바이트만 보임 */
const CIPHER = '17 03 03 00 4a 9f e2 …'

export type AttackScenario = { beats: TopoBeat[]; log: string[]; blocked: boolean }

/** 공격 하나의 재생 비트와 이벤트 로그. id 앞에 공격 이름을 붙여 여러 공격을 이어 붙일 수 있다 */
export function attackScenario(attack: Attack, protocol: Protocol): AttackScenario {
  const p = (id: string) => `${attack}-${id}`
  const https = protocol === 'https'
  const goal = ATTACK_GOAL[attack]

  if (attack === 'eavesdrop') {
    return https
      ? {
          blocked: true,
          beats: [
            { kind: 'flow', id: p('send'), path: TO_SERVER, label: 'TLS 레코드', detail: CIPHER, tone: 'request' },
            { kind: 'flow', id: p('copy'), path: ['wifi', 'attacker'], label: '엿봄', detail: CIPHER, tone: 'danger' },
            { kind: 'tags', id: p('result'), tags: [{ node: 'attacker', text: `읽을 수 없음 (${goal})`, tone: 'defense' }] },
          ],
          log: ['브라우저 → 학사 서버: 로그인 (HTTPS, 암호화)', '공격자: 같은 Wi-Fi에서 패킷 복사', `공격자: 의미 없는 바이트만 보임 → ${goal} ✓`],
        }
      : {
          blocked: false,
          beats: [
            { kind: 'flow', id: p('send'), path: TO_SERVER, label: 'POST /login', detail: 'id=2026001&pw=inu1234', tone: 'request' },
            { kind: 'flow', id: p('copy'), path: ['wifi', 'attacker'], label: '엿봄', detail: 'pw=inu1234', tone: 'danger' },
            { kind: 'tags', id: p('result'), tags: [{ node: 'attacker', text: 'pw=inu1234 그대로 보임', tone: 'threat' }] },
          ],
          log: ['브라우저 → 학사 서버: POST /login (HTTP, 평문)', '공격자: 같은 Wi-Fi에서 패킷 복사', `공격자: pw=inu1234 그대로 읽음 → ${goal} ✕`],
        }
  }

  if (attack === 'tamper') {
    // 보충: A+ → F 예시 (강의자료는 "중간에 글씨를 고쳐 써도 받는 사람은 모른다"까지)
    return https
      ? {
          blocked: true,
          beats: [
            { kind: 'flow', id: p('grab'), path: ['wifi', 'attacker'], label: '가로챔', detail: '응답 (암호문)', tone: 'danger' },
            { kind: 'tags', id: p('edit'), tags: [{ node: 'attacker', text: '암호문 한 바이트 고침', tone: 'threat' }] },
            { kind: 'flow', id: p('forward'), path: ['attacker', 'wifi', 'browser'], label: 'TLS 레코드', detail: '고쳐진 암호문', tone: 'danger' },
            { kind: 'tags', id: p('result'), tags: [{ node: 'browser', text: `변조 감지 → 폐기 (${goal})`, tone: 'defense' }] },
          ],
          log: ['학사 서버 → 브라우저: 성적 응답 (HTTPS)', '공격자: 응답을 가로채 한 바이트 고침', `브라우저: 인증 태그가 맞지 않음 → 폐기 → ${goal} ✓`],
        }
      : {
          blocked: false,
          beats: [
            { kind: 'flow', id: p('reply'), path: ['server', 'isp', 'wifi'], label: '200 OK', detail: '성적: A+', tone: 'response' },
            { kind: 'flow', id: p('grab'), path: ['wifi', 'attacker'], label: '가로챔', detail: '성적: A+', tone: 'danger' },
            { kind: 'tags', id: p('edit'), tags: [{ node: 'attacker', text: 'A+ → F 로 고침', tone: 'threat' }] },
            { kind: 'flow', id: p('forward'), path: ['attacker', 'wifi', 'browser'], label: '200 OK', detail: '성적: F', tone: 'danger' },
            { kind: 'tags', id: p('result'), tags: [{ node: 'browser', text: '바뀐 줄 모름', tone: 'warn' }] },
          ],
          log: ['학사 서버 → 브라우저: 200 OK 성적: A+ (HTTP)', '공격자: 응답을 가로채 A+ → F로 고침', `브라우저: 성적 F를 그대로 믿음 → ${goal} ✕`],
        }
  }

  // 사칭
  return https
    ? {
        blocked: true,
        beats: [
          { kind: 'flow', id: p('ask'), path: ['browser', 'wifi', 'attacker'], label: 'HTTPS 연결 요청', detail: '학사 서버에게', tone: 'request' },
          { kind: 'tags', id: p('fake'), tags: [{ node: 'attacker', text: '가짜 학사 서버', tone: 'threat' }] },
          { kind: 'flow', id: p('answer'), path: ['attacker', 'wifi', 'browser'], label: '가짜 인증서', detail: '"나는 학사 서버"', tone: 'danger' },
          { kind: 'tags', id: p('result'), tags: [{ node: 'browser', text: `인증서 검증 실패 → 경고 (${goal})`, tone: 'defense' }] },
        ],
        log: ['브라우저: 학사 서버에 HTTPS 연결 요청', '공격자: 학사 서버인 척 가짜 인증서 제시', `브라우저: 인증서 검증 실패 → 경고 → ${goal} ✓`],
      }
    : {
        blocked: false,
        beats: [
          { kind: 'flow', id: p('ask'), path: ['browser', 'wifi', 'attacker'], label: 'GET /v1/grades', detail: '학사 서버에게', tone: 'request' },
          { kind: 'tags', id: p('fake'), tags: [{ node: 'attacker', text: '가짜 학사 서버', tone: 'threat' }] },
          { kind: 'flow', id: p('answer'), path: ['attacker', 'wifi', 'browser'], label: '200 OK', detail: '"나는 학사 서버"', tone: 'danger' },
          { kind: 'tags', id: p('result'), tags: [{ node: 'browser', text: '진짜인지 모름', tone: 'warn' }] },
        ],
        log: ['브라우저: 학사 서버에 GET /v1/grades (HTTP)', '공격자: 학사 서버인 척 대신 응답', `브라우저: 진짜 서버인지 확인할 방법이 없음 → ${goal} ✕`],
      }
}

/** 무대 상태: 공격자가 있는 장면 + 공격 비트들 */
export function envelopeState(beats: TopoBeat[], notes?: TopologyState['notes']): TopologyState {
  return {
    kind: 'topology',
    nodes: [...ENVELOPE_NODES, ATTACKER],
    links: [...ENVELOPE_LINKS, ATTACK_LINK],
    beats,
    notes,
  }
}
