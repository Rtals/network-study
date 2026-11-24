import { useEffect, useMemo, useState } from 'react'
import { StageFrame } from '../../../components/stage/StageFrame'
import { ATTACK_INFO, evaluateCookie, RECOMMENDED, setCookieHeader, type CookieAttack, type CookieAttrs, type SameSite } from '../../../lib/cookie'
import { useStudyStore } from '../../../store/useStudyStore'
import { TopologyDiagram } from '../../topology/TopologyDiagram'
import { cookieAttackBeats, cookieState } from './scenario'

const ATTACKS: CookieAttack[] = ['xss', 'sniff', 'csrf', 'link']
const SAMESITES: SameSite[] = ['Strict', 'Lax', 'None']

/**
 * 6-13 직접 해보기: 쿠키 속성을 켜고 끄며 XSS·도청·CSRF가 통하는지 본다.
 * 판정은 src/lib/cookie.ts. 그림 위의 가짜 시뮬레이션이다.
 */
export function CookieSandbox() {
  const setEvents = useStudyStore((s) => s.setEvents)
  const speed = useStudyStore((s) => s.speed)
  const [attrs, setAttrs] = useState<CookieAttrs>({ httpOnly: false, secure: false, sameSite: 'None' })
  const [attack, setAttack] = useState<CookieAttack>('xss')
  const [tries, setTries] = useState(0)

  const outcome = evaluateCookie(attrs)
  const state = useMemo(() => cookieState(attack, cookieAttackBeats(attack, attrs)), [attack, attrs])

  useEffect(() => {
    setEvents([
      `Set-Cookie: ${setCookieHeader(attrs)}`,
      ...(outcome.rejected
        ? ['SameSite=None인데 Secure가 없어 브라우저가 쿠키를 거부함']
        : ATTACKS.map((a) => {
            const hit = outcome.result[a]
            return a === 'link' ? `${ATTACK_INFO[a].label}: 쿠키 ${hit ? '붙음' : '안 붙음'}` : `${ATTACK_INFO[a].label}: ${hit ? '성공 ✕' : '막힘 ✓'}`
          })),
    ])
  }, [attrs, outcome, setEvents])

  const toggle = (k: 'httpOnly' | 'secure') => setAttrs((a) => ({ ...a, [k]: !a[k] }))

  return (
    <div className="flex w-full flex-wrap items-start justify-center gap-4">
      <StageFrame className="flex-[999_1_480px]">
        <TopologyDiagram state={state} speed={speed} playKey={`${attack}-${attrs.httpOnly}-${attrs.secure}-${attrs.sameSite}-${tries}`} />
      </StageFrame>

      <div className="flex w-full max-w-[300px] flex-[1_1_240px] flex-col gap-4 rounded-xl border border-line bg-card p-4">
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-[13px] font-bold">쿠키 속성</legend>
          <div className="flex gap-1.5">
            <button type="button" aria-pressed={attrs.httpOnly} onClick={() => toggle('httpOnly')} className="tool flex-1">
              HttpOnly
            </button>
            <button type="button" aria-pressed={attrs.secure} onClick={() => toggle('secure')} className="tool flex-1">
              Secure
            </button>
          </div>
          <div role="group" aria-label="SameSite" className="flex gap-1.5">
            {SAMESITES.map((s) => (
              <button key={s} type="button" aria-pressed={attrs.sameSite === s} onClick={() => setAttrs((a) => ({ ...a, sameSite: s }))} className="tool flex-1 px-1 text-[11.5px]">
                {s}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setAttrs(RECOMMENDED)} className="tool text-[11.5px]">
            권장 조합으로
          </button>
        </fieldset>

        <div aria-live="polite" className="flex flex-col gap-1.5">
          <p className="m-0 text-[13px] font-bold">공격 결과 (눌러서 재생)</p>
          {outcome.rejected && (
            <p className="m-0 rounded-[10px] border border-[#f1d08f] bg-[#fbe5bd] px-3 py-2 text-[12px] font-bold text-[#6d4a0c]">
              SameSite=None인데 Secure가 없다 → 브라우저가 이 쿠키를 거부한다
            </p>
          )}
          {ATTACKS.map((a) => {
            const hit = outcome.result[a]
            const bad = a !== 'link' && hit
            return (
              <button
                key={a}
                type="button"
                aria-pressed={attack === a}
                onClick={() => {
                  setAttack(a)
                  setTries((n) => n + 1)
                }}
                className="tool h-auto justify-between py-1.5 text-left text-[12px]"
              >
                {ATTACK_INFO[a].label}
                <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${outcome.rejected ? 'bg-zinc-100 text-muted' : bad ? 'bg-[#f8d5cf] text-[#8f2a22]' : a === 'link' ? 'bg-zinc-100 text-ink-2' : 'bg-green text-[#24521c]'}`}>
                  {outcome.rejected ? '쿠키 없음' : a === 'link' ? (hit ? '쿠키 붙음' : '안 붙음') : hit ? '성공' : '막힘'}
                </span>
              </button>
            )
          })}
        </div>
        <p className="m-0 font-mono text-[11px] break-all text-muted">{setCookieHeader(attrs)}</p>
        <p className="m-0 text-[11px] text-faint">그림 위의 가짜 시뮬레이션입니다. 실제 쿠키·스크립트·요청을 다루지 않습니다.</p>
      </div>
    </div>
  )
}
