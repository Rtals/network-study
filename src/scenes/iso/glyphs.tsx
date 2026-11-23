import type { ReactNode } from 'react'
import { INK } from './constants'
import type { Pt } from './geometry'

/** 블록 윗면에 찍는 선 아이콘 종류 */
export type GlyphKind =
  | 'monitor'
  | 'server'
  | 'browser'
  | 'wifi'
  | 'shield'
  | 'db'
  | 'spy'
  | 'door'
  | 'idcard'
  | 'card'
  | 'elevator'
  | 'clipboard'
  | 'person'
  | 'globe'
  | 'hash'
  | 'fingerprint'
  | 'key'
  | 'stamp'

const f = (n: number) => n.toFixed(1)
const FILL = { fill: '#ffffff', fillOpacity: 0.55 }

/** 블록 윗면에 찍는 선 아이콘 (화면 기준, 중심 c, 약 30px). 잉크색 둥근 선 + 반투명 흰 채움 */
export function Glyph({ kind, c }: { kind: GlyphKind; c: Pt }) {
  return (
    <g
      transform={`translate(${f(c.x)} ${f(c.y)})`}
      fill="none"
      stroke={INK}
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {SHAPES[kind]}
    </g>
  )
}

const SHAPES: Record<GlyphKind, ReactNode> = {
  monitor: (
    <>
      <rect x={-15} y={-13} width={30} height={20} rx={3.5} {...FILL} />
      <path d="M-6 3l4-4M-1 3h7" strokeWidth={2.2} />
      <path d="M0 7v5M-7 12h14" />
    </>
  ),
  server: (
    <>
      <rect x={-15} y={-13} width={30} height={11} rx={3} {...FILL} />
      <rect x={-15} y={1} width={30} height={11} rx={3} {...FILL} />
      <circle cx={-9} cy={-7.5} r={1.6} fill={INK} stroke="none" />
      <circle cx={-9} cy={6.5} r={1.6} fill={INK} stroke="none" />
      <path d="M-2 -7.5h11M-2 6.5h11" strokeWidth={2.2} />
    </>
  ),
  browser: (
    <>
      <rect x={-15} y={-12} width={30} height={23} rx={3.5} {...FILL} />
      <path d="M-15 -5h30" strokeWidth={2.2} />
      <circle cx={-10.5} cy={-8.5} r={1.3} fill={INK} stroke="none" />
      <circle cx={-6.5} cy={-8.5} r={1.3} fill={INK} stroke="none" />
      <path d="M-9 2h18M-9 6h11" strokeWidth={2} />
    </>
  ),
  wifi: (
    <>
      <path d="M-15 -4a21 21 0 0 1 30 0" />
      <path d="M-9.5 1.5a13 13 0 0 1 19 0" />
      <path d="M-4.5 6.5a6 6 0 0 1 9 0" />
      <circle cx={0} cy={11} r={2} fill={INK} stroke="none" />
    </>
  ),
  shield: (
    <>
      <path d="M0 -14l12 4.5v7c0 8.5-5.5 13-12 16-6.5-3-12-7.5-12-16v-7z" {...FILL} />
      <path d="M-5.5 0.5l4 4 7-7.5" />
    </>
  ),
  db: (
    <>
      <path d="M-13 -9v17c0 2.6 5.8 4.6 13 4.6s13-2 13-4.6v-17" {...FILL} />
      <ellipse cx={0} cy={-9} rx={13} ry={4.6} {...FILL} />
      <path d="M-13 -0.5c0 2.6 5.8 4.6 13 4.6s13-2 13-4.6" strokeWidth={2.2} />
    </>
  ),
  spy: (
    <>
      <path d="M-9 -4l2.5-9h13l2.5 9" {...FILL} />
      <path d="M-15 -4h30" />
      <circle cx={-6.5} cy={5.5} r={4.5} {...FILL} />
      <circle cx={6.5} cy={5.5} r={4.5} {...FILL} />
      <path d="M-2 5.5h4" strokeWidth={2.2} />
    </>
  ),
  door: (
    <>
      <path d="M-14 13v-17l14-9 14 9v17z" {...FILL} />
      <rect x={-4.5} y={2} width={9} height={11} rx={1.5} />
      <path d="M-9 -2h3M6 -2h3" strokeWidth={2.2} />
    </>
  ),
  idcard: (
    <>
      <rect x={-15} y={-10} width={30} height={21} rx={3} {...FILL} />
      <circle cx={-7} cy={-2.5} r={3.4} />
      <path d="M-12.5 7c1-3 3-4.2 5.5-4.2s4.5 1.2 5.5 4.2" strokeWidth={2.2} />
      <path d="M3 -4h8M3 1h8M3 6h5" strokeWidth={2.2} />
    </>
  ),
  card: (
    <>
      <rect x={-15} y={-10} width={30} height={20} rx={3.5} {...FILL} />
      <rect x={-10} y={-4.5} width={8} height={7} rx={1.6} />
      <path d="M3 4h7" strokeWidth={2.2} />
    </>
  ),
  elevator: (
    <>
      <rect x={-12} y={-14} width={24} height={28} rx={3.5} {...FILL} />
      <path d="M-4.5 -3l4.5-5 4.5 5M-4.5 3l4.5 5 4.5-5" strokeWidth={2.4} />
    </>
  ),
  clipboard: (
    <>
      <rect x={-12} y={-11} width={24} height={26} rx={3.5} {...FILL} />
      <rect x={-5.5} y={-14.5} width={11} height={6} rx={1.8} fill="#ffffff" />
      <path d="M-6.5 -2h13M-6.5 3.5h13M-6.5 9h8" strokeWidth={2.2} />
    </>
  ),
  globe: (
    <>
      <circle cx={0} cy={0} r={13} {...FILL} />
      <ellipse cx={0} cy={0} rx={5.5} ry={13} strokeWidth={2} />
      <path d="M-13 0h26M-11 -6.5h22M-11 6.5h22" strokeWidth={2} />
    </>
  ),
  hash: (
    <>
      <rect x={-14} y={-14} width={28} height={28} rx={5} {...FILL} />
      <path d="M-4 -8.5l-2 17M4.5 -8.5l-2 17M-8.5 -3.5h17M-9.5 3.5h17" strokeWidth={2.4} />
    </>
  ),
  fingerprint: (
    <>
      <path d="M-9 9c-2.5-3.5-3.5-7-3-11 .8-6 6-10 12-10s11.2 4 12 10c.4 3-.3 6-1.5 8.5" strokeWidth={2.2} />
      <path d="M-4.5 11c-2.5-3-3.5-6.5-3-9.5.6-3.8 3.7-6.3 7.5-6.3s6.9 2.5 7.5 6.3c.4 3-.4 6.3-2.5 9.5" strokeWidth={2.2} />
      <path d="M0.5 12c-1.6-3-2.3-6-1.8-9" strokeWidth={2.2} />
      <path d="M0 -0.5c1.8 0 3 1.4 3 3.3 0 3.2-1 6.3-3 9" strokeWidth={2.2} />
    </>
  ),
  key: (
    <>
      <circle cx={-6} cy={0} r={7} {...FILL} />
      <circle cx={-6} cy={0} r={2.2} fill={INK} stroke="none" />
      <path d="M1 0h14M10 0v5M14 0v4" strokeWidth={2.6} />
    </>
  ),
  stamp: (
    <>
      <path d="M-4.5 -2.5v-5.5a4.5 4.5 0 1 1 9 0v5.5" {...FILL} />
      <path d="M-13 3.5c0-3.3 2.7-6 6-6h14c3.3 0 6 2.7 6 6v3h-26z" {...FILL} />
      <path d="M-12 12h24" strokeWidth={2.8} />
    </>
  ),
  person: (
    <>
      <circle cx={0} cy={-6} r={5.5} {...FILL} />
      <path d="M-11 13c0-6.5 5-10 11-10s11 3.5 11 10" {...FILL} />
    </>
  ),
}
