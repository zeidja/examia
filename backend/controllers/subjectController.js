import Subject from '../models/Subject.js';
import { getMaterialsFolderNames } from '../services/materialsService.js';

const CODE_MAP = {
  Biology: 'BIO',
  Business: 'BM',
  Economics: 'ECON',
  GlobalPolitics: 'GP',
  Math: 'MATH',
  Physics: 'PHY',
  Psychology: 'PSY',
};

function getCode(name) {
  return CODE_MAP[name] || name.slice(0, 3).toUpperCase();
}

export const syncFromMaterials = async (req, res) => {
  try {
    const folderNames = await getMaterialsFolderNames();
    const folderSet = new Set(folderNames);

    // Add or update subjects for each folder present in materials
    const synced = [];
    for (const name of folderNames) {
      const subject = await Subject.findOneAndUpdate(
        { materialsPath: name },
        { $set: { name, code: getCode(name), materialsPath: name, isActive: true } },
        { upsert: true, new: true }
      );
      synced.push(subject);
    }

    // Deactivate subjects whose materials folder no longer exists (e.g. removed "Math" after adding "Math AA" and "Math Applied")
    const deactivated = await Subject.updateMany(
      { materialsPath: { $nin: folderNames }, isActive: true },
      { $set: { isActive: false } }
    );
    const deactivatedCount = deactivated.modifiedCount || 0;

    const message =
      deactivatedCount > 0
        ? `Synced ${synced.length} subjects from materials folder. ${deactivatedCount} subject(s) deactivated (folder no longer present).`
        : `Synced ${synced.length} subjects from materials folder.`;
    res.json({ success: true, subjects: synced, deactivatedCount, message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createSubject = async (req, res) => {
  try {
    const subject = await Subject.create(req.body);
    res.status(201).json({ success: true, subject });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, subjects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    res.json({ success: true, subject });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    res.json({ success: true, subject });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
