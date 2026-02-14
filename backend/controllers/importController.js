import * as XLSX from 'xlsx';
import User from '../models/User.js';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';

const DEFAULT_PASSWORD = 'ChangeMe123';
const ROLE_MAP = { teacher: 'teacher', student: 'student', Teacher: 'teacher', Student: 'student' };

/** Excel template for user import: headers + example rows */
const TEMPLATE_HEADERS = ['Name', 'Email', 'Role', 'Class', 'Subject', 'Password'];
const TEMPLATE_ROWS = [
  ['John Doe', 'john@school.com', 'Teacher', '', 'Biology', ''],
  ['Jane Smith', 'jane@school.com', 'Student', 'Grade 10', '', ''],
  ['Alex Brown', 'alex@school.com', 'Student', 'Grade 11', '', 'ChangeMe123'],
];

export const getImportTemplate = (req, res) => {
  try {
    const sheetData = [TEMPLATE_HEADERS, ...TEMPLATE_ROWS];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="users_import_template.xlsx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to generate template' });
  }
};

export const importUsers = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const schoolId = req.user.role === 'school_admin' ? req.user.school : (req.body.school || '').trim() || null;
    if (req.user.role === 'school_admin' && !schoolId) {
      return res.status(400).json({ success: false, message: 'School admin must belong to a school' });
    }
    if (req.user.role === 'super_admin' && !schoolId) {
      return res.status(400).json({ success: false, message: 'Select a school for the import' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rows.length < 2) {
      return res.status(400).json({ success: false, message: 'Excel must have a header row and at least one data row' });
    }

    const headers = rows[0].map((h) => String(h || '').trim().toLowerCase());
    const nameCol = headers.findIndex((h) => h === 'name' || h === 'nombre');
    const emailCol = headers.findIndex((h) => h === 'email' || h === 'email address');
    const roleCol = headers.findIndex((h) => h === 'role' || h === 'type');
    const classCol = headers.findIndex((h) => h === 'class' || h === 'class name' || h === 'classname');
    const subjectCol = headers.findIndex((h) => h === 'subject');
    const passwordCol = headers.findIndex((h) => h === 'password');

    if (nameCol < 0 || emailCol < 0 || roleCol < 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel must have columns: Name, Email, Role (Teacher or Student). Optional: Class, Subject, Password',
      });
    }

    const created = [];
    const errors = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const name = String(row[nameCol] ?? '').trim();
      const email = String(row[emailCol] ?? '').trim().toLowerCase();
      const roleRaw = String(row[roleCol] ?? '').trim();
      const role = ROLE_MAP[roleRaw] || (roleRaw.toLowerCase() === 'teacher' ? 'teacher' : roleRaw.toLowerCase() === 'student' ? 'student' : null);
      const classVal = row[classCol] != null ? String(row[classCol]).trim() : '';
      const subjectVal = row[subjectCol] != null ? String(row[subjectCol]).trim() : '';
      const password = passwordCol >= 0 && row[passwordCol] ? String(row[passwordCol]).trim() : DEFAULT_PASSWORD;

      if (!name || !email) {
        errors.push({ row: i + 1, email: email || '(empty)', message: 'Name and Email required' });
        continue;
      }
      if (!role || !['teacher', 'student'].includes(role)) {
        errors.push({ row: i + 1, email, message: 'Role must be Teacher or Student' });
        continue;
      }
      if (req.user.role === 'school_admin' && !['teacher', 'student'].includes(role)) {
        errors.push({ row: i + 1, email, message: 'School admin can only import teachers and students' });
        continue;
      }

      const existing = await User.findOne({ email });
      if (existing) {
        errors.push({ row: i + 1, email, message: 'Email already registered' });
        continue;
      }

      let classId = null;
      let subjectId = null;
      if (classVal && schoolId) {
        const cls = await Class.findOne({ school: schoolId, name: new RegExp(`^${escapeRe(classVal)}$`, 'i') });
        if (cls) classId = cls._id;
      }
      if (subjectVal) {
        const sub = await Subject.findOne({ name: new RegExp(`^${escapeRe(subjectVal)}$`, 'i') });
        if (sub) subjectId = sub._id;
      }

      try {
        const user = await User.create({
          name,
          email,
          password: password || DEFAULT_PASSWORD,
          role,
          school: schoolId,
          class: classId,
          subject: role === 'teacher' ? subjectId : undefined,
        });
        if (role === 'student' && classId) {
          await Class.findByIdAndUpdate(classId, { $addToSet: { students: user._id } });
        }
        const u = user.toObject();
        delete u.password;
        created.push(u);
      } catch (err) {
        errors.push({ row: i + 1, email, message: err.message || 'Create failed' });
      }
    }

    res.json({
      success: true,
      created: created.length,
      errors: errors.length,
      users: created,
      errorList: errors,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Import failed' });
  }
};

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
