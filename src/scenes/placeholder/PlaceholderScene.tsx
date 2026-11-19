import { motion } from 'motion/react'
import { ANIM_MS } from '../../theme'
import type { SceneProps } from '../types'

/** 엔진이 아직 없는 장면 유형용. 현재 Phase의 상태 스냅샷을 그대로 보여 준다. */
export function PlaceholderScene({ type, state, phaseIndex, phaseLabel, mode, speed, onEvent }: SceneProps) {
  return (
    <div className="absolute inset-0 flex flex-col">
      <motion.div
        key={phaseIndex}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: ANIM_MS / 1000 / speed }}
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
      >
        <span className="font-mono text-xs text-muted">{type} 엔진 · 구현 전 (자리 표시 장면)</span>
        <span className="text-4xl font-bold">{phaseLabel}</span>
        <span className="text-sm text-muted">Phase {phaseIndex + 1}</span>
        <pre className="max-w-full overflow-auto rounded-md bg-zinc-100 px-3 py-2 text-left font-mono text-xs text-muted">
          {JSON.stringify(state, null, 2)}
        </pre>
      </motion.div>
      {mode === 'sandbox' && (
        <div className="flex justify-center pb-6">
          <button
            type="button"
            onClick={() => onEvent(`테스트 이벤트 · Phase ${phaseIndex + 1}`)}
            className="h-10 rounded-lg border border-line bg-surface px-4 text-[13px] hover:bg-zinc-50"
          >
            이벤트 로그에 기록해 보기
          </button>
        </div>
      )}
      <span className="absolute top-3 right-3 rounded bg-canvas px-2 py-0.5 text-[11px] text-muted">
        Stage · 16:10
      </span>
    </div>
  )
}
