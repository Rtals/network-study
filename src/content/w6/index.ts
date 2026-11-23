import type { Week } from '../types'
import { certificateChain } from './certificate-chain'
import { hashSignature } from './hash-signature'
import { httpVsHttps } from './http-vs-https'
import { securityMap } from './security-map'
import { symmetricPublicKey } from './symmetric-public-key'
import { tlsHandshake } from './tls-handshake'
import { tlsLimits } from './tls-limits'

export const w6: Week = {
  id: 'w6',
  no: 6,
  title: 'Authentication & Web Security',
  // TODO: 강의자료의 "오늘의 질문"과 Learning Objectives로 채우기
  question: 'Week 5의 API는 누구든 호출할 수 있었다 → 누가, 어떤 통로로, 무엇을 하는지 통제한다',
  objectives: [],
  source: 'Week06_Authentication_Web_Security_Revised.pdf',
  steps: [securityMap, httpVsHttps, symmetricPublicKey, hashSignature, certificateChain, tlsHandshake, tlsLimits],
}
