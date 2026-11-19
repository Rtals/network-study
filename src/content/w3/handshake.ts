import type { Step } from '../types'

// [더미] M0 셸 확인용. M1에서 Week03 PDF p.10–11을 읽고 Phase 전체를 다시 작성한다.
export const handshake: Step = {
  id: 'handshake',
  no: '3-4',
  title: '3-Way Handshake',
  slides: [10, 11],
  scene: 'sequence',
  star: true,
  sandbox: true,
  phases: [
    {
      label: '준비',
      title: '[더미] 연결 전 상태',
      body: 'M0 셸 확인용 더미 본문입니다.\n\nM1에서 강의자료 p.10–11을 근거로 교체합니다.',
      keyPoint: '[더미] 핵심 포인트 박스 자리',
      state: { client: 'CLOSED', server: 'LISTEN' },
    },
    {
      label: 'SYN',
      title: '[더미] 첫 번째 메시지',
      body: 'M0 셸 확인용 더미 본문입니다.',
      pitfall: '[더미] 흔한 오해 박스 자리',
      state: { client: 'SYN_SENT', server: 'LISTEN', message: 'SYN' },
    },
    {
      label: 'SYN+ACK',
      title: '[더미] 두 번째 메시지',
      body: 'M0 셸 확인용 더미 본문입니다.',
      keyPoint: '[더미] 핵심 포인트 박스 자리',
      pitfall: '[더미] 흔한 오해 박스 자리',
      state: { client: 'SYN_SENT', server: 'SYN_RCVD', message: 'SYN+ACK' },
    },
  ],
  quiz: [
    {
      q: '[더미] 주관식 문항 자리',
      answer: '[더미] 모범답안 자리',
      why: '[더미] 해설 자리',
    },
  ],
}
