import { useEffect, useMemo, useState } from 'react'
import { StageFrame } from '../../../components/stage/StageFrame'
import { buildSample, SAMPLE_TOKENS, STAGE_LABEL, VERIFY_STAGES, verifyPipeline, type PipelineResult, type SampleId } from '../../../lib/jwt'
import { useStudyStore } from '../../../store/useStudyStore'
import { TopologyDiagram } from '../../topology/TopologyDiagram'
import { verifyBeats, verifyState } from './scenario'

const IDS = Object.keys(SAMPLE_TOKENS) as SampleId[]

/**
 * 6-15 직접 해보기: 검증기. 토큰을 고르면 서버의 검증 순서를 따라 어느 검문소에서 멈추는지 본다.
 * "decode만 하는 서버"로 바꾸면 모두 통과해 버린다. 실제 HS256 계산(연습용 비밀키), 요청은 보내지 않는다.
 */
export function JwtVerifySandbox() {
  const setEvents = useStudyStore((s) => s.setEvents)
  const speed = useStudyStore((s) => s.speed)
  const [id, setId] = useState<SampleId>('valid')
  const [decodeOnly, setDecodeOnly] = useState(false)
  const [res, setRes] = useState<{ key: string; token: string; result: PipelineResult } | null>(null)
  const key = `${id}-${decodeOnly}`

  useEffect(() => {
    let alive = true
    buildSample(id).then(async (token) => {
      const result = await verifyPipeline(token, { decodeOnly })
      if (alive) setRes({ key, token, result })
    })
    return () => {
      alive = false
    }
  }, [id, decodeOnly, key])

  const ready = res && res.key === key ? res : null
  const state = useMemo(
    () =>
      verifyState(
        ready
          ? verifyBeats({
              stop: ready.result.stop,
              reason: ready.result.reason,
              label: SAMPLE_TOKENS[id].title,
              detail: decodeOnly ? 'decode만 하는 서버' : undefined,
              role: String(ready.result.payload?.role ?? 'student'),
              decodeOnly,
            })
          : [],
      ),
    [ready, id, decodeOnly],
  )

  useEffect(() => {
    if (!ready) return
    const { stop, reason } = ready.result
    setEvents([
      `${SAMPLE_TOKENS[id].title}${decodeOnly ? ' · decode만 하는 서버' : ''}`,
      stop === 'pass' ? `모든 검문소 통과 → 인가 (role: ${String(ready.result.payload?.role)})` : `${STAGE_LABEL[stop]}에서 멈춤: ${reason} → 401`,
    ])
  }, [ready, id, decodeOnly, setEvents])

  const stopIndex = ready ? (ready.result.stop === 'pass' ? VERIFY_STAGES.length : VERIFY_STAGES.indexOf(ready.result.stop)) : -1

  return (
    <div className="flex w-full flex-wrap items-start justify-center gap-4">
      <StageFrame className="flex-[999_1_480px]">
        <TopologyDiagram state={state} speed={speed} playKey={key} />
      </StageFrame>

      <div className="flex w-full max-w-[300px] flex-[1_1_240px] flex-col gap-4 rounded-xl border border-line bg-card p-4">
        <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
          <legend className="mb-2 p-0 text-[13px] font-bold">토큰 고르기</legend>
          {IDS.map((s) => (
            <button key={s} type="button" aria-pressed={id === s} onClick={() => setId(s)} className="tool justify-start">
              {SAMPLE_TOKENS[s].title}
            </button>
          ))}
        </fieldset>
        <button type="button" aria-pressed={decodeOnly} onClick={() => setDecodeOnly((v) => !v)} className={`tool ${decodeOnly ? '!bg-[#f8d5cf] text-[#8f2a22]' : ''}`}>
          decode만 하는 서버 {decodeOnly ? '(켜짐)' : ''}
        </button>

        <ol aria-label="검문소 결과" aria-live="polite" className="m-0 flex list-none flex-col gap-1 p-0 text-[12px]">
          {VERIFY_STAGES.map((s, i) => {
            const state = !ready ? '…' : decodeOnly ? '건너뜀' : i < stopIndex ? '✓' : i === stopIndex ? '✕' : '—'
            const color = state === '✓' ? 'text-[#24521c]' : state === '✕' ? 'text-[#8f2a22]' : state === '건너뜀' ? 'text-[#6d4a0c]' : 'text-faint'
            return (
              <li key={s} className="flex justify-between rounded-md border border-line bg-white px-2.5 py-1">
                <span>{STAGE_LABEL[s]}</span>
                <b className={color}>{state}</b>
              </li>
            )
          })}
        </ol>
        {ready && (
          <p className={`m-0 rounded-[10px] border px-3 py-2 text-[12.5px] font-bold ${ready.result.stop === 'pass' && !(decodeOnly && id !== 'valid') ? 'border-[#c9d6b3] bg-green-tile' : 'border-[#ebbcb3] bg-rose-tile'}`}>
            {ready.result.stop === 'pass'
              ? decodeOnly && id !== 'valid'
                ? `검증 없이 통과 → 위험! (${SAMPLE_TOKENS[id].title})`
                : '모든 검문소 통과 → 인가로'
              : `${STAGE_LABEL[ready.result.stop]}에서 멈춤 → 401`}
          </p>
        )}
        <p className="m-0 text-[11px] text-faint">연습용 비밀키로 실제 HS256 서명·검증을 계산합니다. 요청은 보내지 않습니다.</p>
      </div>
    </div>
  )
}
