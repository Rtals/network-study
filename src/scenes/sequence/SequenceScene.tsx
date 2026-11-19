import { PlaceholderScene } from '../placeholder/PlaceholderScene'
import type { SceneProps } from '../types'
import { SequenceDiagram } from './SequenceDiagram'
import { isSequenceState } from './types'

/**
 * sequence 엔진. Phase가 바뀌어도 그대로 살아 있고(기기·카메라가 이어진다),
 * playKey(Phase 번호 + 다시 보기 횟수)로 이번 Phase의 메시지를 처음부터 재생한다.
 */
export function SequenceScene(props: SceneProps) {
  if (!isSequenceState(props.state)) return <PlaceholderScene {...props} />
  return <SequenceDiagram state={props.state} speed={props.speed} playKey={`${props.phaseIndex}:${props.replay}`} />
}
