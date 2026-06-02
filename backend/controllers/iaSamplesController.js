import fs from 'fs';
import path from 'path';
import IaSample from '../models/IaSample.js';
import {
  isValidObjectId,
  resolveUserSchoolId,
  assertCanManageIaSampleForSubject,
  assertCanAccessIaSample,
} from '../utils/iaSamplesAccess.js';

/** GET /ia-samples?subjectId= — list samples for caller's school + subject only. */
export const list = async (req, res) => {
  try {
    const schoolId = await resolveUserSchoolId(req.user);
    if (!schoolId) {
      return res.json({ success: true, samples: [] });
    }
    const { subjectId } = req.query;
    if (!isValidObjectId(subjectId)) {
      return res.status(400).json({ success: false, message: 'subjectId is required' });
    }
    const samples = await IaSample.find({ school: schoolId, subject: subjectId })
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, samples });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to list IA samples' });
  }
};

/** POST /ia-samples — teachers only (school-private). */
export const upload = async (req, res) => {
  try {
    if (!req.file?.path) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const subjectId = req.body.subjectId;
    const title = (req.body.title || req.file.originalname || 'IA sample').trim();
    if (!title) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const access = await assertCanManageIaSampleForSubject(req, subjectId);
    if (access.status) {
      fs.unlink(req.file.path, () => {});
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const doc = await IaSample.create({
      school: access.schoolId,
      subject: access.subjectId,
      title,
      description: (req.body.description || '').trim(),
      filePath: req.file.path,
      fileName: req.file.originalname || req.file.filename,
      mimeType: req.file.mimetype || '',
      uploadedBy: req.user._id,
    });

    const populated = await IaSample.findById(doc._id).populate('uploadedBy', 'name').lean();
    return res.status(201).json({ success: true, sample: populated });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: err.message || 'Failed to upload' });
  }
};

/** DELETE /ia-samples/:id */
export const remove = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    const sample = await IaSample.findById(req.params.id);
    if (!sample) return res.status(404).json({ success: false, message: 'Not found' });

    const access = await assertCanAccessIaSample(req, sample);
    if (access) return res.status(access.status).json({ success: false, message: access.message });

    const manage = await assertCanManageIaSampleForSubject(req, sample.subject);
    if (manage.status) return res.status(manage.status).json({ success: false, message: manage.message });

    if (sample.filePath && fs.existsSync(sample.filePath)) {
      try {
        fs.unlinkSync(sample.filePath);
      } catch {
        /* ignore */
      }
    }
    await IaSample.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to delete' });
  }
};

/** GET /ia-samples/:id/file */
export const downloadFile = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    const sample = await IaSample.findById(req.params.id).lean();
    if (!sample?.filePath) return res.status(404).json({ success: false, message: 'Not found' });

    const access = await assertCanAccessIaSample(req, sample);
    if (access) return res.status(access.status).json({ success: false, message: access.message });

    if (!fs.existsSync(sample.filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const download = req.query.download === '1';
    const disposition = download ? 'attachment' : 'inline';
    const safeName = (sample.fileName || 'ia-sample').replace(/"/g, "'");
    res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"`);
    return res.sendFile(path.resolve(sample.filePath));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to download' });
  }
};
