import type { SceneType } from '../content/types'
import type { Mode } from '../store/useStudyStore'

/**
 * 모든 장면 엔진이 받는 props (M2에서 확정 예정).
 * Phase = 상태 스냅샷. 엔진은 prevState → state 전환을 선언적으로 그린다.
 */
export type SceneProps<S = unknown> = {
  type: SceneType
  state: S
  prevState?: S
  phaseIndex: number
  phaseLabel: string
  mode: Mode
  speed: number
  /** 직접 해보기 모드에서 이벤트 로그에 한 줄 추가 */
  onEvent: (message: string) => void
}
