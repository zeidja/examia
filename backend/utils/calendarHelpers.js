import Class from '../models/Class.js';
import { teacherSeesClass } from './teacherClassAccess.js';

export function parseDateOnly(str) {
  if (!str || typeof str !== 'string') return null;
  const parts = str.trim().split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function eventInstantInRange(instant, rangeStart, rangeEnd) {
  const t = new Date(instant).getTime();
  return t >= rangeStart.getTime() && t <= rangeEnd.getTime();
}

export async function resolveUserSchoolId(user) {
  let schoolId = user.school?._id || user.school;
  const classId = user.class?._id || user.class;
  if (!schoolId && classId) {
    const cls = await Class.findById(classId).select('school').lean();
    if (cls) schoolId = cls.school;
  }
  return schoolId?.toString?.() || (schoolId ? String(schoolId) : null);
}

export function studentResourceFilter(user, schoolId) {
  const classId = user.class?._id || user.class;
  const filter = { published: true, school: schoolId };
  if (classId) {
    filter.$or = [{ class: classId }, { classes: classId }, { class: null }];
  } else {
    filter.class = null;
  }
  return filter;
}

/** Class ids this teacher may see school events for (whole-school events use class: null). */
export async function teacherVisibleClassIds(teacherId, schoolId) {
  const classes = await Class.find({ school: schoolId }).select('teachers').lean();
  return classes.filter((c) => teacherSeesClass(teacherId, c)).map((c) => c._id);
}

export function teacherResourceFilter(user, schoolId) {
  return {
    school: schoolId,
    createdBy: user._id,
    $or: [
      { deadline: { $ne: null } },
      { availabilityStart: { $ne: null } },
    ],
  };
}

const TYPE_LABELS = {
  quiz: 'Quiz',
  flash_cards: 'Flashcards',
  material: 'Material',
};

export function resourceToCalendarEntries(resource) {
  const entries = [];
  const rid = resource._id.toString();
  const subjectId = resource.subject?._id?.toString?.() || resource.subject?.toString?.() || null;
  const subjectName = resource.subject?.name || '';
  const label = TYPE_LABELS[resource.type] || 'Resource';

  if (resource.type === 'quiz' && resource.availabilityStart) {
    entries.push({
      id: `quiz-available-${rid}`,
      source: 'quiz',
      kind: 'quiz_available',
      title: `${label} opens: ${resource.title}`,
      description: resource.description || '',
      startAt: resource.availabilityStart,
      endAt: null,
      allDay: false,
      resourceId: rid,
      subjectId,
      subjectName,
      editable: false,
    });
  }

  if (resource.deadline) {
    const kind = resource.type === 'quiz' ? 'quiz_deadline' : resource.type === 'flash_cards' ? 'flash_deadline' : 'deadline';
    entries.push({
      id: `${resource.type}-deadline-${rid}`,
      source: resource.type,
      kind,
      title: `${label} due: ${resource.title}`,
      description: resource.description || '',
      startAt: resource.deadline,
      endAt: null,
      allDay: false,
      resourceId: rid,
      subjectId,
      subjectName,
      editable: false,
    });
  }

  return entries;
}

export function schoolEventToCalendarEntry(doc) {
  return {
    id: `school-event-${doc._id.toString()}`,
    source: 'school_event',
    kind: 'school_event',
    schoolEventId: doc._id.toString(),
    title: doc.title,
    description: doc.description || '',
    startAt: doc.startAt,
    endAt: doc.endAt || null,
    allDay: doc.allDay !== false,
    classId: doc.class ? String(doc.class._id || doc.class) : null,
    className: doc.class?.name ?? null,
    editable: true,
  };
}
