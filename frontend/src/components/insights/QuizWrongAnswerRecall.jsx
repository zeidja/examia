import { stripDuplicateMcqLetterPrefix } from '../../utils/format';
import { formatStudentChoicePercent } from '../../utils/insights';

/** Per-quiz recall flow for wrong answers in the bank. */
export function QuizWrongAnswerRecall({
  quizTitle,
  items,
  recallIndex,
  recallSelected,
  recallRevealed,
  onExit,
  onSelectOption,
  onNext,
}) {
  const item = items[recallIndex];
  const options = item?.options || [];
  const correctIndex = item?.correctIndex ?? 0;
  const isCorrect = recallSelected !== null && recallSelected === correctIndex;
  const correctPct = formatStudentChoicePercent(
    item?.optionPercents,
    correctIndex,
    item?.classAttemptCount
  );

  if (!item) return null;

  return (
    <div className="border-t border-examia-soft/30 p-4 bg-examia-soft/5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-examia-mid">
          Recall — {quizTitle} · Question {recallIndex + 1} of {items.length}
        </p>
        <button
          type="button"
          onClick={onExit}
          className="text-sm text-examia-mid hover:text-examia-dark font-medium"
        >
          Exit recall
        </button>
      </div>
      <div className="p-5 rounded-xl border-2 border-examia-soft/40 bg-white">
        <p className="font-medium text-examia-dark mb-4">{item.questionText || 'Question'}</p>
        {!recallRevealed ? (
          <div className="space-y-2">
            {options.map((opt, j) => (
              <button
                key={j}
                type="button"
                onClick={() => onSelectOption(j)}
                className="w-full text-left px-4 py-3 rounded-xl border-2 border-examia-soft/50 bg-white hover:border-examia-mid hover:bg-examia-soft/20 transition font-medium text-examia-dark"
              >
                {String.fromCharCode(65 + j)}. {stripDuplicateMcqLetterPrefix(opt, j)}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {options.map((opt, j) => {
                const pct = formatStudentChoicePercent(item.optionPercents, j, item.classAttemptCount);
                return (
                  <span
                    key={j}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      j === correctIndex
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : j === recallSelected
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-examia-soft/20 text-examia-dark border border-examia-soft/40'
                    }`}
                  >
                    {String.fromCharCode(65 + j)}. {stripDuplicateMcqLetterPrefix(opt, j)}
                    {j === correctIndex && ' ✓'}
                    {pct && <span className="font-normal opacity-90"> ({pct})</span>}
                  </span>
                );
              })}
            </div>
            <p className={`text-sm font-semibold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isCorrect ? 'Correct!' : 'Incorrect. Correct answer: '}
              {!isCorrect && (
                <>
                  {stripDuplicateMcqLetterPrefix(options[correctIndex] ?? '', correctIndex) || '—'}
                  {correctPct && <span className="font-normal text-emerald-700"> ({correctPct})</span>}
                </>
              )}
              {isCorrect && correctPct && (
                <span className="font-normal text-emerald-600"> ({correctPct})</span>
              )}
            </p>
            {item.rationale && (
              <p className="text-sm text-examia-dark pt-2 border-t border-examia-soft/30">{item.rationale}</p>
            )}
            <div className="pt-3 flex justify-end">
              {recallIndex < items.length - 1 ? (
                <button
                  type="button"
                  onClick={onNext}
                  className="px-4 py-2 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid transition"
                >
                  Next question
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onExit}
                  className="px-4 py-2 rounded-xl bg-examia-dark text-white font-medium hover:bg-examia-mid transition"
                >
                  Back to bank
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
