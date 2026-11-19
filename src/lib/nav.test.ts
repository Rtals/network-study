import { describe, expect, it } from 'vitest'
import type { Step, Week } from '../content/types'
import {
  adjacentStep,
  findStep,
  formatSlides,
  parseLocation,
  parsePhaseParam,
  phasePath,
} from './nav'

const step = (id: string): Step => ({
  id,
  no: id,
  title: id,
  slides: [1],
  scene: 'flow',
  phases: [{ label: 'a', title: 'a', body: '', state: null }],
})
const week = (id: Week['id'], steps: Step[]): Week => ({
  id,
  no: Number(id.slice(1)),
  title: id,
  question: '',
  objectives: [],
  source: '',
  steps,
})
const fixture: Week[] = [week('w2', [step('a'), step('b')]), week('w3', []), week('w4', [step('c')])]

describe('parsePhaseParam', () => {
  it('없으면 첫 Phase', () => expect(parsePhaseParam(undefined, 5)).toEqual({ index: 0, valid: true }))
  it('1부터 세는 값을 0부터 세는 index로', () => expect(parsePhaseParam('3', 5)).toEqual({ index: 2, valid: true }))
  it('범위를 넘으면 마지막으로 고치고 invalid', () => expect(parsePhaseParam('99', 5)).toEqual({ index: 4, valid: false }))
  it('0이면 첫 Phase로 고치고 invalid', () => expect(parsePhaseParam('0', 5)).toEqual({ index: 0, valid: false }))
  it('숫자가 아니면 invalid', () => expect(parsePhaseParam('abc', 5)).toEqual({ index: 0, valid: false }))
  it('소수점도 invalid', () => expect(parsePhaseParam('1.5', 5).valid).toBe(false))
})

describe('phasePath / parseLocation', () => {
  it('URL의 phase는 1부터', () => expect(phasePath('w3', 'handshake', 2)).toBe('/w3/handshake/3'))
  it('경로를 나눈다', () =>
    expect(parseLocation('/w3/handshake/3')).toEqual({ weekId: 'w3', stepId: 'handshake', phase: '3' }))
  it('Week 개요 경로', () => expect(parseLocation('/w2')).toEqual({ weekId: 'w2' }))
})

describe('findStep / adjacentStep', () => {
  it('Step을 찾는다', () => expect(findStep(fixture, 'w2', 'b')?.step.id).toBe('b'))
  it('없는 Step은 undefined', () => expect(findStep(fixture, 'w2', 'zzz')).toBeUndefined())
  it('다음 Step은 빈 Week를 건너뛰어 다음 Week로', () =>
    expect(adjacentStep(fixture, 'w2', 'b', 1)?.step.id).toBe('c'))
  it('이전 Step', () => expect(adjacentStep(fixture, 'w4', 'c', -1)?.step.id).toBe('b'))
  it('처음과 끝에서는 undefined', () => {
    expect(adjacentStep(fixture, 'w2', 'a', -1)).toBeUndefined()
    expect(adjacentStep(fixture, 'w4', 'c', 1)).toBeUndefined()
  })
})

describe('formatSlides', () => {
  it('연속 페이지는 범위로', () => expect(formatSlides([10, 11])).toBe('p.10–11'))
  it('끊긴 페이지는 쉼표로', () => expect(formatSlides([3, 5, 6, 7])).toBe('p.3, 5–7'))
  it('한 페이지', () => expect(formatSlides([12])).toBe('p.12'))
  it('정렬하고 중복 제거', () => expect(formatSlides([4, 2, 2])).toBe('p.2, 4'))
})
