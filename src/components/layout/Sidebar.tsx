import { Link, useLocation } from 'react-router'
import { weeks } from '../../content'
import { parseLocation } from '../../lib/nav'
import { useStudyStore } from '../../store/useStudyStore'
import { ChevronRight, ListChecks, Notebook, PanelLeft } from '../ui/icons'

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
        className="flex w-16 shrink-0 flex-col items-center gap-1.5 py-3"
      >
        <button
          type="button"
          aria-label="사이드바 펼치기"
          onClick={toggleSidebar}
          className="tool tool--icon mb-2"
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
                current ? 'border-[1.5px] border-ink-2 bg-card font-bold text-ink shadow-[0_1.5px_0_var(--color-ink-2)]' : 'text-muted hover:bg-zinc-100'
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
    <nav aria-label="Week와 Step 목록" className="flex w-[260px] shrink-0 flex-col">
      <div className="flex items-center justify-between gap-2 pt-5 pr-3 pb-3 pl-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 text-[13.5px] font-extrabold tracking-[-0.02em] whitespace-nowrap text-ink">
          <Logo />
          네트워크 구조 및 설계
        </Link>
        <button type="button" aria-label="사이드바 접기" onClick={toggleSidebar} className="tool tool--icon">
          <PanelLeft size={15} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-3">
        {weeks.map((week) => {
          const isCurrentWeek = week.id === loc.weekId
          const open = expandedWeeks[week.id] ?? isCurrentWeek
          const isOverview = isCurrentWeek && !loc.stepId
          return (
            <div key={week.id}>
              <div className="flex min-h-[34px] items-center">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={`W${week.no} Step 목록 ${open ? '접기' : '펼치기'}`}
                  onClick={() => setWeekExpanded(week.id, !open)}
                  className="grid size-7 shrink-0 place-items-center rounded-md text-ink hover:bg-zinc-100"
                >
                  <ChevronRight size={13} className={`transition-transform duration-300 ease-[cubic-bezier(.2,.7,.2,1)] ${open ? 'rotate-90' : ''}`} />
                </button>
                <Link
                  to={`/${week.id}`}
                  aria-current={isOverview ? 'page' : undefined}
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 pr-1 pl-1 text-[13px] hover:underline ${
                    isOverview ? 'font-extrabold' : 'font-semibold'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">
                    W{week.no} {week.title}
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold text-faint">{week.steps.length || ''}</span>
                </Link>
              </div>
              {/* 펼침: 높이를 부드럽게 늘린다 (grid 0fr → 1fr) */}
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(.2,.7,.2,1)] ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                aria-hidden={!open}
                inert={!open}
              >
                <div className="min-h-0 overflow-hidden">
                  <ul
                    className={`relative mt-px mb-2 ml-[13px] flex flex-col transition-[opacity,transform] duration-300 before:absolute before:top-0 before:bottom-[15px] before:left-0 before:border-l before:border-zinc-400 ${
                      open ? 'translate-y-0 opacity-100' : '-translate-y-1.5 opacity-0'
                    }`}
                  >
                    {week.steps.length === 0 && <li className="py-1.5 pl-6 text-[12px] text-faint">Step 준비 중</li>}
                    {week.steps.map((step) => {
                      const current = isCurrentWeek && step.id === loc.stepId
                      return (
                        <li key={step.id} className="relative pl-6 before:absolute before:top-1/2 before:left-0 before:w-3.5 before:border-t before:border-zinc-400">
                          <Link
                            to={`/${week.id}/${step.id}`}
                            aria-current={current ? 'page' : undefined}
                            className={`-ml-2 flex min-h-[28px] items-center gap-2 rounded-lg border-[1.5px] px-2 py-0.5 text-[12.5px] transition-[background-color,border-color,box-shadow] duration-300 ${
                              current
                                ? 'border-ink-2 bg-card font-bold shadow-[0_1.5px_0_var(--color-ink-2)]'
                                : 'border-transparent font-medium text-ink-2 hover:underline'
                            }`}
                          >
                            <span className={`shrink-0 text-[10.5px] ${current ? 'text-ink' : 'text-faint'}`}>{step.no}</span>
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
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-0.5 border-t border-line px-4 py-2.5">
        {footerLinks.map(({ to, label, Icon }) => (
          <Link key={to} to={to} className="flex items-center gap-2 rounded-md px-2 py-2 text-[12.5px] font-medium text-ink-2 hover:underline">
            <Icon size={15} className="text-muted" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}

/** 사이트 로고: 지구본 (무대 블록처럼 파스텔 채움 + 잉크색 테두리 + 아래로 단단한 그림자) */
function Logo() {
  const ink = '#1d1b18'
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" className="shrink-0">
      {/* 단단한 그림자 */}
      <circle cx="14" cy="15.6" r="11" fill={ink} />
      {/* 바다 */}
      <circle cx="14" cy="14" r="11" fill="#cfe1f4" stroke={ink} strokeWidth="1.6" />
      {/* 땅 (연두) */}
      <path d="M7.2 8.6c1.8-.6 3.4.2 4.2 1.5.7 1.2-.2 2.4-1.5 2.6-1.1.2-1.4 1.3-.9 2.3.5 1.1-.3 2-1.5 1.8-1.4-.3-2.6-1.8-3-3.5.1-1.8 1.1-3.6 2.7-4.7z" fill="#cfe3b2" stroke={ink} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M16.6 15.2c1.6-.4 3.4.3 4 1.6.5 1.2-.1 2.6-1.3 3.4-1 .7-2.3.6-2.8-.4-.4-.8-.1-1.6-.6-2.3-.5-.8-.5-1.9.7-2.3z" fill="#cfe3b2" stroke={ink} strokeWidth="1.2" strokeLinejoin="round" />
      {/* 경선·위선 */}
      <ellipse cx="14" cy="14" rx="5" ry="11" fill="none" stroke={ink} strokeWidth="1.2" strokeOpacity="0.55" />
      <path d="M3 14h22M4.6 8.6h18.8M4.6 19.4h18.8" fill="none" stroke={ink} strokeWidth="1.2" strokeOpacity="0.55" />
      {/* 윗면 광택 */}
      <path d="M7.5 6.8a10 10 0 0 1 6-2.6" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.85" />
      {/* 바깥 테두리 다시 (선들이 테두리를 덮지 않게) */}
      <circle cx="14" cy="14" r="11" fill="none" stroke={ink} strokeWidth="1.6" />
    </svg>
  )
}
