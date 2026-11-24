import { useEffect, useId, useState } from 'react'
import { StageFrame } from '../../../components/stage/StageFrame'
import { RotateCcw } from '../../../components/ui/icons'
import { RFC_EXAMPLE, secondsLeft, timeStep, totp, TOTP_STEP_S } from '../../../lib/totp'
import { useStudyStore } from '../../../store/useStudyStore'

/** 남은 시간 원형 타이머 */
function Ring({ left }: { left: number }) {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#e6ddd0" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke={left <= 5 ? '#e5534b' : '#7fc278'}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - left / TOTP_STEP_S)}
        transform="rotate(-90 32 32)"
      />
      <text x="32" y="37" textAnchor="middle" fontSize="15" fontWeight="800" fill="#1d1b18">
        {left}
      </text>
    </svg>
  )
}

function CodeCard({ title, sub, code, left, tone }: { title: string; sub: string; code: string | null; left: number; tone: 'ok' | 'bad' }) {
  return (
    <div className={`flex flex-1 items-center gap-3 rounded-[12px] border-[1.3px] border-ink-2 px-4 py-3 shadow-[0_1.5px_0_var(--color-ink-2)] ${tone === 'ok' ? 'bg-card' : 'bg-rose-tile'}`}>
      <Ring left={left} />
      <div className="min-w-0">
        <p className="m-0 text-[12px] font-bold text-muted">{title}</p>
        <p className="m-0 font-mono text-[30px] leading-tight font-extrabold tracking-[0.12em]" aria-label={`${title} 코드`}>
          {code ? `${code.slice(0, 3)} ${code.slice(3)}` : '··· ···'}
        </p>
        <p className="m-0 text-[11px] text-muted">{sub}</p>
      </div>
    </div>
  )
}

/**
 * 6-9 직접 해보기: 실제 TOTP 계산기.
 * 이 컴퓨터의 현재 시각으로 OTP 앱과 서버가 각자 6자리를 계산한다. 앱 시계를 어긋나게 해 보면 코드가 달라진다.
 * 계산은 브라우저 안(Web Crypto)에서만 한다.
 */
export function TotpSandbox() {
  const setEvents = useStudyStore((s) => s.setEvents)
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  const [skew, setSkew] = useState(0)
  const [codes, setCodes] = useState<{ app: string; server: string; key: string } | null>(null)
  const skewId = useId()

  useEffect(() => {
    const t = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => window.clearInterval(t)
  }, [])

  const appTime = now + skew
  const key = `${timeStep(appTime)}:${timeStep(now)}`
  useEffect(() => {
    let alive = true
    Promise.all([totp(RFC_EXAMPLE.secret, appTime), totp(RFC_EXAMPLE.secret, now)]).then(([app, server]) => {
      if (alive) setCodes({ app, server, key })
    })
    return () => {
      alive = false
    }
    // 30초 칸이 바뀔 때만 다시 계산한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const ready = codes && codes.key === key ? codes : null
  const same = ready ? ready.app === ready.server : true

  useEffect(() => {
    if (!ready) return
    setEvents([
      `앱: 비밀값 + 시각칸 ${timeStep(appTime)} → ${ready.app}`,
      `서버: 비밀값 + 시각칸 ${timeStep(now)} → ${ready.server}`,
      same ? '같다 → 로그인 통과' : '다르다 → 로그인 실패 (앱 시계가 어긋남)',
    ])
    // 칸이 바뀔 때만 로그를 갱신한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, same, setEvents])

  return (
    <div className="flex w-full flex-wrap items-start justify-center gap-4">
      <StageFrame className="flex-[999_1_480px]">
        <div className="absolute inset-0 flex flex-col justify-center gap-4 overflow-y-auto p-6">
          <div className="flex flex-wrap gap-3">
            <CodeCard title="OTP 앱" sub={skew === 0 ? '내 스마트폰 시계' : `시계 ${skew > 0 ? '+' : ''}${skew}초 어긋남`} code={ready?.app ?? null} left={secondsLeft(appTime)} tone={same ? 'ok' : 'bad'} />
            <CodeCard title="서버" sub="서버 시계" code={ready?.server ?? null} left={secondsLeft(now)} tone="ok" />
          </div>
          <div aria-live="polite" className={`rounded-[10px] border px-4 py-3 text-[13px] ${same ? 'border-[#c9d6b3] bg-green-tile' : 'border-[#ebbcb3] bg-rose-tile'}`}>
            <p className="m-0 font-bold">{same ? '두 코드가 같다 → 로그인 통과' : '두 코드가 다르다 → 로그인 실패'}</p>
            <p className="m-0 mt-1 text-[12px] text-ink-2">
              같은 비밀값 + 같은 {TOTP_STEP_S}초 칸이면 네트워크 없이도 같은 6자리가 나온다. {TOTP_STEP_S}초마다 둘이 함께 바뀐다.
            </p>
          </div>
        </div>
      </StageFrame>

      <div className="flex w-full max-w-[300px] flex-[1_1_240px] flex-col gap-4 rounded-xl border border-line bg-card p-4">
        <div className="flex flex-col gap-1">
          <p className="m-0 text-[13px] font-bold">나눠 가진 비밀값</p>
          <p className="m-0 font-mono text-[12.5px] break-all text-ink-2">{RFC_EXAMPLE.secret}</p>
          <p className="m-0 text-[11px] text-faint">표준(RFC 6238) 시험용 비밀값입니다.</p>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={skewId} className="text-[13px] font-bold">
            앱 시계 어긋남: {skew > 0 ? '+' : ''}
            {skew}초
          </label>
          <input id={skewId} type="range" min={-90} max={90} step={5} value={skew} onChange={(e) => setSkew(Number(e.target.value))} className="accent-[#24521c]" />
          <p className="m-0 text-[11.5px] leading-relaxed text-muted">시계가 다른 {TOTP_STEP_S}초 칸으로 넘어가면 코드가 달라진다.</p>
        </div>
        <button type="button" onClick={() => setSkew(0)} className="tool">
          <RotateCcw size={14} />
          시계 맞추기
        </button>
        <p className="m-0 text-[11px] text-faint">코드는 이 컴퓨터 안에서만 계산하고, 어디로도 보내지 않습니다.</p>
      </div>
    </div>
  )
}
