import mongoose from 'mongoose';

/** Distinct class ObjectId strings assigned to a resource (multi-class or legacy single `class`). */
export function assignedClassIdStrings(resource) {
  if (!resource) return [];
  const raw = resource.classes;
  const fromArr = Array.isArray(raw)
    ? raw
        .map((c) => {
          if (c == null) return null;
          if (typeof c === 'object' && c._id != null) return c._id.toString();
          return c.toString();
        })
        .filter(Boolean)
    : [];
  const uniq = [...new Set(fromArr)];
  if (uniq.length > 0) return uniq;
  const c = resource.class;
  if (c == null) return [];
  const id = typeof c === 'object' && c._id != null ? c._id.toString() : c.toString();
  return id ? [id] : [];
}

/** True if resource is not restricted to specific classes (school-wide for this subject). */
export function isSchoolWideResource(resource) {
  return assignedClassIdStrings(resource).length === 0;
}

/** Student may open resource: school-wide, or their class is in assigned list. */
export function studentHasClassAccess(resource, userClassId) {
  const ids = assignedClassIdStrings(resource);
  const uid = userClassId != null ? userClassId.toString() : null;
  if (ids.length === 0) return true;
  if (!uid) return false;
  return ids.includes(uid);
}

/**
 * Normalize `class` + `classes` on a create/update body.
 * - One id → class set, classes = [id]
 * - Several → class null, classes = ids
 * - None → class null, classes = []
 */
export function normalizeResourceClassFields(body) {
  const raw = body.classes;
  let ids = [];
  if (Array.isArray(raw) && raw.length) {
    ids = [...new Set(raw.map((id) => String(id)).filter((id) => mongoose.Types.ObjectId.isValid(id)))];
  }
  if (!ids.length && body.class != null && body.class !== '') {
    const id = String(body.class);
    if (mongoose.Types.ObjectId.isValid(id)) ids = [id];
  }
  body.classes = ids;
  if (ids.length === 1) {
    body.class = ids[0];
  } else if (ids.length > 1) {
    body.class = null;
  } else {
    body.class = null;
    body.classes = [];
  }
}
