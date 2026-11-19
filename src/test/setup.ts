import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// vitest globals를 쓰지 않으므로 Testing Library 자동 정리가 등록되지 않는다
afterEach(() => cleanup())
