/**
 * Return display name for a file: strip extension and use basename if path.
 * e.g. "Biology Definitions.docx" -> "Biology Definitions"
 *      "Biology Checklists/C1.3 Photosynthesis.docx" -> "C1.3 Photosynthesis"
 */
export function fileNameWithoutExtension(name) {
  if (name == null || typeof name !== 'string') return name ?? '';
  const base = name.includes('/') ? name.split('/').pop() : name;
  return base.replace(/\.[^.]+$/, '') || base;
}

/**
 * Format an instant for <input type="datetime-local" /> using the browser’s local calendar (not UTC).
 * Avoid `toISOString().slice(0,16)` — that shows UTC and shifts times for non-UTC users.
 */
export function formatDateForDatetimeLocal(date) {
  if (date == null) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Convert a datetime-local control value (local wall time, no offset) to an ISO UTC string for the API.
 * Parsing in the browser ties the value to the teacher’s timezone; the server stores an unambiguous instant.
 */
export function datetimeLocalValueToIsoString(localValue) {
  if (localValue == null || typeof localValue !== 'string' || !localValue.trim()) return null;
  const d = new Date(localValue.trim());
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * When the UI already shows option index as a letter (A, B, …), remove the same
 * leading label from stored text (e.g. "A) Photosynthesis" → "Photosynthesis", "A)A" → "A").
 */
export function stripDuplicateMcqLetterPrefix(text, optionIndex) {
  if (text == null) return '';
  const s = String(text);
  if (typeof optionIndex !== 'number' || optionIndex < 0 || optionIndex > 25) return s;
  const letter = String.fromCharCode(65 + optionIndex);
  const esc = letter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^\\s*(?:\\(\\s*${esc}\\s*\\)\\s*|${esc}\\s*[)\\.:]\\s*)`, 'i');
  let out = s;
  for (let k = 0; k < 5; k++) {
    const next = out.replace(re, '');
    if (next === out) break;
    out = next;
  }
  const trimmed = out.trimStart();
  return trimmed.length ? trimmed : s.trim();
}
