import { describe, expect, it } from 'vitest'
import { wheelZoom, ZOOM_MAX, ZOOM_MIN } from './usePan'

describe('휠 확대·축소', () => {
  it('굴린 만큼 이어서(끊기지 않고) 바뀐다: 조금 굴리면 조금, 많이 굴리면 많이', () => {
    const small = wheelZoom(1, -10)
    const big = wheelZoom(1, -100)
    expect(small).toBeGreaterThan(1)
    expect(big).toBeGreaterThan(small)
    expect(big).toBeCloseTo(1.2, 1)
    // 같은 양을 나눠 굴려도 결과가 같다 (연속)
    let z = 1
    for (let i = 0; i < 10; i++) z = wheelZoom(z, -10)
    expect(z).toBeCloseTo(big, 6)
  })

  it('아래로 굴리면 축소, 트랙패드 핀치는 작은 움직임에도 반응', () => {
    expect(wheelZoom(1, 100)).toBeLessThan(1)
    expect(wheelZoom(1, -5, true)).toBeGreaterThan(wheelZoom(1, -5))
  })

  it('3배 위, 1/2배 아래로는 가지 않는다', () => {
    expect(wheelZoom(ZOOM_MAX, -1000)).toBe(3)
    expect(wheelZoom(ZOOM_MIN, 1000)).toBe(0.5)
  })
})
