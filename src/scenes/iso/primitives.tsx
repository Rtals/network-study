import { motion, useReducedMotion } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'
import { DROP, EASE, INK, SANS, STROKE, TAG, TILE } from './constants'
import { Glyph, type GlyphKind } from './glyphs'
import {
  BLOCK_PALETTE,
  PILL_TONES,
  blockLabelAt,
  boxOutline,
  calloutPath,
  extentOfDevice,
  roundedPath,
  type BlockColor,
  type PillTone,
} from './draw'
import { estimateTextWidth, iso, ISO_X, ISO_Y, poly, type Pt } from './geometry'

const f = (n: number) => n.toFixed(1)

/**
 * 무대 공통 정의: 블록 그라데이션, 흐림 필터, 반복 애니메이션(CSS).
 * 시스템의 '동작 줄이기' 설정이면 반복 애니메이션은 모두 멈춘다. SVG 안에 한 번 넣는다.
 */
export function IsoStyles() {
  return (
    <>
      <defs>
        {Object.entries(BLOCK_PALETTE).map(([name, c]) => (
          <g key={name}>
            <linearGradient id={`iso-${name}-top`} x1="0" y1="0" x2="0.35" y2="1">
              <stop offset="0" stopColor={c.top[0]} />
              <stop offset="1" stopColor={c.top[1]} />
            </linearGradient>
            <linearGradient id={`iso-${name}-side`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={c.side[0]} />
              <stop offset="1" stopColor={c.side[1]} />
            </linearGradient>
          </g>
        ))}
        <filter id="iso-blur-sm" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
        <filter id="iso-blur-lg" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <style>{`
        .iso-stage:active { cursor: grabbing !important; }
        .iso-blink { animation: iso-blink 1.1s steps(1) infinite; }
        @keyframes iso-blink { 0%, 55% { opacity: 1 } 56%, 100% { opacity: 0 } }
        .iso-pulse { animation: iso-pulse 2.4s ease-in-out infinite; }
        @keyframes iso-pulse { 0%, 100% { opacity: .35 } 50% { opacity: 1 } }
        @media (prefers-reduced-motion: reduce) {
          [class*="iso-"] { animation: none !important; }
        }
      `}</style>
    </>
  )
}

type BlockProps = {
  x: number
  y: number
  z?: number
  w: number
  d: number
  h: number
  color: BlockColor
  /** 외곽 모서리 둥글기 (화면 단위) */
  r?: number
  children?: ReactNode
}

/**
 * 둥근 블록: 옆면·윗면 그라데이션, 윗면 광택, 앞 모서리 하이라이트, 잉크색 외곽선.
 * 오른쪽(+x) 면은 살짝 어둡게 해서 입체감을 준다.
 */
export function IsoBlock({ x, y, z = 0, w, d, h, color, r = 12, children }: BlockProps) {
  const T00 = iso(x, y, z + h)
  const T10 = iso(x + w, y, z + h)
  const T11 = iso(x + w, y + d, z + h)
  const T01 = iso(x, y + d, z + h)
  const B10 = iso(x + w, y, z)
  const B11 = iso(x + w, y + d, z)
  const sil = boxOutline(x, y, z, w, d, h, r)
  const rt = Math.min(r, h / 2)
  const top = roundedPath([T00, T10, T11, T01], rt * 0.8)
  const right = roundedPath([T11, T10, B10, B11], rt * 0.6)
  const cy = (T00.y + T11.y) / 2
  const sheen = roundedPath(
    [T00, T10, T11, T01].map((p) => ({ x: p.x, y: p.y - 3 + (p.y - cy) * -0.25 })),
    rt * 0.8,
  )
  const bevel = `M${f(T01.x)} ${f(T01.y)}L${f(T11.x)} ${f(T11.y)}L${f(T10.x)} ${f(T10.y)}`
  return (
    <g>
      <path d={sil} fill={`url(#iso-${color}-side)`} />
      <path d={right} fill="#3a2a14" opacity={0.06} />
      <path d={top} fill={`url(#iso-${color}-top)`} />
      <path d={sheen} fill="#ffffff" opacity={0.22} filter="url(#iso-blur-sm)" />
      <path d={bevel} transform="translate(0 1.6)" fill="none" stroke="#ffffff" strokeOpacity={0.75} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <path d={sil} fill="none" stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />
      {children}
    </g>
  )
}

/** 바닥에 번진 부드러운 그림자 (블록 외곽선을 흐리게) */
export function SoftShadow({ d, lift = 0, opacity = 0.24 }: { d: string; lift?: number; opacity?: number }) {
  return <path d={d} transform={`translate(0 ${f(8 + lift)})`} fill="#6b5236" opacity={opacity} filter="url(#iso-blur-lg)" />
}

/**
 * 바닥 물결: 오브젝트에 설명 알약이 뜰 때 그 블록 바닥에서 원 하나가 한 번 퍼져 나간다.
 * "여기를 보라"는 표시. (x, y)는 블록 바닥 중심(월드), delay는 초.
 */
export function FloorRipple({ x, y, color, delay = 0 }: { x: number; y: number; color: string; delay?: number }) {
  const reduce = useReducedMotion()
  if (reduce) return null
  const c = iso(x, y)
  // 블록 바닥 마름모 바로 바깥에서 시작해야 가장 진할 때 가려지지 않는다
  const r = TILE * 0.8
  return (
    <motion.ellipse
      data-testid="floor-ripple"
      cx={c.x}
      cy={c.y}
      rx={r * Math.SQRT2 * ISO_X}
      ry={r * Math.SQRT2 * ISO_Y}
      fill="none"
      stroke={color}
      strokeWidth={2.6}
      pointerEvents="none"
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: [0.95, 1.7], opacity: [0.9, 0] }}
      transition={{ duration: 1.1, ease: EASE, delay }}
    />
  )
}

/** 바닥에 드리운 둥근 그림자 (작은 오브젝트용) */
export function Shadow({ x, y, r, className, style }: { x: number; y: number; r: number; className?: string; style?: CSSProperties }) {
  const c = iso(x, y)
  return (
    <ellipse
      cx={c.x}
      cy={c.y}
      rx={r * Math.SQRT2 * ISO_X}
      ry={r * Math.SQRT2 * ISO_Y}
      fill="#6b5236"
      opacity={0.16}
      className={className}
      style={style}
    />
  )
}

/** 기기 그림자 (기기와 따로 그려 떨어지는 동안 바닥에 남게) */
export function DeviceShadow({ device, x, y }: { device: 'pc' | 'server'; x: number; y: number }) {
  const e = extentOfDevice(device)
  return <SoftShadow d={boxOutline(x + e.x0, y + e.y0, 0, e.x1 - e.x0, e.y1 - e.y0, e.h, 12)} />
}

type DeviceProps = { device: 'pc' | 'server'; x: number; y: number; label: string; /** false면 그림자를 빼고 그린다 */ shadow?: boolean }

/** 기기 블록: 클라이언트 = 보라 + 모니터 아이콘, 서버 = 파랑 + 서버 아이콘. 이름은 블록에 직접 쓴다 */
export function IsoDevice({ device, x, y, label, shadow = true }: DeviceProps) {
  const e = extentOfDevice(device)
  const top = iso(x, y, e.h)
  const at = blockLabelAt(x, y, e)
  return (
    <g>
      {shadow && <DeviceShadow device={device} x={x} y={y} />}
      <IsoBlock x={x + e.x0} y={y + e.y0} w={e.x1 - e.x0} d={e.y1 - e.y0} h={e.h} color={device === 'pc' ? 'violet' : 'blue'}>
        <Glyph kind={device === 'pc' ? 'monitor' : 'server'} c={{ x: top.x, y: top.y - 1 }} />
        <text x={at.x} y={at.y} textAnchor="middle" fontFamily={SANS} fontSize={18} fontWeight={800} fill={INK}>
          {label}
        </text>
      </IsoBlock>
    </g>
  )
}

type NodeProps = {
  x: number
  y: number
  h: number
  glyph: GlyphKind
  color: BlockColor
  label: string
  /** 이름 아래 작은 글씨 (예: "Wi-Fi · ISP") */
  sub?: string
  shadow?: boolean
}

/** 아무 아이콘이나 얹는 블록 (topology 등). 크기는 TILE 정사각 바닥 + 높이 h */
export function IsoNode({ x, y, h, glyph, color, label, sub, shadow = true }: NodeProps) {
  const half = TILE / 2
  const e = { x0: -half, x1: half, y0: -half, y1: half, h }
  const top = iso(x, y, h)
  const at = blockLabelAt(x, y, e)
  return (
    <g>
      {shadow && <SoftShadow d={boxOutline(x - half, y - half, 0, TILE, TILE, h, 12)} />}
      <IsoBlock x={x - half} y={y - half} w={TILE} d={TILE} h={h} color={color}>
        <Glyph kind={glyph} c={{ x: top.x, y: top.y - 1 }} />
        <text x={at.x} y={at.y - (sub ? 6 : 0)} textAnchor="middle" fontFamily={SANS} fontSize={17} fontWeight={800} fill={INK}>
          {label}
        </text>
        {sub && (
          <text x={at.x} y={at.y + 12} textAnchor="middle" fontFamily={SANS} fontSize={12} fontWeight={600} fill="#5c564e">
            {sub}
          </text>
        )}
      </IsoBlock>
    </g>
  )
}

/**
 * 알약 상자 바탕: 잉크색 얇은 테두리 + 아래로 단단한 그림자. 글자는 부르는 쪽에서 얹는다.
 * tail이 있으면 아래 가운데에 꼬리를 단다.
 */
export function PillBox({
  x,
  y,
  w,
  h,
  tone = 'paper',
  dashed = false,
  tailX,
  tail = 0,
}: {
  x: number
  y: number
  w: number
  h: number
  tone?: PillTone
  dashed?: boolean
  tailX?: number
  tail?: number
}) {
  const r = Math.min(TAG.R + 4, h / 2)
  const d = calloutPath(x, y, w, h, r, tailX, tail)
  return (
    <g>
      <path d={d} transform={`translate(0 ${TAG.DROP})`} fill={DROP} />
      <path
        d={d}
        fill={PILL_TONES[tone].bg}
        fillOpacity={TAG.FILL_OPACITY}
        stroke={INK}
        strokeWidth={TAG.STROKE}
        strokeDasharray={dashed ? '6 4' : undefined}
        strokeLinejoin="round"
      />
    </g>
  )
}

/** 한 줄 알약: 가운데 at, 글자 + 선택 아이콘 자리 */
export function Pill({ at, text, tone = 'paper', icon }: { at: Pt; text: string; tone?: PillTone; icon?: ReactNode }) {
  const iconW = icon ? 22 : 0
  const w = estimateTextWidth(text, TAG.FONT, true) + TAG.PAD * 2 + iconW
  const h = TAG.H
  const x = at.x - w / 2
  const y = at.y - h / 2
  return (
    <g>
      <PillBox x={x} y={y} w={w} h={h} tone={tone} />
      {icon && <g transform={`translate(${f(x + TAG.PAD + 7)} ${f(at.y)})`}>{icon}</g>}
      <text x={at.x + iconW / 2} y={at.y + TAG.FONT * 0.36} textAnchor="middle" fontFamily={SANS} fontSize={TAG.FONT} fontWeight={700} fill={PILL_TONES[tone].fg}>
        {text}
      </text>
    </g>
  )
}

/** 패킷: 잉크색 테두리의 작은 원 */
export function PacketDot({ fill, opacity = 1, dashed = false }: { fill: string; opacity?: number; dashed?: boolean }) {
  return (
    <circle
      r={9}
      fill={fill}
      fillOpacity={opacity}
      stroke={INK}
      strokeOpacity={opacity < 1 ? 0.6 : 1}
      strokeWidth={2.2}
      strokeDasharray={dashed ? '4 3' : undefined}
    />
  )
}

/** 실패 표시: 빨간 원이 터지듯 번지고(한 번), 작은 ✕ 표시가 남는다 */
export function FailMark({ at }: { at: Pt }) {
  const reduce = useReducedMotion()
  const k = 4.5
  return (
    <g transform={`translate(${f(at.x)} ${f(at.y)})`} pointerEvents="none">
      {!reduce && (
        <motion.circle
          r={10}
          fill="#e5534b"
          stroke="#8f2a22"
          strokeWidth={1.6}
          initial={{ opacity: 1, scale: 0.7 }}
          animate={{ opacity: [1, 1, 0], scale: [0.7, 1.3, 2.4] }}
          transition={{ duration: 0.65, times: [0, 0.45, 1], ease: 'easeOut' }}
        />
      )}
      <motion.g
        initial={reduce ? false : { scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.32, ease: EASE, delay: reduce ? 0 : 0.2 }}
      >
        <circle r={11} fill="#e5534b" stroke={INK} strokeWidth={2} />
        <path d={`M${-k} ${-k}L${k} ${k}M${k} ${-k}L${-k} ${k}`} stroke="#ffffff" strokeWidth={2.4} strokeLinecap="round" />
      </motion.g>
    </g>
  )
}

/**
 * 바닥 위의 검은 연결선 (월드 좌표 from → to). 화살촉은 화면 기준 작은 삼각형.
 * both면 양쪽 끝에 화살촉.
 */
export function IsoArrow({
  from,
  to,
  both = false,
  danger = false,
}: {
  from: { x: number; y: number }
  to: { x: number; y: number }
  both?: boolean
  /** 빨간 점선 (공격자에게 새는 길 등) */
  danger?: boolean
}) {
  const a = iso(from.x, from.y)
  const b = iso(to.x, to.y)
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
  const ux = (b.x - a.x) / len
  const uy = (b.y - a.y) / len
  const L = 15
  const W = 7
  const head = (tip: Pt, sx: number, sy: number) =>
    poly([tip, { x: tip.x - sx * L - sy * W, y: tip.y - sy * L + sx * W }, { x: tip.x - sx * L + sy * W, y: tip.y - sy * L - sx * W }])
  const p0 = both ? { x: a.x + ux * L * 0.8, y: a.y + uy * L * 0.8 } : a
  const p1 = { x: b.x - ux * L * 0.8, y: b.y - uy * L * 0.8 }
  const color = danger ? '#c0392b' : INK
  return (
    <g stroke={color} strokeLinejoin="round" strokeLinecap="round">
      <line x1={f(p0.x)} y1={f(p0.y)} x2={f(p1.x)} y2={f(p1.y)} strokeWidth={danger ? STROKE * 0.8 : STROKE} strokeDasharray={danger ? '9 7' : undefined} />
      <polygon points={head(b, ux, uy)} fill={color} strokeWidth={1.6} />
      {both && <polygon points={head(a, -ux, -uy)} fill={color} strokeWidth={1.6} />}
    </g>
  )
}

/**
 * 바닥 격자 (연하게). 월드 좌표의 x·y 축을 따라 선을 그어 아이소메트릭 바닥으로 보이게 한다.
 * 끌어서 옮겨도 빈 곳이 보이지 않도록 넓게 깐다.
 */
export function IsoGrid({ cx = 0, cy = 0, step = 46, extent = 3200 }: { cx?: number; cy?: number; step?: number; extent?: number }) {
  const n = Math.ceil(extent / step)
  const x0 = Math.round(cx / step) * step
  const y0 = Math.round(cy / step) * step
  let d = ''
  for (let i = -n; i <= n; i++) {
    const a = iso(x0 + i * step, y0 - extent)
    const b = iso(x0 + i * step, y0 + extent)
    const c = iso(x0 - extent, y0 + i * step)
    const e = iso(x0 + extent, y0 + i * step)
    d += `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}M${f(c.x)} ${f(c.y)}L${f(e.x)} ${f(e.y)}`
  }
  return <path d={d} stroke="#e4dacb" strokeWidth={1.1} fill="none" pointerEvents="none" />
}
