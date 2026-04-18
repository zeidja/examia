import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractTextFromBuffer } from '../utils/extractText.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MATERIALS_PATH = path.resolve(__dirname, '../../materials');
const DEFINITIONS_PATH = path.resolve(__dirname, '../../Definitions');
const CHECKLISTS_PATH = path.resolve(__dirname, '../../Checklists');
const COMMAND_TERMS_PATH = path.resolve(__dirname, '../../commandterms');
const IA_GUIDES_PATH = path.resolve(__dirname, '../../IA Guides');

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

/**
 * List definition files for a subject. Definitions folder contains docx files named like "Biology Definitions.docx".
 * Matches by subject name (case-insensitive, normalized). Returns [] if folder missing or no match.
 */
export async function getDefinitionsForSubject(subjectName) {
  const name = (subjectName || '').trim();
  if (!name) return [];
  try {
    const entries = await fs.readdir(DEFINITIONS_PATH, { withFileTypes: true });
    const files = [];
    const normalizedSubject = name.toLowerCase().replace(/\s+/g, ' ');
    const subjectWords = normalizedSubject.split(' ').filter(Boolean);
    for (const ent of entries) {
      if (!ent.isFile() || ent.name.startsWith('.')) continue;
      const ext = path.extname(ent.name).toLowerCase();
      if (ext !== '.docx' && ext !== '.doc' && ext !== '.pdf' && ext !== '.txt') continue;
      const baseName = path.basename(ent.name, ext).toLowerCase().replace(/\s+/g, ' ');
      const match =
        baseName.includes(normalizedSubject) ||
        baseName.includes(normalizedSubject.replace(/\s/g, '')) ||
        subjectWords.every((w) => baseName.includes(w));
      if (match) {
        files.push({ name: ent.name, relativePath: ent.name });
      }
    }
    return files.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

/**
 * Resolve a definitions file path (basename only) to full path. Prevents path traversal.
 */
export function resolveDefinitionsPath(basename) {
  if (!basename || typeof basename !== 'string') return null;
  const safe = path.basename(basename).replace(/\.\./g, '');
  const full = path.resolve(DEFINITIONS_PATH, safe);
  if (!full.startsWith(DEFINITIONS_PATH)) return null;
  return full;
}

function normalizeCommandTermsMatchKey(s) {
  return (s || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[:–—]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strip "IB … Command Terms" filenames to a comparable subject fragment. */
export function commandTermsFileMatchStem(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (!['.docx', '.doc', '.pdf', '.txt'].includes(ext)) return '';
  let base = path.basename(fileName, ext).replace(/\s+/g, ' ').trim();
  base = base.replace(/^IB\s+/i, '').trim();
  base = base.replace(/\s*[—–-]\s*Command Terms.*$/i, '').trim();
  base = base.replace(/\s+Command Terms.*$/i, '').trim();
  return normalizeCommandTermsMatchKey(base);
}

/** Map common subject labels to phrases that appear in official IB command-terms document titles. */
const COMMAND_TERMS_SUBJECT_ALIASES = {
  business: 'business management',
  'global politics': 'global politics',
  globalpolitics: 'global politics',
  gp: 'global politics',
  'math aa': 'mathematics analysis and approaches',
  mathaa: 'mathematics analysis and approaches',
  'mathematics analysis and approaches': 'mathematics analysis and approaches',
  'mathematics: analysis and approaches': 'mathematics analysis and approaches',
  'math ai': 'mathematics application and interpretation',
  mathai: 'mathematics application and interpretation',
  'mathematics application and interpretation': 'mathematics application and interpretation',
  'mathematics: applications and interpretation': 'mathematics application and interpretation',
};

function subjectKeysForCommandTermsMatch(subjectName) {
  const raw = (subjectName || '').trim();
  if (!raw) return [];
  const n = normalizeCommandTermsMatchKey(raw);
  const keys = new Set([n, n.replace(/\s/g, '')]);
  const compact = n.replace(/\s/g, '');
  const alias = COMMAND_TERMS_SUBJECT_ALIASES[n] || COMMAND_TERMS_SUBJECT_ALIASES[compact];
  if (alias) {
    const a = normalizeCommandTermsMatchKey(alias);
    keys.add(a);
    keys.add(a.replace(/\s/g, ''));
  }
  return [...keys].filter(Boolean);
}

function commandTermsStemMatchesSubject(stem, subjectName) {
  if (!stem) return false;
  for (const key of subjectKeysForCommandTermsMatch(subjectName)) {
    if (stem.includes(key) || key.includes(stem)) return true;
  }
  const n = normalizeCommandTermsMatchKey(subjectName);
  const words = n.split(' ').filter((w) => w.length > 1);
  if (words.length && words.every((w) => stem.includes(w))) return true;
  const stemWords = stem.split(' ').filter((w) => w.length > 1);
  if (stemWords.length && stemWords.every((w) => n.includes(w))) return true;
  return false;
}

/**
 * List command-terms files for a subject (docx in /commandterms, matched to subject name / materialsPath).
 */
export async function getCommandTermsForSubject(subjectName) {
  const name = (subjectName || '').trim();
  if (!name) return [];
  try {
    const entries = await fs.readdir(COMMAND_TERMS_PATH, { withFileTypes: true });
    const files = [];
    for (const ent of entries) {
      if (!ent.isFile() || ent.name.startsWith('.')) continue;
      const ext = path.extname(ent.name).toLowerCase();
      if (!['.docx', '.doc', '.pdf', '.txt'].includes(ext)) continue;
      const stem = commandTermsFileMatchStem(ent.name);
      if (commandTermsStemMatchesSubject(stem, name)) {
        files.push({ name: ent.name, relativePath: ent.name });
      }
    }
    return files.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

export function resolveCommandTermsPath(basename) {
  if (!basename || typeof basename !== 'string') return null;
  const safe = path.basename(basename).replace(/\.\./g, '');
  const full = path.resolve(COMMAND_TERMS_PATH, safe);
  if (!full.startsWith(COMMAND_TERMS_PATH)) return null;
  return full;
}

/** Map subject name / materialsPath to Checklists folder name (e.g. "Biology" -> "Biology Checklists"). */
const CHECKLIST_FOLDER_ALIASES = {
  'biology': 'Biology Checklists',
  'business': 'Business Checklists',
  'chemistry': 'Chemistry Checklists',
  'economics': 'Economics Checklists',
  'psychology': 'Psychology Checklists',
  'physics': 'Physics Checklists',
  'mathematics - analysis & approaches': 'Math AA Checklists',
  'math aa': 'Math AA Checklists',
  'mathaa': 'Math AA Checklists',
  'mathematics - application & interpretation': 'Math AI Checklists',
  'math ai': 'Math AI Checklists',
  'mathai': 'Math AI Checklists',
  'global politics': 'Global Politics Checklists',
  'globalpolitics': 'Global Politics Checklists',
};

/**
 * Resolve subject name to the Checklists subfolder name (e.g. "Biology" -> "Biology Checklists").
 * Returns null if no matching folder.
 */
export async function getChecklistsFolderForSubject(subjectName) {
  const name = (subjectName || '').trim();
  if (!name) return null;
  try {
    const entries = await fs.readdir(CHECKLISTS_PATH, { withFileTypes: true });
    const normalizedSubject = name.toLowerCase().replace(/\s+/g, ' ');
    const alias = CHECKLIST_FOLDER_ALIASES[normalizedSubject] || CHECKLIST_FOLDER_ALIASES[normalizedSubject.replace(/\s/g, '')];
    if (alias) {
      const exists = entries.some((e) => e.isDirectory() && e.name === alias);
      return exists ? alias : null;
    }
    for (const ent of entries) {
      if (!ent.isDirectory() || ent.name.startsWith('.')) continue;
      const folderKey = ent.name.replace(/\s*checklists\s*$/i, '').trim().toLowerCase();
      if (!folderKey) continue;
      if (folderKey === normalizedSubject || normalizedSubject.includes(folderKey) || folderKey.includes(normalizedSubject)) return ent.name;
      const subjectWords = normalizedSubject.split(/\s+/).filter(Boolean);
      if (subjectWords.some((w) => folderKey.includes(w)) || folderKey.split(/\s+/).every((w) => normalizedSubject.includes(w))) return ent.name;
    }
    return null;
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

const CHECKLIST_EXT = ['.pdf', '.doc', '.docx', '.txt', '.dotx'];

/**
 * List all checklist files for a subject (recursive under subject's folder in Checklists).
 * Returns [] if folder missing or no match. relativePath is from Checklists root (e.g. "Biology Checklists/C1.3.docx").
 */
export async function getChecklistFilesForSubject(subjectName) {
  const folderName = await getChecklistsFolderForSubject(subjectName);
  if (!folderName) return [];
  const subjectPath = path.join(CHECKLISTS_PATH, folderName);
  try {
    const files = await listFilesRecursive(subjectPath);
    const list = [];
    for (const fullPath of files) {
      const ext = path.extname(fullPath).toLowerCase();
      if (!CHECKLIST_EXT.includes(ext)) continue;
      const rel = path.relative(CHECKLISTS_PATH, fullPath);
      const relativePath = rel.split(path.sep).join('/');
      list.push({ name: path.basename(fullPath), relativePath });
    }
    return list.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

/**
 * Resolve a checklists file path (relative to Checklists root) to full path. Prevents path traversal.
 */
export function resolveChecklistsPath(relativePath) {
  if (!relativePath || typeof relativePath !== 'string') return null;
  const normalized = path.normalize(relativePath.replace(/\//g, path.sep)).replace(/^(\.\.(\/|\\|$))+/, '');
  const full = path.resolve(CHECKLISTS_PATH, normalized);
  if (!full.startsWith(CHECKLISTS_PATH)) return null;
  return full;
}

/** First matching rule wins (TOK exhibition before essay). Filenames must match repo IA Guides/. */
const IA_GUIDE_RULES = [
  { re: /tok\s*exhibition|exhibition/i, file: 'IB Theory of Knowledge Exhibition Guide.docx' },
  { re: /tok\s*essay|^tok$/i, file: 'IB Theory of Knowledge Essay Guide.docx' },
  {
    re: /analysis\s*&\s*approaches|mathematics\s*[-–]\s*analysis|mathematics\s*:\s*analysis|math\s*aa|\baa\b/i,
    file: 'IB Mathematics Analysis Guide.docx',
  },
  {
    re: /application\s*&\s*interpretation|mathematics\s*[-–]\s*application|mathematics\s*:\s*application|math\s*ai|\bai\b/i,
    file: 'IB Mathematics Applications Guide.docx',
  },
  { re: /global\s*politics/i, file: 'IB Global Politics Engagement Project Guide.docx' },
  { re: /business\s*management|^business$/i, file: 'IB Business Management Internal Assessment Guide.docx' },
  { re: /biology/i, file: 'IB Biology Internal Assessment Guide.docx' },
  { re: /chemistry/i, file: 'IB Chemistry Internal Assessment Guide.docx' },
  { re: /physics/i, file: 'IB Physics Internal Assessment Guide.docx' },
  { re: /economics/i, file: 'IB Economics Internal Assessment Guide.docx' },
  { re: /psychology/i, file: 'IB Psychology Internal Assessment Guide.docx' },
];

/**
 * Resolve full path to the IA Guide .docx for a subject display name (or materialsPath).
 * Returns null if folder missing, no match, or file not on disk.
 */
export async function findIaGuideFileForSubject(subjectName) {
  const name = (subjectName || '').trim();
  if (!name) return null;

  for (const { re, file } of IA_GUIDE_RULES) {
    if (!re.test(name)) continue;
    const full = path.resolve(IA_GUIDES_PATH, path.basename(file));
    if (!full.startsWith(IA_GUIDES_PATH)) continue;
    if (existsSync(full)) return full;
  }

  try {
    const entries = await fs.readdir(IA_GUIDES_PATH, { withFileTypes: true });
    const docx = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.docx')).map((e) => e.name);
    const lower = name.toLowerCase();
    const words = lower.split(/\s+/).filter((w) => w.length > 2);
    let best = null;
    let bestScore = 0;
    for (const fname of docx) {
      const fl = fname.toLowerCase();
      let score = 0;
      for (const w of words) {
        if (fl.includes(w)) score += w.length;
      }
      if (score > bestScore) {
        bestScore = score;
        best = fname;
      }
    }
    if (best && bestScore >= 5) {
      const full = path.resolve(IA_GUIDES_PATH, best);
      if (full.startsWith(IA_GUIDES_PATH) && existsSync(full)) return full;
    }
  } catch {
    /* ENOENT */
  }
  return null;
}
