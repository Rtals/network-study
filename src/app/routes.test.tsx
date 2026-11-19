import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStudyStore } from '../store/useStudyStore'
import { AppRoutes } from './routes'

function LocationProbe() {
  return <div data-testid="location">{useLocation().pathname}</div>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
      <LocationProbe />
    </MemoryRouter>,
  )
}

const location = () => screen.getByTestId('location').textContent
const phaseHeading = () => screen.getAllByRole('heading', { level: 2 })[0].textContent

beforeEach(() => {
  localStorage.clear()
  useStudyStore.setState({ expandedWeeks: {}, sidebarCollapsed: false, speed: 1 })
})
afterEach(() => vi.useRealTimers())

describe('라우팅', () => {
  it('/ 는 Step이 있는 첫 Week 개요로 보낸다', () => {
    renderAt('/')
    expect(location()).toBe('/w3')
    expect(screen.getByRole('heading', { level: 1, name: 'TCP, UDP & Socket' })).toBeInTheDocument()
  })

  it('URL의 phase로 바로 연다', () => {
    renderAt('/w3/handshake/2')
    expect(phaseHeading()).toContain('첫 번째 메시지')
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('범위를 넘는 phase는 마지막 Phase로 고친다', () => {
    renderAt('/w3/handshake/99')
    expect(location()).toBe('/w3/handshake/3')
  })

  it('없는 Step은 찾을 수 없음 화면', () => {
    renderAt('/w3/nope')
    expect(screen.getByText('페이지를 찾을 수 없습니다')).toBeInTheDocument()
  })
})

describe('키보드', () => {
  it('→ / ← 로 Phase 이동', () => {
    renderAt('/w3/handshake/1')
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(location()).toBe('/w3/handshake/2')
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(location()).toBe('/w3/handshake/1')
  })

  it('] / [ 로 Step 이동', () => {
    renderAt('/w3/handshake/2')
    fireEvent.keyDown(window, { key: ']' })
    expect(location()).toBe('/w3/seq-ack/1')
    fireEvent.keyDown(window, { key: '[' })
    expect(location()).toBe('/w3/handshake/1')
  })

  it('마지막 Phase에서 → 는 다음 Step으로', () => {
    renderAt('/w3/handshake/3')
    expect(screen.getByRole('link', { name: /다음 Step으로/ })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(location()).toBe('/w3/seq-ack/1')
  })

  it('Space 자동재생은 마지막 Phase에서 멈춘다', () => {
    vi.useFakeTimers()
    renderAt('/w3/handshake/1')
    fireEvent.keyDown(window, { key: ' ' })
    expect(useStudyStore.getState().playing).toBe(true)
    act(() => vi.advanceTimersByTime(2100))
    expect(location()).toBe('/w3/handshake/2')
    act(() => vi.advanceTimersByTime(2100))
    expect(location()).toBe('/w3/handshake/3')
    expect(useStudyStore.getState().playing).toBe(false)
  })

  it('입력 칸에서는 단축키를 무시한다', () => {
    renderAt('/w3/handshake/1')
    const input = document.createElement('input')
    document.body.appendChild(input)
    fireEvent.keyDown(input, { key: 'ArrowRight' })
    expect(location()).toBe('/w3/handshake/1')
    input.remove()
  })
})

describe('진도 표시 없음', () => {
  it.each(['/w3/handshake/3', '/w3'])('%s: 진도율·완료 표시가 없다', (path) => {
    renderAt(path)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.queryByText(/진도/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('완료')).not.toBeInTheDocument()
  })
})
