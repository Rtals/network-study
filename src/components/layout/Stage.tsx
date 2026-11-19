import type { Step } from '../../content/types'
import { sceneRegistry } from '../../scenes/registry'
import { useStudyStore } from '../../store/useStudyStore'

type Props = { step: Step; phaseIndex: number }

/** 중앙 무대. 16:10 비율을 유지하며 남는 공간에 맞춰 확대/축소한다. */
export function Stage({ step, phaseIndex }: Props) {
  const mode = useStudyStore((s) => s.mode)
  const speed = useStudyStore((s) => s.speed)
  const pushEvent = useStudyStore((s) => s.pushEvent)
  const Scene = sceneRegistry[step.scene]
  const phase = step.phases[phaseIndex]

  return (
    <section
      aria-label="애니메이션 무대"
      className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-6"
    >
      <div className="relative aspect-[16/10] w-full max-w-[min(1000px,calc((100dvh-240px)*1.6))] overflow-hidden rounded-xl border border-line bg-surface">
        <Scene
          type={step.scene}
          state={phase.state}
          prevState={step.phases[phaseIndex - 1]?.state}
          phaseIndex={phaseIndex}
          phaseLabel={phase.label}
          mode={mode}
          speed={speed}
          onEvent={pushEvent}
        />
      </div>
    </section>
  )
}
