import { useEffect, useId, useMemo, useState } from 'react'
import { StageFrame } from '../../../components/stage/StageFrame'
import { Pause, Play } from '../../../components/ui/icons'
import { DEFAULT_ACCESS_MIN, fmtDuration, fmtMin, REFRESH_DAYS, simulateTokens, sub, type TokenEvent } from '../../../lib/tokens'
import { useStudyStore } from '../../../store/useStudyStore'
import { directionColors, protocolColors, STAGE_FLOOR } from '../../../theme'

const DURATION = 60
const ACCESS_CHOICES = [DEFAULT_ACCESS_MIN, 60, 1440]

// 시간축 (viewBox 1000 × 470)
const X0 = 170
const X1 = 950
const x = (min: number) => X0 + ((X1 - X0) * Math.min(min, DURATION)) / DURATION
const ROW = { at: 120, rt: 230, req: 350 }
const BAR_H = 56
const INK = '#34302b'
const AT_FILL = '#e7ddf5'
const RT_FILL = '#f6e6c9'

type Marker = { at: number; kind: 'ok' | 'refresh' | 'blocked' }

/** 같은 시각의 여러 사건을 표시 하나로: 차단 > 재발급 > 정상 */
function markers(events: TokenEvent[]): Marker[] {
  const byAt = new Map<number, Marker['kind']>()
  for (const e of events) {
    if (e.kind === 'login' || e.kind === 'logout') continue
    const prev = byAt.get(e.at)
    const kind: Marker['kind'] = e.kind === 'blocked' ? 'blocked' : e.kind === 'refresh' ? 'refresh' : prev === 'refresh' || prev === 'blocked' ? prev : 'ok'
    if (prev === 'blocked') continue
    byAt.set(e.at, prev === 'refresh' && kind === 'ok' ? 'refresh' : kind)
  }
  return [...byAt].map(([at, kind]) => ({ at, kind }))
}

const MARK_COLOR: Record<Marker['kind'], { fill: string; stroke: string }> = {
  ok: { fill: directionColors.forwardFill, stroke: directionColors.forward },
  refresh: { fill: directionColors.backwardFill, stroke: directionColors.backward },
  blocked: { fill: protocolColors.error.bg, stroke: protocolColors.error.fg },
}

/**
 * 6-16 직접 해보기: 시간 슬라이더.
 * 0~60분 동안 5분마다 요청을 보내며, Access 만료 → 401 → Refresh 재발급(Rotation) → 로그아웃(RT 삭제)이 어떻게 이어지는지 본다.
 * 계산은 src/lib/tokens.ts. 그림 위의 시뮬레이션이며 실제 토큰을 만들거나 보내지 않는다.
 */
export function TokenSandbox() {
  const setEvents = useStudyStore((s) => s.setEvents)
  const [now, setNow] = useState(DURATION)
  const [playing, setPlaying] = useState(false)
  const [accessMin, setAccessMin] = useState(DEFAULT_ACCESS_MIN)
  const [logoutOn, setLogoutOn] = useState(true)
  const [logoutAt, setLogoutAt] = useState(20)
  const nowId = useId()
  const logoutId = useId()

  const sim = useMemo(() => simulateTokens({ accessMin, durationMin: DURATION, logoutAt: logoutOn ? logoutAt : undefined }), [accessMin, logoutOn, logoutAt])
  const marks = useMemo(() => markers(sim.events), [sim])
  const rtEnd = logoutOn ? logoutAt : DURATION
  const segs = sim.segments.filter((g) => g.to > g.from)

  useEffect(() => {
    if (!playing) return
    const t = window.setInterval(() => {
      setNow((n) => {
        if (n >= DURATION) {
          setPlaying(false)
          return n
        }
        return n + 1
      })
    }, 120)
    return () => window.clearInterval(t)
  }, [playing])

  useEffect(() => {
    setEvents(sim.events.filter((e) => e.at <= now).map((e) => `${String(e.at).padStart(2, ' ')}분  ${e.text}`))
  }, [sim, now, setEvents])

  const play = () => {
    if (now >= DURATION) setNow(0)
    setPlaying((p) => !p)
  }

  // 지금 상태
  const cur = [...sim.segments].reverse().find((g) => g.from <= now) ?? sim.segments[0]
  const blocked = sim.blockedAt !== undefined && now >= sim.blockedAt
  const loggedOut = logoutOn && now >= logoutAt
  const status = blocked
    ? { tone: 'bad', head: '접근 끊김', text: `RT${sub(cur.n)}가 DB에서 삭제되어 재발급할 수 없다.` }
    : loggedOut
      ? { tone: 'warn', head: `로그아웃했지만 AT${sub(cur.n)}는 아직 유효`, text: `${fmtDuration(cur.exp - now)} 더 API를 호출할 수 있다. 만료되면 재발급이 막힌다.` }
      : { tone: 'ok', head: `AT${sub(cur.n)} 사용 중 · ${fmtDuration(cur.exp - now)} 남음`, text: `만료되면 401 → RT${sub(cur.n)}로 재발급하고 RT도 새것으로 바꾼다.` }
  const graceEnd = logoutOn && sim.graceAfterLogout !== undefined ? logoutAt + sim.graceAfterLogout : undefined

  return (
    <div className="flex w-full flex-wrap items-start justify-center gap-4">
      <StageFrame className="flex-[999_1_480px]">
        <div className="absolute inset-0 flex flex-col gap-2 p-4">
          <svg viewBox="0 0 1000 470" className="min-h-0 w-full flex-1" role="img" aria-label={`토큰 시간표, 현재 ${now}분`}>
            <defs>
              <pattern id="grace-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="10" height="10" fill={protocolColors.error.bg} />
                <line x1="0" y1="0" x2="0" y2="10" stroke={protocolColors.error.fg} strokeWidth="2.5" opacity="0.35" />
              </pattern>
            </defs>

            {/* 행 이름 */}
            {[
              { y: ROW.at, t: 'Access', s: `${fmtMin(accessMin)} · 메모리` },
              { y: ROW.rt, t: 'Refresh', s: `${REFRESH_DAYS}일 · 쿠키` },
              { y: ROW.req - 28, t: '요청', s: '5분마다 GET' },
            ].map((r) => (
              <g key={r.t} fontFamily="var(--font-mono)">
                <text x="30" y={r.y + 24} fontSize="19" fontWeight="800" fill={INK}>
                  {r.t}
                </text>
                <text x="30" y={r.y + 46} fontSize="13" fill="#6f6961">
                  {r.s}
                </text>
              </g>
            ))}

            {/* Access 구간 */}
            {segs.map((g) => (
              <g key={`at${g.n}`}>
                <rect x={x(g.from) + 2} y={ROW.at + 3} width={x(g.to) - x(g.from) - 4} height={BAR_H} rx="8" fill={INK} />
                <rect x={x(g.from) + 2} y={ROW.at} width={x(g.to) - x(g.from) - 4} height={BAR_H} rx="8" fill={AT_FILL} stroke={INK} strokeWidth="1.3" />
              </g>
            ))}
            {cur.exp > DURATION && (
              <text x={X1} y={ROW.at - 10} textAnchor="end" fontSize="13" fill="#6f6961" fontFamily="var(--font-mono)">
                AT{sub(cur.n)} 만료: {fmtDuration(cur.exp)} 시점 →
              </text>
            )}
            {graceEnd !== undefined && (
              <g>
                <rect x={x(logoutAt)} y={ROW.at - 4} width={x(graceEnd) - x(logoutAt)} height={BAR_H + 8} fill="url(#grace-hatch)" opacity="0.85" />
                <text x={x(logoutAt) + 8} y={ROW.at + BAR_H + 24} fontSize="13" fontWeight="700" fill={protocolColors.error.fg} fontFamily="var(--font-mono)">
                  로그아웃 뒤에도 쓰이는 AT: {fmtDuration(sim.graceAfterLogout!)}
                </text>
              </g>
            )}
            {segs.map((g) => (
              <text key={`atl${g.n}`} x={(x(g.from) + x(g.to)) / 2} y={ROW.at + 35} textAnchor="middle" fontSize="18" fontWeight="800" fill={INK} fontFamily="var(--font-mono)">
                AT{sub(g.n)}
              </text>
            ))}

            {/* Refresh 구간 (Rotation: 재발급마다 새 RT) */}
            {sim.segments
              .filter((g) => g.from < rtEnd)
              .map((g, i, arr) => {
                const to = Math.min(arr[i + 1]?.from ?? rtEnd, rtEnd)
                if (to <= g.from) return null
                return (
                  <g key={`rt${g.n}`}>
                    <rect x={x(g.from) + 2} y={ROW.rt + 3} width={x(to) - x(g.from) - 4} height={BAR_H} rx="8" fill={INK} />
                    <rect x={x(g.from) + 2} y={ROW.rt} width={x(to) - x(g.from) - 4} height={BAR_H} rx="8" fill={RT_FILL} stroke={INK} strokeWidth="1.3" />
                    <text x={(x(g.from) + x(to)) / 2} y={ROW.rt + 35} textAnchor="middle" fontSize="18" fontWeight="800" fill={INK} fontFamily="var(--font-mono)">
                      RT{sub(g.n)}
                    </text>
                  </g>
                )
              })}
            {logoutOn && (
              <g>
                <rect x={x(logoutAt) + 2} y={ROW.rt} width={X1 - x(logoutAt) - 4} height={BAR_H} rx="8" fill="none" stroke="#b0a698" strokeWidth="1.3" strokeDasharray="6 5" />
                <text x={(x(logoutAt) + X1) / 2} y={ROW.rt + 35} textAnchor="middle" fontSize="14" fill="#8b847a" fontFamily="var(--font-mono)">
                  DB에서 삭제 → 재발급 불가
                </text>
              </g>
            )}

            {/* 요청 */}
            <line x1={X0} y1={ROW.req} x2={X1} y2={ROW.req} stroke="#ddd3c5" strokeWidth="1.3" />
            {marks.map((m) => (
              <circle key={m.at} cx={x(m.at)} cy={ROW.req} r={m.kind === 'ok' ? 9 : 12} fill={MARK_COLOR[m.kind].fill} stroke={MARK_COLOR[m.kind].stroke} strokeWidth="1.8" />
            ))}

            {/* 시간축 */}
            <line x1={X0} y1={ROW.req + 50} x2={X1} y2={ROW.req + 50} stroke={INK} strokeWidth="1.3" />
            {[0, 15, 30, 45, 60].map((m) => (
              <g key={m} fontFamily="var(--font-mono)">
                <line x1={x(m)} y1={ROW.req + 44} x2={x(m)} y2={ROW.req + 56} stroke={INK} strokeWidth="1.3" />
                <text x={x(m)} y={ROW.req + 78} textAnchor="middle" fontSize="14" fill="#6f6961">
                  {m}분
                </text>
              </g>
            ))}

            {/* 로그아웃 선 */}
            {logoutOn && (
              <g>
                <line x1={x(logoutAt)} y1={ROW.at - 30} x2={x(logoutAt)} y2={ROW.req + 50} stroke={protocolColors.error.fg} strokeWidth="2" strokeDasharray="7 5" />
                <text x={x(logoutAt)} y={ROW.at - 38} textAnchor="middle" fontSize="14" fontWeight="800" fill={protocolColors.error.fg} fontFamily="var(--font-mono)">
                  로그아웃
                </text>
              </g>
            )}

            {/* 아직 오지 않은 시간은 흐리게 */}
            {now < DURATION && <rect x={x(now)} y={ROW.at - 60} width={X1 - x(now) + 30} height={ROW.req + 100 - ROW.at} fill={STAGE_FLOOR} opacity="0.7" />}
            <line x1={x(now)} y1={ROW.at - 20} x2={x(now)} y2={ROW.req + 50} stroke={INK} strokeWidth="2.5" />
            <circle cx={x(now)} cy={ROW.req + 50} r="6" fill={INK} />
          </svg>

          <div
            aria-live="polite"
            className={`rounded-[10px] border px-4 py-2.5 text-[13px] ${status.tone === 'ok' ? 'border-[#c9d6b3] bg-green-tile' : status.tone === 'warn' ? 'border-[#e6cf9f] bg-sand' : 'border-[#ebbcb3] bg-rose-tile'}`}
          >
            <p className="m-0 font-bold">
              {now}분 · {status.head}
            </p>
            <p className="m-0 mt-0.5 text-[12px] text-ink-2">{status.text}</p>
          </div>
        </div>
      </StageFrame>

      <div className="flex w-full max-w-[300px] flex-[1_1_240px] flex-col gap-4 rounded-xl border border-line bg-card p-4">
        <div className="flex flex-col gap-2">
          <label htmlFor={nowId} className="text-[13px] font-bold">
            시각: {now}분
          </label>
          <input
            id={nowId}
            type="range"
            min={0}
            max={DURATION}
            step={1}
            value={now}
            onChange={(e) => {
              setPlaying(false)
              setNow(Number(e.target.value))
            }}
            className="accent-[#24521c]"
          />
          <button type="button" onClick={play} className="tool">
            {playing ? <Pause size={14} /> : <Play size={14} />}
            {playing ? '멈춤' : '0분부터 흘려 보기'}
          </button>
        </div>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-[13px] font-bold">Access Token 수명</legend>
          <div className="flex gap-1.5">
            {ACCESS_CHOICES.map((m) => (
              <button key={m} type="button" aria-pressed={accessMin === m} onClick={() => setAccessMin(m)} className="tool flex-1 px-1">
                {fmtMin(m)}
              </button>
            ))}
          </div>
          <p className="m-0 text-[11.5px] leading-relaxed text-muted">길게 하면 재발급은 줄지만, 로그아웃해도 남은 Access로 오래 접근된다.</p>
        </fieldset>

        <div className="flex flex-col gap-2">
          <button type="button" aria-pressed={logoutOn} onClick={() => setLogoutOn((v) => !v)} className="tool">
            로그아웃 (RT 삭제)
          </button>
          <label htmlFor={logoutId} className={`text-[13px] font-bold ${logoutOn ? '' : 'text-faint'}`}>
            로그아웃 시각: {logoutAt}분
          </label>
          <input
            id={logoutId}
            type="range"
            min={1}
            max={DURATION - 1}
            step={1}
            value={logoutAt}
            disabled={!logoutOn}
            onChange={(e) => setLogoutAt(Number(e.target.value))}
            className="accent-[#24521c]"
          />
          {logoutOn && sim.graceAfterLogout !== undefined && (
            <p className="m-0 text-[12px] leading-relaxed">
              로그아웃 뒤 남은 접근 시간: <b>{fmtDuration(sim.graceAfterLogout)}</b>
            </p>
          )}
        </div>

        <p className="m-0 text-[11px] text-faint">Refresh {REFRESH_DAYS}일은 예시 값입니다. 그림 위의 시뮬레이션이며, 실제 토큰을 만들거나 보내지 않습니다.</p>
      </div>
    </div>
  )
}
