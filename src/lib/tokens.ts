/**
 * 6-16 Access + Refresh Token (Week06 p.30–31).
 * 시간이 흐르며 요청 · 만료(401) · 재발급(Rotation) · 로그아웃(RT 폐기)이 어떻게 이어지는지 계산한다. (그림 위의 시뮬레이션)
 */

/** p.30: Access는 5~15분 */
export const DEFAULT_ACCESS_MIN = 15
// 보충: p.30 "수 일~수 주"에서 고른 예시 값
export const REFRESH_DAYS = 14

export type TokenEventKind = 'login' | 'ok' | 'expired' | 'refresh' | 'logout' | 'blocked'
export type TokenEvent = { at: number; kind: TokenEventKind; text: string }

export type TokenSimOptions = {
  /** Access Token 수명 (분) */
  accessMin?: number
  /** 시뮬레이션 길이 (분) */
  durationMin?: number
  /** 요청 간격 (분) */
  requestEvery?: number
  /** 이 시각에 로그아웃 → Refresh Token을 DB에서 삭제 */
  logoutAt?: number
}

/** Access Token n이 쓰인 구간 [from, to). to는 다음 재발급·만료·시뮬레이션 끝 중 가장 이른 시각 */
export type AccessSegment = { n: number; from: number; to: number; exp: number }

export type TokenSimResult = {
  events: TokenEvent[]
  segments: AccessSegment[]
  /** 로그아웃 뒤에도 이미 발급된 Access Token으로 접근할 수 있는 최대 시간 (분). 로그아웃이 없으면 undefined */
  graceAfterLogout?: number
  /** 접근이 처음 막힌 시각 */
  blockedAt?: number
}

export function simulateTokens(o: TokenSimOptions = {}): TokenSimResult {
  const { accessMin = DEFAULT_ACCESS_MIN, durationMin = 60, requestEvery = 5, logoutAt } = o
  const events: TokenEvent[] = [{ at: 0, kind: 'login', text: `로그인 → AT₁ (${fmtMin(accessMin)}) + RT₁ (${REFRESH_DAYS}일)` }]
  let n = 1
  let atExp = accessMin
  const starts: { n: number; from: number; exp: number }[] = [{ n: 1, from: 0, exp: accessMin }]
  let rtRevoked = false
  let blocked = false
  let graceAfterLogout: number | undefined
  let blockedAt: number | undefined

  for (let t = requestEvery; t <= durationMin; t += requestEvery) {
    if (logoutAt !== undefined && !rtRevoked && logoutAt <= t) {
      rtRevoked = true
      graceAfterLogout = Math.max(0, atExp - logoutAt)
      events.push({ at: logoutAt, kind: 'logout', text: `로그아웃 → RT${sub(n)} DB에서 삭제 (AT${sub(n)}는 ${atExp}분까지 유효)` })
    }
    if (blocked) {
      events.push({ at: t, kind: 'blocked', text: 'GET /grades → 401 (재발급 불가)' })
      continue
    }
    if (t < atExp) {
      events.push({ at: t, kind: 'ok', text: `GET /grades Bearer AT${sub(n)} → 200` })
      continue
    }
    events.push({ at: t, kind: 'expired', text: `GET /grades Bearer AT${sub(n)} → 401 token expired` })
    if (rtRevoked) {
      blocked = true
      blockedAt = t
      events.push({ at: t, kind: 'blocked', text: `POST /token/refresh (RT${sub(n)}) → 401 폐기됨 → 접근 끊김` })
      continue
    }
    n += 1
    atExp = t + accessMin
    starts.push({ n, from: t, exp: atExp })
    events.push({ at: t, kind: 'refresh', text: `POST /token/refresh → AT${sub(n)} + RT${sub(n)} (RT${sub(n - 1)} 폐기)` })
    events.push({ at: t, kind: 'ok', text: `GET /grades Bearer AT${sub(n)} → 200` })
  }
  const segments = starts.map((st, i) => ({ ...st, to: Math.min(st.exp, starts[i + 1]?.from ?? Infinity, durationMin) }))
  return { events, segments, graceAfterLogout, blockedAt }
}

const SUBS = '₀₁₂₃₄₅₆₇₈₉'
/** 아래 첨자 숫자: 2 → ₂ */
export const sub = (k: number) => String(k).replace(/\d/g, (d) => SUBS[Number(d)])

/** 분 → "15분", "1시간", "1일" */
export function fmtMin(min: number): string {
  if (min % 1440 === 0) return `${min / 1440}일`
  if (min % 60 === 0) return `${min / 60}시간`
  return `${min}분`
}

/** 분 → "10분", "23시간 40분", "1일 2시간" */
export function fmtDuration(min: number): string {
  const d = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  const m = min % 60
  const parts = [d && `${d}일`, h && `${h}시간`, m && `${m}분`].filter(Boolean)
  return parts.length ? parts.join(' ') : '0분'
}
