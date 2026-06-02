import mongoose from 'mongoose';
import SchoolEvent from '../models/SchoolEvent.js';
import TeacherResource from '../models/TeacherResource.js';
import Class from '../models/Class.js';
import '../models/Subject.js';
import {
  parseDateOnly,
  endOfDay,
  eventInstantInRange,
  resolveUserSchoolId,
  studentResourceFilter,
  teacherResourceFilter,
  teacherVisibleClassIds,
  resourceToCalendarEntries,
  schoolEventToCalendarEntry,
} from '../utils/calendarHelpers.js';

function isValidObjectId(id) {
  return id && typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

/** GET /calendar?from=YYYY-MM-DD&to=YYYY-MM-DD — students, teachers & school admins. */
export const getCalendar = async (req, res) => {
  try {
    if (!['student', 'school_admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Calendar is not available for this role' });
    }
    const fromStr = req.query.from;
    const toStr = req.query.to;
    const rangeStart = parseDateOnly(fromStr);
    const rangeEnd = endOfDay(parseDateOnly(toStr) || rangeStart);
    if (!rangeStart || !rangeEnd) {
      return res.status(400).json({ success: false, message: 'from and to query params (YYYY-MM-DD) are required' });
    }

    const schoolId = await resolveUserSchoolId(req.user);
    if (!schoolId) {
      return res.json({ success: true, events: [] });
    }

    const classId = req.user.class?._id || req.user.class;
    const eventFilter = {
      school: schoolId,
      startAt: { $gte: rangeStart, $lte: rangeEnd },
    };
    if (req.user.role === 'student' && classId) {
      eventFilter.$or = [{ class: null }, { class: classId }];
    } else if (req.user.role === 'teacher') {
      const visibleClassIds = await teacherVisibleClassIds(req.user._id, schoolId);
      const eventScope = [{ class: null }];
      if (visibleClassIds.length > 0) {
        eventScope.push({ class: { $in: visibleClassIds } });
      }
      eventFilter.$or = eventScope;
    }

    let resourceFilter;
    if (req.user.role === 'school_admin') {
      resourceFilter = { published: true, school: schoolId };
    } else if (req.user.role === 'teacher') {
      resourceFilter = teacherResourceFilter(req.user, schoolId);
    } else {
      resourceFilter = studentResourceFilter(req.user, schoolId);
    }

    const [schoolEvents, resources] = await Promise.all([
      SchoolEvent.find(eventFilter)
        .populate('class', 'name')
        .sort({ startAt: 1 })
        .lean(),
      TeacherResource.find(resourceFilter)
        .populate('subject', 'name')
        .select('title description type deadline availabilityStart subject published')
        .lean(),
    ]);

    const entries = [];
    for (const ev of schoolEvents) {
      entries.push(schoolEventToCalendarEntry(ev));
    }
    for (const r of resources) {
      for (const entry of resourceToCalendarEntries(r)) {
        if (eventInstantInRange(entry.startAt, rangeStart, rangeEnd)) {
          entries.push(entry);
        }
      }
    }

    entries.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));

    return res.json({ success: true, events: entries, from: fromStr, to: toStr });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load calendar' });
  }
};

/** POST /calendar/events — school admin only. */
export const createSchoolEvent = async (req, res) => {
  try {
    if (req.user.role !== 'school_admin') {
      return res.status(403).json({ success: false, message: 'Only school admins can create calendar events' });
    }
    const schoolId = await resolveUserSchoolId(req.user);
    if (!schoolId) {
      return res.status(403).json({ success: false, message: 'School admin must belong to a school' });
    }

    const { title, description, startAt, endAt, allDay, classId } = req.body || {};
    if (!title?.trim() || !startAt) {
      return res.status(400).json({ success: false, message: 'title and startAt are required' });
    }

    let classRef = null;
    if (classId) {
      if (!isValidObjectId(classId)) {
        return res.status(400).json({ success: false, message: 'Invalid class ID' });
      }
      const cls = await Class.findOne({ _id: classId, school: schoolId }).lean();
      if (!cls) return res.status(400).json({ success: false, message: 'Class not found in your school' });
      classRef = classId;
    }

    const doc = await SchoolEvent.create({
      school: schoolId,
      title: title.trim(),
      description: (description || '').trim(),
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : null,
      allDay: allDay !== false,
      class: classRef,
      createdBy: req.user._id,
    });

    const populated = await SchoolEvent.findById(doc._id).populate('class', 'name').lean();
    return res.status(201).json({ success: true, event: schoolEventToCalendarEntry(populated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to create event' });
  }
};

/** PATCH /calendar/events/:id — school admin only. */
export const updateSchoolEvent = async (req, res) => {
  try {
    if (req.user.role !== 'school_admin') {
      return res.status(403).json({ success: false, message: 'Only school admins can update calendar events' });
    }
    const schoolId = await resolveUserSchoolId(req.user);
    const doc = await SchoolEvent.findOne({ _id: req.params.id, school: schoolId });
    if (!doc) return res.status(404).json({ success: false, message: 'Event not found' });

    const { title, description, startAt, endAt, allDay, classId } = req.body || {};
    if (title !== undefined) doc.title = String(title).trim();
    if (description !== undefined) doc.description = String(description).trim();
    if (startAt !== undefined) doc.startAt = new Date(startAt);
    if (endAt !== undefined) doc.endAt = endAt ? new Date(endAt) : null;
    if (allDay !== undefined) doc.allDay = Boolean(allDay);

    if (classId !== undefined) {
      if (classId === null || classId === '') {
        doc.class = null;
      } else if (isValidObjectId(classId)) {
        const cls = await Class.findOne({ _id: classId, school: schoolId }).lean();
        if (!cls) return res.status(400).json({ success: false, message: 'Class not found in your school' });
        doc.class = classId;
      } else {
        return res.status(400).json({ success: false, message: 'Invalid class ID' });
      }
    }

    await doc.save();
    const populated = await SchoolEvent.findById(doc._id).populate('class', 'name').lean();
    return res.json({ success: true, event: schoolEventToCalendarEntry(populated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update event' });
  }
};

/** DELETE /calendar/events/:id — school admin only. */
export const deleteSchoolEvent = async (req, res) => {
  try {
    if (req.user.role !== 'school_admin') {
      return res.status(403).json({ success: false, message: 'Only school admins can delete calendar events' });
    }
    const schoolId = await resolveUserSchoolId(req.user);
    const result = await SchoolEvent.findOneAndDelete({ _id: req.params.id, school: schoolId });
    if (!result) return res.status(404).json({ success: false, message: 'Event not found' });
    return res.json({ success: true, message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to delete event' });
  }
};
