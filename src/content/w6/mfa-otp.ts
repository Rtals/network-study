import { RFC_EXAMPLE, TOTP_STEP_S } from '../../lib/totp'
import type { TopoBeat, TopoNode, TopoTag, TopologyState } from '../../scenes/topology/types'
import type { Step } from '../types'

// 출처: Week06 PDF p.18 (인증 요소와 MFA · 조합 판정 표 · TOTP 동작 · Passkey)
// 6자리 예시는 RFC 6238 시험 값으로 실제 계산한 값 (src/lib/totp.ts, 테스트로 확인)
// 패널 글은 배경과 흐름이 보이게 풀어 쓴다. 강의자료에 없는 설명은 // 보충

const CODE = RFC_EXAMPLE.code
const tags = (id: string, ...list: TopoTag[]): TopoBeat => ({ kind: 'tags', id, tags: list })
const scene = (nodes: TopoNode[], s: Omit<TopologyState, 'kind' | 'nodes'>): TopologyState => ({ kind: 'topology', nodes, ...s })

// ① 요소 3종
const FACTORS: TopoNode[] = [
  { id: 'know', label: '지식', sub: 'know', kind: 'knowledge', t: 0 },
  { id: 'have', label: '소유', sub: 'have', kind: 'possession', t: 320 },
  { id: 'are', label: '생체', sub: 'are', kind: 'inherence', t: 640 },
]

// ② 조합 판정
const COMBOS: TopoNode[] = [
  { id: 'c-question', label: '비밀번호', sub: '+ 보안질문', kind: 'combo', t: 0 },
  { id: 'c-otp', label: '비밀번호', sub: '+ OTP 앱', kind: 'combo', t: 260 },
  { id: 'c-sms', label: '비밀번호', sub: '+ SMS 코드', kind: 'combo', t: 520 },
  { id: 'c-passkey', label: 'Passkey', sub: 'FIDO2', kind: 'combo', t: 780 },
]

// ③④ TOTP: OTP 앱 ↔ 서버
const TOTP_NODES: TopoNode[] = [
  { id: 'app', label: 'OTP 앱', sub: '내 스마트폰', kind: 'phone', t: 0 },
  { id: 'server', label: '서버', kind: 'server', t: 380 },
]
const TOTP_LINKS = [{ from: 'app', to: 'server' }]
const SHARED: TopoTag[] = [
  { node: 'app', text: '비밀값 K', tone: 'term' },
  { node: 'server', text: '비밀값 K', tone: 'term' },
]

// ⑤ Passkey
const PASSKEY_NODES: TopoNode[] = [
  { id: 'device', label: '내 기기', sub: 'Passkey', kind: 'phone', t: 0 },
  { id: 'server', label: '서버', kind: 'server', t: 380 },
  { id: 'attacker', label: '공격자', sub: '서버를 턺', kind: 'attacker', t: 380, side: 320 },
]

export const mfaOtp: Step = {
  id: 'mfa-otp',
  no: '6-9',
  title: 'MFA와 OTP',
  slides: [18],
  scene: 'topology',
  sandbox: true,
  phases: [
    {
      label: '요소 3종',
      title: '비밀번호 하나로는 약하다: 인증 요소 세 가지',
      body: '비밀번호 하나는 유출·추측·재사용에 약하다. 그래서 **서로 다른 종류**의 요소를 둘 이상 조합한다. 이것이 **MFA**(다중 요소 인증)다.\n· 지식(Something you know): 비밀번호 · PIN · 보안질문\n· 소유(Something you have): OTP 앱 · 스마트폰 푸시 · 보안키(FIDO2)\n· 생체(Something you are): 지문 · 얼굴 · 홍채',
      state: scene(FACTORS, {
        links: [],
        beats: [
          tags('know', { node: 'know', text: '비밀번호 · PIN · 보안질문', tone: 'term' }, { node: 'know', text: '피싱 · 유출 · 재사용에 취약', tone: 'warn' }),
          tags('have', { node: 'have', text: 'OTP 앱 · 푸시 · 보안키', tone: 'term' }, { node: 'have', text: '기기를 함께 훔쳐야 함', tone: 'info' }),
          tags('are', { node: 'are', text: '지문 · 얼굴 · 홍채', tone: 'term' }, { node: 'are', text: '바꿀 수 없음 → 기기 안에서만 확인', tone: 'info' }),
        ],
        notes: [{ text: '서로 다른 종류를 둘 이상 = MFA', after: 'are' }],
      }),
    },
    {
      label: 'MFA인가?',
      title: '둘을 조합한다고 다 MFA는 아니다',
      body: '· 비밀번호 + 보안질문: ✕ 둘 다 \'지식\' 요소\n· 비밀번호 + OTP 앱: ○ 2FA (지식 + 소유)\n· 비밀번호 + SMS 코드: △ 약한 2FA (유심 복제·가로채기 위험)\n· Passkey(FIDO2): ○ 피싱 저항 (기기 소유 + 생체/PIN)',
      keyPoint: 'MFA의 조건은 개수가 아니라 **종류가 다른** 요소다.',
      state: scene(COMBOS, {
        links: [],
        beats: [
          tags('q', { node: 'c-question', text: '✕ 둘 다 지식', tone: 'threat' }),
          tags('otp', { node: 'c-otp', text: '○ 2FA (지식 + 소유)', tone: 'defense' }),
          tags('sms', { node: 'c-sms', text: '△ 약한 2FA (유심 복제·가로채기)', tone: 'warn' }),
          tags('pk', { node: 'c-passkey', text: '○ 피싱 저항 (소유 + 생체/PIN)', tone: 'defense' }),
        ],
        notes: [{ text: '개수가 아니라 종류가 달라야 MFA', after: 'pk' }],
      }),
    },
    {
      label: 'TOTP 가입',
      title: 'TOTP ① 가입할 때 비밀값을 나눠 갖는다',
      body: 'OTP 앱을 등록할 때 서버가 보여 주는 **QR 코드**에는 비밀값이 들어 있다. 이것을 찍으면 서버와 앱이 **같은 비밀값**을 나눠 가진다.\n\n이 비밀값은 이후 네트워크로 다시 오가지 않는다.',
      state: scene(TOTP_NODES, {
        links: TOTP_LINKS,
        beats: [
          tags('secret', { node: 'server', text: '비밀값 K 생성', tone: 'term' }),
          { kind: 'flow', id: 'qr', path: ['server', 'app'], label: 'QR 코드', detail: '비밀값 K', tone: 'response' },
          tags('shared', { node: 'app', text: '비밀값 K', tone: 'term' }),
        ],
        notes: [{ text: '서버와 앱이 같은 비밀값을 나눠 가진다 (가입 때 한 번)', after: 'shared' }],
      }),
    },
    {
      label: '6자리',
      title: 'TOTP ② 양쪽이 각자 같은 숫자를 계산한다',
      // 보충: 마지막 문장 (30초마다 바뀌어 훔친 코드가 금방 쓸모없어진다)
      body: `로그인할 때 앱과 서버는 각자 **'비밀값 + 현재 시각(${TOTP_STEP_S}초 단위)'**을 해시해 6자리 숫자를 만든다. 비밀값과 시각이 같으니 결과도 같다. 사용자가 앱의 숫자를 입력하면 서버가 자기 계산과 비교해 같으면 통과시킨다.\n\n그래서 OTP 앱은 **네트워크 없이도** 코드를 만든다. ${TOTP_STEP_S}초가 지나면 숫자가 바뀌어, 훔친 코드도 금방 쓸모없어진다.`,
      state: scene(TOTP_NODES, {
        links: TOTP_LINKS,
        tags: SHARED,
        beats: [
          tags(
            'calc',
            { node: 'app', text: `K + 현재 시각 → 해시 → ${CODE}`, tone: 'info' },
            { node: 'server', text: `K + 현재 시각 → 해시 → ${CODE}`, tone: 'info' },
          ),
          { kind: 'flow', id: 'enter', path: ['app', 'server'], label: `${CODE} 입력`, detail: '사용자가 앱 숫자를 입력', tone: 'request' },
          tags('match', { node: 'server', text: '같다 → 통과', tone: 'defense' }),
        ],
        notes: [{ text: '같은 비밀값 + 같은 시각 = 같은 6자리 (네트워크 없이)', after: 'match' }],
      }),
    },
    {
      label: 'Passkey',
      title: 'Passkey: 비밀번호 대신 기기의 개인키로 서명',
      // 보충: 서버가 서명할 문제를 보낸다는 흐름
      body: 'Passkey는 비밀번호를 보내지 않는다. 기기의 **개인키로 서명**하고, 서버는 **공개키만** 저장한다(6-3, 6-4에서 본 서명 검증 그대로).\n\n그래서 서버가 털려도 훔칠 비밀번호가 없다.',
      state: scene(PASSKEY_NODES, {
        links: [
          { from: 'device', to: 'server' },
          { from: 'server', to: 'attacker', style: 'danger' },
        ],
        beats: [
          tags(
            'keys',
            { node: 'device', text: '개인키 (기기 안에만)', tone: 'term' },
            { node: 'server', text: '공개키만 저장', tone: 'term' },
          ),
          { kind: 'flow', id: 'challenge', path: ['server', 'device'], label: '로그인 요청', detail: '이 문제에 서명해 줘', tone: 'response' },
          { kind: 'flow', id: 'sign', path: ['device', 'server'], label: '서명', detail: '기기 개인키로', tone: 'request' },
          tags('verified', { node: 'server', text: '공개키로 검증 ✓', tone: 'defense' }),
          { kind: 'flow', id: 'breach', path: ['server', 'attacker'], label: '털림', detail: '저장된 공개키', tone: 'danger' },
          tags('nothing', { node: 'attacker', text: '공개키뿐 → 훔칠 비밀번호 없음', tone: 'defense' }),
        ],
        notes: [{ text: '서버에는 공개키만 → 털려도 훔칠 비밀번호가 없다', after: 'nothing' }],
      }),
    },
  ],
  quiz: [
    {
      q: '"비밀번호 + 보안질문"은 왜 MFA가 아닌가?',
      answer:
        'MFA는 서로 다른 종류의 인증 요소(지식·소유·생체)를 둘 이상 조합해야 한다. 비밀번호와 보안질문은 둘 다 "아는 것(지식)" 요소라서, 같은 방식(피싱·유출)으로 함께 털릴 수 있다. 비밀번호 + OTP 앱(지식 + 소유)이 2FA다.',
      why: 'p.18 조합 표: 비밀번호 + 보안 질문 ✕ (둘 다 지식 요소). (Quick Check 문항이 아니라 이 Step의 확인 문제)',
    },
  ],
}
