import type { Pt } from './geometry'

/**
 * 무대 카메라 (모든 장면 공통).
 * 기본 배율은 VIEW_W로 고정해 장면마다 오브젝트 크기가 같게 보이고,
 * 오브젝트가 많아 넘치면 MAX_ZOOM_OUT까지 살짝 축소한다. 그래도 넘치면 focus 쪽으로 옮긴다.
 */
export const ASPECT = 1.6
export const VIEW_W = 1100
export const MAX_ZOOM_OUT = 1.7

export type Box = { x: number; y: number; w: number; h: number }
export type Bounds = { minX: number; minY: number; maxX: number; maxY: number }

export const boxString = (b: Box) => `${b.x.toFixed(1)} ${b.y.toFixed(1)} ${b.w.toFixed(1)} ${b.h.toFixed(1)}`

/** 상자를 무대 비율(16:10)로 넓힌다 */
export function fitAspect(b: Bounds): Box {
  let w = b.maxX - b.minX
  let h = b.maxY - b.minY
  const cx = (b.minX + b.maxX) / 2
  const cy = (b.minY + b.maxY) / 2
  if (w / h < ASPECT) w = h * ASPECT
  else h = w / ASPECT
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

export function cameraFor(content: Bounds, focus: Pt[] = []): Box {
  const o = fitAspect(content)
  const w = clamp(o.w, VIEW_W, VIEW_W * MAX_ZOOM_OUT)
  const h = w / ASPECT
  let cx = o.x + o.w / 2
  let cy = o.y + o.h / 2
  if (o.w > w && focus.length > 0) {
    const xs = focus.map((p) => p.x)
    const ys = focus.map((p) => p.y)
    cx = clamp((Math.min(...xs) + Math.max(...xs)) / 2, o.x + w / 2, o.x + o.w - w / 2)
    cy = clamp((Math.min(...ys) + Math.max(...ys)) / 2, o.y + h / 2, o.y + o.h - h / 2)
  }
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}
