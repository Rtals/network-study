import { useId } from 'react'
import type { Step, Week } from '../../content/types'
import { formatSlides } from '../../lib/nav'
import { useStudyStore, type PanelTab } from '../../store/useStudyStore'
import { QuizPanel } from '../quiz/QuizPanel'
import { AlertTriangle, FileText, X } from '../ui/icons'

type Props = {
  week: Week
  step: Step
  phaseIndex: number
  /** 드로어로 열렸을 때만 닫기 버튼을 보여 준다 */
  onClose?: () => void
}

/** ①②③ … (20까지), 그 뒤는 숫자 그대로 */
const circled = (n: number) => (n >= 1 && n <= 20 ? String.fromCharCode(0x2460 + n - 1) : `${n}.`)

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i} className="m-0 leading-[1.7] whitespace-pre-line text-zinc-800">
          {p}
        </p>
      ))}
    </>
  )
}

export function DetailPanel({ week, step, phaseIndex, onClose }: Props) {
  const panelTab = useStudyStore((s) => s.panelTab)
  const setPanelTab = useStudyStore((s) => s.setPanelTab)
  const baseId = useId()

  const tabs: { id: PanelTab; label: string; enabled: boolean }[] = [
    { id: 'explain', label: '설명', enabled: true },
    { id: 'easy', label: '쉽게 보기', enabled: !!step.easy },
    { id: 'quiz', label: '퀴즈', enabled: !!step.quiz?.length },
  ]
  const active = tabs.find((t) => t.id === panelTab && t.enabled)?.id ?? 'explain'
  const phase = step.phases[phaseIndex]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-14 items-end justify-between border-b border-line px-4">
        <div role="tablist" aria-label="상세 설명" className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              id={`${baseId}-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={active === t.id}
              aria-controls={`${baseId}-panel`}
              disabled={!t.enabled}
              onClick={() => setPanelTab(t.id)}
              className={`h-11 border-b-2 px-3 text-[13px] ${
                active === t.id
                  ? 'border-accent font-bold text-accent'
                  : 'border-transparent text-muted hover:text-ink disabled:text-faint disabled:hover:text-faint'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {onClose && (
          <button
            type="button"
            aria-label="설명 닫기"
            onClick={onClose}
            className="mb-1.5 grid size-9 place-items-center rounded-md text-muted hover:bg-zinc-100"
          >
            <X />
          </button>
        )}
      </div>

      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${active}`}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5"
      >
        {active === 'explain' && (
          <>
            <div>
              <p className="m-0 text-xs text-muted">
                Phase {phaseIndex + 1} / {step.phases.length}
              </p>
              <h2 className="mt-1 mb-0 text-xl leading-snug font-bold">
                {circled(phaseIndex + 1)} {phase.title}
              </h2>
            </div>
            <Paragraphs text={phase.body} />
            {phase.keyPoint && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5">
                <p className="m-0 mb-1.5 text-xs font-bold text-accent">핵심 포인트</p>
                <p className="m-0 text-[13.5px] leading-relaxed">{phase.keyPoint}</p>
              </div>
            )}
            {phase.pitfall && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-3.5">
                <p className="m-0 mb-1.5 flex items-center gap-1.5 text-xs font-bold text-orange-800">
                  <AlertTriangle size={14} />
                  흔한 오해
                </p>
                <p className="m-0 text-[13.5px] leading-relaxed">{phase.pitfall}</p>
              </div>
            )}
          </>
        )}

        {active === 'easy' && step.easy && (
          <>
            <h2 className="m-0 text-xl font-bold">{step.easy.title}</h2>
            <Paragraphs text={step.easy.body} />
          </>
        )}

        {active === 'quiz' && step.quiz && <QuizPanel quiz={step.quiz} />}

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <span
            className="flex h-8 items-center gap-1.5 rounded-full border border-line px-2.5 text-xs"
            title={week.source}
          >
            <FileText size={14} className="text-muted" />W{week.no} {formatSlides(step.slides)}
          </span>
        </div>
      </div>
    </div>
  )
}
