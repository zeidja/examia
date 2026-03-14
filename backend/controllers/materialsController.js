import path from 'path';
import fs from 'fs';
import { getMaterialsTree, getSubjectPaths, resolveMaterialPath, getSubjectFileList, getDefinitionsForSubject, resolveDefinitionsPath, getChecklistFilesForSubject, resolveChecklistsPath } from '../services/materialsService.js';
import Subject from '../models/Subject.js';
import { extractTextFromBuffer } from '../utils/extractText.js';

export const getTree = async (req, res) => {
  try {
    const tree = await getMaterialsTree();
    res.json({ success: true, tree });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSubjectPathsMap = async (req, res) => {
  try {
    const paths = await getSubjectPaths();
    res.json({ success: true, paths });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /materials/subject-files?subjectId=xxx — list supported files for a subject (for Study & Learn file picker). All authenticated users. */
export const getSubjectFiles = async (req, res) => {
  try {
    const subjectId = req.query.subjectId;
    if (!subjectId) return res.status(400).json({ success: false, message: 'subjectId query required' });
    const subject = await Subject.findById(subjectId).lean();
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    const folderKey = (subject.materialsPath && subject.materialsPath.trim()) || subject.name || '';
    const files = await getSubjectFileList(folderKey);
    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const mimeMap = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

export const getFile = async (req, res) => {
  try {
    const relativePath = req.query.path || req.query.file;
    if (!relativePath) {
      return res.status(400).json({ success: false, message: 'path or file query required' });
    }
    const fullPath = resolveMaterialPath(relativePath);
    if (!fullPath) {
      return res.status(400).json({ success: false, message: 'Invalid path' });
    }
    const exists = fs.existsSync(fullPath);
    if (!exists) return res.status(404).json({ success: false, message: 'File not found' });
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) return res.status(400).json({ success: false, message: 'Not a file' });
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = mimeMap[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(fullPath);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /materials/definitions?subjectId=xxx — list definition files for a subject. Returns { files: [{ name, relativePath }] }. */
export const getDefinitions = async (req, res) => {
  try {
    const subjectId = req.query.subjectId;
    if (!subjectId) return res.status(400).json({ success: false, message: 'subjectId query required' });
    const subject = await Subject.findById(subjectId).lean();
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    const subjectName = (subject.name || subject.materialsPath || '').trim();
    const files = await getDefinitionsForSubject(subjectName);
    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /materials/definitions/file?path=FileName.docx — serve a definitions file (path = basename only). */
export const getDefinitionsFile = async (req, res) => {
  try {
    const filePath = req.query.path || req.query.file;
    if (!filePath) return res.status(400).json({ success: false, message: 'path or file query required' });
    const fullPath = resolveDefinitionsPath(filePath);
    if (!fullPath) return res.status(400).json({ success: false, message: 'Invalid path' });
    const exists = fs.existsSync(fullPath);
    if (!exists) return res.status(404).json({ success: false, message: 'File not found' });
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) return res.status(400).json({ success: false, message: 'Not a file' });
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = mimeMap[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline; filename="' + path.basename(fullPath) + '"');
    res.sendFile(fullPath);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /materials/definitions/file/content?path=FileName.docx — return extracted text for in-app viewing. */
export const getDefinitionsFileContent = async (req, res) => {
  try {
    const filePath = req.query.path || req.query.file;
    if (!filePath) return res.status(400).json({ success: false, message: 'path or file query required' });
    const fullPath = resolveDefinitionsPath(filePath);
    if (!fullPath) return res.status(400).json({ success: false, message: 'Invalid path' });
    const exists = fs.existsSync(fullPath);
    if (!exists) return res.status(404).json({ success: false, message: 'File not found' });
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) return res.status(400).json({ success: false, message: 'Not a file' });
    const buffer = await fs.promises.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const mime = mimeMap[ext] || 'application/octet-stream';
    let content = '';
    try {
      content = await extractTextFromBuffer(buffer, mime, path.basename(fullPath)) || '';
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Could not extract text from this file. Try a different format.' });
    }
    res.json({ success: true, content: content.trim(), filename: path.basename(fullPath) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /materials/checklists?subjectId=xxx — list checklist files for a subject. Returns { files: [{ name, relativePath }] }. */
export const getChecklists = async (req, res) => {
  try {
    const subjectId = req.query.subjectId;
    if (!subjectId) return res.status(400).json({ success: false, message: 'subjectId query required' });
    const subject = await Subject.findById(subjectId).lean();
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    const subjectName = (subject.name || subject.materialsPath || '').trim();
    const files = await getChecklistFilesForSubject(subjectName);
    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /materials/checklists/file/content?path=... — return extracted text for in-app viewing (path relative to Checklists root). */
export const getChecklistsFileContent = async (req, res) => {
  try {
    const filePath = req.query.path || req.query.file;
    if (!filePath) return res.status(400).json({ success: false, message: 'path or file query required' });
    const fullPath = resolveChecklistsPath(filePath);
    if (!fullPath) return res.status(400).json({ success: false, message: 'Invalid path' });
    const exists = fs.existsSync(fullPath);
    if (!exists) return res.status(404).json({ success: false, message: 'File not found' });
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) return res.status(400).json({ success: false, message: 'Not a file' });
    const buffer = await fs.promises.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const mime = mimeMap[ext] || 'application/octet-stream';
    let content = '';
    try {
      content = await extractTextFromBuffer(buffer, mime, path.basename(fullPath)) || '';
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Could not extract text from this file. Try a different format.' });
    }
    res.json({ success: true, content: content.trim(), filename: path.basename(fullPath) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
