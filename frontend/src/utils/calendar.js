export function formatDateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function getCalendarMonthCells(year, month) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startPad = new Date(year, month, 1).getDay();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(new Date(year, month, d));
  return cells;
}

export function monthLabel(year, month) {
  return new Date(year, month, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

export function eventsOnDay(events, day) {
  const key = formatDateKey(day);
  return events.filter((e) => formatDateKey(new Date(e.startAt)) === key);
}

export function daysWithEvents(events) {
  const set = new Set();
  for (const e of events) set.add(formatDateKey(new Date(e.startAt)));
  return set;
}

/** Kinds present on a given day (for colored markers). */
export function kindsOnDay(events, day) {
  const key = formatDateKey(day);
  const kinds = new Set();
  for (const e of events) {
    if (formatDateKey(new Date(e.startAt)) === key) {
      kinds.add(e.kind || 'deadline');
    }
  }
  return kinds;
}

/** Map date key -> Set of event kinds for the visible month. */
export function kindsByDateKey(events) {
  const map = new Map();
  for (const e of events) {
    const key = formatDateKey(new Date(e.startAt));
    const kind = e.kind || 'deadline';
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(kind);
  }
  return map;
}

export const EVENT_KIND_ORDER = ['school_event', 'quiz_available', 'quiz_deadline', 'flash_deadline', 'deadline'];

export const EVENT_KIND_META = {
  school_event: {
    label: 'School event',
    dot: 'bg-violet-500',
    dotSelected: 'bg-violet-200',
    ring: 'ring-violet-400/50',
    dayTint: 'bg-violet-50',
    accent: 'border-l-violet-500',
    card: 'bg-violet-50/90 text-violet-950 border-violet-200/80',
    badge: 'bg-violet-100 text-violet-800',
  },
  quiz_available: {
    label: 'Quiz opens',
    dot: 'bg-sky-500',
    dotSelected: 'bg-sky-200',
    ring: 'ring-sky-400/50',
    dayTint: 'bg-sky-50',
    accent: 'border-l-sky-500',
    card: 'bg-sky-50/90 text-sky-950 border-sky-200/80',
    badge: 'bg-sky-100 text-sky-800',
  },
  quiz_deadline: {
    label: 'Quiz due',
    dot: 'bg-rose-500',
    dotSelected: 'bg-rose-200',
    ring: 'ring-rose-400/50',
    dayTint: 'bg-rose-50',
    accent: 'border-l-rose-500',
    card: 'bg-rose-50/90 text-rose-950 border-rose-200/80',
    badge: 'bg-rose-100 text-rose-800',
  },
  flash_deadline: {
    label: 'Flashcards due',
    dot: 'bg-amber-500',
    dotSelected: 'bg-amber-200',
    ring: 'ring-amber-400/50',
    dayTint: 'bg-amber-50',
    accent: 'border-l-amber-500',
    card: 'bg-amber-50/90 text-amber-950 border-amber-200/80',
    badge: 'bg-amber-100 text-amber-800',
  },
  deadline: {
    label: 'Due date',
    dot: 'bg-slate-500',
    dotSelected: 'bg-slate-200',
    ring: 'ring-slate-400/50',
    dayTint: 'bg-slate-50',
    accent: 'border-l-slate-500',
    card: 'bg-slate-50/90 text-slate-950 border-slate-200/80',
    badge: 'bg-slate-100 text-slate-800',
  },
};

export function eventKindMeta(kind) {
  return EVENT_KIND_META[kind] || EVENT_KIND_META.deadline;
}

/** Legend entries that actually appear in the current month's events. */
export function activeLegendKinds(events) {
  const kinds = new Set();
  for (const e of events) kinds.add(e.kind || 'deadline');
  return EVENT_KIND_ORDER.filter((k) => kinds.has(k));
}

export function eventTimeLabel(event) {
  if (event.allDay) return 'All day';
  const d = new Date(event.startAt);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** @deprecated use eventKindMeta(kind).card */
export const EVENT_KIND_STYLES = Object.fromEntries(
  Object.entries(EVENT_KIND_META).map(([k, v]) => [k, v.card])
);
