import { useEffect, useMemo, useState } from 'react'
import { StageFrame } from '../../../components/stage/StageFrame'
import { RotateCcw } from '../../../components/ui/icons'
import { useStudyStore } from '../../../store/useStudyStore'
import { TopologyDiagram } from '../../topology/TopologyDiagram'
import { ATTACK_GOAL, ATTACK_LABEL, attackScenario, envelopeState, type Attack, type Protocol } from './scenario'

const ATTACKS: Attack[] = ['eavesdrop', 'tamper', 'impersonate']
const PROTOCOLS: { id: Protocol; label: string; hint: string }[] = [
  { id: 'http', label: 'HTTP', hint: '엽서' },
  { id: 'https', label: 'HTTPS', hint: '봉인된 봉투' },
]

/**
 * 6-2 직접 해보기: HTTP / HTTPS를 고르고 엿보기·고쳐 쓰기·사칭을 시도해 본다.
 * 전부 그림 위의 가짜 시뮬레이션이다 (실제 요청·암호화 없음).
 */
export function EnvelopeSandbox() {
  const setEvents = useStudyStore((s) => s.setEvents)
  const speed = useStudyStore((s) => s.speed)
  const [protocol, setProtocol] = useState<Protocol>('http')
  const [attack, setAttack] = useState<Attack>('eavesdrop')
  const [tries, setTries] = useState(0)

  const scenario = useMemo(() => attackScenario(attack, protocol), [attack, protocol])
  const state = useMemo(() => envelopeState(scenario.beats), [scenario])
  const goal = ATTACK_GOAL[attack]

  useEffect(() => {
    setEvents(scenario.log)
  }, [scenario, setEvents])

  const tryAttack = (a: Attack) => {
    setAttack(a)
    setTries((n) => n + 1)
  }

  return (
    <div className="flex w-full flex-wrap items-start justify-center gap-4">
      <StageFrame className="flex-[999_1_480px]">
        <TopologyDiagram state={state} speed={speed} playKey={`${protocol}-${attack}-${tries}`} />
      </StageFrame>

      <div className="flex w-full max-w-[300px] flex-[1_1_240px] flex-col gap-4 rounded-xl border border-line bg-card p-4">
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-[13px] font-bold">통신 방식</legend>
          <div className="flex gap-1.5">
            {PROTOCOLS.map((p) => (
              <button key={p.id} type="button" aria-pressed={protocol === p.id} onClick={() => setProtocol(p.id)} className="tool flex-1">
                {p.label}
                <span className="text-[10.5px] font-medium text-muted">{p.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-[13px] font-bold">공격자가 해 볼 일</legend>
          <div className="flex flex-col gap-1.5">
            {ATTACKS.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={attack === a}
                onClick={() => tryAttack(a)}
                className="tool justify-between"
              >
                {ATTACK_LABEL[a]}
                <span className="text-[10.5px] font-medium text-muted">{ATTACK_GOAL[a]}을 노림</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div
          aria-live="polite"
          className={`rounded-[10px] border p-3 text-[12.5px] leading-relaxed ${
            scenario.blocked ? 'border-[#c9d6b3] bg-green-tile' : 'border-[#ebbcb3] bg-rose-tile'
          }`}
        >
          <p className="m-0 font-bold">
            {protocol.toUpperCase()} + {ATTACK_LABEL[attack]} → {scenario.blocked ? '막힘' : '성공'}
          </p>
          <p className="m-0 mt-1 text-ink-2">
            {scenario.blocked ? `TLS가 ${goal}을 지켰다.` : `HTTP에는 ${goal}이 없어서 공격이 통했다.`}
          </p>
        </div>

        <button type="button" onClick={() => setTries((n) => n + 1)} className="tool">
          <RotateCcw size={14} />
          다시 재생
        </button>
        <p className="m-0 text-[11px] text-faint">그림 위의 가짜 시뮬레이션입니다. 실제 요청을 보내지 않습니다.</p>
      </div>
    </div>
  )
}
