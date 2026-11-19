import { Navigate, Route, Routes } from 'react-router'
import { weeks } from '../content'
import { AppShell } from './AppShell'
import { ComingSoon } from './ComingSoon'
import { NotFound } from './NotFound'
import { StepRoute } from './StepView'
import { WeekOverview } from './WeekOverview'

/** 첫 화면: Step이 있는 첫 Week의 개요 */
function HomeRedirect() {
  const week = weeks.find((w) => w.steps.length > 0) ?? weeks[0]
  return <Navigate replace to={`/${week.id}`} />
}

/** URL이 곧 상태: /#/:week/:step/:phase */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomeRedirect />} />
        <Route path="quick-check" element={<ComingSoon title="Quick Check 모아보기" milestone="M6" />} />
        <Route path="wrong-notes" element={<ComingSoon title="오답 노트" milestone="M6" />} />
        <Route path=":weekId" element={<WeekOverview />} />
        <Route path=":weekId/:stepId" element={<StepRoute />} />
        <Route path=":weekId/:stepId/:phase" element={<StepRoute />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
