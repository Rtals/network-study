import { useEffect, useId, useState } from 'react'
import { StageFrame } from '../../../components/stage/StageFrame'
import { RotateCcw } from '../../../components/ui/icons'
import { bitDifference, hexDiffMask, sha256Hex, SHA256_BITS, shortHex } from '../../../lib/hash'
import { useStudyStore } from '../../../store/useStudyStore'

const DEFAULTS = { a: 'inu1234', b: 'inu1235' }

/** 16진수 64자리를 32자리씩 두 줄로, 다른 자리는 빨간 바탕 */
function HexView({ hex, diff, label }: { hex: string | null; diff: boolean[]; label: string }) {
  if (!hex) return <p className="m-0 h-[44px] text-[12px] text-faint">계산 중…</p>
  return (
    <p aria-label={`${label}의 SHA-256: ${hex}`} className="m-0 font-mono text-[13px] leading-[1.6] tracking-[0.04em] break-all">
      {[...hex].map((ch, i) => (
        <span key={i} className={diff[i] ? 'rounded-[3px] bg-[#f8d5cf] font-bold text-[#8f2a22]' : 'text-ink-2'}>
          {ch}
          {i === 31 && <br />}
        </span>
      ))}
    </p>
  )
}

/**
 * 6-4 직접 해보기: 두 입력의 실제 SHA-256을 나란히 보고, 한 글자 차이가 몇 비트를 바꾸는지 본다.
 * 계산은 브라우저 안(Web Crypto)에서만 하고 어디로도 보내지 않는다.
 */
export function HashSandbox() {
  const setEvents = useStudyStore((s) => s.setEvents)
  const [input, setInput] = useState(DEFAULTS)
  const [hash, setHash] = useState<{ a: string; b: string; for: string } | null>(null)
  const idA = useId()
  const idB = useId()
  const key = `${input.a}\u0000${input.b}`

  useEffect(() => {
    let alive = true
    Promise.all([sha256Hex(input.a), sha256Hex(input.b)]).then(([a, b]) => {
      if (alive) setHash({ a, b, for: key })
    })
    return () => {
      alive = false
    }
  }, [input.a, input.b, key])

  const ready = hash && hash.for === key ? hash : null
  const diff = ready ? hexDiffMask(ready.a, ready.b) : []
  const bits = ready ? bitDifference(ready.a, ready.b) : 0
  const percent = Math.round((bits / SHA256_BITS) * 100)

  useEffect(() => {
    if (!ready) return
    setEvents([
      `A "${input.a}" → ${shortHex(ready.a)}`,
      `B "${input.b}" → ${shortHex(ready.b)}`,
      bits === 0 ? '같은 입력 → 같은 해시' : `256비트 중 ${bits}비트 다름 (약 ${percent}%)`,
    ])
  }, [ready, input.a, input.b, bits, percent, setEvents])

  const field = (id: string, which: 'a' | 'b', label: string) => (
    <div className="flex flex-col gap-1.5 rounded-[10px] border border-line-strong bg-card px-3.5 py-3">
      <label htmlFor={id} className="text-[11.5px] font-bold text-muted">
        {label}
      </label>
      <input
        id={id}
        value={input[which]}
        onChange={(e) => setInput((s) => ({ ...s, [which]: e.target.value }))}
        spellCheck={false}
        className="h-9 rounded-lg border-[1.3px] border-ink-2 bg-white px-2.5 font-mono text-[14px] shadow-[0_1.5px_0_var(--color-ink-2)] outline-none focus:border-ink"
      />
      <HexView hex={ready ? ready[which] : null} diff={diff} label={label} />
    </div>
  )

  return (
    <div className="flex w-full flex-wrap items-start justify-center gap-4">
      <StageFrame className="flex-[999_1_480px]">
        <div className="absolute inset-0 flex flex-col gap-3 overflow-y-auto p-5">
          {field(idA, 'a', '입력 A')}
          {field(idB, 'b', '입력 B')}
          <div aria-live="polite" className="rounded-[10px] border border-line-strong bg-card px-3.5 py-3">
            <p className="m-0 text-[13px] font-bold">
              {!ready ? '계산 중…' : bits === 0 ? '두 해시가 같다: 같은 입력 → 항상 같은 출력' : `256비트 중 ${bits}비트가 다르다 (약 ${percent}%)`}
            </p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-ink-2 bg-zinc-100">
              <div className="h-full bg-[#e5534b] transition-[width] duration-500" style={{ width: `${percent}%` }} />
            </div>
            <p className="m-0 mt-2 text-[11.5px] text-muted">
              입력 길이와 상관없이 결과는 항상 16진수 64자리(256비트)다. 다른 자리는 빨간색으로 표시된다.
            </p>
          </div>
        </div>
      </StageFrame>

      <div className="flex w-full max-w-[300px] flex-[1_1_240px] flex-col gap-3 rounded-xl border border-line bg-card p-4">
        <p className="m-0 text-[13px] font-bold">해 볼 것</p>
        <ul className="m-0 flex list-disc flex-col gap-1.5 pl-4 text-[12.5px] leading-relaxed text-ink-2">
          <li>B를 A와 똑같이 바꿔 보기 → 해시가 완전히 같아진다</li>
          <li>한 글자만 바꿔 보기 → 비트의 절반 가까이가 바뀐다</li>
          <li>아주 긴 글을 붙여 넣기 → 그래도 64자리</li>
        </ul>
        <button type="button" onClick={() => setInput(DEFAULTS)} className="tool">
          <RotateCcw size={14} />
          처음 값으로
        </button>
        <p className="m-0 text-[11px] text-faint">해시는 이 컴퓨터 안에서만 계산하고, 입력을 어디로도 보내지 않습니다.</p>
      </div>
    </div>
  )
}
