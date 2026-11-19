import { useRef, type MouseEvent, type PointerEvent } from 'react'
import { useStudyStore } from '../../store/useStudyStore'

const ZERO = { x: 0, y: 0 }
/** 이만큼 움직여야 끌기로 본다 (그 전에는 클릭) */
const DRAG_THRESHOLD = 4

/**
 * 무대를 끌어서 옮기기. 그림 묶음을 옮기는 방식이라 바닥(배경)은 그대로다.
 * 카메라(viewBox)는 장면이 따로 움직이고, 끌기는 그 위에 더해진다.
 * @param size 현재 viewBox의 가로·세로 (화면 1px이 몇 단위인지 계산용)
 */
export function usePan(key: string, size: { w: number; h: number }) {
  const pan = useStudyStore((s) => s.stagePan[key]) ?? ZERO
  const setStagePan = useStudyStore((s) => s.setStagePan)
  const drag = useRef<{ startX: number; startY: number; from: { x: number; y: number } } | null>(null)
  const moved = useRef(false)

  const clamp = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v))

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    drag.current = { startX: e.clientX, startY: e.clientY, from: pan }
    moved.current = false
  }

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!moved.current) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      moved.current = true
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    const rect = e.currentTarget.getBoundingClientRect()
    // preserveAspectRatio="meet": 화면 1px = viewBox의 k 단위
    const k = Math.max(size.w / (rect.width || 1), size.h / (rect.height || 1))
    setStagePan(key, { x: clamp(d.from.x + dx * k, size.w * 0.8), y: clamp(d.from.y + dy * k, size.h * 0.8) })
  }

  const endDrag = (e: PointerEvent<SVGSVGElement>) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    drag.current = null
  }

  /** 끌기 직후의 click은 무시 */
  const onClickCapture = (e: MouseEvent<SVGSVGElement>) => {
    if (moved.current) {
      e.stopPropagation()
      e.preventDefault()
      moved.current = false
    }
  }

  return {
    /** 그림 묶음에 줄 transform */
    transform: `translate(${pan.x.toFixed(1)} ${pan.y.toFixed(1)})`,
    panned: pan.x !== 0 || pan.y !== 0,
    reset: () => setStagePan(key, ZERO),
    svgProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onClickCapture,
      style: { cursor: 'grab', touchAction: 'none' as const },
      className: 'iso-stage',
    },
  }
}
