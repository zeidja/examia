import Class from '../models/Class.js';
import User from '../models/User.js';

export const createClass = async (req, res) => {
  try {
    const body = { ...req.body };
    if (req.user?.role === 'school_admin' && req.user?.school) {
      body.school = req.user.school._id || req.user.school;
    }
    const cls = await Class.create(body);
    res.status(201).json({ success: true, class: cls });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getClasses = async (req, res) => {
  try {
    let filter = {};
    if (req.user?.role === 'school_admin' && req.user?.school) filter.school = req.user.school._id || req.user.school;
    if (req.user?.role === 'teacher' && req.user?.school) filter.school = req.user.school._id || req.user.school;
    if (req.query.school) filter.school = req.query.school;
    const classes = await Class.find(filter).populate('school', 'name').populate('students', 'name email').sort({ name: 1 });

    for (const cls of classes) {
      if (cls.students.length === 0) {
        const actualStudents = await User.find({ role: 'student', class: cls._id }).select('_id').lean();
        if (actualStudents.length > 0) {
          cls.students = actualStudents.map((s) => s._id);
          await cls.save();
          await cls.populate('students', 'name email');
        }
      }
    }

    res.json({ success: true, classes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getClassById = async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id).populate('school', 'name').populate('students', 'name email');
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
    res.json({ success: true, class: cls });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateClass = async (req, res) => {
  try {
    const cls = await Class.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('school', 'name').populate('students', 'name email');
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
    res.json({ success: true, class: cls });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addStudentToClass = async (req, res) => {
  try {
    const { studentId } = req.body;
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
    if (!cls.students.includes(studentId)) {
      cls.students.push(studentId);
      await cls.save();
      await User.findByIdAndUpdate(studentId, { class: cls._id });
    }
    const updated = await Class.findById(req.params.id).populate('students', 'name email');
    res.json({ success: true, class: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const removeStudentFromClass = async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
    cls.students = cls.students.filter((id) => id.toString() !== req.params.studentId);
    await cls.save();
    await User.findByIdAndUpdate(req.params.studentId, { $unset: { class: 1 } });
    const updated = await Class.findById(req.params.id).populate('students', 'name email');
    res.json({ success: true, class: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
