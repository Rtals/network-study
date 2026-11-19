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
import { ANIM_MS, AUTOPLAY_PAUSE_MS } from '../theme'
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

  // 자동재생: 전환(600ms) + 쉼(1.5s)을 속도로 나눈 간격으로 다음 Phase. 마지막에 도착하면 멈춘다.
  useEffect(() => {
    if (!playing || mode !== 'follow' || phaseIndex >= last) return
    const t = window.setTimeout(
      () => {
        go(phaseIndex + 1)
        if (phaseIndex + 1 >= last) setPlaying(false)
      },
      (ANIM_MS + AUTOPLAY_PAUSE_MS) / speed,
    )
    return () => window.clearTimeout(t)
  }, [playing, mode, phaseIndex, last, speed, go, setPlaying])

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
  const restart = () => {
    setPlaying(false)
    go(0)
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
    <div className="flex min-h-0 min-w-0 flex-1">
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <StepHeader week={week} step={step} onOpenPanel={() => setPanelOpen(true)} />
        <Stage step={step} phaseIndex={phaseIndex} />
        <PhaseBar
          step={step}
          phaseIndex={phaseIndex}
          next={nextStep}
          onGo={go}
          onTogglePlay={togglePlay}
          onRestart={restart}
        />
      </main>

      <aside
        aria-label="상세 설명"
        className="hidden w-[360px] shrink-0 border-l border-line bg-surface lg:block"
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
            className="absolute inset-y-0 right-0 w-[min(360px,90vw)] bg-surface shadow-xl"
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
