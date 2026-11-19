import { Outlet } from 'react-router'
import { Sidebar } from '../components/layout/Sidebar'

/** 왼쪽 사이드바 + 오른쪽 라우트 영역 */
export function AppShell() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
