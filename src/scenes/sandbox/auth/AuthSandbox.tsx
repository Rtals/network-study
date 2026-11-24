import { useEffect, useMemo, useState } from 'react'
import { StageFrame } from '../../../components/stage/StageFrame'
import { AUTH_CARDS, authorize, cardById } from '../../../lib/authz'
import { useStudyStore } from '../../../store/useStudyStore'
import { TopologyDiagram } from '../../topology/TopologyDiagram'
import { authScenario, authState } from './scenario'

const GUESSES = [401, 403, 200] as const

/**
 * 6-8 직접 해보기: 상황 카드를 고르고 401 / 403 / 200을 먼저 맞혀 본 뒤, 요청이 어디서 멈추는지 본다.
 * 판정은 src/lib/authz.ts. 실제 요청을 보내지 않는다.
 */
export function AuthSandbox() {
  const setEvents = useStudyStore((s) => s.setEvents)
  const speed = useStudyStore((s) => s.speed)
  const [cardId, setCardId] = useState(AUTH_CARDS[0].id)
  const [guess, setGuess] = useState<number | null>(null)

  const card = cardById(cardId)
  const scenario = useMemo(() => authScenario(card), [card])
  const answer = authorize(card.req)
  const state = useMemo(() => authState(guess === null ? [] : scenario.beats), [guess, scenario])

  useEffect(() => {
    setEvents(guess === null ? [`카드: ${card.title} → 401 / 403 / 200 중 골라 보세요`] : scenario.log)
  }, [guess, card, scenario, setEvents])

  const pick = (id: string) => {
    setCardId(id)
    setGuess(null)
  }

  return (
    <div className="flex w-full flex-wrap items-start justify-center gap-4">
      <StageFrame className="flex-[999_1_480px]">
        <TopologyDiagram state={state} speed={speed} playKey={`${cardId}-${guess}`} />
      </StageFrame>

      <div className="flex w-full max-w-[300px] flex-[1_1_240px] flex-col gap-4 rounded-xl border border-line bg-card p-4">
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-[13px] font-bold">상황 카드</legend>
          <div className="flex flex-col gap-1.5">
            {AUTH_CARDS.map((c) => (
              <button key={c.id} type="button" aria-pressed={cardId === c.id} onClick={() => pick(c.id)} className="tool h-auto justify-start py-1.5 text-left">
                {c.title}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-[13px] font-bold">응답은 몇 번일까?</legend>
          <div className="flex gap-1.5">
            {GUESSES.map((g) => (
              <button key={g} type="button" aria-pressed={guess === g} onClick={() => setGuess(g)} className="tool flex-1">
                {g}
              </button>
            ))}
          </div>
        </fieldset>

        {guess !== null && (
          <div
            aria-live="polite"
            className={`rounded-[10px] border p-3 text-[12.5px] leading-relaxed ${
              guess === answer.status ? 'border-[#c9d6b3] bg-green-tile' : 'border-[#ebbcb3] bg-rose-tile'
            }`}
          >
            <p className="m-0 font-bold">
              {guess === answer.status ? '정답!' : `아쉽다. 정답은 ${answer.status}`} · {answer.reason}
            </p>
            <p className="m-0 mt-1 text-ink-2">
              {answer.stop === 'authn'
                ? '인증에서 멈췄다: 누구인지 모른다 → 401'
                : answer.stop === 'authz'
                  ? '인증은 통과, 인가에서 멈췄다: 권한이 없다 → 403'
                  : '인증과 인가를 모두 통과해 Handler가 실행됐다 → 200'}
            </p>
          </div>
        )}
        <p className="m-0 text-[11px] text-faint">그림 위의 시뮬레이션입니다. 실제 요청을 보내지 않습니다.</p>
      </div>
    </div>
  )
}
