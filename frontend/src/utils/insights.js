/** Group flat wrong-answer rows by quiz resource. */
export function groupWrongAnswersByQuiz(wrongAnswerBank) {
  const map = new Map();
  for (const item of wrongAnswerBank || []) {
    const id = item.resourceId || item.resourceTitle || 'unknown';
    if (!map.has(id)) {
      map.set(id, {
        resourceId: id,
        title: item.resourceTitle || 'Quiz',
        items: [],
      });
    }
    map.get(id).items.push(item);
  }
  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
}

export function wrongAnswerItemKey(item) {
  return `${item.resourceId ?? 'q'}-${item.questionIndex ?? 0}`;
}

/** e.g. "62% of students" when class peers attempted this question. */
export function formatStudentChoicePercent(optionPercents, optionIndex, classAttemptCount) {
  if (!classAttemptCount || !optionPercents || optionPercents[optionIndex] == null) return null;
  return `${optionPercents[optionIndex]}% of students`;
}
