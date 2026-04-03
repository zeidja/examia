import { getCoreAiPromptSpecs } from './aiPromptCoreSeed.js';
import { getExtendedAiPromptSpecs } from './aiPromptExtendedSeed.js';

/** All default AI prompt documents (core + subject-specific). */
export function getAllAiPromptSeedDocuments() {
  return [...getCoreAiPromptSpecs(), ...getExtendedAiPromptSpecs()];
}

/** Key → document for runtime fallback when Mongo has no row yet. */
export function getPromptFallbackMap() {
  const map = Object.create(null);
  for (const d of getAllAiPromptSeedDocuments()) {
    map[d.key] = d;
  }
  return map;
}
