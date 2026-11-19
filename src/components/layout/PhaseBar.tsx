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
  /** 지금 Phase의 애니메이션 다시 보기 */
  onReplay: () => void
}

export function PhaseBar(props: Props) {
  const mode = useStudyStore((s) => s.mode)
  return mode === 'sandbox' ? <EventLogBar /> : <FollowBar {...props} />
}

/** 타임라인: 번호 점 + 진행만큼 채워지는 선. 지금 Phase 점은 초록 + 단단한 그림자 */
function FollowBar({ step, phaseIndex, next, onGo, onTogglePlay, onReplay }: Props) {
  const playing = useStudyStore((s) => s.playing)
  const speed = useStudyStore((s) => s.speed)
  const cycleSpeed = useStudyStore((s) => s.cycleSpeed)
  const count = step.phases.length
  const isLast = phaseIndex === count - 1
  const progress = count > 1 ? phaseIndex / (count - 1) : 0

  return (
    <footer aria-label="Phase 진행 바" className="px-5 pt-2 pb-3.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[12.5px] font-bold">진행</span>
        <span className="text-[11.5px] font-semibold text-muted" aria-live="polite">
          {phaseIndex + 1} / {count}
        </span>
      </div>

      <div className="relative mt-1.5">
        {/* 선: 첫 점 가운데 ~ 마지막 점 가운데 */}
        <div className="absolute top-[13px] h-[1.3px] bg-zinc-400" style={{ left: `calc(100% / ${count} / 2)`, right: `calc(100% / ${count} / 2)` }}>
          <span
            className="absolute -inset-y-px left-0 bg-ink transition-[width] duration-700 ease-[cubic-bezier(.65,0,.35,1)]"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <ol className="relative m-0 grid list-none p-0" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
          {step.phases.map((p, i) => {
            const done = i < phaseIndex
            const current = i === phaseIndex
            return (
              <li key={i}>
                <button
                  type="button"
                  aria-label={`Phase ${i + 1}: ${p.label}`}
                  aria-current={current ? 'step' : undefined}
                  onClick={() => onGo(i)}
                  className="group flex w-full flex-col items-center px-0.5"
                >
                  <span
                    className={`grid size-[26px] place-items-center rounded-full text-[11.5px] font-bold transition-[background-color,transform] duration-300 ${
                      current
                        ? 'scale-[1.08] border-[1.5px] border-ink bg-green shadow-[1px_1.5px_0_var(--color-ink)]'
                        : done
                          ? 'border-[1.3px] border-ink-2 bg-green-tile group-hover:-translate-y-px'
                          : 'border-[1.3px] border-zinc-600 bg-card group-hover:-translate-y-px group-hover:bg-white'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`mt-1 min-h-[2.6em] text-center text-[11px] leading-[1.3] ${
                      current ? 'font-bold text-ink' : done ? 'text-ink-2' : 'text-muted'
                    }`}
                  >
                    {p.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        <button type="button" aria-label="이전 Phase" className="tool tool--icon" disabled={phaseIndex === 0} onClick={() => onGo(phaseIndex - 1)}>
          <ChevronLeft size={16} />
        </button>
        <button type="button" aria-label={playing ? '정지' : '자동재생'} aria-pressed={playing} onClick={onTogglePlay} className="tool">
          {playing ? <Pause size={14} /> : <Play size={14} />}
          {playing ? '정지' : '재생'}
        </button>
        {!isLast ? (
          <button type="button" aria-label="다음 Phase" className="tool tool--icon" onClick={() => onGo(phaseIndex + 1)}>
            <ChevronRight size={16} />
          </button>
        ) : next ? (
          <Link to={phasePath(next.week.id, next.step.id, 0)} className="tool is-on">
            다음 Step으로
            <ChevronRight size={15} />
          </Link>
        ) : (
          <span className="px-2 text-[12px] text-muted">마지막 Step</span>
        )}
        <span className="ml-auto flex items-center gap-2">
          <span className="hidden text-[10.5px] text-faint xl:inline">← → Phase · [ ] Step · Space 재생</span>
          <button type="button" aria-label={`재생 속도 ${speed}배, 눌러서 바꾸기`} onClick={cycleSpeed} className="tool min-w-12">
            {speed}x
          </button>
          <button type="button" aria-label="이 단계 다시 보기" title="이 단계 다시 보기" onClick={onReplay} className="tool tool--icon">
            <RotateCcw size={14} />
          </button>
        </span>
      </div>
    </footer>
  )
}

function EventLogBar() {
  const eventLog = useStudyStore((s) => s.eventLog)
  const clearEvents = useStudyStore((s) => s.clearEvents)

  return (
    <footer
      aria-label="이벤트 로그"
      className="flex min-h-[72px] flex-wrap items-center gap-x-3.5 gap-y-2 px-5 pt-2 pb-3.5"
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
              <span className="tag bg-card font-medium">{e}</span>
            </li>
          ))}
        </ol>
      )}
      <button
        type="button"
        onClick={clearEvents}
        disabled={eventLog.length === 0}
        className="tool ml-auto"
      >
        <RotateCcw size={14} />
        로그 지우기
      </button>
    </footer>
  )
}
