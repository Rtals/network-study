import { describe, expect, it } from 'vitest'
import { weeks } from '.'

/** 모든 Step 데이터가 지켜야 할 규칙 (CLAUDE.md, CURRICULUM.md) */
describe('콘텐츠 규칙', () => {
  it('Week id가 겹치지 않는다', () => {
    const ids = weeks.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  for (const week of weeks) {
    describe(week.id, () => {
      it('Step id가 Week 안에서 겹치지 않는다', () => {
        const ids = week.steps.map((s) => s.id)
        expect(new Set(ids).size).toBe(ids.length)
      })

      for (const step of week.steps) {
        it(`${step.no} ${step.title}: 출처 페이지와 Phase가 있다`, () => {
          expect(step.slides.length).toBeGreaterThan(0)
          expect(step.phases.length).toBeGreaterThan(0)
        })
        it(`${step.no}: Phase 라벨은 8자 이내`, () => {
          for (const p of step.phases) expect([...p.label].length).toBeLessThanOrEqual(8)
        })
        it(`${step.no}: id는 URL에 쓸 수 있는 형태`, () => {
          expect(step.id).toMatch(/^[a-z0-9-]+$/)
        })
      }
    })
  }
})
