import { PlaceholderScene } from '../placeholder/PlaceholderScene'
import type { SceneProps } from '../types'
import { IsoBars } from './IsoBars'
import { isIsoBarsState } from './types'

/** chart 엔진. M1: 아이소메트릭 막대만. 꺾은선 그래프(cwnd 등)는 M2에서 추가한다. */
export function ChartScene(props: SceneProps) {
  if (isIsoBarsState(props.state)) return <IsoBars key={`${props.phaseIndex}:${props.replay}`} state={props.state} speed={props.speed} />
  return <PlaceholderScene {...props} />
}
