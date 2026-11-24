import { expToKst, LECTURE_PAYLOAD } from '../../lib/jwt'
import type { TopoBeat, TopoNode, TopoTag } from '../../scenes/topology/types'
import type { Step } from '../types'

// 출처: Week06 PDF p.25 (토큰 기반 인증 — 세션과 무엇이 다른가), p.26 (JWT 해부 · Claim 표),
//       p.27 (홀로그램 입장권 비유), p.29 (JWT는 암호화가 아니다 · 넣어도 되는 것/안 되는 것)
// exp 날짜는 src/lib/jwt.ts의 expToKst로 계산한다
// 패널 글은 배경과 흐름이 보이게 풀어 쓴다. 강의자료에 없는 설명은 // 보충

const EXP = LECTURE_PAYLOAD.exp
const tags = (id: string, ...list: TopoTag[]): TopoBeat => ({ kind: 'tags', id, tags: list })
const GAP = 320

const CLIENT: TopoNode = { id: 'client', label: '클라이언트', kind: 'browser', t: 0 }
const SERVER: TopoNode = { id: 'server', label: 'API 서버', kind: 'server', t: GAP }
const TOKEN: TopoNode = { id: 'token', label: 'JWT', sub: '토큰', kind: 'doc', t: GAP * 2 }
const ATTACKER: TopoNode = { id: 'attacker', label: '공격자', sub: '토큰을 주움', kind: 'attacker', t: 0, side: 330 }

const BEARER = 'Authorization: Bearer eyJ…'

export const jwtAnatomy: Step = {
  id: 'jwt-anatomy',
  no: '6-14',
  title: '토큰 방식과 JWT 해부',
  slides: [25, 26, 27, 29],
  scene: 'topology',
  star: true,
  sandbox: true,
  easy: {
    title: "JWT를 '홀로그램 입장권'으로 이해하기",
    body: `누구나 읽을 수 있지만, 아무도 고칠 수 없다.\n\n**INU 축제 입장권**: 이름 김인천 (2026001) · 등급 일반 (student) · 유효 11월 11일 16:00까지 · 홀로그램(서명)\n\n입장권과 JWT\n· 적힌 내용 = Payload → 누구나 읽을 수 있다\n· 홀로그램 = Signature → 발급처만 만들 수 있다\n· 입구 검표원 = API 서버 → 홀로그램만 확인, 명단 조회 ✕\n· 유효 시간 = exp → 지나면 입장 거부 (401)\n· '일반'을 'VIP'로 고쳐 씀 = role 변조 → 홀로그램 불일치 → 거부\n\n**읽을 수 있다**: 입장권을 주운 사람도 이름·등급을 다 본다 → 비밀번호·주민번호를 적으면 안 된다\n**고칠 수 없다**: 글자를 바꾸면 홀로그램이 맞지 않는다 → 서버는 서명이 틀리면 무조건 거부\n**훔치면 쓸 수 있다**: 입장권을 통째로 훔치면 그대로 입장 가능 → 짧은 만료, HTTPS, 안전한 보관`,
  },
  phases: [
    {
      label: '세션 vs 토큰',
      title: '세션은 서버가 기억하고, 토큰은 스스로 증명한다',
      body: '· **세션**: 브라우저는 의미 없는 번호(sid)만 갖고, 서버가 저장소에서 사용자를 찾는다 → 로그아웃·강제 종료가 즉시 반영되지만, 서버가 여러 대면 저장소를 공유해야 한다\n· **토큰(JWT)**: 토큰 안에 {sub, role, exp}와 서명이 들어 있어, 서버는 **서명만 검증**하면 끝난다(Stateless) → 서버를 늘리기 쉽지만, 만료 전에는 강제로 무효화하기 어렵다',
      // 보충: (→ 6-17) 다음 Step과 잇기
      keyPoint: "어느 쪽이 '더 안전'한 것이 아니다. 무엇을 서버에 두고, 무엇을 클라이언트에 맡길지의 **설계 선택**이다(→ 6-17).",
      state: {
        kind: 'topology',
        nodes: [CLIENT, SERVER, { id: 'store', label: '세션 저장소', kind: 'db', t: GAP * 2 }],
        links: [
          { from: 'client', to: 'server' },
          { from: 'server', to: 'store' },
        ],
        beats: [
          { kind: 'flow', id: 'session', path: ['client', 'server'], label: '세션 방식', detail: 'Cookie: sid=a91f…', tone: 'request' },
          { kind: 'flow', id: 'lookup', path: ['server', 'store'], label: '저장소 조회', detail: '요청마다', tone: 'request' },
          tags('session-tag', { node: 'store', text: '서버가 기억한다 (Stateful)', tone: 'info' }),
          { kind: 'flow', id: 'token', path: ['client', 'server'], label: '토큰 방식', detail: BEARER, tone: 'request' },
          tags('token-tag', { node: 'server', text: '서명만 검증 → 끝 (Stateless)', tone: 'term' }),
        ],
        notes: [
          { text: '세션: 서버가 저장소에서 찾는다', after: 'session-tag' },
          { text: '토큰: 토큰 스스로 증명, 서버는 서명만 본다', after: 'token-tag' },
        ],
      },
    },
    {
      label: '세 덩어리',
      title: 'JWT 해부: header.payload.signature',
      // 보충: (6-4의 HMAC) 앞 Step과 잇기
      body: 'JWT는 점(.) 두 개로 나뉜 **세 덩어리**다.\n① Header: 어떤 방식으로 서명했나 (alg: HS256)\n② Payload(Claims): 누구이고, 언제까지인가\n③ Signature: 위조되지 않았다는 증거. 앞의 두 덩어리를 서버의 비밀키로 HMAC-SHA256한 값이다(6-4의 HMAC)',
      state: {
        kind: 'topology',
        nodes: [CLIENT, SERVER, TOKEN],
        links: [{ from: 'client', to: 'server' }],
        beats: [
          { kind: 'flow', id: 'send', path: ['client', 'server'], label: 'GET /me', detail: BEARER, tone: 'request' },
          tags('format', { node: 'server', text: '형식: header.payload.signature', tone: 'info' }),
          tags(
            'parts',
            { node: 'token', text: '1. Header: {"alg":"HS256","typ":"JWT"}', tone: 'term' },
            { node: 'token', text: `2. Payload: {"sub":"2026001","role":"student",…}`, tone: 'term' },
            { node: 'token', text: '3. Signature: HMAC-SHA256(header.payload, SECRET)', tone: 'term' },
          ),
        ],
        notes: [{ text: '점으로 나뉜 세 덩어리: 방식 · 내용 · 서명', after: 'parts' }],
      },
    },
    {
      label: 'Claim',
      title: 'Payload에는 무엇이 들어가나',
      body: `· **sub**(Subject): 사용자 식별자\n· **exp**(Expiration): 만료 시각(Unix 초). 예시의 ${EXP}은 ${expToKst(EXP)}이다\n· iss(발급자) · aud(받을 대상 API) · iat(발급 시각) · jti(토큰 고유 번호)\n· role처럼 **직접 정한 클레임**도 넣을 수 있다(RFC 7519의 등록 클레임 외)`,
      state: {
        kind: 'topology',
        nodes: [TOKEN],
        links: [],
        beats: [
          tags(
            'claims',
            { node: 'token', text: 'sub: 2026001 (사용자 식별자)', tone: 'term' },
            { node: 'token', text: 'role: student (직접 정한 클레임)', tone: 'term' },
            { node: 'token', text: `exp: ${EXP} = ${expToKst(EXP)}`, tone: 'term' },
            { node: 'token', text: 'iss · aud · iat · jti', tone: 'info' },
          ),
        ],
        notes: [{ text: '누구이고(sub), 언제까지인가(exp)', after: 'claims' }],
      },
    },
    {
      label: '누구나 읽음',
      title: 'Base64URL은 포장일 뿐, 누구나 읽는다',
      body: 'Header와 Payload는 **Base64URL로 인코딩**만 되어 있다. 터미널 한 줄(base64 -d)이면 누구나 내용을 읽는다.\n\nJWT의 기본형(JWS)은 내용을 숨기지 않고 **서명만** 한다(6-4: 서명은 숨기지 않는다).',
      pitfall: '인코딩(Base64) ≠ 암호화(AES) ≠ 서명(HMAC/RSA). JWT는 암호화된 데이터가 아니다.',
      state: {
        kind: 'topology',
        nodes: [CLIENT, SERVER, ATTACKER],
        links: [
          { from: 'client', to: 'server' },
          { from: 'client', to: 'attacker', style: 'danger' },
        ],
        beats: [
          { kind: 'flow', id: 'leak', path: ['client', 'attacker'], label: '토큰을 주움', detail: 'eyJzdWIiOiIy…', tone: 'danger' },
          tags('decode', { node: 'attacker', text: 'base64 -d', tone: 'info' }),
          tags('readable', { node: 'attacker', text: '{"sub":"2026001","role":"student",…} 그대로 보임', tone: 'threat' }),
        ],
        notes: [{ text: 'Base64URL = 포장. 누구나 펼쳐 읽는다', after: 'readable' }],
      },
    },
    {
      label: '변조',
      title: '고치면 서명이 맞지 않는다',
      body: 'role을 student에서 professor로 바꿔 다시 조립하면 어떻게 될까? 서버는 받은 header.payload를 **자기 비밀키로 다시 서명**해 토큰의 signature와 비교한다.\n\n내용이 바뀌었으니 값이 달라지고, 결과는 **401 Unauthorized(invalid token)**다. 공격자는 비밀키가 없어서 맞는 서명을 만들 수 없다.',
      state: {
        kind: 'topology',
        nodes: [{ ...ATTACKER, side: 0 }, SERVER],
        links: [{ from: 'attacker', to: 'server', style: 'danger', both: true }],
        beats: [
          tags('edit', { node: 'attacker', text: 'role: student → professor', tone: 'threat' }, { node: 'attacker', text: '서명은 원래 그대로', tone: 'info' }),
          { kind: 'flow', id: 'forged', path: ['attacker', 'server'], label: 'GET /admin/grades', detail: 'Bearer <변조된 토큰>', tone: 'danger' },
          tags('resign', { node: 'server', text: '비밀키로 다시 서명 → 불일치', tone: 'defense' }),
          { kind: 'flow', id: 'reject', path: ['server', 'attacker'], label: '401 Unauthorized', detail: '{"detail": "invalid token"}', tone: 'danger' },
        ],
        notes: [{ text: '읽을 수는 있지만, 고치면 서명이 맞지 않는다', after: 'reject' }],
      },
    },
    {
      label: '넣지 말 것',
      title: '누구나 읽으니까, 민감한 것은 넣지 않는다',
      body: '· 넣어도 되는 것: 사용자 ID(sub), 역할·권한 범위(role, scope), 만료·발급 정보(exp, iat, iss). 노출돼도 큰 문제없는 **최소 정보**만\n· 넣으면 안 되는 것: 비밀번호·해시, 주민번호·전화번호·성적 같은 개인정보, API 비밀키·내부 시스템 정보\n\n내용까지 숨기려면 JWE를 쓰지만, 보통은 민감한 정보를 넣지 않는 쪽을 택한다.',
      keyPoint: '읽을 수 있다 · 고칠 수 없다 · **훔치면 쓸 수 있다** → 짧은 만료, HTTPS, 안전한 보관 (p.27)',
      state: {
        kind: 'topology',
        nodes: [TOKEN],
        links: [],
        beats: [
          tags(
            'ok',
            { node: 'token', text: '넣어도 됨: sub · role · scope', tone: 'defense' },
            { node: 'token', text: '넣어도 됨: exp · iat · iss', tone: 'defense' },
          ),
          tags(
            'no',
            { node: 'token', text: '✕ 비밀번호 · 해시', tone: 'threat' },
            { node: 'token', text: '✕ 주민번호 · 전화번호 · 성적', tone: 'threat' },
            { node: 'token', text: '✕ API 비밀키 · 내부 정보', tone: 'threat' },
          ),
        ],
        notes: [{ text: '노출돼도 괜찮은 최소 정보만', after: 'no' }],
      },
    },
  ],
  quiz: [
    {
      q: 'JWT는 암호화된 데이터인가? 누구나 읽을 수 있는데 왜 안전하다고 하는가? (Quick Check Q7)',
      answer:
        '아니다. JWT의 Header와 Payload는 Base64URL로 인코딩만 되어 있어 누구나 디코딩해 읽을 수 있다. 안전한 이유는 서명 때문이다. 서버가 비밀키로 header.payload를 다시 서명해 토큰의 signature와 비교하므로, role을 바꾸는 등 한 글자라도 고치면 서명이 맞지 않아 401로 거부된다. 그래서 내용은 숨길 수 없으니 민감한 정보는 넣지 않고, 토큰을 통째로 훔쳐 쓰는 것을 막기 위해 짧은 만료·HTTPS·안전한 보관을 쓴다.',
      why: 'p.29 "JWT는 암호화가 아니다"와 p.27 "누구나 읽을 수 있지만, 아무도 고칠 수 없다".',
    },
  ],
}
