/**
 * 6-5 인증서와 신뢰 체인 · 6-7 인증서 오류에서 쓰는 인증서 예시와 검사.
 * 실제 인증서를 읽거나 네트워크로 확인하지 않는다 (강의자료 예시 값으로 하는 계산).
 */

export type CertInfo = {
  /** Subject / SAN: 이 인증서가 보증하는 도메인 */
  san: string[]
  issuer: string
  /** Not Before / Not After (YYYY-MM-DD, 그날 하루 전체 포함) */
  notBefore: string
  notAfter: string
  publicKey: string
}

/** 강의자료 p.11 디지털 여권 예시 */
export const INU_CERT: CertInfo = {
  san: ['www.inu.ac.kr'],
  issuer: 'Sectigo RSA DV CA',
  notBefore: '2026-03-01',
  notAfter: '2027-03-31',
  publicKey: 'RSA 2048',
}

/** p.12 체인 예시 이름 */
export const CHAIN_EXAMPLE = {
  root: 'ISRG Root X1',
  intermediate: "Let's Encrypt R11",
} as const

/** 날짜(YYYY-MM-DD)가 유효 기간 안인가 — 브라우저 검증 ② (PC 시계 기준) */
export function isWithinValidity(cert: Pick<CertInfo, 'notBefore' | 'notAfter'>, date: string): boolean {
  return cert.notBefore <= date && date <= cert.notAfter
}

/** 주소창 호스트가 인증서 이름(SAN) 중 하나와 같은가 — 브라우저 검증 ① (대소문자 무시, *. 와일드카드는 한 단계만) */
export function nameMatches(cert: Pick<CertInfo, 'san'>, host: string): boolean {
  const h = host.toLowerCase()
  return cert.san.some((name) => {
    const n = name.toLowerCase()
    if (!n.startsWith('*.')) return n === h
    const rest = n.slice(1) // ".inu.ac.kr"
    return h.endsWith(rest) && !h.slice(0, -rest.length).includes('.') && h.length > rest.length
  })
}
