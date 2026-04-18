import ActivityLog from '../models/ActivityLog.js';

/**
 * Persist a school-scoped activity row. Swallows errors so logging never breaks requests.
 */
export async function recordActivity({
  schoolId,
  actorId,
  actorRole,
  actorName = '',
  action = 'event',
  summary = '',
  method = '',
  path = '',
  statusCode = null,
  meta = null,
}) {
  if (!schoolId || !actorId || !actorRole) return;
  try {
    await ActivityLog.create({
      school: schoolId,
      actor: actorId,
      actorRole,
      actorName: String(actorName || '').slice(0, 200),
      action,
      summary: String(summary || '').slice(0, 500),
      method: String(method || '').slice(0, 16),
      path: String(path || '').slice(0, 500),
      statusCode,
      meta,
    });
  } catch (err) {
    console.error('recordActivity', err.message);
  }
}
