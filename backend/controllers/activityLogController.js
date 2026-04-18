import ActivityLog from '../models/ActivityLog.js';
import User from '../models/User.js';
import { getVisibleStudentIdsForTeacher } from '../utils/teacherClassAccess.js';

const MAX_LIMIT = 100;
const ROLE_OPTIONS = new Set(['student', 'teacher', 'school_admin']);

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function simplifyDetail(row) {
  if (row.action === 'login') return 'Signed in';
  if (row.action === 'logout') return 'Signed out';
  const p = row.path || '';
  if (p.includes('quiz-attempt')) return 'Quiz';
  if (p.includes('flash-card-ratings')) return 'Flashcards';
  if (p.includes('lesson-notes')) return 'Lesson notes';
  if (p.includes('/ideas')) return 'Ideas';
  if (p.includes('/ai/')) return 'AI';
  if (p.includes('/resources') && p.includes('upload')) return 'Upload';
  if (p.includes('/resources')) return 'Library';
  if (p.includes('/users')) return 'Users';
  if (p.includes('/classes')) return 'Classes';
  const sum = (row.summary || '').replace(/^POST\s+|^PUT\s+|^PATCH\s+|^DELETE\s+/i, '');
  if (sum.length > 96) return `${sum.slice(0, 93)}…`;
  return sum || row.action || 'Activity';
}

function toSimpleEntry(row) {
  const actor = row.actor || {};
  return {
    id: row._id,
    at: row.createdAt,
    name: actor.name || row.actorName || '—',
    detail: simplifyDetail(row),
  };
}

function parseDayStart(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00.000Z` : iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDayEnd(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const d = new Date(iso.length <= 10 ? `${iso}T23:59:59.999Z` : iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const listActivityLogs = async (req, res) => {
  try {
    const role = req.user.role;
    if (!['school_admin', 'teacher'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const schoolId = req.user.school?._id || req.user.school;
    if (!schoolId) {
      return res.status(403).json({ success: false, message: 'No school on account' });
    }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(req.query.limit || '40'), 10) || 40));
    const skip = (page - 1) * limit;

    const search = String(req.query.search || '').trim();
    const roleFilter = String(req.query.actorRole || req.query.role || '').trim();
    const from = parseDayStart(String(req.query.from || ''));
    const to = parseDayEnd(String(req.query.to || ''));

    const filter = { school: schoolId };
    let studentIdsForTeacher = null;

    if (role === 'teacher') {
      studentIdsForTeacher = await getVisibleStudentIdsForTeacher(req.user._id, schoolId);
      if (studentIdsForTeacher.length === 0) {
        return res.json({
          success: true,
          logs: [],
          page,
          limit,
          total: 0,
          hasMore: false,
        });
      }
      filter.actor = { $in: studentIdsForTeacher };
    } else if (roleFilter && ROLE_OPTIONS.has(roleFilter)) {
      filter.actorRole = roleFilter;
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lte = to;
    }

    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      const nameClauses = [];

      if (role === 'teacher') {
        const matched = await User.find({
          _id: { $in: studentIdsForTeacher },
          name: rx,
        })
          .select('_id')
          .lean();
        const ids = matched.map((u) => u._id);
        if (ids.length) nameClauses.push({ actor: { $in: ids } });
        nameClauses.push({ actorName: rx });
        filter.$and = [...(filter.$and || []), { $or: nameClauses }];
      } else {
        const matched = await User.find({ school: schoolId, name: rx }).select('_id').lean();
        const ids = matched.map((u) => u._id);
        if (ids.length) nameClauses.push({ actor: { $in: ids } });
        nameClauses.push({ actorName: rx });
        filter.$and = [...(filter.$and || []), { $or: nameClauses }];
      }
    }

    const [rows, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actor', 'name email role')
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      logs: rows.map(toSimpleEntry),
      page,
      limit,
      total,
      hasMore: skip + rows.length < total,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load logs' });
  }
};
