import { RECOMMENDED, setCookieHeader, type CookieAttrs } from '../../lib/cookie'
import { cookieAttackBeats, cookieBaseState, cookieState } from '../../scenes/sandbox/cookie/scenario'
import type { TopoBeat, TopoTag } from '../../scenes/topology/types'
import type { Step } from '../types'

// 출처: Week06 PDF p.24 (Cookie 보안 속성 · Set-Cookie 예시 · 속성 표 · DevTools 확인)
// 공격 결과는 src/lib/cookie.ts의 evaluateCookie로 계산한다 (그림 위의 가짜 시뮬레이션)
// 패널 글은 배경과 흐름이 보이게 풀어 쓴다. 강의자료에 없는 설명은 // 보충

const tags = (id: string, ...list: TopoTag[]): TopoBeat => ({ kind: 'tags', id, tags: list })
const mark = (id: string, text: string, on: boolean): TopoBeat => tags(id, { node: 'browser', text, tone: on ? 'term' : 'warn' })
const attrs = (a: Partial<CookieAttrs>): CookieAttrs => ({ ...RECOMMENDED, ...a })

export const cookieAttributes: Step = {
  id: 'cookie-attributes',
  no: '6-13',
  title: 'Cookie 보안 속성',
  slides: [24],
  scene: 'topology',
  star: true,
  sandbox: true,
  phases: [
    {
      label: '속성',
      title: '같은 sid라도 속성이 운명을 바꾼다',
      // 보충: 6-12와 잇는 문장
      body: "같은 세션 쿠키라도 Set-Cookie에 붙는 **속성**에 따라 '누가 읽을 수 있고, 언제 전송되는지'가 완전히 달라진다.\n\n6-12에서 본 쿠키의 위험(탈취·도청·위조 요청)을 막는 장치가 이 속성들이다.",
      state: cookieBaseState(
        [
          { kind: 'flow', id: 'set', path: ['server', 'wifi', 'browser'], label: 'Set-Cookie', detail: setCookieHeader(RECOMMENDED), tone: 'response' },
          tags(
            'attrs',
            { node: 'browser', text: 'HttpOnly', tone: 'term' },
            { node: 'browser', text: 'Secure', tone: 'term' },
            { node: 'browser', text: 'SameSite=Lax', tone: 'term' },
            { node: 'browser', text: 'Path=/ · Max-Age=3600', tone: 'info' },
          ),
        ],
        { notes: [{ text: '속성이 누가 읽고 언제 보내는지를 정한다', after: 'attrs' }] },
      ),
    },
    {
      label: 'HttpOnly',
      title: 'HttpOnly: 자바스크립트가 못 읽는다',
      body: '**HttpOnly**가 붙은 쿠키는 자바스크립트(document.cookie)로 읽을 수 없다. 그래서 XSS로 심어진 스크립트가 세션 쿠키를 훔쳐 가지 못한다.\n\n세션 쿠키에는 **필수**다.',
      state: cookieState('xss', [
        mark('off', 'HttpOnly 없음', false),
        ...cookieAttackBeats('xss', attrs({ httpOnly: false }), 'off', '없음'),
        mark('on', 'HttpOnly 켬', true),
        ...cookieAttackBeats('xss', attrs({ httpOnly: true }), 'on', '켬'),
      ], {
        notes: [
          { text: '없으면: 스크립트가 sid를 훔친다', after: 'off-result' },
          { text: 'HttpOnly: 스크립트에게 안 보인다', after: 'on-result' },
        ],
      }),
    },
    {
      label: 'Secure',
      title: 'Secure: HTTPS에서만 보낸다',
      body: '**Secure**가 붙은 쿠키는 HTTPS 연결에서만 전송된다. 평문 HTTP로 새어 나가 도청당하는 일을 막는다.\n\n**항상** 붙인다(개발용 localhost는 예외로 허용된다).',
      state: cookieState('sniff', [
        mark('off', 'Secure 없음', false),
        ...cookieAttackBeats('sniff', attrs({ secure: false }), 'off', '없음'),
        mark('on', 'Secure 켬', true),
        ...cookieAttackBeats('sniff', attrs({ secure: true }), 'on', '켬'),
      ], {
        notes: [
          { text: '없으면: http 요청에 실려 도청된다', after: 'off-result' },
          { text: 'Secure: http로는 아예 안 보낸다', after: 'on-result' },
        ],
      }),
    },
    {
      label: 'SameSite',
      title: 'SameSite: 다른 사이트에서 시작된 요청엔 붙이지 않는다',
      body: '**SameSite**는 다른 사이트에서 시작된 요청에 쿠키를 붙일지 정한다. CSRF(6-12)를 막는 핵심이다.\n· Strict: 다른 사이트에서 시작된 요청엔 전송 안 함 → CSRF를 가장 강하게 막음 (은행·관리자 화면)\n· Lax: 다른 사이트의 링크 클릭(GET 이동)엔 전송, POST·fetch엔 안 함 → 대부분의 CSRF 차단 (일반 웹, **브라우저 기본값**)\n· None: 모든 요청에 전송 → 보호 없음. 반드시 Secure와 함께, 다른 도메인에 임베드할 때만',
      state: cookieState('csrf', [
        mark('none', 'SameSite=None', false),
        ...cookieAttackBeats('csrf', attrs({ sameSite: 'None' }), 'none', 'None'),
        mark('lax', 'SameSite=Lax', true),
        ...cookieAttackBeats('csrf', attrs({ sameSite: 'Lax' }), 'lax', 'Lax POST'),
        ...cookieAttackBeats('link', attrs({ sameSite: 'Lax' }), 'lax-link', 'Lax 링크'),
        mark('strict', 'SameSite=Strict', true),
        ...cookieAttackBeats('link', attrs({ sameSite: 'Strict' }), 'strict-link', 'Strict 링크'),
      ], {
        notes: [
          { text: 'None: 위조 POST에도 쿠키가 붙는다', after: 'none-result' },
          { text: 'Lax: POST엔 안 붙고, 링크 이동(GET)엔 붙는다', after: 'lax-link-result' },
          { text: 'Strict: 링크 이동에도 안 붙는다', after: 'strict-link-result' },
        ],
      }),
    },
    {
      label: '수명·범위',
      title: 'Max-Age · Domain · Path: 얼마나, 어디까지',
      body: '· **Max-Age / Expires**: 쿠키 수명. 없으면 브라우저를 닫을 때 지워진다. 오래 남은 세션이 악용되지 않게 짧게 두고 재로그인시킨다\n· **Domain / Path**: 어느 호스트·경로로 보낼지. 불필요한 하위 도메인으로 새지 않게 Domain은 생략한다(현재 호스트만)',
      signal: 'DevTools → Application → Cookies에서 각 쿠키의 HttpOnly · Secure · SameSite 열을 직접 확인할 수 있다. AI가 만든 Set-Cookie에 이 세 개가 없으면 의심부터 하자.',
      state: cookieBaseState(
        [
          tags('maxage', { node: 'browser', text: 'Max-Age=3600 → 1시간 뒤 삭제', tone: 'term' }),
          tags('session', { node: 'browser', text: 'Max-Age 없음 → 브라우저 종료 시 삭제', tone: 'info' }),
          tags('domain', { node: 'browser', text: 'Domain 생략 → 현재 호스트에만', tone: 'term' }),
        ],
        { notes: [{ text: '수명은 짧게, 범위는 좁게', after: 'domain' }] },
      ),
    },
  ],
  quiz: [
    {
      q: 'HttpOnly · Secure · SameSite는 각각 어떤 공격을 막는가? (Quick Check Q6)',
      answer:
        'HttpOnly는 자바스크립트(document.cookie)가 쿠키를 읽지 못하게 해 XSS로 세션 쿠키를 훔쳐 가는 것을 막는다. Secure는 HTTPS에서만 쿠키를 보내 평문 HTTP 도청을 막는다. SameSite(Lax/Strict)는 다른 사이트에서 시작된 요청에 쿠키를 붙이지 않아 CSRF(위조 요청)를 막는다.',
      why: 'p.24 Cookie 보안 속성 표의 "막는 공격 · 문제" 열.',
    },
  ],
}
