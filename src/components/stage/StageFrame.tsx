import type { ReactNode } from 'react'
import { STAGE_FLOOR } from '../../theme'

/** 16:10 무대 틀. 남는 공간에 맞춰 확대/축소한다. 창 전체가 바닥이 되도록 바닥색으로 채운다. */
export function StageFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative aspect-[16/10] w-full max-w-[min(1000px,calc((100dvh-240px)*1.6))] overflow-hidden rounded-xl border border-line-soft ${className}`}
      style={{ background: STAGE_FLOOR }}
    >
      {children}
    </div>
  )
}
