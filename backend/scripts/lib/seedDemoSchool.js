/**
 * Shared demo school seed: school admin, one teacher per active subject,
 * two DP classes with five students each. All logins use password Demo12@.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import School from '../../models/School.js';
import Class from '../../models/Class.js';
import User from '../../models/User.js';
import Subject from '../../models/Subject.js';

const PASSWORD = 'Demo12@';
const DEFAULT_CLASS_NAMES = ['DP Year 1 — Class A', 'DP Year 1 — Class B'];

function email(local, domain) {
  return `${local}@${domain}`;
}

function slugForTeacherEmail(name) {
  const base = String(name || 'subject')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 56)
    .replace(/-$/, '');
  return base || 'subject';
}

async function addStudentToClass(userId, classId) {
  await Class.findByIdAndUpdate(classId, { $addToSet: { students: userId } });
}

async function ensureUser({ name, emailAddr, role, schoolId, subjectId, classId }) {
  const existing = await User.findOne({ email: emailAddr });
  if (existing) {
    return { user: existing, created: false };
  }
  const doc = {
    name,
    email: emailAddr,
    password: PASSWORD,
    role,
    school: schoolId,
    ...(subjectId ? { subject: subjectId } : {}),
    ...(classId ? { class: classId } : {}),
  };
  const user = await User.create(doc);
  if (role === 'student' && classId) {
    await addStudentToClass(user._id, classId);
  }
  return { user, created: true };
}

function escapeCell(c) {
  return String(c).replace(/\|/g, '\\|');
}

function buildMarkdown({
  title,
  schoolName,
  schoolSlug,
  classA,
  classB,
  rows,
  subjectsCount,
  emailDomain,
  emailKeyword,
  npmScript,
}) {
  const header = rows[0];
  const body = rows.slice(1);
  const table = [
    `| ${header.map(escapeCell).join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...body.map((r) => `| ${r.map(escapeCell).join(' | ')} |`),
  ].join('\n');

  return `# ${title}

All accounts use the same password: **${PASSWORD}**

- **School:** ${schoolName} (\`slug: ${schoolSlug}\`)
- **Classes:** ${classA}, ${classB}
- **Teachers:** one per active subject (${subjectsCount} subjects in DB when seed ran)
- **Email domain:** \`@${emailDomain}\` (every address contains **${emailKeyword}**)

## Regenerate this file

From the \`backend\` folder:

\`\`\`bash
npm run seed
npm run ${npmScript}
\`\`\`

## Accounts

${table}
`;
}

/**
 * @param {{
 *   schoolName: string,
 *   emailDomain: string,
 *   emailKeyword: string,
 *   adminDisplayName: string,
 *   markdownTitle: string,
 *   markdownFilename: string,
 *   npmScript: string,
 *   classNames?: string[],
 *   scriptsDir?: string,
 * }} config
 */
export async function seedDemoSchool(config) {
  const {
    schoolName,
    emailDomain,
    emailKeyword,
    adminDisplayName,
    markdownTitle,
    markdownFilename,
    npmScript,
    classNames = DEFAULT_CLASS_NAMES,
    scriptsDir = path.dirname(fileURLToPath(import.meta.url)),
  } = config;

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Add it to backend/.env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const subjects = await Subject.find({ isActive: true }).sort({ name: 1 }).lean();
  if (subjects.length === 0) {
    console.error('No active subjects in the database. Run `npm run seed` first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const schoolPattern = new RegExp(`^${schoolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  let school = await School.findOne({ name: schoolPattern });
  if (!school) {
    school = await School.create({
      name: schoolName,
      email: email('info', emailDomain),
      phone: '',
      address: '',
      country: '',
      isActive: true,
    });
    console.log('School created:', school.name, school.slug);
  } else {
    console.log('School already exists:', school.name);
  }

  const schoolId = school._id;
  const rows = [['Role', 'Name', 'Email', 'Password', 'Notes']];

  const principalEmail = email('principal', emailDomain);
  const { user: adminUser, created: adminCreated } = await ensureUser({
    name: adminDisplayName,
    emailAddr: principalEmail,
    role: 'school_admin',
    schoolId,
  });
  rows.push(['school_admin', adminUser.name, adminUser.email, PASSWORD, adminCreated ? 'created' : 'already existed']);
  console.log(adminCreated ? 'School admin created' : 'School admin skipped (exists):', principalEmail);

  const usedLocals = new Set();
  for (const sub of subjects) {
    let local = `teacher.${slugForTeacherEmail(sub.name)}`;
    let addr = email(local, emailDomain);
    let n = 2;
    while (usedLocals.has(local)) {
      local = `teacher.${slugForTeacherEmail(sub.name)}-${n++}`;
      addr = email(local, emailDomain);
    }
    usedLocals.add(local);

    const { user: t, created } = await ensureUser({
      name: `Teacher — ${sub.name}`,
      emailAddr: addr,
      role: 'teacher',
      schoolId,
      subjectId: sub._id,
    });
    rows.push(['teacher', t.name, t.email, PASSWORD, `Subject: ${sub.name}${created ? '' : ' (user existed)'}`]);
    console.log(created ? 'Teacher created' : 'Teacher skipped:', addr, `(${sub.name})`);
  }

  const allTeachers = await User.find({
    school: schoolId,
    role: 'teacher',
    subject: { $in: subjects.map((s) => s._id) },
  })
    .select('_id')
    .lean();
  const teacherIds = allTeachers.map((t) => t._id);

  const classes = [];
  for (const name of classNames) {
    let cls = await Class.findOne({ school: schoolId, name });
    if (!cls) {
      cls = await Class.create({
        name,
        grade: 'DP1',
        school: schoolId,
        teachers: teacherIds,
        students: [],
        isActive: true,
      });
      console.log('Class created:', name);
    } else {
      await Class.findByIdAndUpdate(cls._id, { $set: { teachers: teacherIds } });
      console.log('Class updated (teachers refreshed):', name);
    }
    classes.push(cls);
  }

  const [classA, classB] = classes;

  for (let i = 1; i <= 5; i++) {
    const addr = email(`student${i}.class-a`, emailDomain);
    const { user, created } = await ensureUser({
      name: `Student ${i} — Class A`,
      emailAddr: addr,
      role: 'student',
      schoolId,
      classId: classA._id,
    });
    rows.push(['student', user.name, user.email, PASSWORD, `${classA.name}${created ? '' : ' (user existed)'}`]);
    console.log(created ? 'Student created' : 'Student skipped:', addr);
  }

  for (let i = 1; i <= 5; i++) {
    const addr = email(`student${i}.class-b`, emailDomain);
    const { user, created } = await ensureUser({
      name: `Student ${i} — Class B`,
      emailAddr: addr,
      role: 'student',
      schoolId,
      classId: classB._id,
    });
    rows.push(['student', user.name, user.email, PASSWORD, `${classB.name}${created ? '' : ' (user existed)'}`]);
    console.log(created ? 'Student created' : 'Student skipped:', addr);
  }

  const mdPath = path.join(scriptsDir, '../config', markdownFilename);
  const md = buildMarkdown({
    title: markdownTitle,
    schoolName,
    schoolSlug: school.slug,
    classA: classA.name,
    classB: classB.name,
    rows,
    subjectsCount: subjects.length,
    emailDomain,
    emailKeyword,
    npmScript,
  });
  fs.writeFileSync(mdPath, md, 'utf8');
  console.log('Wrote account list:', mdPath);

  await mongoose.disconnect();
  console.log(`Demo seed finished (${schoolName}).`);
}
