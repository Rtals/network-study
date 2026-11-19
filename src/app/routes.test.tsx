import { act, fireEvent, render, screen, within } from '@testing-library/react'
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
  useStudyStore.setState({ expandedWeeks: {}, sidebarCollapsed: false, speed: 1, stagePan: {} })
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
    expect(phaseHeading()).toContain('SYN: "연결하자. 내 번호는 x부터야"')
    expect(screen.getByText('2 / 8')).toBeInTheDocument()
  })

  it('범위를 넘는 phase는 마지막 Phase로 고친다', () => {
    renderAt('/w3/handshake/99')
    expect(location()).toBe('/w3/handshake/8')
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
    renderAt('/w3/handshake/8')
    expect(screen.getByRole('link', { name: /다음 Step으로/ })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(location()).toBe('/w3/seq-ack/1')
  })

  it('Space 자동재생은 장면이 끝난 뒤 넘어가고, 마지막 Phase에서 멈춘다', () => {
    vi.useFakeTimers()
    renderAt('/w3/handshake/6')
    fireEvent.keyDown(window, { key: ' ' })
    expect(useStudyStore.getState().playing).toBe(true)
    // Phase 6: 메시지 3개 (약 3.9초) + 설명 읽을 시간 2번 (4.4초) + 쉼 1.5초 ≈ 9.8초
    act(() => vi.advanceTimersByTime(6000))
    expect(location()).toBe('/w3/handshake/6')
    act(() => vi.advanceTimersByTime(4500))
    expect(location()).toBe('/w3/handshake/7')
    act(() => vi.advanceTimersByTime(10000))
    expect(location()).toBe('/w3/handshake/8')
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

describe('3-4 장면', () => {
  it('클라이언트와 서버 이름표가 보인다', () => {
    renderAt('/w3/handshake/1')
    expect(screen.getByText('클라이언트')).toBeInTheDocument()
    expect(screen.getByText('서버')).toBeInTheDocument()
  })

  it('기기가 바닥에 떨어진 뒤 상태 표지판이 뜨고, 앞으로 올 메시지는 미리 보여 주지 않는다', () => {
    vi.useFakeTimers()
    renderAt('/w3/handshake/1')
    const stage0 = within(screen.getByRole('img', { name: /연결 다이어그램/ }))
    expect(stage0.queryByText('CLOSED')).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1000))
    const stage = within(screen.getByRole('img', { name: /연결 다이어그램/ }))
    expect(stage.queryByText('SYN')).not.toBeInTheDocument()
    expect(stage.queryByText('SYN+ACK')).not.toBeInTheDocument()
    expect(stage.queryByText('SYN_SENT')).not.toBeInTheDocument()
    expect(stage.getByText('CLOSED')).toBeInTheDocument()
  })

  it('무대를 드래그하면 화면이 이동하고, 가운데로 버튼으로 돌아온다', () => {
    renderAt('/w3/handshake/1')
    const svg = screen.getByRole('img', { name: /연결 다이어그램/ })
    const content = screen.getByTestId('stage-content')
    const before = content.getAttribute('transform')
    fireEvent.pointerDown(svg, { clientX: 100, clientY: 100, button: 0, pointerId: 1 })
    fireEvent.pointerMove(svg, { clientX: 160, clientY: 130, pointerId: 1 })
    fireEvent.pointerUp(svg, { pointerId: 1 })
    expect(content.getAttribute('transform')).not.toBe(before)
    fireEvent.click(screen.getByRole('button', { name: '가운데로' }))
    expect(content.getAttribute('transform')).toBe(before)
  })

  it('주고받은 메시지는 무대가 아니라 오른쪽 패널에 뜻풀이와 함께 나온다', () => {
    renderAt('/w3/handshake/3')
    const stage = screen.getByRole('img', { name: /연결 다이어그램/ })
    expect(within(stage).queryByText('주고받은 메시지')).not.toBeInTheDocument()
    const list = within(screen.getByRole('region', { name: '주고받은 메시지' }))
    expect(list.getByText('SYN')).toBeInTheDocument()
    expect(list.getByText('SYN+ACK')).toBeInTheDocument()
    expect(list.getByText('이번 단계')).toBeInTheDocument()
    expect(list.getByText(/Server의 시작 번호 y를 알린다/)).toBeInTheDocument()
  })

  it('Phase 1에는 주고받은 메시지가 없으니 목록도 없다', () => {
    renderAt('/w3/handshake/1')
    expect(screen.queryByRole('region', { name: '주고받은 메시지' })).not.toBeInTheDocument()
  })

  it('다시 보기 버튼은 Phase를 그대로 두고 이번 단계 애니메이션만 처음부터 다시 재생한다', () => {
    vi.useFakeTimers()
    renderAt('/w3/handshake/2')
    // 타임라인은 한 단계가 그려진 뒤에 다음 타이머를 건다: 조금씩 나눠 흘린다
    const flush = (ms: number) => {
      for (let t = 0; t < ms; t += 200) act(() => vi.advanceTimersByTime(200))
    }
    flush(2500)
    const stage = () => within(screen.getByRole('img', { name: /연결 다이어그램/ }))
    expect(stage().getByText('SYN')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '이 단계 다시 보기' }))
    expect(location()).toBe('/w3/handshake/2')
    // 처음으로 돌아가 패킷이 아직 출발하지 않았다가, 잠시 뒤 다시 보낸다
    expect(stage().queryByText('SYN')).not.toBeInTheDocument()
    flush(600)
    expect(stage().getByText('SYN')).toBeInTheDocument()
  })

  it('Phase 8은 연결 비용 막대와 실무 신호', () => {
    renderAt('/w3/handshake/8')
    expect(screen.getByRole('img', { name: /RTT 30ms 기준 연결 수립 비용/ })).toBeInTheDocument()
    expect(screen.getByText('실무 신호')).toBeInTheDocument()
  })
})

describe('3-4 직접 해보기', () => {
  it('SYN 손실을 켜면 이벤트 로그에 재전송이 기록된다', () => {
    renderAt('/w3/handshake/1')
    fireEvent.click(screen.getByRole('button', { name: '직접 해보기' }))
    const log = () => screen.getByRole('contentinfo', { name: '이벤트 로그' }).textContent
    expect(log()).toContain('Client ESTABLISHED')
    fireEvent.click(screen.getByRole('button', { name: 'SYN', pressed: false }))
    expect(log()).toContain('SYN 손실')
    expect(log()).toContain('RTO 1s 대기')
    expect(log()).toContain('SYN 재전송')
  })

  it('SYN 계속 손실이면 Connection timed out', () => {
    renderAt('/w3/handshake/1')
    fireEvent.click(screen.getByRole('button', { name: '직접 해보기' }))
    fireEvent.click(screen.getByLabelText('SYN 계속 손실 (방화벽 차단)'))
    expect(screen.getAllByText(/Connection timed out/).length).toBeGreaterThan(0)
  })
})
