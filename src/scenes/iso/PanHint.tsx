import { Move, RotateCcw } from '../../components/ui/icons'

/** 무대 오른쪽 위 도구: 끌어서 옮겼으면 "가운데로" 버튼, 아니면 이동 아이콘만 */
export function PanHint({ panned, onReset }: { panned: boolean; onReset: () => void }) {
  return panned ? (
    <button type="button" onClick={onReset} aria-label="가운데로" title="가운데로" className="tool absolute top-3 right-3">
      <RotateCcw size={14} />
      <span>가운데로</span>
    </button>
  ) : (
    <span
      role="img"
      aria-label="드래그해서 화면 이동"
      title="드래그해서 화면 이동"
      className="pointer-events-none absolute top-3 right-3 grid size-8 place-items-center rounded-[9px] border border-line-strong bg-card/80 text-muted"
    >
      <Move size={15} />
    </span>
  )
}
