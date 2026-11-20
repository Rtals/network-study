import { PlaceholderScene } from '../placeholder/PlaceholderScene'
import type { SceneProps } from '../types'
import { TopologyDiagram } from './TopologyDiagram'
import { isTopologyState } from './types'

/** topology 엔진. Phase가 바뀌어도 살아 있고, playKey(Phase 번호 + 다시 보기 횟수)로 이번 Phase를 처음부터 재생한다 */
export function TopologyScene(props: SceneProps) {
  if (!isTopologyState(props.state)) return <PlaceholderScene {...props} />
  return <TopologyDiagram state={props.state} speed={props.speed} playKey={`${props.phaseIndex}:${props.replay}`} />
}
