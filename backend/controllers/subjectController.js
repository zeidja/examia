import Subject from '../models/Subject.js';
import { getMaterialsFolderNames } from '../services/materialsService.js';

const CODE_MAP = {
  Biology: 'BIO',
  Business: 'BM',
  Chemistry: 'CHEM',
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

    // Deactivate subjects whose materials folder no longer exists (do not deactivate iaOnly subjects like TOK Essay/Exhibition)
    const deactivated = await Subject.updateMany(
      { materialsPath: { $nin: folderNames }, isActive: true, iaOnly: { $ne: true } },
      { $set: { isActive: false } }
    );
    const deactivatedCount = deactivated.modifiedCount || 0;

    // Ensure IA-only subjects (TOK Essay, TOK Exhibition) exist so they appear on Modules
    const iaOnlySubjects = [
      { name: 'TOK Essay', code: 'TOK-E', materialsPath: '', iaOnly: true },
      { name: 'TOK Exhibition', code: 'TOK-X', materialsPath: '', iaOnly: true },
    ];
    for (const sub of iaOnlySubjects) {
      await Subject.findOneAndUpdate(
        { name: sub.name },
        { $set: { name: sub.name, code: sub.code, materialsPath: sub.materialsPath || '', iaOnly: true, isActive: true } },
        { upsert: true, new: true }
      );
    }

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
