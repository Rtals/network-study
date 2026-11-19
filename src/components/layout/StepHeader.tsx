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
    <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-6 py-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
        <Link to={`/${week.id}`} className="text-muted hover:text-ink">
          W{week.no}
        </Link>
        <span aria-hidden="true" className="text-faint">
          ›
        </span>
        <span className="font-mono text-[13px] text-muted">{step.no}</span>
        <h1 className="m-0 text-sm font-bold">{step.title}</h1>
        {step.star && (
          <span className="rounded border border-orange-200 bg-orange-50 px-1.5 py-px text-[11px] text-star">
            ★ 시험 우선
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {step.sandbox && (
          <div role="group" aria-label="모드" className="flex rounded-lg bg-zinc-100 p-[3px]">
            {modes.map((m) => {
              const active = mode === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMode(m.id)}
                  className={`h-8 rounded-md px-3.5 text-[13px] ${
                    active ? 'bg-surface font-bold text-ink shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  {m.label}
                </button>
              )
            })}
          </div>
        )}
        <button
          type="button"
          onClick={onOpenPanel}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] lg:hidden"
        >
          <BookOpen size={15} />
          설명
        </button>
      </div>
    </header>
  )
}
