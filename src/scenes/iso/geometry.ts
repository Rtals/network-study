/**
 * 2:1 아이소메트릭(다이메트릭) 투영. 모든 장면이 같은 각도를 쓴다 (바닥 마름모의 가로:세로 = 2:1).
 * 월드 좌표: +x = 화면 오른쪽 아래, +y = 화면 왼쪽 아래, +z = 위.
 * 보이는 면: 윗면, +y 면(왼쪽 앞), +x 면(오른쪽 앞).
 */
export const ISO_X = 1
export const ISO_Y = 0.5

export type Pt = { x: number; y: number }

export function iso(x: number, y: number, z = 0): Pt {
  return { x: (x - y) * ISO_X, y: (x + y) * ISO_Y - z }
}

export const lerp = (a: Pt, b: Pt, t: number): Pt => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
})

export const poly = (ps: Pt[]) => ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

/** 바닥(z=0) 평면에 눕힌 요소용 SVG transform. 로컬 +x → 월드 +x, 로컬 +y → 월드 +y */
export const floorMatrix = (p: Pt) =>
  `matrix(${ISO_X} ${ISO_Y} ${-ISO_X} ${ISO_Y} ${p.x.toFixed(1)} ${p.y.toFixed(1)})`

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number }

export function boundsOf(points: Pt[], pad = 0): Bounds {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  return {
    minX: Math.min(...xs) - pad,
    minY: Math.min(...ys) - pad,
    maxX: Math.max(...xs) + pad,
    maxY: Math.max(...ys) + pad,
  }
}

export const viewBoxOf = (b: Bounds) =>
  `${b.minX.toFixed(0)} ${b.minY.toFixed(0)} ${(b.maxX - b.minX).toFixed(0)} ${(b.maxY - b.minY).toFixed(0)}`

/** 상자의 꼭짓점 8개 (경계 계산용) */
export function boxPoints(x: number, y: number, z: number, w: number, d: number, h: number): Pt[] {
  const out: Pt[] = []
  for (const dx of [0, w]) for (const dy of [0, d]) for (const dz of [0, h]) out.push(iso(x + dx, y + dy, z + dz))
  return out
}

/** amount > 0 이면 흰색 쪽으로, < 0 이면 검은색 쪽으로 섞는다 (-1..1) */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const target = amount > 0 ? 255 : 0
    return Math.round(c + (target - c) * Math.abs(amount))
  })
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/** SVG 글자 폭 대략값 (말풍선·표지판 크기 계산용) */
export function estimateTextWidth(text: string, size: number, mono = false): number {
  let w = 0
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    if ((code >= 0xac00 && code <= 0xd7a3) || (code >= 0x3131 && code <= 0x318e)) w += size * 0.95
    else if (ch === ' ') w += size * (mono ? 0.6 : 0.3)
    else w += size * (mono ? 0.6 : 0.6)
  }
  return w
}
