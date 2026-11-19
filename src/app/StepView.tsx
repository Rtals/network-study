import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { DetailPanel } from '../components/layout/DetailPanel'
import { PhaseBar } from '../components/layout/PhaseBar'
import { Stage } from '../components/layout/Stage'
import { StepHeader } from '../components/layout/StepHeader'
import { weeks } from '../content'
import type { Step, Week } from '../content/types'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { adjacentStep, findStep, parsePhaseParam, phasePath, stepKey, type StepRef } from '../lib/nav'
import { useStudyStore } from '../store/useStudyStore'
import { phaseDurationMs } from '../scenes/duration'
import { AUTOPLAY_PAUSE_MS } from '../theme'
import { NotFound } from './NotFound'

/** /:weekId/:stepId/:phase? — 잘못된 phase는 가장 가까운 값으로 리다이렉트 */
export function StepRoute() {
  const { weekId = '', stepId = '', phase } = useParams()
  const ref = findStep(weeks, weekId, stepId)
  if (!ref) return <NotFound />

  const parsed = parsePhaseParam(phase, ref.step.phases.length)
  if (!parsed.valid) return <Navigate replace to={phasePath(weekId, stepId, parsed.index)} />

  return <StepView key={stepKey(weekId, stepId)} week={ref.week} step={ref.step} phaseIndex={parsed.index} />
}

function StepView({ week, step, phaseIndex }: { week: Week; step: Step; phaseIndex: number }) {
  const navigate = useNavigate()
  const mode = useStudyStore((s) => s.mode)
  const playing = useStudyStore((s) => s.playing)
  const speed = useStudyStore((s) => s.speed)
  const setPlaying = useStudyStore((s) => s.setPlaying)
  const enterStep = useStudyStore((s) => s.enterStep)
  /** 지금 Phase의 애니메이션만 처음부터 다시 (자동재생 중이면 타이머도 다시 잰다) */
  const replayPhase = useStudyStore((s) => s.replay)
  const replayCount = useStudyStore((s) => s.replayCount)
  const [panelOpen, setPanelOpen] = useState(false)

  const last = step.phases.length - 1
  const prevStep = adjacentStep(weeks, week.id, step.id, -1)
  const nextStep = adjacentStep(weeks, week.id, step.id, 1)

  const go = useCallback(
    (index: number) => navigate(phasePath(week.id, step.id, Math.min(Math.max(index, 0), last))),
    [navigate, week.id, step.id, last],
  )
  const goStep = (ref?: StepRef) => {
    if (ref) navigate(phasePath(ref.week.id, ref.step.id, 0))
  }

  // Step에 들어오면 모드·재생·탭·이벤트 로그를 초기화
  useEffect(() => {
    enterStep()
  }, [enterStep])

  // 자동재생: 장면이 끝날 때까지(최소 600ms) + 쉼(1.5s)을 속도로 나눈 뒤 다음 Phase. 마지막에 도착하면 멈춘다.
  const sceneMs = phaseDurationMs(step, step.phases[phaseIndex])
  useEffect(() => {
    if (!playing || mode !== 'follow' || phaseIndex >= last) return
    const t = window.setTimeout(
      () => {
        go(phaseIndex + 1)
        if (phaseIndex + 1 >= last) setPlaying(false)
      },
      (sceneMs + AUTOPLAY_PAUSE_MS) / speed,
    )
    return () => window.clearTimeout(t)
  }, [playing, mode, phaseIndex, last, speed, go, setPlaying, sceneMs, replayCount])

  // 1024px 미만 드로어: Esc로 닫기
  useEffect(() => {
    if (!panelOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanelOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panelOpen])

  const togglePlay = () => {
    if (playing) return setPlaying(false)
    if (phaseIndex >= last) go(0)
    setPlaying(true)
  }


  useKeyboardShortcuts({
    prev: () => mode === 'follow' && phaseIndex > 0 && go(phaseIndex - 1),
    next: () => {
      if (mode !== 'follow') return
      if (phaseIndex < last) go(phaseIndex + 1)
      else goStep(nextStep)
    },
    prevStep: () => goStep(prevStep),
    nextStep: () => goStep(nextStep),
    toggle: () => mode === 'follow' && togglePlay(),
  })

  return (
    <div className="flex min-h-0 min-w-0 flex-1 gap-3 p-3 pl-0">
      <main className="card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <StepHeader week={week} step={step} onOpenPanel={() => setPanelOpen(true)} />
        <Stage week={week} step={step} phaseIndex={phaseIndex} />
        <PhaseBar
          step={step}
          phaseIndex={phaseIndex}
          next={nextStep}
          onGo={go}
          onTogglePlay={togglePlay}
          onReplay={replayPhase}
        />
      </main>

      <aside
        aria-label="상세 설명"
        className="card hidden w-[360px] shrink-0 overflow-hidden lg:block"
      >
        <DetailPanel week={week} step={step} phaseIndex={phaseIndex} />
      </aside>

      {panelOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="설명 닫기"
            onClick={() => setPanelOpen(false)}
            className="absolute inset-0 bg-black/30"
          />
          <aside
            aria-label="상세 설명"
            className="absolute inset-y-0 right-0 w-[min(360px,90vw)] border-l-[1.5px] border-ink bg-canvas shadow-[0_0_60px_-18px_#503c2373]"
          >
            <DetailPanel
              week={week}
              step={step}
              phaseIndex={phaseIndex}
              onClose={() => setPanelOpen(false)}
            />
          </aside>
        </div>
      )}
    </div>
  )
}
