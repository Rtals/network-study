import { Link } from 'react-router'
import type { Step, Week } from '../../content/types'
import { useStudyStore, type Mode } from '../../store/useStudyStore'
import { BookOpen } from '../ui/icons'

const modes: { id: Mode; label: string }[] = [
  { id: 'follow', label: '따라가기' },
  { id: 'sandbox', label: '직접 해보기' },
]

type Props = {
  week: Week
  step: Step
  /** 1024px 미만에서 설명 드로어 열기 */
  onOpenPanel: () => void
}

export function StepHeader({ week, step, onOpenPanel }: Props) {
  const mode = useStudyStore((s) => s.mode)
  const setMode = useStudyStore((s) => s.setMode)

  return (
    <header className="flex flex-wrap items-end justify-between gap-3 px-5 pt-4 pb-1">
      <div className="min-w-0">
        <p className="m-0 flex items-center gap-1.5 text-[11.5px] font-semibold text-muted">
          <Link to={`/${week.id}`} className="hover:text-ink hover:underline">
            Week {week.no} · {week.title}
          </Link>
          <span aria-hidden="true">/</span>
          <span>Step {step.no}</span>
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
          <h1 className="m-0 text-[24px] leading-tight font-extrabold tracking-[-0.015em]">{step.title}</h1>
          {step.star && <span className="tag bg-sand">★ 시험 우선</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {step.sandbox && (
          <div role="group" aria-label="모드" className="flex gap-1.5">
            {modes.map((m) => (
              <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => setMode(m.id)} className="tool">
                {m.label}
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={onOpenPanel} className="tool lg:hidden">
          <BookOpen size={15} />
          설명
        </button>
      </div>
    </header>
  )
}
