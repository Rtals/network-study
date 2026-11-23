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

/** p.15 Chrome 인증서 경고 */
export type CertError =
  | 'NET::ERR_CERT_DATE_INVALID'
  | 'NET::ERR_CERT_COMMON_NAME_INVALID'
  | 'NET::ERR_CERT_AUTHORITY_INVALID'
  | 'Mixed Content 차단'

/** 경고마다 원인과 조치 (p.15 표) */
export const CERT_ERROR_INFO: Record<CertError, { cause: string; fix: string }> = {
  'NET::ERR_CERT_DATE_INVALID': { cause: '인증서 만료 또는 PC 시계 오류', fix: '자동 갱신(certbot) 확인, 시계 동기화' },
  'NET::ERR_CERT_COMMON_NAME_INVALID': { cause: '주소와 인증서 SAN 불일치 (www 누락 등)', fix: 'SAN에 모든 도메인 포함해 재발급' },
  'NET::ERR_CERT_AUTHORITY_INVALID': { cause: '자체 서명(self-signed), 체인 누락', fix: '서버에 fullchain.pem 설정' },
  'Mixed Content 차단': { cause: 'HTTPS 페이지에서 http:// 리소스 호출', fix: '모든 리소스·API를 HTTPS로' },
}

export type Connection = {
  cert: CertInfo
  /** 주소창 호스트 */
  host: string
  /** 브라우저(PC 시계)의 오늘 날짜 YYYY-MM-DD */
  today: string
  /** 서버가 Intermediate까지 보냈고 Root가 Trust Store에 있는가 */
  chainComplete: boolean
  /** 페이지가 http:// 리소스를 부르는가 */
  loadsHttpResource: boolean
}

/** 브라우저가 띄울 경고 목록 (없으면 빈 배열). 6-5 검증 순서대로 */
export function diagnoseConnection(c: Connection): CertError[] {
  const errors: CertError[] = []
  if (!nameMatches(c.cert, c.host)) errors.push('NET::ERR_CERT_COMMON_NAME_INVALID')
  if (!isWithinValidity(c.cert, c.today)) errors.push('NET::ERR_CERT_DATE_INVALID')
  if (!c.chainComplete) errors.push('NET::ERR_CERT_AUTHORITY_INVALID')
  if (c.loadsHttpResource) errors.push('Mixed Content 차단')
  return errors
}

/** 정상 접속 예시 (p.11 인증서, 유효 기간 안의 날짜) */
export const OK_CONNECTION: Connection = {
  cert: INU_CERT,
  host: 'www.inu.ac.kr',
  today: '2026-11-11',
  chainComplete: true,
  loadsHttpResource: false,
}
