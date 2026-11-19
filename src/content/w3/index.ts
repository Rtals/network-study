import type { Week } from '../types'
import { handshake } from './handshake'
import { seqAck } from './seq-ack'

export const w3: Week = {
  id: 'w3',
  no: 3,
  title: 'TCP, UDP & Socket',
  // TODO: 강의자료의 "오늘의 질문"과 Learning Objectives로 채우기
  question: '연결은 케이블이 아니라 양쪽 메모리에 남은 상태(state)다. 그 상태가 어떻게 생기고 사라지는가?',
  objectives: [],
  source: 'Week03_TCP_UDP_Socket_Revised_1.pdf',
  steps: [handshake, seqAck],
}
