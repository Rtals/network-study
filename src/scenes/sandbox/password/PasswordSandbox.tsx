import { useEffect, useId, useState } from 'react'
import { StageFrame } from '../../../components/stage/StageFrame'
import { RotateCcw } from '../../../components/ui/icons'
import { crackYears, pbkdf2Hex, randomSalt, saltedSha256Hex, sha256Hex, shortHex } from '../../../lib/hash'
import { useStudyStore } from '../../../store/useStudyStore'

/** 느린 해시 반복 횟수 (PBKDF2). 클수록 느리다 */
export const PBKDF2_ITERATIONS = 200_000

type Row = { method: string; verdict: '✕' | '△' | '○'; kim: string; lee: string; note: string }
type Result = { rows: Row[]; slowMs: number; key: string }

const VERDICT_STYLE = { '✕': 'bg-[#f8d5cf] text-[#8f2a22]', '△': 'bg-[#fbe5bd] text-[#6d4a0c]', '○': 'bg-green text-[#24521c]' }

/**
 * 6-10 직접 해보기: 비밀번호를 넣으면 저장 방식별로 DB에 무엇이 남는지 본다.
 * 느린 해시는 브라우저에 Argon2id가 없어서 같은 원리(Salt + 반복)의 PBKDF2로 실제 계산한다.
 * 계산은 이 컴퓨터 안에서만 하고 어디로도 보내지 않는다.
 */
export function PasswordSandbox() {
  const setEvents = useStudyStore((s) => s.setEvents)
  const [pw, setPw] = useState({ kim: 'inu1234', lee: 'inu1234' })
  const [salt, setSalt] = useState(() => ({ kim: randomSalt(), lee: randomSalt() }))
  const [result, setResult] = useState<Result | null>(null)
  const idKim = useId()
  const idLee = useId()
  const key = `${pw.kim}\u0000${pw.lee}\u0000${salt.kim}\u0000${salt.lee}`

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [hk, hl, sk, sl] = await Promise.all([
        sha256Hex(pw.kim),
        sha256Hex(pw.lee),
        saltedSha256Hex(salt.kim, pw.kim),
        saltedSha256Hex(salt.lee, pw.lee),
      ])
      const t0 = performance.now()
      const sk2 = await pbkdf2Hex(pw.kim, salt.kim, PBKDF2_ITERATIONS)
      const slowMs = performance.now() - t0
      const sl2 = await pbkdf2Hex(pw.lee, salt.lee, PBKDF2_ITERATIONS)
      if (!alive) return
      const s = (h: string) => shortHex(h, 6)
      setResult({
        key,
        slowMs,
        rows: [
          { method: '평문', verdict: '✕', kim: pw.kim, lee: pw.lee, note: 'DB 유출 = 계정 탈취' },
          { method: 'SHA-256', verdict: '△', kim: s(hk), lee: s(hl), note: '같은 비밀번호 = 같은 해시, 너무 빠름' },
          { method: 'Salt + SHA-256', verdict: '△', kim: `${salt.kim} · ${s(sk)}`, lee: `${salt.lee} · ${s(sl)}`, note: '해시는 달라지지만 여전히 빠름' },
          { method: '느린 해시 + Salt', verdict: '○', kim: `${salt.kim} · ${s(sk2)}`, lee: `${salt.lee} · ${s(sl2)}`, note: `한 번에 ${Math.round(slowMs)}ms` },
        ],
      })
    })()
    return () => {
      alive = false
    }
    // key가 모든 입력을 담는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const ready = result && result.key === key ? result : null
  const years = ready ? crackYears(ready.slowMs / 1000, 1e9) : 0

  useEffect(() => {
    if (!ready) return
    setEvents([
      ...ready.rows.map((r) => `${r.method}: kim ${r.kim} / lee ${r.lee}`),
      `느린 해시 한 번 ${Math.round(ready.slowMs)}ms → 10억 번 대입 ≈ ${years.toFixed(1)}년`,
    ])
  }, [ready, years, setEvents])

  const field = (id: string, who: 'kim' | 'lee') => (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-8 text-[12.5px] font-bold">
        {who}
      </label>
      <input
        id={id}
        aria-label={`${who} 비밀번호`}
        value={pw[who]}
        onChange={(e) => setPw((p) => ({ ...p, [who]: e.target.value }))}
        spellCheck={false}
        className="h-9 min-w-0 flex-1 rounded-lg border-[1.3px] border-ink-2 bg-white px-2.5 font-mono text-[14px] shadow-[0_1.5px_0_var(--color-ink-2)] outline-none"
      />
    </div>
  )

  return (
    <div className="flex w-full flex-wrap items-start justify-center gap-4">
      <StageFrame className="flex-[999_1_480px]">
        <div className="absolute inset-0 overflow-y-auto p-5">
          <p className="m-0 mb-2 text-[12px] font-bold text-muted">User DB에 저장되는 값</p>
          <table aria-label="저장 방식별 DB" className="w-full border-separate border-spacing-y-1.5 text-[12.5px]">
            <thead>
              <tr className="text-left text-[11px] text-muted">
                <th className="px-2 font-bold">저장 방식</th>
                <th className="px-2 font-bold">kim</th>
                <th className="px-2 font-bold">lee</th>
              </tr>
            </thead>
            <tbody>
              {(ready?.rows ?? []).map((r) => {
                const same = r.kim === r.lee
                return (
                  <tr key={r.method} className="bg-card">
                    <td className="rounded-l-lg border-y border-l border-line-strong px-2 py-2 align-top">
                      <span className={`mr-1.5 inline-grid size-5 place-items-center rounded-full text-[11px] font-extrabold ${VERDICT_STYLE[r.verdict]}`}>{r.verdict}</span>
                      <b>{r.method}</b>
                      <p className="m-0 mt-0.5 text-[11px] text-muted">{r.note}</p>
                    </td>
                    {[r.kim, r.lee].map((v, i) => (
                      <td
                        key={i}
                        className={`border-y border-line-strong px-2 py-2 align-top font-mono text-[12px] break-all ${i === 1 ? 'rounded-r-lg border-r' : ''} ${same && r.method !== '평문' ? 'text-[#8f2a22]' : ''}`}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!ready ? (
            <p className="m-0 text-[12px] text-faint">계산 중…</p>
          ) : (
            <p aria-live="polite" className="m-0 mt-2 rounded-[10px] border border-line-strong bg-card px-3 py-2 text-[12.5px]">
              느린 해시 한 번 <b>{Math.round(ready.slowMs)}ms</b> → 공격자가 10억 번 대입하려면 약 <b>{years.toFixed(1)}년</b>
            </p>
          )}
        </div>
      </StageFrame>

      <div className="flex w-full max-w-[300px] flex-[1_1_240px] flex-col gap-3 rounded-xl border border-line bg-card p-4">
        <p className="m-0 text-[13px] font-bold">비밀번호</p>
        {field(idKim, 'kim')}
        {field(idLee, 'lee')}
        <button type="button" onClick={() => setSalt({ kim: randomSalt(), lee: randomSalt() })} className="tool">
          <RotateCcw size={14} />
          Salt 새로 만들기
        </button>
        <ul className="m-0 flex list-disc flex-col gap-1 pl-4 text-[12px] leading-relaxed text-ink-2">
          <li>두 칸을 같게 두면 SHA-256 줄의 해시가 똑같다 (빨간 글자)</li>
          <li>Salt를 넣으면 같은 비밀번호라도 해시가 달라진다</li>
        </ul>
        <p className="m-0 text-[11px] text-faint">
          느린 해시는 브라우저에 Argon2id가 없어 같은 원리(Salt + {PBKDF2_ITERATIONS.toLocaleString()}번 반복)의 PBKDF2로 계산합니다. 입력은 어디로도 보내지 않습니다.
        </p>
      </div>
    </div>
  )
}
