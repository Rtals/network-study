import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// vitest globals를 쓰지 않으므로 Testing Library 자동 정리가 등록되지 않는다
afterEach(() => cleanup())

// jsdom에는 matchMedia가 없다 (Motion의 reduced-motion 확인용)
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
