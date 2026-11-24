import { crackYears, HASH_EXAMPLES, SALT_EXAMPLES, SALTED_EXAMPLES, shortHex } from '../../lib/hash'
import type { TopoBeat, TopoLink, TopoNode, TopoTag, TopologyState } from '../../scenes/topology/types'
import type { Step } from '../types'

// 출처: Week06 PDF p.19 (비밀번호는 어떻게 저장해야 하는가 · 왜 '느린' 해시인가 · pwdlib),
//       p.20 (믹서기 비유 · kim/lee 표)
// 해시 값은 강의자료의 설명용 값(9b1f3c… / 3e7a… / c81d…) 대신 실제 SHA-256 (src/lib/hash.ts, 테스트로 확인)
// 패널 글은 배경과 흐름이 보이게 풀어 쓴다. 강의자료에 없는 설명은 // 보충

const PW = 'inu1234'
const H = shortHex(HASH_EXAMPLES.inu1234, 6)
const SK = shortHex(SALTED_EXAMPLES.kim, 6)
const SL = shortHex(SALTED_EXAMPLES.lee, 6)
const YEARS = Math.round(crackYears(0.1, 1e9))

const tags = (id: string, ...list: TopoTag[]): TopoBeat => ({ kind: 'tags', id, tags: list })

const GAP = 290
const NODES: TopoNode[] = [
  { id: 'signup', label: '가입 화면', sub: '브라우저', kind: 'browser', t: 0 },
  { id: 'server', label: '서버', kind: 'server', t: GAP },
  { id: 'db', label: 'User DB', kind: 'db', t: GAP * 2 },
]
const ATTACKER: TopoNode = { id: 'attacker', label: '공격자', sub: 'DB 유출', kind: 'attacker', t: GAP * 2, side: 330 }
const LINKS: TopoLink[] = [
  { from: 'signup', to: 'server' },
  { from: 'server', to: 'db' },
]
const scene = (withAttacker: boolean, s: Omit<TopologyState, 'kind' | 'nodes' | 'links'>): TopologyState => ({
  kind: 'topology',
  nodes: withAttacker ? [...NODES, ATTACKER] : NODES,
  links: withAttacker ? [...LINKS, { from: 'db', to: 'attacker', style: 'danger' }] : LINKS,
  ...s,
})

/** 가입 → 서버에서 변환 → DB에 kim·lee 두 행 저장 */
function store(prefix: string, how: string, kim: string, lee: string): TopoBeat[] {
  return [
    { kind: 'flow', id: `${prefix}-signup`, path: ['signup', 'server'], label: 'kim · lee 가입', detail: `둘 다 pw=${PW}`, tone: 'request' },
    { kind: 'flow', id: `${prefix}-save`, path: ['server', 'db'], label: how, tone: 'request' },
    tags(`${prefix}-rows`, { node: 'db', text: `kim: ${kim}`, tone: 'info' }, { node: 'db', text: `lee: ${lee}`, tone: 'info' }),
  ]
}
const LEAK: TopoBeat = { kind: 'flow', id: 'leak', path: ['db', 'attacker'], label: 'DB 통째로', detail: '유출', tone: 'danger' }

export const passwordStorage: Step = {
  id: 'password-storage',
  no: '6-10',
  title: '비밀번호 저장',
  slides: [19, 20],
  scene: 'topology',
  star: true,
  sandbox: true,
  easy: {
    title: '비밀번호 해시를 믹서기로 이해하기',
    body: `갈아 버린 주스로 원래 과일을 되돌릴 수는 없지만, 같은 과일을 다시 갈면 같은 주스가 나온다.\n\n① **해시 = 믹서기**: 딸기 + 바나나 → 분홍 주스. 주스를 보고 과일을 꺼낼 수 없다(단방향). 로그인 때 입력한 과일을 다시 갈아서 저장된 주스와 색만 비교한다.\n② **레인보우 테이블**: 공격자가 흔한 과일 조합(123456, password, qwerty…)의 주스 색을 미리 다 만들어 둔 색상표. 유출된 주스 색을 표에서 찾으면 과일이 바로 나온다.\n③ **Salt = 사람마다 다른 비밀 재료**: 가입할 때마다 무작위 재료를 섞어 간다. 같은 비밀번호라도 사람마다 주스 색이 달라서, 미리 만든 색상표가 쓸모없어진다.\n④ **느린 믹서기**: Argon2id는 한 번 갈 때 시간과 메모리를 많이 쓰도록 설계되어, 공격자의 대량 시도를 비싸게 만든다. Salt는 비밀이 아니며 해시 문자열 안에 함께 저장된다.`,
  },
  phases: [
    {
      label: '원칙',
      title: '서버도 비밀번호를 알 수 없어야 한다',
      // 보충: 마지막 문장 (DB 유출을 가정하고 고른다)
      body: '비밀번호 저장의 원칙은 하나다. **서버도 사용자의 비밀번호를 알 수 없어야 한다.** 서버가 저장하는 것은 로그인 때 **비교만 가능한 값**이다.\n\nDB는 언젠가 털릴 수 있다고 가정하고, 털렸을 때 무엇이 드러나는지로 저장 방식을 고른다.',
      state: scene(false, {
        beats: [
          { kind: 'flow', id: 'signup', path: ['signup', 'server'], label: 'kim 가입', detail: `pw=${PW}`, tone: 'request' },
          tags('rule', { node: 'server', text: '저장할 것 = 비교만 가능한 값', tone: 'term' }),
        ],
        notes: [{ text: '서버도 비밀번호를 몰라야 한다', after: 'rule' }],
      }),
    },
    {
      label: '평문',
      title: '평문: 털리면 끝',
      // 보충: 마지막 문장 (비밀번호 재사용 위험)
      body: '비밀번호를 그대로(평문) 저장하면, DB가 유출되는 순간 **모든 계정이 즉시 탈취**된다.\n\n다른 사이트에 같은 비밀번호를 쓰는 사람까지 위험해진다.',
      state: scene(true, {
        beats: [...store('plain', '그대로 저장', PW, PW), LEAK, tags('stolen', { node: 'attacker', text: '모든 계정 즉시 탈취', tone: 'threat' })],
        notes: [{ text: '✕ 평문: 유출 = 모든 계정 탈취', after: 'stolen' }],
      }),
    },
    {
      label: '암호화',
      title: '암호화: 키도 서버에 있다',
      body: 'AES로 암호화해 저장하면 안전해 보이지만, **복호화 키도 서버에 있다.** 서버가 털릴 때 키도 함께 털리면 그대로 풀린다.\n\n되돌릴 수 있는 방식은 비밀번호 저장에 맞지 않는다.',
      state: scene(true, {
        tags: [{ node: 'server', text: '암호화 키', tone: 'warn' }],
        beats: [
          ...store('aes', 'AES 암호화', 'U2FsdGVkX1+…', 'U2FsdGVkX1+…'),
          LEAK,
          { kind: 'flow', id: 'key-leak', path: ['server', 'db', 'attacker'], label: '키도 함께', detail: '서버에서 유출', tone: 'danger' },
          tags('decrypt', { node: 'attacker', text: `복호화 → ${PW}`, tone: 'threat' }),
        ],
        notes: [{ text: '✕ 암호화: 키와 함께 털리면 풀린다', after: 'decrypt' }],
      }),
    },
    {
      label: '단순 해시',
      title: '단순 해시: 같은 비밀번호는 같은 해시',
      body: 'SHA-256으로 해시하면 되돌릴 수는 없다(6-4). 하지만 두 가지 약점이 있다.\n· **같은 비밀번호는 같은 해시**다. kim과 lee의 해시가 똑같아서 한 명이 뚫리면 다른 사람도 뚫린다\n· **너무 빠르다.** GPU로 초당 수십억 번 대입할 수 있다. 공격자는 흔한 비밀번호의 해시를 미리 만든 **레인보우 테이블**에서 찾아본다',
      state: scene(true, {
        beats: [
          ...store('sha', 'SHA-256', H, H),
          tags('same', { node: 'db', text: '같은 비밀번호 = 같은 해시', tone: 'warn' }),
          LEAK,
          tags(
            'rainbow',
            { node: 'attacker', text: `레인보우 테이블에서 찾음 → ${PW}`, tone: 'threat' },
            { node: 'attacker', text: 'GPU로 초당 수십억 번 대입', tone: 'threat' },
          ),
        ],
        notes: [{ text: '△ 단순 해시: 같은 해시 + 너무 빠름', after: 'rainbow' }],
      }),
    },
    {
      label: 'Salt',
      title: 'Salt: 사람마다 다른 비밀 재료',
      body: '가입할 때마다 **무작위 재료(Salt)**를 섞어 해시한다. 같은 비밀번호라도 사람마다 해시가 달라져, 미리 만든 레인보우 테이블이 쓸모없어진다.\n\nSalt는 **비밀이 아니며** 해시와 함께 저장된다. 하지만 해시 자체가 여전히 빨라서, 한 사람씩 대입하는 공격은 막지 못한다.',
      state: scene(true, {
        beats: [
          ...store('salt', 'Salt + SHA-256', `salt=${SALT_EXAMPLES.kim} · ${SK}`, `salt=${SALT_EXAMPLES.lee} · ${SL}`),
          tags('differ', { node: 'db', text: '같은 비밀번호인데 해시가 다르다', tone: 'defense' }),
          LEAK,
          tags(
            'still-fast',
            { node: 'attacker', text: '레인보우 테이블 쓸모없음', tone: 'defense' },
            { node: 'attacker', text: '그래도 너무 빠름 → 한 명씩 대입', tone: 'warn' },
          ),
        ],
        notes: [{ text: '△ Salt: 레인보우 테이블은 막지만 여전히 빠르다', after: 'still-fast' }],
      }),
    },
    {
      label: '느린 해시',
      title: '느린 해시: 공격을 비싸게 만든다',
      body: `Argon2id·bcrypt·scrypt는 **일부러 느리고 메모리를 많이 쓰도록** 설계된 해시다. 정상 로그인은 0.1초 걸려도 불편하지 않지만, 유출된 해시로 10억 개를 대입하는 공격자에게는 0.1초 × 10억 = **약 ${YEARS}년**이 된다.\n\nSalt도 해시 문자열 안에 자동으로 포함된다.`,
      signal: 'FastAPI 공식 튜토리얼 방식은 pwdlib의 PasswordHash.recommended()(Argon2id)다. 가입 때 ph.hash(비밀번호)로 저장하고, 로그인 때 ph.verify(입력, 저장된 해시)로 비교한다.',
      state: scene(true, {
        beats: [
          ...store('argon', 'Argon2id (느리게)', `$argon2id$…$${SALT_EXAMPLES.kim}f…`, `$argon2id$…$${SALT_EXAMPLES.lee}p…`),
          tags('slow', { node: 'server', text: '정상 로그인: 0.1초 (불편 없음)', tone: 'defense' }),
          LEAK,
          tags('expensive', { node: 'attacker', text: `0.1초 × 10억 번 = 약 ${YEARS}년`, tone: 'defense' }),
        ],
        notes: [{ text: '○ 느린 해시 + Salt: 대량 대입을 비싸게', after: 'expensive' }],
      }),
    },
  ],
  quiz: [
    {
      q: '비밀번호를 SHA-256 한 번으로 저장하면 안 되는 이유와 Salt의 역할은? (Quick Check Q4)',
      answer:
        'SHA-256은 너무 빨라서 GPU로 초당 수십억 번 대입할 수 있고, 같은 비밀번호는 항상 같은 해시가 되어 미리 만든 레인보우 테이블로 바로 찾을 수 있다. Salt는 사용자마다 다른 무작위 값을 섞어 같은 비밀번호라도 해시가 달라지게 해 레인보우 테이블을 무력화한다. 그래도 빠른 해시는 대입에 약하므로 Argon2id·bcrypt 같은 느린 해시 + Salt로 저장한다.',
      why: 'p.19 저장 방식 표와 p.20 Salt 설명.',
    },
  ],
}
