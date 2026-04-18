import mongoose from 'mongoose';
import Class from '../models/Class.js';
import User from '../models/User.js';

/** Class doc may be lean with `teachers` as id[] */
export function teacherSeesClass(teacherId, classDoc) {
  if (!classDoc || !teacherId) return false;
  const tid = String(teacherId);
  const teachers = classDoc.teachers;
  if (!teachers || teachers.length === 0) return true;
  return teachers.some((t) => String(typeof t === 'object' && t?._id != null ? t._id : t) === tid);
}

/** Student ObjectIds this teacher may view (logs, insights) for the given school. */
export async function getVisibleStudentIdsForTeacher(teacherId, schoolId) {
  if (!teacherId || !schoolId) return [];
  const classes = await Class.find({ school: schoolId }).select('teachers').lean();
  const classIds = classes.filter((c) => teacherSeesClass(teacherId, c)).map((c) => c._id);
  if (classIds.length === 0) return [];
  const students = await User.find({
    role: 'student',
    class: { $in: classIds },
  })
    .select('_id')
    .lean();
  return students.map((s) => s._id);
}

export function assertTeacherAssignedSubject(req, subjectId) {
  if (req.user.role !== 'teacher') return null;
  const mySubject = req.user.subject?._id || req.user.subject;
  if (!mySubject || String(mySubject) !== String(subjectId)) {
    return { status: 403, message: 'You can only access your assigned subject' };
  }
  return null;
}

export async function assertTeacherCanViewStudent(req, studentId, schoolId) {
  if (req.user.role !== 'teacher') return null;
  const student = await User.findById(studentId).select('role school class').populate('class', 'teachers').lean();
  if (!student || student.role !== 'student') {
    return { status: 404, message: 'Student not found' };
  }
  if (String(student.school) !== String(schoolId)) {
    return { status: 403, message: 'Not allowed' };
  }
  if (!student.class || !teacherSeesClass(req.user._id, student.class)) {
    return { status: 403, message: 'You can only view students in classes you are assigned to' };
  }
  return null;
}

export function isValidObjectId(id) {
  return id && typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}
