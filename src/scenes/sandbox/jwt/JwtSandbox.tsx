import { useEffect, useId, useState } from 'react'
import { StageFrame } from '../../../components/stage/StageFrame'
import { RotateCcw } from '../../../components/ui/icons'
import { decodePart, DEMO_SECRET, encodePart, expToKst, LECTURE_PAYLOAD, signHS256, verifyHS256, type VerifyResult } from '../../../lib/jwt'
import { useStudyStore } from '../../../store/useStudyStore'

/** 서버의 "지금" 시각: 예시 토큰 만료 10분 전 (오늘 날짜와 상관없이 같은 결과가 나오게) */
const NOW = LECTURE_PAYLOAD.exp - 600

const PART_STYLE = ['text-[#b0582a]', 'text-[#5a43a6]', 'text-[#1f63a0]'] as const
const PART_NAME = ['Header', 'Payload', 'Signature'] as const

const REASON_TEXT: Record<Exclude<VerifyResult, { ok: true }>['reason'], string> = {
  'invalid format': '형식이 틀렸다 (세 덩어리가 아니거나 Payload가 JSON이 아님)',
  'invalid token': '서명 불일치 → 위조 또는 변조',
  'token expired': '만료 (exp가 지났다)',
}

/**
 * 6-14 직접 해보기: JWT를 해부하고, Payload를 고쳐 서버 검증이 어떻게 되는지 본다.
 * 연습용 비밀키로 실제 HS256 서명을 만든다. 계산은 브라우저 안에서만 한다.
 */
export function JwtSandbox() {
  const setEvents = useStudyStore((s) => s.setEvents)
  const [token, setToken] = useState<string | null>(null)
  const [payloadText, setPayloadText] = useState(JSON.stringify(LECTURE_PAYLOAD))
  const [result, setResult] = useState<VerifyResult | null>(null)
  const payloadId = useId()

  // 처음: 서버가 발급한 정상 토큰
  const issue = async (payload: object) => {
    const t = await signHS256(payload)
    setToken(t)
    setPayloadText(JSON.stringify(payload))
  }
  useEffect(() => {
    let alive = true
    signHS256(LECTURE_PAYLOAD).then((t) => alive && setToken(t))
    return () => {
      alive = false
    }
  }, [])

  // 화면의 Payload를 고치면: 서명은 그대로 두고 앞 두 덩어리만 다시 조립 (공격자가 하는 일)
  const parts = token?.split('.') ?? []
  let forged: string | null = null
  let jsonError = false
  if (token) {
    try {
      forged = `${parts[0]}.${encodePart(JSON.parse(payloadText))}.${parts[2]}`
    } catch {
      jsonError = true
    }
  }
  const shown = forged ?? token

  useEffect(() => {
    let alive = true
    if (!shown) return
    verifyHS256(shown, NOW).then((r) => alive && setResult(r))
    return () => {
      alive = false
    }
  }, [shown])

  useEffect(() => {
    if (!shown || !result) return
    const [h, p] = shown.split('.')
    setEvents([
      `Header 디코딩: ${decodePart(h)}`,
      `Payload 디코딩: ${decodePart(p)}`,
      result.ok ? '서버 검증: 서명 일치 · 만료 전 → 200 통과' : `서버 검증: ${REASON_TEXT[result.reason]} → 401`,
    ])
  }, [shown, result, setEvents])

  const reissue = () => {
    try {
      issue(JSON.parse(payloadText))
    } catch {
      /* JSON이 틀리면 무시 */
    }
  }

  return (
    <div className="flex w-full flex-wrap items-start justify-center gap-4">
      <StageFrame className="flex-[999_1_480px]">
        <div className="absolute inset-0 flex flex-col gap-3 overflow-y-auto p-5">
          <div className="rounded-[10px] border border-line-strong bg-card px-3.5 py-3">
            <p className="m-0 mb-1 text-[11.5px] font-bold text-muted">토큰 (header.payload.signature)</p>
            <p aria-label="JWT 토큰" className="m-0 font-mono text-[12.5px] leading-[1.6] break-all">
              {(shown ?? '…').split('.').map((s, i) => (
                <span key={i}>
                  {i > 0 && <b className="text-ink">.</b>}
                  <span className={PART_STYLE[i]}>{s}</span>
                </span>
              ))}
            </p>
          </div>
          {shown && (
            <div className="grid gap-2 sm:grid-cols-2">
              {shown
                .split('.')
                .slice(0, 2)
                .map((s, i) => (
                  <div key={i} className="rounded-[10px] border border-line-strong bg-card px-3 py-2">
                    <p className={`m-0 text-[11px] font-bold ${PART_STYLE[i]}`}>{PART_NAME[i]} 디코딩 (누구나 가능)</p>
                    <p className="m-0 font-mono text-[12px] break-all">{decodePart(s)}</p>
                  </div>
                ))}
            </div>
          )}
          {result && (
            <div
              aria-live="polite"
              className={`rounded-[10px] border px-3.5 py-3 text-[13px] ${result.ok ? 'border-[#c9d6b3] bg-green-tile' : 'border-[#ebbcb3] bg-rose-tile'}`}
            >
              <p className="m-0 font-bold">{result.ok ? '서버 검증 통과 → 200 OK' : `401 Unauthorized · ${REASON_TEXT[result.reason]}`}</p>
              <p className="m-0 mt-1 text-[12px] text-ink-2">
                서버는 header.payload를 자기 비밀키로 다시 서명해 Signature와 비교하고, exp를 확인한다. (서버 시각: {expToKst(NOW)})
              </p>
            </div>
          )}
        </div>
      </StageFrame>

      <div className="flex w-full max-w-[300px] flex-[1_1_240px] flex-col gap-3 rounded-xl border border-line bg-card p-4">
        <label htmlFor={payloadId} className="text-[13px] font-bold">
          Payload 고치기
        </label>
        <textarea
          id={payloadId}
          value={payloadText}
          onChange={(e) => setPayloadText(e.target.value)}
          spellCheck={false}
          rows={4}
          className="resize-y rounded-lg border-[1.3px] border-ink-2 bg-white px-2.5 py-2 font-mono text-[12.5px] shadow-[0_1.5px_0_var(--color-ink-2)] outline-none"
        />
        {jsonError && <p className="m-0 text-[11.5px] font-bold text-[#8f2a22]">JSON 형식이 아니다</p>}
        <div className="flex flex-col gap-1.5">
          <button type="button" onClick={() => setPayloadText(JSON.stringify({ ...LECTURE_PAYLOAD, role: 'professor' }))} className="tool">
            role을 professor로 (변조)
          </button>
          <button type="button" onClick={() => setPayloadText(JSON.stringify({ ...LECTURE_PAYLOAD, exp: NOW - 60 }))} className="tool">
            exp를 과거로
          </button>
          <button type="button" onClick={reissue} className="tool is-on">
            비밀키를 아는 서버가 다시 발급
          </button>
          <button type="button" onClick={() => issue(LECTURE_PAYLOAD)} className="tool">
            <RotateCcw size={14} />
            처음 토큰으로
          </button>
        </div>
        <p className="m-0 text-[11px] text-faint">
          연습용 비밀키("{DEMO_SECRET}")로 서명합니다. 계산은 이 컴퓨터 안에서만 하고 어디로도 보내지 않습니다. 실제 운영 토큰은 외부 사이트에 붙여 넣지 마세요.
        </p>
      </div>
    </div>
  )
}
