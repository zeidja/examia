import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractTextFromBuffer } from '../utils/extractText.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MATERIALS_PATH = path.resolve(__dirname, '../../materials');

const mimeByExt = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
};

async function buildNode(fullPath, name) {
  const rel = path.relative(MATERIALS_PATH, fullPath);
  const relativePath = rel.split(path.sep).join('/');
  const stat = await fs.stat(fullPath).catch(() => null);
  if (!stat) return null;
  if (stat.isFile()) {
    return { name, path: fullPath, relativePath, type: 'file' };
  }
  if (stat.isDirectory()) {
    const entries = await fs.readdir(fullPath, { withFileTypes: true }).catch(() => []);
    const children = [];
    for (const ent of entries) {
      if (ent.name.startsWith('.')) continue;
      const childPath = path.join(fullPath, ent.name);
      const child = await buildNode(childPath, ent.name);
      if (child) children.push(child);
    }
    return { name, path: fullPath, relativePath, type: 'folder', children };
  }
  return null;
}

export async function getMaterialsTree() {
  const tree = { name: 'materials', children: [] };
  try {
    const subjects = await fs.readdir(MATERIALS_PATH, { withFileTypes: true });
    for (const subject of subjects) {
      if (!subject.isDirectory() || subject.name.startsWith('.')) continue;
      const fullPath = path.join(MATERIALS_PATH, subject.name);
      const node = await buildNode(fullPath, subject.name);
      if (node) tree.children.push(node);
    }
    return tree;
  } catch (err) {
    return { name: 'materials', children: [], error: err.message };
  }
}

/** Resolve relative path and ensure it stays inside MATERIALS_PATH (prevent path traversal). */
export function resolveMaterialPath(relativePath) {
  if (!relativePath || typeof relativePath !== 'string') return null;
  const normalized = path.normalize(relativePath.replace(/\//g, path.sep)).replace(/^(\.\.(\/|\\|$))+/, '');
  const full = path.resolve(MATERIALS_PATH, normalized);
  if (!full.startsWith(MATERIALS_PATH)) return null;
  return full;
}

export async function getSubjectPaths() {
  try {
    const subjects = await fs.readdir(MATERIALS_PATH, { withFileTypes: true });
    const map = {};
    for (const s of subjects) {
      if (s.isDirectory() && !s.name.startsWith('.')) {
        map[s.name] = path.join(MATERIALS_PATH, s.name);
      }
    }
    return map;
  } catch (err) {
    return {};
  }
}

/** Returns folder names in materials (same list as Subjects should use). */
export async function getMaterialsFolderNames() {
  try {
    const entries = await fs.readdir(MATERIALS_PATH, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => e.name);
  } catch (err) {
    return [];
  }
}

/** Read a material file by relative path and return extracted text for AI. */
export async function getMaterialFileContent(relativePath) {
  const fullPath = resolveMaterialPath(relativePath);
  if (!fullPath) return '';
  try {
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) return '';
    const buffer = await fs.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const mime = mimeByExt[ext] || 'text/plain';
    return await extractTextFromBuffer(buffer, mime, path.basename(fullPath));
  } catch (err) {
    if (err.message?.includes('Unsupported file type')) return '';
    throw err;
  }
}

/** Recursively collect all file paths under dir. */
async function listFilesRecursive(dir, list = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await listFilesRecursive(full, list);
    else if (e.isFile()) list.push(full);
  }
  return list;
}

const SUPPORTED_EXT = ['.pdf', '.doc', '.docx', '.txt'];

/**
 * List all supported material files for a subject (for Study & Learn file picker).
 * Returns array of { relativePath, name } where relativePath is from materials root (e.g. "Biology/A. Unity/.../file.pdf").
 */
export async function getSubjectFileList(subjectName) {
  const subjectPath = await resolveSubjectMaterialsFolder(subjectName);
  if (!subjectPath) return [];
  const files = await listFilesRecursive(subjectPath);
  const list = [];
  for (const fullPath of files) {
    const ext = path.extname(fullPath).toLowerCase();
    if (!SUPPORTED_EXT.includes(ext)) continue;
    const rel = path.relative(MATERIALS_PATH, fullPath);
    const relativePath = rel.split(path.sep).join('/');
    list.push({ relativePath, name: path.basename(fullPath) });
  }
  return list.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

/**
 * Get concatenated text from only the given material paths (relative to materials root).
 * Used when user selects specific files for Study & Learn. Paths are validated via resolveMaterialPath.
 */
export async function getMaterialsTextByPaths(relativePaths, maxChars = 200000) {
  if (!Array.isArray(relativePaths) || relativePaths.length === 0) return '';
  let out = '';
  for (const rel of relativePaths) {
    if (out.length >= maxChars) break;
    const relativePath = (rel || '').trim();
    if (!relativePath) continue;
    const fullPath = resolveMaterialPath(relativePath);
    if (!fullPath) continue;
    try {
      const stat = await fs.stat(fullPath);
      if (!stat.isFile()) continue;
      const ext = path.extname(fullPath).toLowerCase();
      if (!SUPPORTED_EXT.includes(ext)) continue;
      const buffer = await fs.readFile(fullPath);
      const mime = mimeByExt[ext] || 'text/plain';
      const text = await extractTextFromBuffer(buffer, mime, path.basename(fullPath));
      if (text && text.trim()) {
        out += `\n\n--- ${relativePath.split(path.sep).join('/')} ---\n${text.trim()}`;
        if (out.length > maxChars) out = out.slice(0, maxChars);
      }
    } catch (err) {
      console.warn(`[Materials] Could not extract text from ${relativePath}:`, err.message || err);
    }
  }
  return out.trim();
}

/**
 * Resolve subject name or materialsPath to the actual materials folder name.
 * Handles: exact match, case-insensitive match, and common aliases (Mathematics→Math, Global Politics→GlobalPolitics).
 */
export async function resolveSubjectMaterialsFolder(subjectNameOrPath) {
  const name = (subjectNameOrPath || '').trim();
  if (!name) return null;
  const paths = await getSubjectPaths();
  if (paths[name]) return paths[name];
  const lower = name.toLowerCase();
  for (const folder of Object.keys(paths)) {
    if (folder.toLowerCase() === lower) return paths[folder];
  }
  const aliases = {
    mathematics: 'Math',
    'math': 'Math',
    'mathematics aa': 'MathAA',
    'math aa': 'MathAA',
    'mathematics ai': 'MathAI',
    'math ai': 'MathAI',
    'math applied': 'Math Applied',
    'mathematics applied': 'Math Applied',
    'mathematics: applications and interpretation': 'MathAI',
    'applications and interpretation': 'MathAI',
    'global politics': 'GlobalPolitics',
    'global politic': 'GlobalPolitics',
    'ib biology': 'Biology',
    'ib physics': 'Physics',
    'ib chemistry': 'Chemistry',
    'ib business': 'Business',
    'business management': 'Business',
    'ib economics': 'Economics',
    'ib psychology': 'Psychology',
  };
  const aliasKey = lower.replace(/\s+/g, ' ').trim();
  const folderName = aliases[aliasKey] || aliases[aliasKey.replace(/^ib\s+/, '')];
  if (folderName && paths[folderName]) return paths[folderName];
  return null;
}

/**
 * Get concatenated text from all platform materials for a subject (by folder name or subject name).
 * Used as "Knowledge" for Study & Learn chat. Caps total length to maxChars.
 * Accepts subject name (e.g. "Biology", "Mathematics") or materials folder name (e.g. "Math", "GlobalPolitics").
 */
export async function getSubjectMaterialsText(subjectName, maxChars = 200000) {
  const subjectPath = await resolveSubjectMaterialsFolder(subjectName);
  if (!subjectPath) return '';
  const files = await listFilesRecursive(subjectPath);
  let out = '';
  for (const fullPath of files) {
    if (out.length >= maxChars) break;
    const ext = path.extname(fullPath).toLowerCase();
    if (!SUPPORTED_EXT.includes(ext)) continue;
    try {
      const buffer = await fs.readFile(fullPath);
      const mime = mimeByExt[ext] || 'text/plain';
      const text = await extractTextFromBuffer(buffer, mime, path.basename(fullPath));
      if (text && text.trim()) {
        const rel = path.relative(MATERIALS_PATH, fullPath);
        out += `\n\n--- ${rel} ---\n${text.trim()}`;
        if (out.length > maxChars) out = out.slice(0, maxChars);
      }
    } catch (err) {
      const rel = path.relative(MATERIALS_PATH, fullPath);
      console.warn(`[Materials] Could not extract text from ${rel}:`, err.message || err);
    }
  }
  return out.trim();
}
