import { Move, RotateCcw } from '../../components/ui/icons'

/** 무대 오른쪽 위: 옮겼거나 확대·축소했으면 "맞춤" 버튼, 아니면 조작 안내 아이콘만 */
export function StageTools({ changed, onReset }: { changed: boolean; onReset: () => void }) {
  return changed ? (
    <button type="button" onClick={onReset} aria-label="가운데로" title="원래 자리와 크기로" className="tool absolute top-3 right-3">
      <RotateCcw size={14} />
      <span>맞춤</span>
    </button>
  ) : (
    <span
      role="img"
      aria-label="드래그해서 화면 이동, 휠로 확대·축소"
      title="드래그해서 화면 이동 · 휠로 확대·축소"
      className="pointer-events-none absolute top-3 right-3 grid size-8 place-items-center rounded-[9px] border border-line-strong bg-card/80 text-muted"
    >
      <Move size={15} />
    </span>
  )
}
