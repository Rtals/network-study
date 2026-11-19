import type { Step, Week } from '../content/types'

export type StepRef = { week: Week; step: Step }

export const stepKey = (weekId: string, stepId: string) => `${weekId}/${stepId}`

/** 0부터 세는 phase index → URL (URL의 phase는 1부터) */
export const phasePath = (weekId: string, stepId: string, phaseIndex: number) =>
  `/${weekId}/${stepId}/${phaseIndex + 1}`

export function findWeek(weeks: Week[], weekId: string): Week | undefined {
  return weeks.find((w) => w.id === weekId)
}

export function findStep(weeks: Week[], weekId: string, stepId: string): StepRef | undefined {
  const week = findWeek(weeks, weekId)
  const step = week?.steps.find((s) => s.id === stepId)
  return week && step ? { week, step } : undefined
}

export function flattenSteps(weeks: Week[]): StepRef[] {
  return weeks.flatMap((week) => week.steps.map((step) => ({ week, step })))
}

/** Week 경계를 넘어 이전(-1)/다음(+1) Step */
export function adjacentStep(
  weeks: Week[],
  weekId: string,
  stepId: string,
  dir: 1 | -1,
): StepRef | undefined {
  const all = flattenSteps(weeks)
  const i = all.findIndex((r) => r.week.id === weekId && r.step.id === stepId)
  return i === -1 ? undefined : all[i + dir]
}

/**
 * URL의 phase 파라미터(1부터)를 0부터 세는 index로 바꾼다.
 * 없으면 첫 Phase. 범위 밖이거나 숫자가 아니면 가장 가까운 값으로 고치고 valid=false (리다이렉트 대상).
 */
export function parsePhaseParam(
  param: string | undefined,
  count: number,
): { index: number; valid: boolean } {
  if (param === undefined) return { index: 0, valid: true }
  if (!/^\d+$/.test(param)) return { index: 0, valid: false }
  const n = Number(param)
  const index = Math.min(Math.max(n, 1), Math.max(count, 1)) - 1
  return { index, valid: n === index + 1 }
}

/** "/w3/handshake/2" → { weekId, stepId, phase } (사이드바처럼 라우트 밖에서 위치를 알아야 할 때) */
export function parseLocation(pathname: string): {
  weekId?: string
  stepId?: string
  phase?: string
} {
  const [weekId, stepId, phase] = pathname.split('/').filter(Boolean)
  return { weekId, stepId, phase }
}

/** [10, 11] → "p.10–11", [3, 5, 6, 7] → "p.3, 5–7" */
export function formatSlides(slides: number[]): string {
  const sorted = [...new Set(slides)].sort((a, b) => a - b)
  const parts: string[] = []
  let start = sorted[0]
  let prev = sorted[0]
  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i]
    if (cur === prev + 1) {
      prev = cur
      continue
    }
    parts.push(start === prev ? `${start}` : `${start}–${prev}`)
    start = cur
    prev = cur
  }
  return sorted.length ? `p.${parts.join(', ')}` : ''
}
