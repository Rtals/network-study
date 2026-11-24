import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HASH_EXAMPLES } from '../lib/hash'
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
  useStudyStore.setState({ expandedWeeks: {}, sidebarCollapsed: false, speed: 1, stagePan: {}, stageZoom: {} })
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

  it('휠로 굴린 만큼 바로 확대·축소(최대 3배, 최소 1/2배), 맞춤으로 원래대로', () => {
    renderAt('/w3/handshake/1')
    const svg = screen.getByRole('img', { name: /연결 다이어그램/ })
    const content = screen.getByTestId('stage-content')
    const scale = () => Number(content.getAttribute('transform')?.match(/scale\(([\d.]+)\)/)?.[1] ?? 1)
    expect(screen.queryByRole('button', { name: '확대' })).not.toBeInTheDocument()
    fireEvent.wheel(svg, { deltaY: -20 })
    const a = scale()
    fireEvent.wheel(svg, { deltaY: -20 })
    expect(a).toBeGreaterThan(1)
    expect(scale()).toBeGreaterThan(a)
    for (let i = 0; i < 40; i++) fireEvent.wheel(svg, { deltaY: -100 })
    expect(scale()).toBe(3)
    fireEvent.click(screen.getByRole('button', { name: '가운데로' }))
    expect(scale()).toBe(1)
    for (let i = 0; i < 40; i++) fireEvent.wheel(svg, { deltaY: 100 })
    expect(scale()).toBe(0.5)
  })

  it('상태 알약이 바뀌면 그 기기 바닥에 물결이 생긴다', () => {
    vi.useFakeTimers()
    renderAt('/w3/handshake/2')
    expect(screen.queryAllByTestId('floor-ripple')).toHaveLength(0)
    for (let t = 0; t < 1600; t += 200) act(() => vi.advanceTimersByTime(200))
    // SYN을 보내는 순간 클라이언트가 SYN_SENT로 바뀐다
    expect(screen.queryAllByTestId('floor-ripple')).toHaveLength(1)
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

describe('6-1 보안의 큰 그림', () => {
  it('경로 다이어그램과 오른쪽 설명이 나온다', () => {
    renderAt('/w6/security-map/2')
    expect(screen.getByRole('img', { name: /경로 다이어그램: 브라우저, 네트워크, 웹 서버, 인증·인가, DB/ })).toBeInTheDocument()
    expect(phaseHeading()).toContain('요청 하나가 지나가는 길')
    expect(screen.getByText('2 / 5')).toBeInTheDocument()
  })

  it('공격 Phase는 알약 없이 시작해서 차례로 붙는다', () => {
    vi.useFakeTimers()
    renderAt('/w6/security-map/3')
    const stage = () => within(screen.getByRole('img', { name: /경로 다이어그램/ }))
    expect(stage().queryByText('XSS로 토큰 탈취')).not.toBeInTheDocument()
    for (let t = 0; t < 3000; t += 200) act(() => vi.advanceTimersByTime(200))
    expect(stage().getByText('XSS로 토큰 탈취')).toBeInTheDocument()
  })

  it('알약이 뜨는 블록 바닥에 물결이 생긴다 (처음부터 있던 알약에는 없음)', () => {
    vi.useFakeTimers()
    renderAt('/w6/security-map/3')
    expect(screen.queryAllByTestId('floor-ripple')).toHaveLength(0)
    for (let t = 0; t < 3000; t += 200) act(() => vi.advanceTimersByTime(200))
    expect(screen.queryAllByTestId('floor-ripple').length).toBeGreaterThan(0)
  })
})

describe('6-2 HTTP는 엽서, HTTPS는 봉투', () => {
  it('직접 해보기: HTTP 엿보기는 성공, HTTPS로 바꾸면 막히고 로그도 바뀐다', () => {
    renderAt('/w6/http-vs-https/1')
    fireEvent.click(screen.getByRole('button', { name: '직접 해보기' }))
    const log = () => screen.getByRole('contentinfo', { name: '이벤트 로그' }).textContent
    expect(screen.getByText(/HTTP \+ 엿보기 → 성공/)).toBeInTheDocument()
    expect(log()).toContain('기밀성 ✕')
    fireEvent.click(screen.getByRole('button', { name: /HTTPS/ }))
    expect(screen.getByText(/HTTPS \+ 엿보기 → 막힘/)).toBeInTheDocument()
    expect(log()).toContain('기밀성 ✓')
    fireEvent.click(screen.getByRole('button', { name: /사칭/ }))
    expect(log()).toContain('인증서 검증 실패')
  })
})

describe('6-3 대칭키와 공개키', () => {
  it('URL로 Phase를 바로 열고, 도둑이 있는 경로 다이어그램이 나온다', () => {
    renderAt('/w6/symmetric-public-key/2')
    expect(phaseHeading()).toContain('처음 만난 상대에게 열쇠를 어떻게 건네나')
    expect(screen.getByRole('img', { name: /경로 다이어그램: 클라이언트, 네트워크, 서버, 도둑/ })).toBeInTheDocument()
    expect(screen.getByText('2 / 7')).toBeInTheDocument()
  })
})

describe('6-4 해시와 전자서명', () => {
  it('직접 해보기: 실제 SHA-256을 계산하고, 같은 입력이면 같은 해시', async () => {
    renderAt('/w6/hash-signature/1')
    fireEvent.click(screen.getByRole('button', { name: '직접 해보기' }))
    expect(await screen.findByLabelText(`입력 A의 SHA-256: ${HASH_EXAMPLES.inu1234}`)).toBeInTheDocument()
    expect(await screen.findByLabelText(`입력 B의 SHA-256: ${HASH_EXAMPLES.inu1235}`)).toBeInTheDocument()
    expect(screen.getByText(/256비트 중 \d+비트가 다르다/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('입력 B'), { target: { value: 'inu1234' } })
    expect(await screen.findByText(/두 해시가 같다/)).toBeInTheDocument()
  })
})

describe('6-5 인증서와 신뢰 체인', () => {
  it('URL로 Phase를 열면 체인 다이어그램과 Quick Check Q3 핵심 포인트', () => {
    renderAt('/w6/certificate-chain/6')
    expect(phaseHeading()).toContain('출발점은 미리 설치된 Root')
    expect(screen.getByRole('img', { name: /경로 다이어그램: 브라우저, 서버 인증서, Intermediate, Root CA/ })).toBeInTheDocument()
    expect(screen.getByText(/Quick Check Q3/)).toBeInTheDocument()
  })
})

describe('6-6 TLS 1.3 Handshake', () => {
  it('URL로 Phase를 열면 연결 다이어그램과 주고받은 메시지 목록', () => {
    renderAt('/w6/tls-handshake/4')
    expect(phaseHeading()).toContain('개인키로 진짜 주인임을 증명한다')
    expect(screen.getByRole('img', { name: /연결 다이어그램: 서버에서 브라우저로 Certificate/ })).toBeInTheDocument()
    const list = within(screen.getByRole('region', { name: '주고받은 메시지' }))
    expect(list.getByText('ClientHello')).toBeInTheDocument()
  })
})

describe('6-7 TLS의 한계와 인증서 오류', () => {
  it('인증서 오류 Phase: 경고 이름이 차례로 뜬다', () => {
    vi.useFakeTimers()
    renderAt('/w6/tls-limits/4')
    expect(phaseHeading()).toContain('인증서 오류 ① 날짜와 이름')
    const stage = () => within(screen.getByRole('img', { name: /경로 다이어그램/ }))
    for (let t = 0; t < 6000; t += 200) act(() => vi.advanceTimersByTime(200))
    expect(stage().getByText('NET::ERR_CERT_DATE_INVALID')).toBeInTheDocument()
  })
})

describe('6-8 인증과 인가', () => {
  it('직접 해보기: 카드를 고르고 맞히면 정답과 멈춘 곳이 나온다', () => {
    renderAt('/w6/authn-authz/1')
    fireEvent.click(screen.getByRole('button', { name: '직접 해보기' }))
    fireEvent.click(screen.getByRole('button', { name: '학생 토큰으로 남의 성적 조회' }))
    fireEvent.click(screen.getByRole('button', { name: '401' }))
    expect(screen.getByText(/아쉽다. 정답은 403/)).toBeInTheDocument()
    expect(screen.getByText(/인가에서 멈췄다/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '403' }))
    expect(screen.getByText(/정답!/)).toBeInTheDocument()
    const log = screen.getByRole('contentinfo', { name: '이벤트 로그' }).textContent
    expect(log).toContain('403 Forbidden')
  })
})

describe('6-9 MFA와 OTP', () => {
  it('직접 해보기: 앱과 서버 코드가 같고, 앱 시계를 30초 넘게 어긋나게 하면 달라진다', async () => {
    renderAt('/w6/mfa-otp/1')
    fireEvent.click(screen.getByRole('button', { name: '직접 해보기' }))
    expect(await screen.findByText('두 코드가 같다 → 로그인 통과')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/앱 시계 어긋남/), { target: { value: '60' } })
    expect(await screen.findByText('두 코드가 다르다 → 로그인 실패')).toBeInTheDocument()
  })
})

describe('6-10 비밀번호 저장', () => {
  it('직접 해보기: 같은 비밀번호면 SHA-256은 같고, Salt를 넣으면 달라진다', async () => {
    renderAt('/w6/password-storage/1')
    fireEvent.click(screen.getByRole('button', { name: '직접 해보기' }))
    const table = await screen.findByRole('table', { name: '저장 방식별 DB' })
    await within(table).findByText('느린 해시 + Salt', {}, { timeout: 5000 })
    const row = (name: string) => within(table).getByText(name).closest('tr')!
    const cells = (name: string) => [...row(name).querySelectorAll('td')].slice(1).map((td) => td.textContent)
    const [kim, lee] = cells('SHA-256')
    expect(kim).toBe(lee)
    const [sk, sl] = cells('Salt + SHA-256')
    expect(sk).not.toBe(sl)
    expect(screen.getByText(/10억 번 대입하려면/)).toBeInTheDocument()
  })
})

describe('6-11 로그인 전체 흐름', () => {
  it('URL로 Phase를 열면 브라우저·API 서버·DB 다이어그램과 핵심 포인트', () => {
    renderAt('/w6/login-flow/5')
    expect(phaseHeading()).toContain('출입증만 보낸다')
    expect(screen.getByRole('img', { name: /경로 다이어그램: 브라우저, API 서버, User DB/ })).toBeInTheDocument()
    expect(screen.getByText(/비밀번호처럼 보호해야/)).toBeInTheDocument()
  })
})

describe('6-12 Cookie와 Session', () => {
  it('번호표 Phase: 세션 저장소가 있는 다이어그램과 Quick Check Q5 핵심 포인트', () => {
    renderAt('/w6/cookie-session/4')
    expect(phaseHeading()).toContain('Session ID는 번호표')
    expect(screen.getByRole('img', { name: /경로 다이어그램: 브라우저, 서버, 세션 저장소/ })).toBeInTheDocument()
    expect(screen.getByText(/Quick Check Q5/)).toBeInTheDocument()
  })
})

describe('6-13 Cookie 보안 속성', () => {
  it('직접 해보기: 속성이 모두 꺼져 있으면 XSS가 성공, HttpOnly를 켜면 막힌다', () => {
    renderAt('/w6/cookie-attributes/1')
    fireEvent.click(screen.getByRole('button', { name: '직접 해보기' }))
    const log = () => screen.getByRole('contentinfo', { name: '이벤트 로그' }).textContent
    expect(screen.getByText(/SameSite=None인데 Secure가 없다/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Secure' }))
    expect(log()).toContain('XSS 쿠키 탈취: 성공')
    fireEvent.click(screen.getByRole('button', { name: 'HttpOnly' }))
    expect(log()).toContain('XSS 쿠키 탈취: 막힘')
    fireEvent.click(screen.getByRole('button', { name: '권장 조합으로' }))
    expect(log()).toContain('CSRF 위조 POST: 막힘')
  })
})

describe('6-14 JWT 해부', () => {
  it('직접 해보기: 처음엔 통과, role을 바꾸면 서명 불일치, 다시 발급하면 통과', async () => {
    renderAt('/w6/jwt-anatomy/1')
    fireEvent.click(screen.getByRole('button', { name: '직접 해보기' }))
    expect(await screen.findByText('서버 검증 통과 → 200 OK')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'role을 professor로 (변조)' }))
    expect(await screen.findByText(/서명 불일치/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '비밀키를 아는 서버가 다시 발급' }))
    expect(await screen.findByText('서버 검증 통과 → 200 OK')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'exp를 과거로' }))
    expect(await screen.findByText(/만료/)).toBeInTheDocument()
  })
})

describe('6-15 JWT 검증 순서', () => {
  it('검증기: 토큰마다 멈추는 검문소가 다르고, decode만 하면 변조 토큰도 통과한다', async () => {
    renderAt('/w6/jwt-verify/1')
    fireEvent.click(screen.getByRole('button', { name: '직접 해보기' }))
    expect(await screen.findByText('모든 검문소 통과 → 인가로')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'alg: none 토큰' }))
    expect(await screen.findByText('2. 알고리즘에서 멈춤 → 401')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'role 변조 토큰' }))
    expect(await screen.findByText('3. 서명에서 멈춤 → 401')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /decode만 하는 서버/ }))
    expect(await screen.findByText(/검증 없이 통과 → 위험!/)).toBeInTheDocument()
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
