import AIPrompt from '../models/AIPrompt.js';
import { getPromptFallbackMap } from '../config/aiPromptSeedData.js';

const FALLBACK_MAP = getPromptFallbackMap();

export function toPromptPack(doc) {
  if (!doc) return null;
  return {
    key: doc.key,
    systemPrompt: doc.systemPrompt || '',
    userPromptTemplate: doc.userPromptTemplate || '',
    configJson: doc.configJson || '',
    systemSuffix: doc.systemSuffix || '',
  };
}

/** Full system message: main prompt + optional CONFIG JSON block + optional suffix (e.g. quiz rationale). */
export function buildSystemPrompt(pack) {
  if (!pack) return '';
  let s = pack.systemPrompt || '';
  const cfg = (pack.configJson || '').trim();
  if (cfg) {
    s += '\n\n--- CONFIG (authoritative; obey all constraints) ---\n' + cfg;
  }
  const suf = (pack.systemSuffix || '').trim();
  if (suf) {
    s += '\n\n' + suf;
  }
  return s;
}

/**
 * Active prompt from DB, or code fallback if no document.
 * Returns null if the prompt is disabled (isActive false) in DB.
 */
export async function loadActivePrompt(key) {
  const doc = await AIPrompt.findOne({ key }).lean();
  if (doc) {
    if (!doc.isActive) return null;
    return toPromptPack(doc);
  }
  const fb = FALLBACK_MAP[key];
  return fb ? toPromptPack(fb) : null;
}
