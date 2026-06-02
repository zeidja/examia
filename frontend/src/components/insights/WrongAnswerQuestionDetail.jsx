import { stripDuplicateMcqLetterPrefix } from '../../utils/format';
import { formatStudentChoicePercent } from '../../utils/insights';

/** Expanded wrong-answer row: your answer, correct answer with class %, options breakdown. */
export function WrongAnswerQuestionDetail({ item }) {
  const correctOption =
    item.options && item.options[item.correctIndex] != null
      ? stripDuplicateMcqLetterPrefix(item.options[item.correctIndex], item.correctIndex)
      : '';
  const selectedOption =
    item.selectedIndex >= 0 && item.options && item.options[item.selectedIndex] != null
      ? stripDuplicateMcqLetterPrefix(item.options[item.selectedIndex], item.selectedIndex)
      : '(not answered)';
  const correctPct = formatStudentChoicePercent(
    item.optionPercents,
    item.correctIndex,
    item.classAttemptCount
  );

  return (
    <div className="px-4 pb-4 pt-0 space-y-3 border-t border-examia-soft/20 bg-examia-soft/5">
      <div>
        <p className="text-xs font-semibold text-examia-mid uppercase tracking-wider mb-1">Your answer</p>
        <p className="text-sm text-rose-700 font-medium">{selectedOption || '—'}</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-examia-mid uppercase tracking-wider mb-1">Correct answer</p>
        <p className="text-sm text-emerald-700 font-medium">
          {correctOption || '—'}
          {correctPct && (
            <span className="text-emerald-600/90 font-normal ml-1.5">({correctPct})</span>
          )}
        </p>
      </div>
      {item.rationale && (
        <div>
          <p className="text-xs font-semibold text-examia-mid uppercase tracking-wider mb-1">Explanation</p>
          <p className="text-sm text-examia-dark">{item.rationale}</p>
        </div>
      )}
      {item.options?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-examia-mid uppercase tracking-wider mb-1">All options</p>
          <ul className="text-sm text-examia-dark list-disc list-inside space-y-0.5">
            {item.options.map((opt, j) => {
              const pct = formatStudentChoicePercent(item.optionPercents, j, item.classAttemptCount);
              return (
                <li
                  key={j}
                  className={
                    j === item.correctIndex
                      ? 'text-emerald-700 font-medium'
                      : j === item.selectedIndex
                        ? 'text-rose-600'
                        : ''
                  }
                >
                  {String.fromCharCode(65 + j)}. {stripDuplicateMcqLetterPrefix(opt, j)}
                  {pct && <span className="text-examia-mid font-normal"> ({pct})</span>}
                  {j === item.correctIndex && ' ✓'}
                  {j === item.selectedIndex && j !== item.correctIndex && ' (your choice)'}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
