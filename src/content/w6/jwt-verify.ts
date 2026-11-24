import { EXPECTED_AUD, EXPECTED_ISS } from '../../lib/jwt'
import { verifyBeats, verifyState } from '../../scenes/sandbox/jwtverify/scenario'
import type { TopoBeat, TopoTag, TopologyState } from '../../scenes/topology/types'
import type { Step } from '../types'

// 출처: Week06 PDF p.28 (서버의 JWT 검증 순서 · HS256 vs RS256 · 실제로 있었던 취약점 · PyJWT 코드)
// 토큰마다 멈추는 검문소는 src/lib/jwt.ts의 verifyPipeline 결과와 같다 (jwt.test.ts에서 확인)
// 패널 글은 배경과 흐름이 보이게 풀어 쓴다. 강의자료에 없는 설명은 // 보충

const tags = (id: string, ...list: TopoTag[]): TopoBeat => ({ kind: 'tags', id, tags: list })
const BEARER = 'Bearer eyJ…'

export const jwtVerify: Step = {
  id: 'jwt-verify',
  no: '6-15',
  title: '서버의 JWT 검증 순서',
  slides: [28],
  scene: 'topology',
  sandbox: true,
  phases: [
    {
      label: '검증 순서',
      title: '디코딩은 누구나, 서버가 해야 하는 것은 검증',
      body: '6-14에서 본 것처럼 JWT를 **디코딩**(읽기)하는 것은 누구나 할 수 있다. 서버가 해야 하는 것은 **검증**이다.\n\n검증은 정해진 순서로 한 단계씩 하고, 하나라도 실패하면 거기서 멈춘다.\n1. 형식 → 2. 알고리즘 고정 → 3. 서명 → 4. 시간 → 5. 발급자·대상 → 6. 그다음 인가',
      state: verifyState(verifyBeats({ stop: 'pass', reason: '', label: '정상 토큰', detail: BEARER, role: 'student' }), [
        { text: '검문소 5개를 모두 통과해야 인가로 간다', after: 'run-res' },
      ]),
    },
    {
      label: '형식·alg',
      title: '1·2 형식을 보고, 알고리즘은 서버가 정한다',
      body: '1. 형식: 점으로 나뉜 세 덩어리인가? Base64URL로 풀리는가?\n2. 알고리즘 고정: 서버가 정한 alg만 허용한다(algorithms=["HS256"]). **토큰에 적힌 alg를 믿지 않는다.**',
      pitfall: '실제로 alg: none 토큰을 그대로 통과시킨 라이브러리가 있었다. 토큰이 "서명 안 했음"이라고 스스로 적으면 검증을 건너뛰어 버린 것이다.',
      state: verifyState(verifyBeats({ stop: 'alg', reason: 'alg: none → HS256만 허용', label: 'alg: none 토큰', detail: '서명 없음' }), [
        { text: '토큰의 alg를 믿지 않는다 → none은 거부', after: 'run-res' },
      ]),
    },
    {
      label: '서명',
      title: '3 서버의 키로 다시 서명해 비교한다',
      body: 'header.payload를 **서버의 키로 다시 서명**해 토큰의 signature와 같은지 본다.\n\n내용이 한 글자라도 바뀌었으면 여기서 걸린다(6-14).',
      state: verifyState(verifyBeats({ stop: 'signature', reason: '서버 키로 다시 서명 → 불일치', label: 'role 변조 토큰', detail: 'role: professor' }), [
        { text: '고친 토큰은 서명에서 걸린다', after: 'run-res' },
      ]),
    },
    {
      label: '시간',
      title: '4 만료됐거나 아직 쓸 수 없는 토큰',
      body: 'exp가 지났나? nbf(Not Before) 전인가?\n\n서버끼리 시계가 조금 다를 수 있어 약간의 차이는 허용한다.',
      state: verifyState(
        [
          ...verifyBeats({ stop: 'time', reason: 'exp 지남 → token expired', label: '만료된 토큰', detail: BEARER }),
          tags('skew', { node: 'time', text: '서버 간 시계 차이는 약간 허용', tone: 'info' }),
        ],
        [{ text: '서명이 맞아도 시간이 지나면 거부', after: 'skew' }],
      ),
    },
    {
      label: '발급자·대상',
      title: '5 우리 서비스용 토큰인가, 그다음에야 인가',
      // 보충: aud: chat-api 예시 이름
      body: '5. 발급자·대상: iss가 우리 인증 서버인가? aud가 이 API인가? 다른 서비스용으로 발급된 토큰을 받아 주면 안 된다.\n6. 여기까지 통과해야 비로소 role · scope · 소유권으로 이 요청을 허용할지 판단한다(인가, 6-8).',
      signal: `jwt.decode(token, SECRET, algorithms=["HS256"], audience="${EXPECTED_AUD}", issuer="${EXPECTED_ISS}") — PyJWT의 jwt.decode()는 서명과 exp를 기본으로 검증한다.`,
      state: verifyState(
        [
          ...verifyBeats({ stop: 'issuer', reason: 'aud: chat-api → 이 API용 아님', label: '다른 서비스용 토큰', detail: 'aud: chat-api' }, 'other'),
          ...verifyBeats({ stop: 'pass', reason: '', label: '정상 토큰', detail: `aud: ${EXPECTED_AUD}`, role: 'student', showPassed: false }, 'ok'),
        ],
        [
          { text: '다른 서비스용 토큰은 5에서 거부', after: 'other-res' },
          { text: '5까지 통과해야 인가(6)로 간다', after: 'ok-res' },
        ],
      ),
    },
    {
      label: 'HS vs RS',
      title: 'HS256은 비밀키 하나, RS256은 개인키·공개키',
      // 보충: (6-4) 앞 Step과 잇기
      body: '· **HS256(HMAC)**: 비밀키 하나를 공유한다. 서명도 검증도 그 키를 가진 서버가 한다 → 단일 서비스에 적합\n· **RS256 / ES256**: 인증 서버만 개인키로 서명하고, 공개키만 있으면 누구나 검증한다 → 여러 서비스 · OAuth/OIDC에 적합\n\n6-4에서 본 HMAC과 전자서명의 차이 그대로다.',
      state: {
        kind: 'topology',
        nodes: [
          { id: 'auth', label: '인증 서버', sub: '토큰 발급', kind: 'server', t: 0 },
          { id: 'api1', label: '성적 API', kind: 'server', t: 330, side: -170 },
          { id: 'api2', label: '수강 API', kind: 'server', t: 330, side: 170 },
        ],
        links: [
          { from: 'auth', to: 'api1' },
          { from: 'auth', to: 'api2' },
        ],
        beats: [
          tags('hs', { node: 'auth', text: 'HS256: 비밀키 하나를 공유', tone: 'info' }),
          { kind: 'flow', id: 'share', path: ['auth', 'api1'], label: '같은 비밀키', detail: '공유해야 검증 가능', tone: 'request' },
          tags('rs', { node: 'auth', text: 'RS256: 개인키로 서명 (인증 서버만)', tone: 'term' }),
          { kind: 'flow', id: 'pub1', path: ['auth', 'api1'], label: '공개키', tone: 'response' },
          { kind: 'flow', id: 'pub2', path: ['auth', 'api2'], label: '공개키', tone: 'response' },
          tags('verify', { node: 'api1', text: '공개키로 각자 검증', tone: 'defense' }, { node: 'api2', text: '공개키로 각자 검증', tone: 'defense' }),
        ],
        notes: [
          { text: 'HS256: 비밀키를 나눠 가져야 한다', after: 'share' },
          { text: 'RS256: 공개키만 있으면 각 서비스가 검증', after: 'verify' },
        ],
      } satisfies TopologyState,
    },
    {
      label: '건너뛰면?',
      title: 'decode만 하고 role을 믿으면 끝이다',
      body: '실제로 있었던 취약점은 모두 **검증을 건너뛴** 경우다.\n· alg: none 토큰을 그대로 통과시킨 라이브러리\n· RS256 공개키를 HS256 비밀키로 착각해 검증 (알고리즘 혼동)\n· 서명 검증 없이 decode만 하고 role을 신뢰',
      pitfall: 'options={"verify_signature": False}를 AI가 넣었다면 검증이 꺼진 것이다. 디버깅용이라도 배포 전에 반드시 지운다.',
      state: verifyState(
        verifyBeats({ stop: 'pass', reason: '', label: 'role 변조 토큰', detail: 'GET /admin/grades', role: 'professor', decodeOnly: true }),
        [{ text: 'decode만 하면: 변조 토큰이 관리자 데이터까지 가져간다', after: 'run-res' }],
      ),
    },
  ],
  quiz: [
    {
      q: '서버가 JWT의 header에 적힌 alg를 그대로 믿으면 어떤 문제가 생기는가?',
      answer:
        '공격자가 alg를 none으로 바꿔 서명 없는 토큰을 보내면 검증을 건너뛰어 통과시킬 수 있고, RS256 공개키를 HS256 비밀키로 착각하게 만드는 알고리즘 혼동 공격도 가능해진다. 그래서 서버는 허용할 알고리즘을 직접 고정하고(algorithms=["HS256"]), 토큰의 alg를 믿지 않는다.',
      why: 'p.28 검증 순서 2 "알고리즘 고정 — 토큰의 alg를 믿지 않음"과 실제로 있었던 취약점 목록. (Quick Check 문항이 아니라 이 Step의 확인 문제)',
    },
  ],
}
