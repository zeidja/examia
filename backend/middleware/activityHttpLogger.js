import { recordActivity } from '../utils/recordActivity.js';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * After the response is sent, record mutating API calls for users tied to a school.
 * Login is logged separately in authController (no req.user yet).
 */
export function attachActivityHttpLogger(req, res, next) {
  res.on('finish', () => {
    if (!MUTATING.has(req.method)) return;
    const rawPath = req.originalUrl || req.url || '';
    const path = rawPath.split('?')[0] || rawPath;
    if (path.includes('/api/auth/logout')) return;
    const u = req.user;
    if (!u) return;
    const schoolId = u.school?._id || u.school;
    if (!schoolId) return;
    void recordActivity({
      schoolId,
      actorId: u._id,
      actorRole: u.role,
      actorName: u.name,
      action: 'api',
      summary: `${req.method} ${path}${res.statusCode >= 400 ? ` (${res.statusCode})` : ''}`,
      method: req.method,
      path,
      statusCode: res.statusCode,
    });
  });
  next();
}
