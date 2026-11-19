export function ComingSoon({ title, milestone }: { title: string; milestone: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="m-0 text-xl font-bold">{title}</h1>
      <p className="m-0 text-muted">{milestone}에서 구현 예정입니다.</p>
    </div>
  )
}
