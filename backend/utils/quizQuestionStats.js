import User from '../models/User.js';

/** Students in the same school (and class when set) for peer quiz stats. */
export async function getClassmateStudentIds(schoolId, classId) {
  if (!schoolId) return [];
  const filter = { role: 'student', school: schoolId };
  if (classId) filter.class = classId;
  const users = await User.find(filter).select('_id').lean();
  return users.map((u) => u._id);
}

/** Aggregate % of students who chose each option, per question per quiz resource. */
export function buildQuizQuestionStatsFromAttempts(allAttempts) {
  const byResource = {};
  for (const a of allAttempts) {
    const rid = (a.resource?._id || a.resource)?.toString?.() || String(a.resource);
    if (!rid) continue;
    if (!byResource[rid]) byResource[rid] = {};
    for (const r of a.results || []) {
      const qIdx = r.questionIndex;
      if (!byResource[rid][qIdx]) {
        byResource[rid][qIdx] = { optionCounts: [], total: 0 };
      }
      const bucket = byResource[rid][qIdx];
      const numOptions = Math.max(
        r.options?.length || 0,
        (r.correctIndex ?? 0) + 1,
        r.selectedIndex >= 0 ? r.selectedIndex + 1 : 0,
        1
      );
      while (bucket.optionCounts.length < numOptions) bucket.optionCounts.push(0);
      if (r.selectedIndex >= 0) {
        bucket.total += 1;
        bucket.optionCounts[r.selectedIndex] += 1;
      }
    }
  }
  const formatted = {};
  for (const [rid, questions] of Object.entries(byResource)) {
    formatted[rid] = {};
    for (const [qIdx, { optionCounts, total }] of Object.entries(questions)) {
      formatted[rid][qIdx] = {
        totalAttempts: total,
        optionPercents: optionCounts.map((c) => (total > 0 ? Math.round((c / total) * 100) : 0)),
      };
    }
  }
  return formatted;
}

export function getQuestionStats(stats, resourceId, questionIndex) {
  return stats?.[resourceId]?.[questionIndex] ?? null;
}
