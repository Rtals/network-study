import { useEffect, useId, useMemo, useState } from 'react'
import { StageFrame } from '../../../components/stage/StageFrame'
import {
  INITIAL_RTO_MS,
  MAX_SYN_RETRIES,
  connectionCost,
  formatMs,
  simulateHandshake,
  type HandshakeKind,
} from '../../../lib/handshake'
import { useStudyStore } from '../../../store/useStudyStore'
import { protocolColors } from '../../../theme'
import { SequenceDiagram } from '../../sequence/SequenceDiagram'
import { KIND_LABEL, toHandshakeSequence } from './toSequence'

const KINDS: HandshakeKind[] = ['syn', 'synAck', 'ack']
const NO_LOSS: Record<HandshakeKind, boolean> = { syn: false, synAck: false, ack: false }

/** 3-4 직접 해보기: 메시지 손실 → RTO 재전송 → 백오프 → Connection timed out */
export function HandshakeSandbox() {
  const setEvents = useStudyStore((s) => s.setEvents)
  const speed = useStudyStore((s) => s.speed)
  const [rtt, setRtt] = useState(30)
  const [lose, setLose] = useState(NO_LOSS)
  const [block, setBlock] = useState(false)
  const rttId = useId()
  const blockId = useId()

  const result = useMemo(() => simulateHandshake({ rttMs: rtt, loseFirst: lose, blockSyn: block }), [rtt, lose, block])
  const state = useMemo(() => toHandshakeSequence(result), [result])
  const costs = connectionCost(rtt)
  const maxCost = Math.max(...costs.map((c) => c.ms))
  // RTT만 바뀌면 다시 재생하지 않는다
  const replayKey = `${lose.syn}-${lose.synAck}-${lose.ack}-${block}`

  useEffect(() => {
    setEvents(result.events.map((e) => `${formatMs(e.at)} · ${e.text}`))
  }, [result, setEvents])

  const toggle = (kind: HandshakeKind) => {
    if (kind === 'syn' && block) return setBlock(false)
    setLose((l) => ({ ...l, [kind]: !l[kind] }))
  }
  const reset = () => {
    setLose(NO_LOSS)
    setBlock(false)
    setRtt(30)
  }

  return (
    <div className="flex w-full flex-wrap items-start justify-center gap-4">
      <StageFrame className="flex-[999_1_480px]">
        <SequenceDiagram state={state} speed={speed} playKey={replayKey} />
      </StageFrame>

      <div className="flex w-full max-w-[300px] flex-[1_1_240px] flex-col gap-4 rounded-xl border border-line bg-card p-4">
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-[13px] font-bold">첫 전송을 손실시킬 메시지</legend>
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => {
              const on = lose[k] || (k === 'syn' && block)
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(k)}
                  className={`tool h-9 ${on ? '!bg-[#f8d5cf] text-[#8f2a22]' : ''}`}
                >
                  {on ? '✕ ' : ''}
                  {KIND_LABEL[k]}
                </button>
              )
            })}
          </div>
          <label htmlFor={blockId} className="mt-1 flex min-h-10 cursor-pointer items-center gap-2 text-[13px]">
            <input id={blockId} type="checkbox" checked={block} onChange={(e) => setBlock(e.target.checked)} className="size-4" />
            SYN 계속 손실 (방화벽 차단)
          </label>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={rttId} className="flex justify-between text-[13px]">
            <span className="font-bold">RTT</span>
            <span className="font-mono font-semibold">{rtt}ms</span>
          </label>
          <input id={rttId} type="range" min={10} max={300} step={10} value={rtt} onChange={(e) => setRtt(Number(e.target.value))} />
        </div>

        <div className="rounded-[10px] border border-line-strong bg-surface p-3 text-[12.5px]" aria-live="polite">
          {result.outcome === 'established' ? (
            <>
              <p className="m-0 font-bold text-green-800">연결 수립: {formatMs(result.clientEstablishedAt ?? 0)}</p>
              <p className="m-0 mt-1 text-xs text-muted">
                Client 기준 · Server ESTABLISHED {formatMs(result.serverEstablishedAt ?? 0)}
              </p>
            </>
          ) : (
            <>
              <p className="m-0 font-bold text-red-700">Connection timed out ({formatMs(result.totalMs)})</p>
              <p className="m-0 mt-1 text-xs text-muted">SYN에 대한 응답이 아예 없다 (p.36)</p>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="m-0 text-xs text-muted">이 RTT에서 연결 수립 비용 (p.11)</p>
          {costs.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-xs">
              <span className="w-[92px] shrink-0">{c.label}</span>
              <div className="h-2 flex-1 rounded bg-zinc-100">
                <div
                  className="h-2 rounded"
                  style={{
                    width: `${(c.ms / maxCost) * 100}%`,
                    background: c.id === 'quic' ? protocolColors.udp.fg : c.cryptoRtt ? protocolColors.tls.fg : protocolColors.tcp.fg,
                  }}
                />
              </div>
              <span className="w-12 shrink-0 text-right font-mono">{formatMs(c.ms)}</span>
            </div>
          ))}
        </div>

        <button type="button" onClick={reset} className="tool">
          초기화
        </button>
        <p className="m-0 text-[11px] leading-relaxed text-muted">
          RTO 초기값 {formatMs(INITIAL_RTO_MS)}, 재전송 {MAX_SYN_RETRIES}회 후 포기는 이해를 돕기 위해 단순화한 값입니다 (강의자료 외 보충).
        </p>
      </div>
    </div>
  )
}
