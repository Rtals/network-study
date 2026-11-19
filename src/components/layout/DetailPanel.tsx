import { useId } from 'react'
import type { Step, Week } from '../../content/types'
import { formatSlides } from '../../lib/nav'
import { useStudyStore, type PanelTab } from '../../store/useStudyStore'
import { ExchangeList } from '../../scenes/sequence/ExchangeList'
import { isSequenceState } from '../../scenes/sequence/types'
import { QuizPanel } from '../quiz/QuizPanel'
import { Activity, AlertTriangle, FileText, Lightbulb, X } from '../ui/icons'
import { PanelSection } from './PanelSection'
import { RichText } from './RichText'

type Props = {
  week: Week
  step: Step
  phaseIndex: number
  /** 드로어로 열렸을 때만 닫기 버튼을 보여 준다 */
  onClose?: () => void
}

/** 오른쪽 설명 (가이드): 맨 위 탭, 그 아래 Phase 제목·본문·보조 상자가 Phase마다 차례로 미끄러져 들어온다 */
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
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <div role="tablist" aria-label="상세 설명" className="flex gap-1.5">
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
              className={`tool h-7 px-2.5 text-[11.5px] ${active === t.id ? 'is-on' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {onClose && (
          <button type="button" aria-label="설명 닫기" onClick={onClose} className="tool tool--icon">
            <X size={15} />
          </button>
        )}
      </div>

      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${active}`}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-1 pb-4"
      >
        {active === 'explain' && (
          <div key={`explain-${phaseIndex}`} className="guide-in flex flex-col gap-3">
            <div>
              <p className="m-0 text-[11.5px] font-semibold text-muted">
                Phase {phaseIndex + 1} / {step.phases.length} · {phase.label}
              </p>
              <h2 className="mt-1.5 mb-0 text-[17px] leading-[1.3] font-extrabold tracking-[-0.01em] break-keep">{phase.title}</h2>
            </div>
            <RichText text={phase.body} />
            {isSequenceState(phase.state) && <ExchangeList state={phase.state} />}
            {phase.keyPoint && (
              <PanelSection icon={<Lightbulb size={14} />} label="핵심 포인트" tone="tip">
                <RichText text={phase.keyPoint} size="note" />
              </PanelSection>
            )}
            {phase.pitfall && (
              <PanelSection icon={<AlertTriangle size={14} />} label="흔한 오해" tone="warn">
                <RichText text={phase.pitfall} size="note" />
              </PanelSection>
            )}
            {phase.signal && (
              <PanelSection icon={<Activity size={14} />} label="실무 신호" tone="insight">
                <RichText text={phase.signal} size="note" />
              </PanelSection>
            )}
          </div>
        )}

        {active === 'easy' && step.easy && (
          <div key="easy" className="guide-in flex flex-col gap-3">
            <h2 className="m-0 text-[17px] font-extrabold break-keep">{step.easy.title}</h2>
            <RichText text={step.easy.body} />
          </div>
        )}

        {active === 'quiz' && step.quiz && <QuizPanel quiz={step.quiz} />}

        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <span className="tag bg-card font-medium text-muted" title={week.source}>
            <FileText size={13} />W{week.no} {formatSlides(step.slides)}
          </span>
        </div>
      </div>
    </div>
  )
}
