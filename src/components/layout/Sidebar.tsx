import { Link, useLocation } from 'react-router'
import { weeks } from '../../content'
import { parseLocation } from '../../lib/nav'
import { useStudyStore } from '../../store/useStudyStore'
import { ChevronDown, ChevronRight, ListChecks, Notebook, PanelLeft } from '../ui/icons'

const footerLinks = [
  { to: '/quick-check', label: 'Quick Check 모아보기', Icon: ListChecks },
  { to: '/wrong-notes', label: '오답 노트', Icon: Notebook },
]

export function Sidebar() {
  const { pathname } = useLocation()
  const loc = parseLocation(pathname)
  const collapsed = useStudyStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useStudyStore((s) => s.toggleSidebar)
  const expandedWeeks = useStudyStore((s) => s.expandedWeeks)
  const setWeekExpanded = useStudyStore((s) => s.setWeekExpanded)

  if (collapsed) {
    return (
      <nav
        aria-label="Week 목록 (접힘)"
        className="flex w-16 shrink-0 flex-col items-center gap-1.5 border-r border-line bg-surface py-3"
      >
        <button
          type="button"
          aria-label="사이드바 펼치기"
          onClick={toggleSidebar}
          className="mb-2 grid size-11 place-items-center rounded-lg border border-line text-muted hover:bg-zinc-50"
        >
          <PanelLeft />
        </button>
        {weeks.map((week) => {
          const current = week.id === loc.weekId
          return (
            <Link
              key={week.id}
              to={`/${week.id}`}
              aria-label={`W${week.no} ${week.title}`}
              aria-current={current ? 'page' : undefined}
              className={`grid size-11 place-items-center rounded-lg font-mono text-xs ${
                current ? 'bg-accent-soft font-bold text-accent' : 'text-muted hover:bg-zinc-50'
              }`}
            >
              W{week.no}
            </Link>
          )
        })}
        <div className="mt-auto flex flex-col gap-1.5">
          {footerLinks.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              aria-label={label}
              className="grid size-11 place-items-center rounded-lg text-muted hover:bg-zinc-50"
            >
              <Icon size={18} />
            </Link>
          ))}
        </div>
      </nav>
    )
  }

  return (
    <nav
      aria-label="Week와 Step 목록"
      className="flex w-[260px] shrink-0 flex-col border-r border-line bg-surface"
    >
      <div className="flex items-center justify-between border-b border-line px-4 pt-4 pb-3">
        <Link to="/" className="text-[15px] font-bold text-ink">
          네트워크 구조 및 설계
        </Link>
        <button
          type="button"
          aria-label="사이드바 접기"
          onClick={toggleSidebar}
          className="grid size-8 place-items-center rounded-md border border-line text-muted hover:bg-zinc-50"
        >
          <PanelLeft />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {weeks.map((week) => {
          const isCurrentWeek = week.id === loc.weekId
          const open = expandedWeeks[week.id] ?? isCurrentWeek
          const isOverview = isCurrentWeek && !loc.stepId
          return (
            <div key={week.id}>
              <div
                className={`flex items-center rounded-md ${isOverview ? 'bg-accent-soft text-accent' : 'text-ink'}`}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={`W${week.no} Step 목록 ${open ? '접기' : '펼치기'}`}
                  onClick={() => setWeekExpanded(week.id, !open)}
                  className="grid size-8 shrink-0 place-items-center rounded-md hover:bg-zinc-100"
                >
                  {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                <Link
                  to={`/${week.id}`}
                  aria-current={isOverview ? 'page' : undefined}
                  className={`flex min-w-0 flex-1 items-center gap-2 py-2 pr-2 text-[13px] ${
                    isCurrentWeek ? 'font-bold' : ''
                  }`}
                >
                  <span className="font-mono text-xs">W{week.no}</span>
                  <span className="min-w-0 flex-1 truncate">{week.title}</span>
                </Link>
              </div>
              {open && (
                <ul className="mb-1 ml-3 flex flex-col gap-px">
                  {week.steps.length === 0 && (
                    <li className="px-2 py-1.5 text-xs text-muted">Step 준비 중</li>
                  )}
                  {week.steps.map((step) => {
                    const current = isCurrentWeek && step.id === loc.stepId
                    return (
                      <li key={step.id}>
                        <Link
                          to={`/${week.id}/${step.id}`}
                          aria-current={current ? 'page' : undefined}
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] ${
                            current ? 'bg-accent-soft font-bold text-accent' : 'text-zinc-800 hover:bg-zinc-50'
                          }`}
                        >
                          <span className="w-8 shrink-0 font-mono text-[11px]">{step.no}</span>
                          <span className="min-w-0 flex-1 truncate">{step.title}</span>
                          {step.star && (
                            <span className="text-[11px] text-star" aria-label="시험 중요">
                              ★
                            </span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-0.5 border-t border-line p-2">
        {footerLinks.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-2 rounded-md px-2 py-2.5 text-[13px] text-ink hover:bg-zinc-50"
          >
            <Icon className="text-muted" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
