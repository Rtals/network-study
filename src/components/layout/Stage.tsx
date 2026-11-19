import type { Step, Week } from '../../content/types'
import { stepKey } from '../../lib/nav'
import { sceneRegistry } from '../../scenes/registry'
import { sandboxRegistry } from '../../scenes/sandbox/registry'
import { useStudyStore } from '../../store/useStudyStore'
import { StageFrame } from '../stage/StageFrame'

type Props = { week: Week; step: Step; phaseIndex: number }

/** 중앙 무대. 따라가기 = Phase 장면, 직접 해보기 = Step 전용 플레이그라운드 */
export function Stage({ week, step, phaseIndex }: Props) {
  const mode = useStudyStore((s) => s.mode)
  const speed = useStudyStore((s) => s.speed)
  const replay = useStudyStore((s) => s.replayCount)
  const pushEvent = useStudyStore((s) => s.pushEvent)
  const Sandbox = sandboxRegistry[stepKey(week.id, step.id)]

  if (mode === 'sandbox' && Sandbox) {
    return (
      <section aria-label="직접 해보기 무대" className="flex min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-1">
        <Sandbox />
      </section>
    )
  }

  const phase = step.phases[phaseIndex]
  const Scene = sceneRegistry[phase.scene ?? step.scene]

  return (
    <section
      aria-label="애니메이션 무대"
      className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 pt-3 pb-1"
    >
      <StageFrame>
        <Scene
          type={phase.scene ?? step.scene}
          state={phase.state}
          prevState={step.phases[phaseIndex - 1]?.state}
          phaseIndex={phaseIndex}
          phaseLabel={phase.label}
          mode={mode}
          speed={speed}
          replay={replay}
          onEvent={pushEvent}
        />
      </StageFrame>
    </section>
  )
}
