import type { Phase, Step } from '../content/types'
import { ANIM_MS } from '../theme'
import { timelineMs } from './sequence/timeline'
import { isSequenceState } from './sequence/types'

/** Phase 장면이 끝날 때까지 걸리는 시간 (배속 적용 전). 자동재생이 장면을 끝까지 보여 주는 데 쓴다 */
export function phaseDurationMs(step: Step, phase: Phase): number {
  const type = phase.scene ?? step.scene
  if (type === 'sequence' && isSequenceState(phase.state)) return Math.max(ANIM_MS, timelineMs(phase.state))
  return ANIM_MS
}
