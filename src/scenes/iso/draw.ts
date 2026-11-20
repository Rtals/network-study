import { INK, PC_EXTENT, SERVER_EXTENT } from './constants'
import { iso, type Pt } from './geometry'

const f = (n: number) => n.toFixed(1)

/** 블록 색: 윗면·옆면 그라데이션 두 쌍 (밝은 파스텔). IsoStyles가 이 이름으로 그라데이션을 만든다 */
export const BLOCK_PALETTE = {
  blue: { top: ['#e2edf9', '#cfe1f4'], side: ['#bfd4ee', '#a9c3e5'] },
  violet: { top: ['#f0e8f8', '#e2d7f1'], side: ['#d5c7eb', '#c5b4e2'] },
  green: { top: ['#e4f1d9', '#d2e8c3'], side: ['#c3dfb2', '#b0d49c'] },
  orange: { top: ['#fde6cd', '#fbd4ae'], side: ['#f8c699', '#f0b281'] },
  yellow: { top: ['#fff2d6', '#fde6b8'], side: ['#fad99c', '#f3c980'] },
  slab: { top: ['#f7f0e7', '#efe6da'], side: ['#eae0d3', '#e0d4c5'] },
  rose: { top: ['#fce6e2', '#f8d3cc'], side: ['#f2bdb3', '#e9a597'] },
} as const
export type BlockColor = keyof typeof BLOCK_PALETTE

/** 알약 상자 색 (배경 / 글자). 무대의 모든 글자 상자가 이 중 하나를 쓴다 */
export const PILL_TONES = {
  paper: { bg: '#fbf6ef', fg: INK },
  green: { bg: '#dcefd2', fg: '#24521c' },
  orange: { bg: '#fcdcbd', fg: '#86401a' },
  amber: { bg: '#fbe5bd', fg: '#6d4a0c' },
  red: { bg: '#f8d5cf', fg: '#8f2a22' },
  violet: { bg: '#e7ddf5', fg: '#47306f' },
  gray: { bg: '#ebe5dc', fg: '#5f5850' },
} as const
export type PillTone = keyof typeof PILL_TONES

/** 꼭짓점마다 반지름 r로 둥글린 닫힌 경로 */
export function roundedPath(pts: Pt[], r: number): string {
  const n = pts.length
  const toward = (v: Pt, p: Pt) => {
    const dx = p.x - v.x
    const dy = p.y - v.y
    const l = Math.hypot(dx, dy) || 1
    const k = Math.min(r, l / 2) / l
    return { x: v.x + dx * k, y: v.y + dy * k }
  }
  let d = ''
  for (let i = 0; i < n; i++) {
    const v = pts[i]
    const a = toward(v, pts[(i - 1 + n) % n])
    const b = toward(v, pts[(i + 1) % n])
    d += `${i === 0 ? 'M' : 'L'}${f(a.x)} ${f(a.y)}Q${f(v.x)} ${f(v.y)} ${f(b.x)} ${f(b.y)}`
  }
  return `${d}Z`
}

/** 둥근 상자의 화면 외곽선: 윗면 뒤 모서리 → 오른쪽 → 바닥 앞 → 왼쪽 (6각형을 둥글린 것) */
export function boxOutline(x: number, y: number, z: number, w: number, d: number, h: number, r: number): string {
  return roundedPath(
    [iso(x, y, z + h), iso(x + w, y, z + h), iso(x + w, y, z), iso(x + w, y + d, z), iso(x, y + d, z), iso(x, y + d, z + h)],
    r,
  )
}

/** 기기 블록의 바닥 중심 기준 크기 */
export const extentOfDevice = (device: 'pc' | 'server') => (device === 'pc' ? PC_EXTENT : SERVER_EXTENT)

/** 기기 블록 외곽선 (그림자 자리) */
export function deviceOutline(device: 'pc' | 'server', x: number, y: number): string {
  const e = extentOfDevice(device)
  return boxOutline(x + e.x0, y + e.y0, 0, e.x1 - e.x0, e.y1 - e.y0, e.h, 12)
}

/** 블록 이름 글자 자리: 윗면 가운데 아래, 앞쪽 두 면에 걸쳐 */
export function blockLabelAt(x: number, y: number, e: { x0: number; x1: number; y0: number; y1: number; h: number }): Pt {
  const cx = x + (e.x0 + e.x1) / 2
  const cy = y + (e.y0 + e.y1) / 2
  const top = iso(cx, cy, e.h)
  const half = ((e.x1 - e.x0) / 2) * 1
  return { x: top.x, y: top.y + (half + e.h) * 0.42 + 8 }
}

/**
 * 둥근 사각형 + 아래 가운데(tailX) 꼬리를 한 경로로.
 * tail = 꼬리 길이 (0이면 꼬리 없음)
 */
export function calloutPath(x: number, y: number, w: number, h: number, r: number, tailX?: number, tail = 0): string {
  const b = y + h
  const tx = tailX ?? x + w / 2
  const bottom = tail > 0 ? `H${f(tx + 9)}L${f(tx)} ${f(b + tail)}L${f(tx - 9)} ${f(b)}` : ''
  return (
    `M${f(x + r)} ${f(y)}H${f(x + w - r)}Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + r)}` +
    `V${f(b - r)}Q${f(x + w)} ${f(b)} ${f(x + w - r)} ${f(b)}${bottom}` +
    `H${f(x + r)}Q${f(x)} ${f(b)} ${f(x)} ${f(b - r)}V${f(y + r)}Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)}Z`
  )
}
