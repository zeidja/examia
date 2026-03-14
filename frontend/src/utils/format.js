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
