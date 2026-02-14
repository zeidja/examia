import mongoose from 'mongoose';
import TeacherResource from '../models/TeacherResource.js';
import QuizAttempt from '../models/QuizAttempt.js';
import User from '../models/User.js';
import Class from '../models/Class.js';
import path from 'path';
import fs from 'fs';
import { uploadsDir } from '../middleware/upload.js';
import { sendNewResourceNotification } from '../services/emailService.js';

function isValidObjectId(id) {
  return id && typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

export const list = async (req, res) => {
  try {
    if (req.user.role === 'student') {
      const classId = req.user.class?._id || req.user.class;
      let schoolId = req.user.school?._id || req.user.school;
      if (!schoolId && classId) {
        const cls = await Class.findById(classId).select('school').lean();
        if (cls) schoolId = cls.school;
      }
      const filter = { published: true };
      if (schoolId) filter.school = schoolId;
      // Show resources assigned to student's class OR school-wide (no class = by subject)
      if (classId) {
        filter.$or = [{ class: classId }, { class: null }];
      } else {
        filter.class = null;
      }
      if (req.query.subject) filter.subject = req.query.subject;
      const resources = await TeacherResource.find(filter)
        .populate('createdBy', 'name')
        .populate('subject', 'name')
        .populate('class', 'name')
        .sort({ createdAt: -1 });
      // For students, annotate quiz resources with whether they have already attempted them
      const quizResources = resources.filter((r) => r.type === 'quiz');
      let resourcesWithAttempts = resources;
      if (quizResources.length > 0) {
        const quizIds = quizResources.map((r) => r._id);
        const attempts = await QuizAttempt.find({
          student: req.user._id,
          resource: { $in: quizIds },
        })
          .select('resource')
          .lean();
        const attemptedIds = new Set(attempts.map((a) => a.resource.toString()));
        resourcesWithAttempts = resources.map((r) => {
          const obj = r.toObject ? r.toObject() : r;
          if (obj.type === 'quiz') {
            return {
              ...obj,
              hasAttempt: attemptedIds.has(obj._id.toString()),
            };
          }
          return obj;
        });
      }
      return res.json({ success: true, resources: resourcesWithAttempts });
    }
    if (['teacher', 'school_admin', 'super_admin'].includes(req.user.role)) {
      const filter = {};
      if (req.user.role === 'teacher') {
        filter.createdBy = req.user._id;
      }
      if (req.user.role === 'school_admin' && req.user.school) {
        filter.school = req.user.school._id || req.user.school;
      }
      const resources = await TeacherResource.find(filter)
        .populate('createdBy', 'name')
        .populate('subject', 'name')
        .populate('class', 'name')
        .sort({ createdAt: -1 });
      return res.json({ success: true, resources });
    }
    res.json({ success: true, resources: [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const create = async (req, res) => {
  try {
    const body = { ...req.body };
    if (req.user.role === 'teacher' || req.user.role === 'school_admin') {
      if (!req.user.school) return res.status(403).json({ success: false, message: 'Must belong to a school' });
      body.createdBy = req.user._id;
      body.school = req.user.school._id || req.user.school;
      if (req.user.role === 'teacher' && req.user.subject) body.subject = req.user.subject._id || req.user.subject;
    }
    if (body.deadline === '' || body.deadline === null) body.deadline = undefined;
    const resource = await TeacherResource.create(body);
    const populated = await TeacherResource.findById(resource._id)
      .populate('createdBy', 'name')
      .populate('subject', 'name')
      .populate('class', 'name');
    res.status(201).json({ success: true, resource: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadMaterial = async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const { title, description, subject: subjectId } = req.body;
    if (!title) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    const schoolId = req.user.school?._id || req.user.school;
    if (!schoolId) {
      fs.unlink(req.file.path, () => {});
      return res.status(403).json({ success: false, message: 'Teacher must belong to a school' });
    }
    // Material is assigned to subject (not class). Teacher's subject as default.
    const subject = subjectId || (req.user.role === 'teacher' && (req.user.subject?._id || req.user.subject)) || null;
    if (!subject) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ success: false, message: 'Subject is required. Assign a subject to the teacher or select one.' });
    }
    const body = {
      type: 'material',
      title: title.trim(),
      description: (description || '').trim(),
      filePath: req.file.path,
      fileName: req.file.originalname || req.file.filename,
      createdBy: req.user._id,
      school: schoolId,
      subject,
      class: null,
      published: false,
    };
    const resource = await TeacherResource.create(body);
    const populated = await TeacherResource.findById(resource._id)
      .populate('createdBy', 'name')
      .populate('subject', 'name')
      .populate('class', 'name');
    res.status(201).json({ success: true, resource: populated });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getOne = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    const resource = await TeacherResource.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('subject', 'name')
      .populate('class', 'name')
      .lean();
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found' });
    const resourceClassId = (resource.class && (resource.class._id || resource.class))?.toString?.() ?? null;
    const userClassId = (req.user.class && (req.user.class._id || req.user.class))?.toString?.() ?? null;
    if (req.user.role === 'student') {
      if (!resource.published) return res.status(404).json({ success: false, message: 'Resource not found' });
      if (resourceClassId != null && resourceClassId !== userClassId) return res.status(404).json({ success: false, message: 'Resource not found' });
    } else if (req.user.role === 'teacher') {
      const createdById = (resource.createdBy && (resource.createdBy._id || resource.createdBy))?.toString?.();
      if (createdById !== req.user._id.toString()) return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    res.json({ success: true, resource });
  } catch (err) {
    console.error('GET /resources/:id error', err);
    if (err.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const resource = await TeacherResource.findById(req.params.id).populate('class', 'name');
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found' });
    if (req.user.role === 'teacher' && resource.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your resource' });
    }
    const { title, description, class: classId, subject: subjectId, published, deadline } = req.body;
    const wasPublished = resource.published;
    if (title != null) resource.title = title;
    if (description != null) resource.description = description;
    if (classId !== undefined) resource.class = classId === '' || classId === null ? null : classId;
    if (subjectId !== undefined) resource.subject = subjectId === '' || subjectId === null ? null : subjectId;
    if (typeof published === 'boolean') resource.published = published;
    if (deadline !== undefined) resource.deadline = deadline === '' || deadline === null ? null : new Date(deadline);
    await resource.save();
    if (!wasPublished && resource.published) {
      const schoolId = resource.school?._id || resource.school;
      let students;
      if (resource.class) {
        students = await User.find({ role: 'student', class: resource.class._id || resource.class }).select('email').lean();
      } else {
        const classIds = await Class.find({ school: schoolId }).distinct('_id');
        students = await User.find({ role: 'student', class: { $in: classIds } }).select('email').lean();
      }
      const emails = students.map((s) => s.email).filter(Boolean);
      if (emails.length) {
        sendNewResourceNotification(emails, resource.title, resource.type, resource.deadline).catch((err) => console.error('Notify error:', err));
      }
    }
    const populated = await TeacherResource.findById(resource._id)
      .populate('createdBy', 'name')
      .populate('subject', 'name')
      .populate('class', 'name');
    res.json({ success: true, resource: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const resource = await TeacherResource.findById(req.params.id);
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found' });
    if (req.user.role === 'teacher' && resource.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your resource' });
    }
    if (resource.type === 'material' && resource.filePath && fs.existsSync(resource.filePath)) {
      fs.unlinkSync(resource.filePath);
    }
    await TeacherResource.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const downloadFile = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    const resource = await TeacherResource.findById(req.params.id);
    if (!resource || resource.type !== 'material' || !resource.filePath) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    if (!fs.existsSync(resource.filePath)) return res.status(404).json({ success: false, message: 'File not found' });
    const resourceClassId = (resource.class?._id || resource.class)?.toString();
    const userClassId = (req.user.class?._id || req.user.class)?.toString();
    if (req.user.role === 'student') {
      if (!resource.published) return res.status(404).json({ success: false, message: 'Not found' });
      if (resourceClassId != null && resourceClassId !== userClassId) return res.status(404).json({ success: false, message: 'Not found' });
    } else if (req.user.role === 'teacher' && resource.createdBy.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.sendFile(path.resolve(resource.filePath), { headers: { 'Content-Disposition': 'inline' } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
