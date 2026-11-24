import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// 바닥 물결은 delay 동안 첫 키프레임이 미리 적용되므로, 첫 키프레임과 초기값이 모두 '안 보임'이어야 한다
const captured: Record<string, unknown>[] = []
vi.mock('motion/react', async (orig) => {
  const real = (await orig()) as Record<string, unknown>
  return {
    ...real,
    useReducedMotion: () => false,
    motion: new Proxy({}, {
      get: (_t, tag: string) => (props: Record<string, unknown>) => {
        if (tag === 'ellipse') captured.push(props)
        return null
      },
    }),
  }
})

describe('FloorRipple', () => {
  it('delay가 있어도 시작 전에는 보이지 않는다 (초기값·첫 키프레임 opacity 0)', async () => {
    const { FloorRipple } = await import('./primitives')
    render(
      <svg>
        <FloorRipple x={0} y={0} color="#000" delay={0.5} />
      </svg>,
    )
    const p = captured.at(-1)!
    expect((p.initial as { opacity: number }).opacity).toBe(0)
    expect((p.animate as { opacity: number[] }).opacity[0]).toBe(0)
    expect(p.opacity).toBe(0)
  })

  it('크기는 처음부터 쉬지 않고 퍼진다 (같은 크기가 연달아 나오는 키프레임 없음)', async () => {
    const { FloorRipple } = await import('./primitives')
    render(
      <svg>
        <FloorRipple x={0} y={0} color="#000" />
      </svg>,
    )
    const scale = (captured.at(-1)!.animate as { scale: number[] }).scale
    for (let i = 1; i < scale.length; i++) expect(scale[i]).toBeGreaterThan(scale[i - 1])
  })
})
