import type { Step } from '../types'

// [더미] M0 셸 확인용. 실제 구현 전에 Week03 PDF p.12를 읽고 Phase 목록을 먼저 확인받는다.
export const seqAck: Step = {
  id: 'seq-ack',
  no: '3-5',
  title: 'Seq/ACK는 바이트를 센다',
  slides: [12],
  scene: 'sequence',
  easy: {
    title: '[더미] 쉽게 보기',
    body: '쉽게 보기 탭 동작 확인용 더미 비유 문구입니다.',
  },
  phases: [
    {
      label: '눈금자',
      title: '[더미] Phase 1',
      body: 'M0 셸 확인용 더미 본문입니다.',
      state: { ruler: true },
    },
    {
      label: '첫 조각',
      title: '[더미] Phase 2',
      body: 'M0 셸 확인용 더미 본문입니다.',
      state: { seq: 1, len: 1460 },
    },
    {
      label: 'ACK',
      title: '[더미] Phase 3',
      body: 'M0 셸 확인용 더미 본문입니다.',
      keyPoint: '[더미] 핵심 포인트 박스 자리',
      state: { ack: 1461 },
    },
  ],
  quiz: [
    {
      q: '[더미] 객관식 문항 자리',
      choices: ['[더미] 보기 A', '[더미] 보기 B', '[더미] 보기 C'],
      answer: '[더미] 보기 B',
      why: '[더미] 해설 자리',
    },
  ],
}
