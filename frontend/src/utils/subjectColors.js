/**
 * Subject-specific colors (card + badge). Used across Modules, Notes, Quizzes, Flashcards, Subjects, and resource cards.
 * Biology: Sea Green, Chemistry: Blue, Physics: Purple, Economics: Gold, etc.
 */
const SUBJECT_STYLES = {
  biology: {
    className: 'bg-[#2E8B57]/10 border-[#2E8B57]/50 shadow-[0_4px_14px_rgba(46,139,87,0.2)] hover:shadow-[0_8px_24px_rgba(46,139,87,0.28)]',
    badge: 'bg-[#2E8B57] text-white group-hover:bg-[#2E8B57]/90',
    card: 'bg-[#2E8B57]/10 border-[#2E8B57]/50 shadow-[0_4px_14px_rgba(46,139,87,0.2)] hover:shadow-[0_8px_24px_rgba(46,139,87,0.28)]',
  },
  chemistry: {
    className: 'bg-[#1F77B4]/10 border-[#1F77B4]/50 shadow-[0_4px_14px_rgba(31,119,180,0.2)] hover:shadow-[0_8px_24px_rgba(31,119,180,0.28)]',
    badge: 'bg-[#1F77B4] text-white group-hover:bg-[#1F77B4]/90',
    card: 'bg-[#1F77B4]/10 border-[#1F77B4]/50 shadow-[0_4px_14px_rgba(31,119,180,0.2)] hover:shadow-[0_8px_24px_rgba(31,119,180,0.28)]',
  },
  physics: {
    className: 'bg-[#6A0DAD]/10 border-[#6A0DAD]/50 shadow-[0_4px_14px_rgba(106,13,173,0.2)] hover:shadow-[0_8px_24px_rgba(106,13,173,0.28)]',
    badge: 'bg-[#6A0DAD] text-white group-hover:bg-[#6A0DAD]/90',
    card: 'bg-[#6A0DAD]/10 border-[#6A0DAD]/50 shadow-[0_4px_14px_rgba(106,13,173,0.2)] hover:shadow-[0_8px_24px_rgba(106,13,173,0.28)]',
  },
  economics: {
    className: 'bg-[#D4AF37]/10 border-[#D4AF37]/50 shadow-[0_4px_14px_rgba(212,175,55,0.2)] hover:shadow-[0_8px_24px_rgba(212,175,55,0.28)]',
    badge: 'bg-[#D4AF37]/90 text-examia-dark group-hover:bg-[#D4AF37]',
    card: 'bg-[#D4AF37]/10 border-[#D4AF37]/50 shadow-[0_4px_14px_rgba(212,175,55,0.2)] hover:shadow-[0_8px_24px_rgba(212,175,55,0.28)]',
  },
  business: {
    className: 'bg-[#0B3D91]/10 border-[#0B3D91]/50 shadow-[0_4px_14px_rgba(11,61,145,0.2)] hover:shadow-[0_8px_24px_rgba(11,61,145,0.28)]',
    badge: 'bg-[#0B3D91] text-white group-hover:bg-[#0B3D91]/90',
    card: 'bg-[#0B3D91]/10 border-[#0B3D91]/50 shadow-[0_4px_14px_rgba(11,61,145,0.2)] hover:shadow-[0_8px_24px_rgba(11,61,145,0.28)]',
  },
  globalpolitics: {
    className: 'bg-[#C1121F]/10 border-[#C1121F]/50 shadow-[0_4px_14px_rgba(193,18,31,0.2)] hover:shadow-[0_8px_24px_rgba(193,18,31,0.28)]',
    badge: 'bg-[#C1121F] text-white group-hover:bg-[#C1121F]/90',
    card: 'bg-[#C1121F]/10 border-[#C1121F]/50 shadow-[0_4px_14px_rgba(193,18,31,0.2)] hover:shadow-[0_8px_24px_rgba(193,18,31,0.28)]',
  },
  psychology: {
    className: 'bg-[#B497D6]/10 border-[#B497D6]/50 shadow-[0_4px_14px_rgba(180,151,214,0.2)] hover:shadow-[0_8px_24px_rgba(180,151,214,0.28)]',
    badge: 'bg-[#B497D6]/90 text-examia-dark group-hover:bg-[#B497D6]',
    card: 'bg-[#B497D6]/10 border-[#B497D6]/50 shadow-[0_4px_14px_rgba(180,151,214,0.2)] hover:shadow-[0_8px_24px_rgba(180,151,214,0.28)]',
  },
  mathaa: {
    className: 'bg-[#006D77]/10 border-[#006D77]/50 shadow-[0_4px_14px_rgba(0,109,119,0.2)] hover:shadow-[0_8px_24px_rgba(0,109,119,0.28)]',
    badge: 'bg-[#006D77] text-white group-hover:bg-[#006D77]/90',
    card: 'bg-[#006D77]/10 border-[#006D77]/50 shadow-[0_4px_14px_rgba(0,109,119,0.2)] hover:shadow-[0_8px_24px_rgba(0,109,119,0.28)]',
  },
  mathai: {
    className: 'bg-[#2A9D8F]/10 border-[#2A9D8F]/50 shadow-[0_4px_14px_rgba(42,157,143,0.2)] hover:shadow-[0_8px_24px_rgba(42,157,143,0.28)]',
    badge: 'bg-[#2A9D8F] text-white group-hover:bg-[#2A9D8F]/90',
    card: 'bg-[#2A9D8F]/10 border-[#2A9D8F]/50 shadow-[0_4px_14px_rgba(42,157,143,0.2)] hover:shadow-[0_8px_24px_rgba(42,157,143,0.28)]',
  },
  tok: {
    className: 'bg-[#F4A261]/10 border-[#F4A261]/50 shadow-[0_4px_14px_rgba(244,162,97,0.2)] hover:shadow-[0_8px_24px_rgba(244,162,97,0.28)]',
    badge: 'bg-[#F4A261]/90 text-examia-dark group-hover:bg-[#F4A261]',
    card: 'bg-[#F4A261]/10 border-[#F4A261]/50 shadow-[0_4px_14px_rgba(244,162,97,0.2)] hover:shadow-[0_8px_24px_rgba(244,162,97,0.28)]',
  },
  default: {
    className: 'bg-[#526D82]/10 border-[#526D82]/50 shadow-[0_4px_14px_rgba(82,109,130,0.2)] hover:shadow-[0_8px_24px_rgba(82,109,130,0.28)]',
    badge: 'bg-[#526D82] text-white group-hover:bg-[#526D82]/90',
    card: 'bg-[#526D82]/10 border-[#526D82]/50 shadow-[0_4px_14px_rgba(82,109,130,0.2)] hover:shadow-[0_8px_24px_rgba(82,109,130,0.28)]',
  },
};

function normalizeKey(nameOrPath) {
  if (!nameOrPath || typeof nameOrPath !== 'string') return '';
  return nameOrPath
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*&\s*/g, ' ')
    .replace(/[\s-]+/g, ' ');
}

function getSubjectKey(subject) {
  const name = (subject?.name || subject?.materialsPath || (typeof subject === 'string' ? subject : '') || '').trim();
  if (!name) return 'default';
  const key = normalizeKey(name);
  if (key.includes('biology')) return 'biology';
  if (key.includes('chemistry')) return 'chemistry';
  if (key.includes('physics')) return 'physics';
  if (key.includes('economics')) return 'economics';
  if (key.includes('business')) return 'business';
  if (key.includes('global') || key.includes('politics')) return 'globalpolitics';
  if (key.includes('psychology')) return 'psychology';
  if (key.includes('analysis') || key === 'math aa' || key === 'mathaa') return 'mathaa';
  if (key.includes('application') || key === 'math ai' || key === 'mathai') return 'mathai';
  if (key.includes('math')) return 'mathaa';
  if (key.includes('tok') || key.includes('theory of knowledge')) return 'tok';
  return 'default';
}

/**
 * Returns { className, badge, card } for a subject.
 */
export function getSubjectCardStyle(subject) {
  const key = getSubjectKey(subject);
  return SUBJECT_STYLES[key] || SUBJECT_STYLES.default;
}
