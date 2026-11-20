import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { useStudyStore } from '../../store/useStudyStore'
import type { Box } from './camera'

const ZERO = { x: 0, y: 0 }
/** 이만큼 움직여야 끌기로 본다 (그 전에는 클릭) */
const DRAG_THRESHOLD = 4

/** 확대·축소 범위: 1/2배 ~ 3배 */
export const ZOOM_MIN = 0.5
export const ZOOM_MAX = 3
/**
 * 휠 감도. 끌어서 옮길 때처럼 손 움직임만큼 바로 따라오게, 애니메이션·관성 없이 즉시 적용한다.
 * 마우스 휠 한 칸(deltaY ≈ 100) ≈ 1.2배, 트랙패드 핀치(ctrlKey, 작은 delta)는 손가락 벌린 만큼.
 */
const WHEEL_SPEED = 0.0018
const PINCH_SPEED = 0.012

/** 휠 한 번에 바뀐 배율 (범위 안으로) */
export function wheelZoom(zoom: number, deltaY: number, pinch = false): number {
  const next = zoom * Math.exp(-deltaY * (pinch ? PINCH_SPEED : WHEEL_SPEED))
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next))
}

/**
 * 무대 끌어서 옮기기 + 확대·축소.
 * - 카메라(viewBox)는 장면이 정하고 부드럽게 움직인다.
 * - 끌기와 확대·축소는 그림 묶음의 transform으로 즉시 적용한다 (카메라 애니메이션과 섞이지 않게).
 * - 휠·트랙패드 핀치로 커서 자리를 기준으로 확대·축소한다. 끌기처럼 움직인 만큼 즉시 따라온다.
 * 배율은 Phase를 넘겨도 유지되고 Step이 바뀌면 초기화된다.
 * @param camera 장면이 정한 카메라 상자 (viewBox)
 */
export function usePan(key: string, camera: Box) {
  const pan = useStudyStore((s) => s.stagePan[key]) ?? ZERO
  const zoom = useStudyStore((s) => s.stageZoom[key]) ?? 1
  const setStagePan = useStudyStore((s) => s.setStagePan)
  const setStageZoom = useStudyStore((s) => s.setStageZoom)
  const drag = useRef<{ startX: number; startY: number; from: { x: number; y: number } } | null>(null)
  const moved = useRef(false)
  const [svg, setSvg] = useState<SVGSVGElement | null>(null)

  // 확대 기준점: 카메라 가운데
  const cx = camera.x + camera.w / 2
  const cy = camera.y + camera.h / 2

  const clampPan = (p: { x: number; y: number }) => ({
    x: Math.max(-camera.w, Math.min(camera.w, p.x)),
    y: Math.max(-camera.h, Math.min(camera.h, p.y)),
  })

  /** 화면 1px = viewBox의 몇 단위인지 (preserveAspectRatio="meet") */
  const unitsPerPx = (rect: DOMRect) => Math.max(camera.w / (rect.width || 1), camera.h / (rect.height || 1))

  // 휠 핸들러에서 최신 값을 읽기 위해
  const latest = useRef({ pan, zoom, camera })
  useEffect(() => {
    latest.current = { pan, zoom, camera }
  })

  /** 배율을 바꾸되, 화면의 (clientX, clientY) 아래 있던 그림이 그 자리에 머물게 */
  const zoomTo = useCallback(
    (nz: number, client?: { x: number; y: number }) => {
      const { pan: p, zoom: z, camera: c } = latest.current
      if (nz === z) return
      let np = p
      if (client && svg) {
        const rect = svg.getBoundingClientRect()
        const k = Math.max(c.w / (rect.width || 1), c.h / (rect.height || 1))
        // 커서 자리의 viewBox 좌표 - 카메라 가운데
        const dx = (client.x - (rect.left + rect.width / 2)) * k
        const dy = (client.y - (rect.top + rect.height / 2)) * k
        np = { x: p.x + dx / nz - dx / z, y: p.y + dy / nz - dy / z }
      }
      // 다음 휠 이벤트가 렌더 전에 와도 이어서 계산되도록 바로 반영
      latest.current = { ...latest.current, pan: np, zoom: nz }
      setStageZoom(key, nz)
      setStagePan(key, np)
    },
    [svg, key, setStageZoom, setStagePan],
  )

  // 휠은 기본 동작(페이지 확대·스크롤)을 막아야 해서 passive가 아닌 리스너로 붙인다
  useEffect(() => {
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      // 줄 단위(deltaMode 1) 휠은 픽셀로 바꿔서 같은 감도로
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
      zoomTo(wheelZoom(latest.current.zoom, dy, e.ctrlKey), { x: e.clientX, y: e.clientY })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [svg, zoomTo])

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
    // 확대된 만큼 그림 좌표로는 덜 움직인다
    const k = unitsPerPx(e.currentTarget.getBoundingClientRect()) / zoom
    setStagePan(key, clampPan({ x: d.from.x + dx * k, y: d.from.y + dy * k }))
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

  const f = (n: number) => n.toFixed(2)
  return {
    /** 그림 묶음에 줄 transform: 카메라 가운데 기준 확대 → 끌어서 옮긴 만큼 이동 */
    transform:
      zoom === 1
        ? `translate(${f(pan.x)} ${f(pan.y)})`
        : `translate(${f(cx)} ${f(cy)}) scale(${zoom}) translate(${f(-cx + pan.x)} ${f(-cy + pan.y)})`,
    zoom,
    /** 옮겼거나 배율을 바꿨는가 (맞춤 버튼 표시) */
    changed: pan.x !== 0 || pan.y !== 0 || zoom !== 1,
    reset: () => {
      setStagePan(key, ZERO)
      setStageZoom(key, 1)
    },
    svgProps: {
      ref: setSvg,
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
