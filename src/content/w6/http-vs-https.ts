import {
  ENVELOPE_LINKS,
  ENVELOPE_NODES,
  attackScenario,
  envelopeState,
  type Attack,
} from '../../scenes/sandbox/envelope/scenario'
import type { TopologyState } from '../../scenes/topology/types'
import type { Step } from '../types'

// 출처: Week06 PDF p.7 (HTTP는 엽서, HTTPS는 봉인된 봉투 · 보안 목표 표)
// 패널 글은 배경과 흐름이 보이게 풀어 쓴다. 강의자료에 없는 설명은 // 보충

const ATTACKS: Attack[] = ['eavesdrop', 'tamper', 'impersonate']
const httpBeats = (a: Attack) => attackScenario(a, 'http').beats

export const httpVsHttps: Step = {
  id: 'http-vs-https',
  no: '6-2',
  title: 'HTTP는 엽서, HTTPS는 봉투',
  slides: [7],
  scene: 'topology',
  star: true,
  sandbox: true,
  easy: {
    title: '엽서와 봉인된 등기 봉투',
    body: 'HTTP는 **엽서**다.\n· 우체국 직원, 배달원 누구나 내용을 읽을 수 있다\n· 중간에 글씨를 고쳐 써도 받는 사람은 모른다\n· 보낸 사람 이름도 누구나 거짓으로 쓸 수 있다\n\nHTTPS는 **봉인된 등기 봉투**다.\n· 내용은 받는 사람만 열 수 있다 (기밀성)\n· 봉인이 뜯기면 바로 티가 난다 (무결성)\n· 보낸 곳이 진짜 은행인지 확인된다 (인증)',
  },
  phases: [
    {
      label: 'HTTP 엽서',
      title: 'HTTP는 엽서다',
      body: 'HTTP로 보낸 요청은 **엽서**와 같다. 우체국 직원, 배달원 누구나 내용을 읽을 수 있다.\n\n카페 Wi-Fi에서 로그인하면 `id=2026001&pw=inu1234`가 공유기와 ISP 장비를 지나며 **그대로** 보인다. 엽서에는 세 가지 문제가 있다. 하나씩 보자.',
      state: {
        kind: 'topology',
        nodes: ENVELOPE_NODES,
        links: ENVELOPE_LINKS,
        beats: [
          { kind: 'flow', id: 'send', path: ['browser', 'wifi', 'isp', 'server'], label: 'POST /login', detail: 'id=2026001&pw=inu1234', tone: 'request' },
          { kind: 'tags', id: 'wifi-reads', tags: [{ node: 'wifi', text: '공유기도 읽음', tone: 'info' }] },
          { kind: 'tags', id: 'isp-reads', tags: [{ node: 'isp', text: 'ISP 장비도 읽음', tone: 'info' }] },
        ],
        notes: [{ text: '엽서처럼, 지나가는 장비 누구나 내용을 읽는다', after: 'isp-reads' }],
      } satisfies TopologyState,
    },
    {
      label: '엿보기',
      title: '① 누구나 읽는다 → 기밀성이 없다',
      body: '같은 Wi-Fi에 있는 사람이 패킷을 엿보면(스니핑) 비밀번호가 평문 그대로 보인다.\n\n내용을 아무나 읽을 수 있으면 **기밀성(Confidentiality)**이 없는 것이다.',
      state: envelopeState(httpBeats('eavesdrop'), [{ text: '기밀성 없음: 누구나 읽는다', after: 'eavesdrop-result' }]),
    },
    {
      label: '고쳐 쓰기',
      title: '② 고쳐 써도 모른다 → 무결성이 없다',
      // 보충: A+ → F 예시
      body: '엽서는 중간에 글씨를 고쳐 써도 받는 사람이 알아챌 방법이 없다. 공격자가 응답의 A+를 F로 바꿔도 브라우저는 그대로 믿는다.\n\n내용이 바뀌었는지 확인할 수 없으면 **무결성(Integrity)**이 없는 것이다.',
      state: envelopeState(httpBeats('tamper'), [{ text: '무결성 없음: 고쳐 써도 모른다', after: 'tamper-result' }]),
    },
    {
      label: '사칭',
      title: '③ 누가 보냈는지 모른다 → 인증이 없다',
      body: '엽서의 보낸 사람 이름은 누구나 거짓으로 쓸 수 있다. 공격자가 학사 서버인 척 대신 응답해도 브라우저는 진짜인지 확인할 수 없다.\n\n상대가 진짜인지 확인할 수 없으면 **인증(Authentication)**이 없는 것이다.',
      state: envelopeState(httpBeats('impersonate'), [{ text: '인증 없음: 누가 보냈는지 모른다', after: 'impersonate-result' }]),
    },
    {
      label: 'HTTPS 봉투',
      title: 'HTTPS는 봉인된 등기 봉투',
      body: 'HTTPS는 같은 내용을 **봉인된 등기 봉투**에 넣어 보낸다. 같은 Wi-Fi에서 엿봐도 `17 03 03 00 4a 9f …` 같은 의미 없는 바이트만 보인다.\n· 내용은 받는 사람만 연다 → 기밀성\n· 봉인이 뜯기면 바로 티가 난다 → 무결성\n· 보낸 곳이 진짜인지 확인된다 → 인증',
      state: envelopeState(
        ATTACKS.flatMap((a) => attackScenario(a, 'https').beats),
        [
          { text: '엿봐도 읽을 수 없다 (기밀성)', after: 'eavesdrop-result' },
          { text: '고치면 들킨다 (무결성)', after: 'tamper-result' },
          { text: '가짜 서버는 걸러진다 (인증)', after: 'impersonate-result' },
        ],
      ),
    },
    {
      label: '세 가지 목표',
      title: 'TLS가 지키는 세 가지',
      // 보충: 마지막 문장 (다음 Step과 잇기)
      body: 'HTTPS의 S는 TLS다. TLS는 세 목표를 각각 다른 기술로 지킨다.\n· 기밀성 ← 도청: 대칭키 암호 (AES-GCM 등)\n· 무결성 ← 변조: MAC / AEAD 인증 태그\n· 인증 ← 가짜 서버·중간자: 인증서 + 전자서명\n\n이 기술들이 어떻게 동작하는지는 다음 Step부터 하나씩 연다.',
      keyPoint: 'TLS의 세 가지 보안 목표 = **기밀성 · 무결성 · 인증** (Quick Check Q2)',
      state: {
        kind: 'topology',
        nodes: ENVELOPE_NODES,
        links: ENVELOPE_LINKS,
        beats: [
          { kind: 'zone', id: 'tunnel', nodes: ['wifi', 'isp'], label: '암호화된 통로' },
          { kind: 'flow', id: 'send', path: ['browser', 'wifi', 'isp', 'server'], label: 'TLS 레코드', detail: '17 03 03 00 4a 9f e2 …', tone: 'request' },
          {
            kind: 'tags',
            id: 'goals',
            tags: [
              { node: 'isp', text: '기밀성 ← 대칭키 암호 (AES-GCM)', tone: 'term' },
              { node: 'isp', text: '무결성 ← MAC / AEAD 인증 태그', tone: 'term' },
              { node: 'isp', text: '인증 ← 인증서 + 전자서명', tone: 'term' },
            ],
          },
        ],
        notes: [{ text: 'TLS = 기밀성 · 무결성 · 인증', after: 'goals' }],
      } satisfies TopologyState,
    },
  ],
  quiz: [
    {
      q: 'TLS(HTTPS)가 보장하는 세 가지 보안 목표는? 각각 어떤 공격을 막는가? (Quick Check Q2 앞부분)',
      answer:
        '기밀성은 도청·패킷 스니핑을 막는다(대칭키 암호로 내용을 숨김). 무결성은 중간에서의 내용 변조를 막는다(MAC / AEAD 인증 태그로 바뀌면 들킴). 인증은 가짜 서버·중간자(MITM)를 막는다(인증서 + 전자서명으로 상대가 진짜인지 확인).',
      why: 'p.7 보안 목표 표. Q2의 뒷부분 "TLS가 막지 못하는 공격"은 6-7에서 다룬다.',
    },
  ],
}
