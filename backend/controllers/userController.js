import User from '../models/User.js';
import Class from '../models/Class.js';

export const getUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.school) filter.school = req.query.school;
    if (req.user?.role === 'school_admin' && req.user?.school) {
      filter.school = req.user.school;
    }
    const users = await User.find(filter).select('-password').populate('school', 'name').populate('subject', 'name').populate('class', 'name').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').populate('school subject class');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const existing = await User.findById(req.params.id).select('class role');
    if (!existing) return res.status(404).json({ success: false, message: 'User not found' });

    const { password, ...rest } = req.body;
    const update = rest;
    const newClassId = rest.class === undefined ? undefined : (rest.class === '' || rest.class === null ? null : rest.class);

    if (password) {
      const u = await User.findById(req.params.id).select('+password');
      u.password = password;
      await u.save();
    }
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password').populate('school subject class');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (existing.role === 'student') {
      const oldClassId = existing.class?._id?.toString() || existing.class?.toString() || null;
      const newId = newClassId?._id?.toString() || newClassId?.toString() || null;
      if (oldClassId && oldClassId !== newId) {
        await Class.findByIdAndUpdate(oldClassId, { $pull: { students: req.params.id } });
      }
      if (newId) {
        await Class.findByIdAndUpdate(newId, { $addToSet: { students: req.params.id } });
      }
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const body = { ...req.body };
    if (req.user.role === 'school_admin') {
      if (!req.user.school) return res.status(403).json({ success: false, message: 'School admin must belong to a school' });
      body.school = req.user.school;
      if (!['teacher', 'student'].includes(body.role)) {
        return res.status(400).json({ success: false, message: 'School admin can only create teachers and students' });
      }
    }
    if (body.role === 'teacher' && !body.subject) {
      return res.status(400).json({ success: false, message: 'Subject is required when creating a teacher' });
    }
    const user = await User.create(body);
    if (user.role === 'student' && user.class) {
      const classId = user.class._id || user.class;
      await Class.findByIdAndUpdate(classId, { $addToSet: { students: user._id } });
    }
    const u = user.toObject();
    delete u.password;
    res.status(201).json({ success: true, user: u });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
