import { CERT_ERROR_INFO, diagnoseConnection, INU_CERT, OK_CONNECTION, type CertError } from '../../lib/certificate'
import type { TopoBeat, TopoLink, TopoNode, TopoTag } from '../../scenes/topology/types'
import type { Step } from '../types'

// 출처: Week06 PDF p.15 (TLS가 지켜 주는 것, 지켜 주지 않는 것 · HSTS · 브라우저 경고 표)
// 경고 이름은 src/lib/certificate.ts의 diagnoseConnection으로 계산한다
// 패널 글은 배경과 흐름이 보이게 풀어 쓴다. 강의자료에 없는 설명은 // 보충

const DOMAIN = INU_CERT.san[0]
const GAP = 260
const tags = (id: string, ...list: TopoTag[]): TopoBeat => ({ kind: 'tags', id, tags: list })
const chain = (ids: string[]): TopoLink[] => ids.slice(0, -1).map((from, i) => ({ from, to: ids[i + 1] }))

// ── ①② 길 위와 길의 양 끝 ─────────────────────────────────
const ROUTE: TopoNode[] = [
  { id: 'browser', label: '브라우저', kind: 'browser', t: 0 },
  { id: 'wifi', label: '카페 Wi-Fi', kind: 'network', t: GAP },
  { id: 'isp', label: '인터넷', sub: 'ISP', kind: 'isp', t: GAP * 2 },
  { id: 'server', label: '서버', sub: DOMAIN, kind: 'server', t: GAP * 3 },
]
const DB: TopoNode = { id: 'db', label: 'DB', kind: 'db', t: GAP * 4 }
const ATTACKER: TopoNode = { id: 'attacker', label: '공격자', sub: '같은 Wi-Fi', kind: 'attacker', t: GAP, side: 300 }
const TUNNEL: TopoBeat = { kind: 'zone', id: 'tunnel', nodes: ['wifi', 'isp'], label: 'TLS가 지키는 구간' }
const TO_SERVER = ['browser', 'wifi', 'isp', 'server']

// ── ④⑤ 인증서 경고 ──────────────────────────────────────
/** 경고 하나: 브라우저 위에 (원인 입력, 경고 이름), 서버 인증서 옆에 조치 */
function warning(id: string, error: CertError, input: string): TopoBeat[] {
  const info = CERT_ERROR_INFO[error]
  return [
    tags(`${id}-input`, { node: 'browser', text: input, tone: 'info' }),
    tags(`${id}-error`, { node: 'browser', text: error, tone: 'threat' }),
    tags(`${id}-fix`, { node: 'leaf', text: `조치: ${info.fix}`, tone: 'defense' }),
  ]
}
const LEAF: TopoNode = { id: 'leaf', label: '서버 인증서', sub: DOMAIN, kind: 'cert', t: GAP * 1.3 }
const BROWSER: TopoNode = { id: 'browser', label: '브라우저', kind: 'browser', t: 0 }

const [DATE_ERR] = diagnoseConnection({ ...OK_CONNECTION, today: '2027-04-01' })
const [NAME_ERR] = diagnoseConnection({ ...OK_CONNECTION, host: 'inu.ac.kr' })
const [CHAIN_ERR] = diagnoseConnection({ ...OK_CONNECTION, chainComplete: false })
const [MIXED_ERR] = diagnoseConnection({ ...OK_CONNECTION, loadsHttpResource: true })

export const tlsLimits: Step = {
  id: 'tls-limits',
  no: '6-7',
  title: 'TLS의 한계와 인증서 오류',
  slides: [15],
  scene: 'topology',
  star: true,
  phases: [
    {
      label: '지켜 준다',
      title: 'TLS가 지켜 주는 것: 오가는 길 위',
      body: 'HTTPS 자물쇠 아이콘의 정확한 뜻은 **"오가는 길 위는 안전하다"**이다.\n· 카페 Wi-Fi·ISP에서의 도청\n· 전송 중 데이터 변조\n· 가짜 서버로의 연결 (인증서를 검증할 때)\n· URL의 경로·쿼리·헤더·Body까지 모두 암호화된다',
      state: {
        kind: 'topology',
        nodes: ROUTE,
        links: chain(ROUTE.map((n) => n.id)),
        beats: [
          TUNNEL,
          { kind: 'flow', id: 'send', path: TO_SERVER, label: 'GET /v1/grades?sem=2', detail: '경로·쿼리·헤더·Body 모두 암호화', tone: 'request' },
          tags(
            'protects',
            { node: 'isp', text: '도청 ✕', tone: 'defense' },
            { node: 'isp', text: '전송 중 변조 ✕', tone: 'defense' },
            { node: 'isp', text: '가짜 서버 ✕ (인증서 검증 시)', tone: 'defense' },
          ),
        ],
        notes: [{ text: '자물쇠 = 오가는 길 위는 안전', after: 'protects' }],
      },
    },
    {
      label: '못 지킨다',
      title: 'TLS가 지켜 주지 않는 것: 길의 양 끝',
      // 보충: "길만 지킨다 / 양 끝" 표현, (6-5)(6-6) 연결
      body: 'TLS는 **길만** 지킨다. 길의 양 끝은 지키지 못한다.\n· 서버에 도착한 뒤의 데이터 (DB 유출)\n· 브라우저 안의 악성 스크립트 (XSS)\n· 피싱 사이트: 자기 도메인 인증서는 정상이다 (6-5)\n· 도메인 이름(SNI·DNS)은 일부 노출된다 (6-6)',
      keyPoint: 'TLS가 막지 못하는 공격: **XSS, DB 유출, 피싱** (Quick Check Q2 뒷부분)',
      state: {
        kind: 'topology',
        nodes: [...ROUTE, DB],
        links: chain([...ROUTE, DB].map((n) => n.id)),
        beats: [
          TUNNEL,
          tags('db', { node: 'db', text: '도착한 뒤의 데이터 (DB 유출)', tone: 'threat' }),
          tags(
            'browser',
            { node: 'browser', text: '브라우저 안의 악성 스크립트 (XSS)', tone: 'threat' },
            { node: 'browser', text: '피싱 사이트 (자기 도메인 인증서는 정상)', tone: 'threat' },
          ),
          tags('sni', { node: 'wifi', text: '도메인 이름(SNI·DNS)은 일부 노출', tone: 'warn' }),
        ],
        notes: [{ text: 'TLS는 길만 지킨다. 브라우저 안과 서버 안은 따로 지켜야 한다', after: 'sni' }],
      },
    },
    {
      label: 'HSTS',
      title: 'HSTS: 앞으로는 HTTPS로만 와라',
      body: '사용자가 주소창에 `http://`로 접속하면, 첫 요청은 **암호화 전**이라 가로챌 수 있다(SSL Strip).\n\n서버가 `Strict-Transport-Security: max-age=31536000` 헤더를 보내 두면, 브라우저는 **앞으로 1년간 이 사이트는 HTTPS로만** 접속한다. 첫 요청을 가로채는 틈이 사라진다.',
      state: {
        kind: 'topology',
        nodes: [...ROUTE, ATTACKER],
        links: [...chain(ROUTE.map((n) => n.id)), { from: 'wifi', to: 'attacker', style: 'danger', both: true }],
        beats: [
          { kind: 'flow', id: 'plain', path: ['browser', 'wifi', 'attacker'], label: `http://${DOMAIN}`, detail: '첫 요청 (암호화 전)', tone: 'danger' },
          tags('strip', { node: 'attacker', text: 'SSL Strip: 암호화 없이 붙잡아 둠', tone: 'threat' }),
          { kind: 'flow', id: 'hsts', path: ['server', 'isp', 'wifi', 'browser'], label: 'Strict-Transport-Security', detail: 'max-age=31536000', tone: 'response' },
          tags('remember', { node: 'browser', text: '1년간 HTTPS로만 접속', tone: 'defense' }),
          { kind: 'flow', id: 'https', path: TO_SERVER, label: `https://${DOMAIN}`, detail: '처음부터 HTTPS', tone: 'request' },
          tags('no-gap', { node: 'attacker', text: '가로챌 틈 없음', tone: 'defense' }),
        ],
        notes: [
          { text: 'http:// 첫 요청은 가로챌 수 있다 (SSL Strip)', after: 'strip' },
          { text: 'HSTS: 처음부터 HTTPS로 → 틈이 사라진다', after: 'no-gap' },
        ],
      },
    },
    {
      label: '날짜·이름',
      title: '인증서 오류 ① 날짜와 이름',
      // 보충: (6-5) 검증 단계와 잇기
      body: `6-5의 검증 ①②에서 실패하면 이런 경고가 뜬다.\n· ${DATE_ERR}: ${CERT_ERROR_INFO[DATE_ERR].cause} → ${CERT_ERROR_INFO[DATE_ERR].fix}\n· ${NAME_ERR}: ${CERT_ERROR_INFO[NAME_ERR].cause} → ${CERT_ERROR_INFO[NAME_ERR].fix}`,
      state: {
        kind: 'topology',
        nodes: [BROWSER, LEAF],
        links: [{ from: 'browser', to: 'leaf' }],
        beats: [
          { kind: 'flow', id: 'cert', path: ['leaf', 'browser'], label: '인증서', detail: `유효 ~ ${INU_CERT.notAfter}`, tone: 'response' },
          ...warning('date', DATE_ERR, 'PC 시계: 2027-04-01'),
          ...warning('name', NAME_ERR, '주소창: inu.ac.kr (www 누락)'),
        ],
        notes: [
          { text: '만료됐거나 PC 시계가 틀렸다', after: 'date-fix' },
          { text: '주소와 인증서 이름(SAN)이 다르다', after: 'name-fix' },
        ],
      },
    },
    {
      label: '체인·혼합',
      title: '인증서 오류 ② 체인과 Mixed Content',
      body: `· ${CHAIN_ERR}: ${CERT_ERROR_INFO[CHAIN_ERR].cause} → ${CERT_ERROR_INFO[CHAIN_ERR].fix}\n· ${MIXED_ERR}: ${CERT_ERROR_INFO[MIXED_ERR].cause} → ${CERT_ERROR_INFO[MIXED_ERR].fix}`,
      pitfall: '인증서 경고는 **보안 기능이 정상 동작한 결과**다. 개발 중 경고를 끄는 코드(verify=False)를 AI가 넣었다면, 배포 전에 반드시 지운다.',
      state: {
        kind: 'topology',
        nodes: [BROWSER, LEAF, { id: 'cdn', label: '이미지 서버', sub: 'http://', kind: 'server', t: GAP * 1.3, side: 320 }],
        links: [
          { from: 'browser', to: 'leaf' },
          { from: 'browser', to: 'cdn', style: 'danger' },
        ],
        beats: [
          { kind: 'flow', id: 'leaf-only', path: ['leaf', 'browser'], label: '서버 인증서만', detail: 'Intermediate 없음', tone: 'response' },
          ...warning('chain', CHAIN_ERR, '체인이 Root까지 안 이어짐'),
          { kind: 'flow', id: 'img', path: ['browser', 'cdn'], label: 'http://…/logo.png', detail: 'HTTPS 페이지 안에서', tone: 'danger' },
          tags('mixed-error', { node: 'browser', text: MIXED_ERR, tone: 'threat' }),
          tags('mixed-fix', { node: 'cdn', text: `조치: ${CERT_ERROR_INFO[MIXED_ERR].fix}`, tone: 'defense' }),
        ],
        notes: [
          { text: '체인이 끊기면 믿을 출발점(Root)에 닿지 못한다', after: 'chain-fix' },
          { text: 'HTTPS 페이지 안의 http:// 리소스는 막힌다', after: 'mixed-fix' },
        ],
      },
    },
  ],
  quiz: [
    {
      q: 'TLS가 보장하는 세 가지 보안 목표는? TLS가 막지 못하는 공격 하나는? (Quick Check Q2)',
      answer:
        '기밀성(도청 방지), 무결성(변조 방지), 인증(가짜 서버·중간자 방지)이다. TLS는 오가는 길만 지키므로, 브라우저 안에서 실행되는 악성 스크립트(XSS), 서버에 도착한 뒤의 DB 유출, 자기 도메인 인증서를 가진 피싱 사이트는 막지 못한다.',
      why: 'p.7 보안 목표 표와 p.15 "지켜 주지 않는다" 목록.',
    },
  ],
}
