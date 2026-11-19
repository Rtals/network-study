import type { ComponentType } from 'react'
import type { SceneType } from '../content/types'
import { ChartScene } from './chart/ChartScene'
import { PlaceholderScene } from './placeholder/PlaceholderScene'
import { SequenceScene } from './sequence/SequenceScene'
import type { SceneProps } from './types'

/** 구현된 엔진을 여기에 등록한다. 등록되지 않은 유형은 자리 표시 장면으로 그린다. */
const engines: Partial<Record<SceneType, ComponentType<SceneProps>>> = {
  sequence: SequenceScene,
  chart: ChartScene,
}

export const sceneRegistry: Record<SceneType, ComponentType<SceneProps>> = {
  sequence: engines.sequence ?? PlaceholderScene,
  topology: engines.topology ?? PlaceholderScene,
  bits: engines.bits ?? PlaceholderScene,
  anatomy: engines.anatomy ?? PlaceholderScene,
  flow: engines.flow ?? PlaceholderScene,
  chart: engines.chart ?? PlaceholderScene,
  compare: engines.compare ?? PlaceholderScene,
  sandbox: engines.sandbox ?? PlaceholderScene,
  diagnose: engines.diagnose ?? PlaceholderScene,
  quiz: engines.quiz ?? PlaceholderScene,
}
