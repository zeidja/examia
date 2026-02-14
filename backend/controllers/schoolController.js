import School from '../models/School.js';
import User from '../models/User.js';
import Class from '../models/Class.js';

export const createSchool = async (req, res) => {
  try {
    const { adminName, adminEmail, adminPassword, ...schoolData } = req.body;
    const loginEmail = ((adminEmail?.trim() || schoolData.email) || '').trim().toLowerCase();
    const password = adminPassword?.trim();
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Admin password is required (min 6 characters) so the school admin can sign in.' });
    }
    if (!loginEmail) {
      return res.status(400).json({ success: false, message: 'School email or admin email is required.' });
    }
    const existingUser = await User.findOne({ email: loginEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'A user with that email already exists. Use a different admin email.' });
    }
    const school = await School.create(schoolData);
    await User.create({
      name: adminName?.trim() || `${school.name} Admin`,
      email: loginEmail,
      password,
      role: 'school_admin',
      school: school._id,
    });
    return res.status(201).json({ success: true, school, adminEmail: loginEmail });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSchools = async (req, res) => {
  try {
    const schools = await School.find().sort({ createdAt: -1 });
    const adminBySchool = await User.find({ role: 'school_admin', school: { $in: schools.map((s) => s._id) } })
      .select('school email name')
      .lean();
    const adminMap = {};
    adminBySchool.forEach((u) => { adminMap[u.school?.toString()] = { email: u.email, name: u.name }; });
    const schoolsWithAdmin = schools.map((s) => ({
      ...s.toObject(),
      admin: adminMap[s._id.toString()] || null,
    }));
    res.json({ success: true, schools: schoolsWithAdmin });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSchoolById = async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });
    res.json({ success: true, school });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSchool = async (req, res) => {
  try {
    const school = await School.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });
    res.json({ success: true, school });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteSchool = async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });
    await User.updateMany({ school: school._id }, { $set: { school: null } });
    await Class.deleteMany({ school: school._id });
    await School.findByIdAndDelete(school._id);
    res.json({ success: true, message: 'School deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSchoolReports = async (req, res) => {
  try {
    const schools = await School.find().select('name email createdAt');
    const reports = await Promise.all(
      schools.map(async (s) => {
        const [admins, teachers, students, classes] = await Promise.all([
          User.countDocuments({ role: 'school_admin', school: s._id }),
          User.countDocuments({ role: 'teacher', school: s._id }),
          User.countDocuments({ role: 'student', school: s._id }),
          Class.countDocuments({ school: s._id }),
        ]);
        return {
          school: s,
          admins,
          teachers,
          students,
          classes,
        };
      })
    );
    res.json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
