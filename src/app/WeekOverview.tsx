import { Link, useParams } from 'react-router'
import { ChevronRight } from '../components/ui/icons'
import { weeks } from '../content'
import { findWeek, formatSlides, phasePath } from '../lib/nav'
import { NotFound } from './NotFound'

/** /:weekId — Week 개요 (질문, 학습 목표, Step 목록) */
export function WeekOverview() {
  const { weekId = '' } = useParams()
  const week = findWeek(weeks, weekId)
  if (!week) return <NotFound />

  const first = week.steps[0]
  const starCount = week.steps.filter((s) => s.star).length

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-8 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[13px] text-muted">W{week.no}</span>
          <span className="font-bold">Week 개요</span>
        </div>
        {first && (
          <Link
            to={phasePath(week.id, first.id, 0)}
            className="flex h-10 items-center gap-1.5 rounded-lg bg-accent px-4 text-[13px] font-bold text-white hover:bg-blue-800"
          >
            {first.no}부터 시작
            <ChevronRight size={15} />
          </Link>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-6 p-8">
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
            <div>
              <p className="m-0 text-[13px] text-muted">
                Week {week.no} · {week.source}
              </p>
              <h1 className="mt-1.5 mb-0 text-3xl leading-tight font-bold">{week.title}</h1>
            </div>

            <div className="rounded-xl border border-line bg-surface px-6 py-5">
              <p className="m-0 mb-2 text-xs font-bold text-accent">오늘의 질문</p>
              <p className="m-0 text-lg leading-relaxed font-medium">{week.question}</p>
            </div>

            <section>
              <h2 className="m-0 mb-2.5 text-sm font-bold">
                Step 목록
                {starCount > 0 && (
                  <span className="ml-2 text-xs font-normal text-muted">★ 시험 우선 {starCount}개</span>
                )}
              </h2>
              {week.steps.length === 0 ? (
                <p className="m-0 rounded-xl border border-dashed border-faint p-6 text-center text-[13px] text-muted">
                  이 Week의 Step은 아직 준비 중입니다.
                </p>
              ) : (
                <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5 p-0">
                  {week.steps.map((s) => (
                    <li key={s.id}>
                      <Link
                        to={phasePath(week.id, s.id, 0)}
                        className="flex h-full flex-col gap-2 rounded-xl border border-line bg-surface p-3.5 text-ink hover:border-accent"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-muted">{s.no}</span>
                          {s.star && (
                            <span className="text-[11px] text-star" aria-label="시험 중요">
                              ★
                            </span>
                          )}
                          <span className="ml-auto rounded bg-zinc-100 px-1.5 py-px font-mono text-[11px] text-muted">
                            {s.scene}
                          </span>
                        </span>
                        <span className="text-[13.5px] leading-snug font-medium">{s.title}</span>
                        <span className="text-[11px] text-muted">
                          {formatSlides(s.slides)} · Phase {s.phases.length}개{s.sandbox ? ' · 직접 해보기' : ''}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside aria-label="학습 목표" className="flex max-w-full flex-[1_1_300px] flex-col gap-4">
            <section className="rounded-xl border border-line bg-surface p-5">
              <h2 className="m-0 mb-3 text-sm font-bold">학습 목표</h2>
              {week.objectives.length === 0 ? (
                <p className="m-0 text-[13px] text-muted">강의자료의 Learning Objectives로 채울 예정입니다.</p>
              ) : (
                <ol className="m-0 flex flex-col gap-2 pl-[18px] text-[13px] leading-relaxed">
                  {week.objectives.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ol>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
