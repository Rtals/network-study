import { Link } from 'react-router'

export function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="m-0 text-xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="m-0 text-muted">주소의 Week 또는 Step 이름을 확인해 주세요.</p>
      <Link to="/" className="text-sm">
        처음 화면으로
      </Link>
    </div>
  )
}
