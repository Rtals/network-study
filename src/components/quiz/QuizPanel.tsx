import { useId, useState } from 'react'
import type { Quiz } from '../../content/types'

/** Step 마지막 체크 질문. 결과 저장과 오답 노트 연동은 M6에서 붙인다. */
export function QuizPanel({ quiz }: { quiz: Quiz[] }) {
  return (
    <div className="flex flex-col gap-6">
      {quiz.map((item, i) => (
        <QuizItem key={i} item={item} index={i} total={quiz.length} />
      ))}
    </div>
  )
}

function QuizItem({ item, index, total }: { item: Quiz; index: number; total: number }) {
  const [picked, setPicked] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [draft, setDraft] = useState('')
  const textId = useId()
  const showAnswer = item.choices ? picked !== null : revealed

  return (
    <section className="flex flex-col gap-3">
      <p className="m-0 text-xs text-muted">
        체크 질문 {index + 1} / {total}
      </p>
      <h3 className="m-0 text-[16px] leading-relaxed font-bold">{item.q}</h3>

      {item.choices ? (
        <div className="flex flex-col gap-2">
          {item.choices.map((c) => {
            const isPicked = picked === c
            const correct = c === item.answer
            const tone = !isPicked
              ? 'border-line hover:bg-zinc-50'
              : correct
                ? 'border-green-600 bg-green-50 text-green-800'
                : 'border-red-600 bg-red-50 text-red-800'
            return (
              <button
                key={c}
                type="button"
                aria-pressed={isPicked}
                onClick={() => setPicked(c)}
                className={`min-h-11 rounded-lg border px-3 py-2 text-left text-[13.5px] ${tone}`}
              >
                {c}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label htmlFor={textId} className="text-xs text-muted">
            주관식 · 본인 말로 써 보기
          </label>
          <textarea
            id={textId}
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="답을 적고 모범답안과 비교해 보세요"
            className="w-full resize-y rounded-lg border border-zinc-300 px-3 py-2.5 text-[13.5px] leading-relaxed"
          />
          {!revealed && (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="h-11 rounded-lg bg-accent text-sm font-bold text-white hover:bg-blue-800"
            >
              모범답안 보기
            </button>
          )}
        </div>
      )}

      {showAnswer && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-line bg-zinc-50 p-3.5 text-[13.5px] leading-relaxed">
          {item.choices && (
            <p className={`m-0 font-bold ${picked === item.answer ? 'text-green-700' : 'text-red-700'}`}>
              {picked === item.answer ? '정답' : `오답 · 정답은 ${item.answer}`}
            </p>
          )}
          {!item.choices && (
            <p className="m-0">
              <span className="font-bold">모범답안 </span>
              {item.answer}
            </p>
          )}
          <p className="m-0 text-muted">{item.why}</p>
        </div>
      )}
    </section>
  )
}
