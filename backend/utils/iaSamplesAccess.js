import mongoose from 'mongoose';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';

export function isValidObjectId(id) {
  return id && typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

export async function resolveUserSchoolId(user) {
  let schoolId = user.school?._id || user.school;
  const classId = user.class?._id || user.class;
  if (!schoolId && classId) {
    const cls = await Class.findById(classId).select('school').lean();
    if (cls) schoolId = cls.school;
  }
  return schoolId ? String(schoolId) : null;
}

/** Only teachers may upload/delete; for their assigned subject only. */
export async function assertCanManageIaSampleForSubject(req, subjectId) {
  if (req.user.role !== 'teacher') {
    return { status: 403, message: 'Only teachers can upload IA samples' };
  }
  const schoolId = await resolveUserSchoolId(req.user);
  if (!schoolId) return { status: 403, message: 'You must belong to a school' };
  if (!isValidObjectId(subjectId)) return { status: 400, message: 'Invalid subject' };

  const subject = await Subject.findById(subjectId).select('isActive').lean();
  if (!subject || subject.isActive === false) return { status: 404, message: 'Subject not found' };

  const teacherSubject = req.user.subject?._id || req.user.subject;
  if (!teacherSubject || String(teacherSubject) !== String(subjectId)) {
    return { status: 403, message: 'You can only upload IA samples for your assigned subject' };
  }
  return { schoolId, subjectId };
}

export async function assertCanAccessIaSample(req, sample) {
  const schoolId = await resolveUserSchoolId(req.user);
  if (!schoolId || String(sample.school) !== schoolId) {
    return { status: 404, message: 'Not found' };
  }
  return null;
}
