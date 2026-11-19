import { useEffect, useRef } from 'react'

type Action = 'prev' | 'next' | 'prevStep' | 'nextStep' | 'toggle'
type Handlers = Partial<Record<Action, () => void>>

const KEY_TO_ACTION: Record<string, Action> = {
  ArrowLeft: 'prev',
  ArrowRight: 'next',
  '[': 'prevStep',
  ']': 'nextStep',
  ' ': 'toggle',
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** ←/→ Phase, [ / ] Step, Space 재생/정지. 입력 칸에 포커스가 있으면 무시한다. */
export function useKeyboardShortcuts(handlers: Handlers) {
  const ref = useRef(handlers)
  useEffect(() => {
    ref.current = handlers
  })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      if (isTypingTarget(e.target)) return
      const action = KEY_TO_ACTION[e.key]
      const fn = action && ref.current[action]
      if (!fn) return
      e.preventDefault()
      fn()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
