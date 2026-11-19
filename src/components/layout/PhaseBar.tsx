import { Link } from 'react-router'
import type { Step } from '../../content/types'
import { phasePath, type StepRef } from '../../lib/nav'
import { useStudyStore } from '../../store/useStudyStore'
import { ChevronLeft, ChevronRight, LogList, Pause, Play, RotateCcw } from '../ui/icons'

type Props = {
  step: Step
  phaseIndex: number
  next?: StepRef
  onGo: (index: number) => void
  onTogglePlay: () => void
  onRestart: () => void
}

const iconBtn =
  'grid size-11 place-items-center rounded-lg border border-line bg-surface text-ink hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40'

export function PhaseBar(props: Props) {
  const mode = useStudyStore((s) => s.mode)
  return mode === 'sandbox' ? <EventLogBar /> : <FollowBar {...props} />
}

function FollowBar({ step, phaseIndex, next, onGo, onTogglePlay, onRestart }: Props) {
  const playing = useStudyStore((s) => s.playing)
  const speed = useStudyStore((s) => s.speed)
  const cycleSpeed = useStudyStore((s) => s.cycleSpeed)
  const count = step.phases.length
  const isLast = phaseIndex === count - 1

  return (
    <footer aria-label="Phase 진행 바" className="border-t border-line bg-surface px-6 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="이전 Phase"
            className={iconBtn}
            disabled={phaseIndex === 0}
            onClick={() => onGo(phaseIndex - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label={playing ? '정지' : '자동재생'}
            aria-pressed={playing}
            onClick={onTogglePlay}
            className="grid size-11 place-items-center rounded-lg bg-accent text-white hover:bg-blue-800"
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          {!isLast ? (
            <button
              type="button"
              aria-label="다음 Phase"
              className={iconBtn}
              onClick={() => onGo(phaseIndex + 1)}
            >
              <ChevronRight size={18} />
            </button>
          ) : next ? (
            <Link
              to={phasePath(next.week.id, next.step.id, 0)}
              className="flex h-11 items-center gap-1 rounded-lg border border-accent px-3 text-[13px] font-bold text-accent hover:bg-accent-soft"
            >
              다음 Step으로
              <ChevronRight size={16} />
            </Link>
          ) : (
            <span className="px-3 text-[13px] text-muted">마지막 Step</span>
          )}
        </div>

        <ol className="m-0 flex min-w-[280px] flex-1 list-none items-start p-0">
          {step.phases.map((p, i) => {
            const reached = i <= phaseIndex
            const current = i === phaseIndex
            return (
              <li key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full items-center">
                  <span
                    className={`h-0.5 flex-1 ${i === 0 ? 'invisible' : ''} ${reached ? 'bg-accent' : 'bg-zinc-300'}`}
                  />
                  <button
                    type="button"
                    aria-label={`Phase ${i + 1}: ${p.label}`}
                    aria-current={current ? 'step' : undefined}
                    onClick={() => onGo(i)}
                    className="grid size-6 place-items-center rounded-full"
                  >
                    <span
                      className={`block size-3 rounded-full border-2 ${
                        reached ? 'border-accent bg-accent' : 'border-faint bg-surface'
                      } ${current ? 'ring-4 ring-blue-100' : ''}`}
                    />
                  </button>
                  <span
                    className={`h-0.5 flex-1 ${i === count - 1 ? 'invisible' : ''} ${
                      i < phaseIndex ? 'bg-accent' : 'bg-zinc-300'
                    }`}
                  />
                </div>
                <span
                  className={`text-[11px] whitespace-nowrap ${
                    current ? 'font-bold text-accent' : reached ? 'text-ink' : 'text-muted'
                  }`}
                >
                  {p.label}
                </span>
              </li>
            )
          })}
        </ol>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[13px] font-semibold" aria-live="polite">
            {phaseIndex + 1} / {count}
          </span>
          <button
            type="button"
            aria-label={`재생 속도 ${speed}배, 눌러서 바꾸기`}
            onClick={cycleSpeed}
            className="h-8 min-w-11 rounded-md border border-line bg-surface px-2 font-mono text-xs hover:bg-zinc-50"
          >
            {speed}x
          </button>
          <button
            type="button"
            aria-label="처음부터"
            onClick={onRestart}
            className="grid size-8 place-items-center rounded-md border border-line bg-surface text-muted hover:bg-zinc-50"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
      <p className="mt-2 mb-0 text-[11px] text-muted">← → Phase · [ ] Step · Space 재생/정지</p>
    </footer>
  )
}

function EventLogBar() {
  const eventLog = useStudyStore((s) => s.eventLog)
  const clearEvents = useStudyStore((s) => s.clearEvents)

  return (
    <footer
      aria-label="이벤트 로그"
      className="flex min-h-[72px] flex-wrap items-center gap-x-3.5 gap-y-2 border-t border-line bg-surface px-6 py-3"
    >
      <span className="flex items-center gap-1.5 text-xs font-bold text-muted">
        <LogList size={15} />
        이벤트 로그
      </span>
      {eventLog.length === 0 ? (
        <span className="text-[13px] text-muted">무대에서 조작하면 일어난 일이 여기에 순서대로 기록됩니다.</span>
      ) : (
        <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0" aria-live="polite">
          {eventLog.map((e, i) => (
            <li key={i} className="flex items-center gap-2">
              {i > 0 && (
                <span aria-hidden="true" className="text-faint">
                  →
                </span>
              )}
              <span className="rounded-full border border-line bg-zinc-50 px-2.5 py-1 font-mono text-xs">{e}</span>
            </li>
          ))}
        </ol>
      )}
      <button
        type="button"
        onClick={clearEvents}
        disabled={eventLog.length === 0}
        className="ml-auto flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] hover:bg-zinc-50 disabled:opacity-40"
      >
        <RotateCcw size={14} />
        로그 지우기
      </button>
    </footer>
  )
}
