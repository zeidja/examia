/**
 * Subject-specific IA idea generators, revision coaches, and chat agents.
 * Seeded to MongoDB; runtime fallbacks via aiPromptSeedData.
 */
import { BIOLOGY_IDEA_GENERATOR_SYSTEM_PROMPT, BIOLOGY_IDEA_CONFIG_JSON } from './biologyIdeaGenerator.js';
import { BIOLOGY_IA_REVISION_SYSTEM_PROMPT, BIOLOGY_IA_CONFIG_JSON } from './biologyIARevision.js';
import { BUSINESS_IDEA_GENERATOR_SYSTEM_PROMPT, BUSINESS_IDEA_CONFIG_JSON } from './businessIdeaGenerator.js';
import { BUSINESS_IA_REVISION_SYSTEM_PROMPT, BUSINESS_IA_CONFIG_JSON } from './businessIARevision.js';
import { CHEMISTRY_IDEA_GENERATOR_SYSTEM_PROMPT, CHEMISTRY_IDEA_CONFIG_JSON } from './chemistryIdeaGenerator.js';
import { CHEMISTRY_IA_REVISION_SYSTEM_PROMPT, CHEMISTRY_IA_CONFIG_JSON } from './chemistryIARevision.js';
import { ECONOMICS_IDEA_GENERATOR_SYSTEM_PROMPT, ECONOMICS_IDEA_CONFIG_JSON } from './economicsIdeaGenerator.js';
import { ECONOMICS_IA_REVISION_SYSTEM_PROMPT, ECONOMICS_IA_CONFIG_JSON } from './economicsIARevision.js';
import { GLOBAL_POLITICS_IDEA_GENERATOR_SYSTEM_PROMPT, GLOBAL_POLITICS_IDEA_CONFIG_JSON } from './globalPoliticsIdeaGenerator.js';
import { GLOBAL_POLITICS_IA_REVISION_SYSTEM_PROMPT, GLOBAL_POLITICS_IA_CONFIG_JSON } from './globalPoliticsIARevision.js';
import { MATH_AA_IDEA_GENERATOR_SYSTEM_PROMPT, MATH_AA_IDEA_CONFIG_JSON } from './mathAAIdeaGenerator.js';
import { MATH_AA_IA_REVISION_SYSTEM_PROMPT, MATH_AA_IA_CONFIG_JSON } from './mathAAIARevision.js';
import { MATH_AI_IDEA_GENERATOR_SYSTEM_PROMPT, MATH_AI_IDEA_CONFIG_JSON } from './mathAIIdeaGenerator.js';
import { MATH_AI_IA_REVISION_SYSTEM_PROMPT, MATH_AI_IA_CONFIG_JSON } from './mathAIIARevision.js';
import { PHYSICS_IDEA_GENERATOR_SYSTEM_PROMPT, PHYSICS_IDEA_CONFIG_JSON } from './physicsIdeaGenerator.js';
import { PHYSICS_IA_REVISION_SYSTEM_PROMPT, PHYSICS_IA_CONFIG_JSON } from './physicsIARevision.js';
import { PSYCHOLOGY_IDEA_GENERATOR_SYSTEM_PROMPT, PSYCHOLOGY_IDEA_CONFIG_JSON } from './psychologyIdeaGenerator.js';
import { PSYCHOLOGY_IA_REVISION_SYSTEM_PROMPT, PSYCHOLOGY_IA_CONFIG_JSON } from './psychologyIARevision.js';
import { TOK_ESSAY_IDEA_GENERATOR_SYSTEM_PROMPT, TOK_ESSAY_IDEA_CONFIG_JSON } from './tokEssayIdeaGenerator.js';
import { TOK_ESSAY_IA_REVISION_SYSTEM_PROMPT, TOK_ESSAY_IA_CONFIG_JSON } from './tokEssayIARevision.js';
import { TOK_EXHIBITION_IDEA_GENERATOR_SYSTEM_PROMPT, TOK_EXHIBITION_IDEA_CONFIG_JSON } from './tokExhibitionIdeaGenerator.js';
import { TOK_EXHIBITION_IA_REVISION_SYSTEM_PROMPT, TOK_EXHIBITION_IA_CONFIG_JSON } from './tokExhibitionIARevision.js';
import { FEYNMAN_AGENT_SYSTEM_PROMPT } from './feynmanAgent.js';
import { STUDY_LEARN_SYSTEM_PROMPT } from './studyLearnPrompt.js';

function idea(key, name, sortOrder, description, systemPrompt, configJson) {
  return {
    key,
    name,
    category: 'ideas_subject',
    sortOrder,
    description,
    systemPrompt,
    userPromptTemplate: '',
    configJson,
    systemSuffix: '',
    isActive: true,
  };
}

function revision(key, name, sortOrder, description, systemPrompt, configJson, userPromptTemplate) {
  return {
    key,
    name,
    category: 'revision_subject',
    sortOrder,
    description,
    systemPrompt,
    userPromptTemplate,
    configJson,
    systemSuffix: '',
    isActive: true,
  };
}

const U = {
  biology: `Review this IB Biology Internal Assessment draft. Provide detailed revision feedback following your instructions. Use only the headings and structure specified.

--- Student's draft ---

{{content}}`,
  business: `Review this IB Business Management Internal Assessment draft. Provide revision feedback following your instructions. Use only the headings and structure specified.

--- Student's draft ---

{{content}}`,
  chemistry: `Review this IB Chemistry Internal Assessment draft. Provide detailed revision feedback following your instructions. Use only the headings and structure specified.

--- Student's draft ---

{{content}}`,
  economics: `Review this IB Economics Internal Assessment commentary (or commentaries). Provide revision feedback following your instructions. Use only the headings and structure specified.

--- Student's draft ---

{{content}}`,
  globalPolitics: `Review this IB Global Politics Engagement Project draft. Provide diagnostic revision feedback following your instructions. Use only the headings and structure specified. Do not write content for the student.

--- Student's draft ---

{{content}}`,
  mathAA: `Review this IB Mathematics AA (Analysis and Approaches) Exploration draft. Provide revision-focused feedback following your instructions. Do not assign marks or bands. End with a short checklist of high-impact revisions (max 5 items).

--- Student's draft ---

{{content}}`,
  mathAI: `Review this IB Mathematics AI (Applications and Interpretation) Exploration draft. Provide revision-focused feedback following your instructions. Do not assign marks or bands. End with a short checklist of high-impact revisions (max 5 items).

--- Student's draft ---

{{content}}`,
  physics: `Review this IB Physics Internal Assessment draft. Provide precise revision-focused feedback following your instructions. Use only the headings and structure specified. Do not assign marks or rewrite content.

--- Student's draft ---

{{content}}`,
  psychology: `Evaluate this IB Psychology IA research proposal draft. Provide diagnostic, criterion-aligned feedback using only the headings and structure specified. Do not assign marks or rewrite the proposal.

--- Student's draft ---

{{content}}`,
  tokEssay: `Review this TOK Essay draft. Provide diagnostic feedback following your instructions. Use only the headings and structure specified (Overall Alignment, Strengths vs Limitations table, Targeted Revision Guidance). Do not assign marks or rewrite paragraphs.

--- Student's draft ---

{{content}}`,
  tokExhibition: `Review this TOK Exhibition draft. Provide revision feedback following your instructions. Use only the structure specified (Critical issues, Object-by-object feedback, TOK thinking overview, Strengths vs limitations table, Revision checklist). Do not assign marks or rewrite commentary.

--- Student's draft ---

{{content}}`,
};

export function getExtendedAiPromptSpecs() {
  return [
    idea('biology_idea_generator', 'Biology — IA idea generator', 110, 'Ideas tab / IA planner when subject is Biology.', BIOLOGY_IDEA_GENERATOR_SYSTEM_PROMPT, BIOLOGY_IDEA_CONFIG_JSON),
    idea('business_idea_generator', 'Business — IA idea generator', 120, 'Ideas tab when subject is Business Management.', BUSINESS_IDEA_GENERATOR_SYSTEM_PROMPT, BUSINESS_IDEA_CONFIG_JSON),
    idea('chemistry_idea_generator', 'Chemistry — IA idea generator', 130, 'Ideas tab when subject is Chemistry.', CHEMISTRY_IDEA_GENERATOR_SYSTEM_PROMPT, CHEMISTRY_IDEA_CONFIG_JSON),
    idea('economics_idea_generator', 'Economics — IA article checker', 140, 'Ideas tab when subject is Economics (article workflow).', ECONOMICS_IDEA_GENERATOR_SYSTEM_PROMPT, ECONOMICS_IDEA_CONFIG_JSON),
    idea('global_politics_idea_generator', 'Global Politics — engagement ideas', 150, 'Ideas tab when subject is Global Politics.', GLOBAL_POLITICS_IDEA_GENERATOR_SYSTEM_PROMPT, GLOBAL_POLITICS_IDEA_CONFIG_JSON),
    idea('math_aa_idea_generator', 'Mathematics AA — IA idea generator', 160, 'Ideas tab for Mathematics: Analysis & Approaches.', MATH_AA_IDEA_GENERATOR_SYSTEM_PROMPT, MATH_AA_IDEA_CONFIG_JSON),
    idea('math_ai_idea_generator', 'Mathematics AI — IA idea generator', 170, 'Ideas tab for Mathematics: Applications & Interpretation.', MATH_AI_IDEA_GENERATOR_SYSTEM_PROMPT, MATH_AI_IDEA_CONFIG_JSON),
    idea('physics_idea_generator', 'Physics — IA idea generator', 180, 'Ideas tab when subject is Physics.', PHYSICS_IDEA_GENERATOR_SYSTEM_PROMPT, PHYSICS_IDEA_CONFIG_JSON),
    idea('psychology_idea_generator', 'Psychology — IA idea generator', 190, 'Ideas tab when subject is Psychology.', PSYCHOLOGY_IDEA_GENERATOR_SYSTEM_PROMPT, PSYCHOLOGY_IDEA_CONFIG_JSON),
    idea('tok_essay_idea_generator', 'TOK Essay — planning assistant', 200, 'Ideas chat when subject is TOK Essay.', TOK_ESSAY_IDEA_GENERATOR_SYSTEM_PROMPT, TOK_ESSAY_IDEA_CONFIG_JSON),
    idea('tok_exhibition_idea_generator', 'TOK Exhibition — idea generator', 205, 'Ideas chat when subject is TOK Exhibition.', TOK_EXHIBITION_IDEA_GENERATOR_SYSTEM_PROMPT, TOK_EXHIBITION_IDEA_CONFIG_JSON),

    revision('biology_ia_revision', 'Biology — IA revision coach', 210, 'Feedback on Biology IA drafts.', BIOLOGY_IA_REVISION_SYSTEM_PROMPT, BIOLOGY_IA_CONFIG_JSON, U.biology),
    revision('business_ia_revision', 'Business — IA revision coach', 220, 'Feedback on Business IA drafts.', BUSINESS_IA_REVISION_SYSTEM_PROMPT, BUSINESS_IA_CONFIG_JSON, U.business),
    revision('chemistry_ia_revision', 'Chemistry — IA revision coach', 230, 'Feedback on Chemistry IA drafts.', CHEMISTRY_IA_REVISION_SYSTEM_PROMPT, CHEMISTRY_IA_CONFIG_JSON, U.chemistry),
    revision('economics_ia_revision', 'Economics — IA revision coach', 240, 'Feedback on Economics commentary drafts.', ECONOMICS_IA_REVISION_SYSTEM_PROMPT, ECONOMICS_IA_CONFIG_JSON, U.economics),
    revision('global_politics_ia_revision', 'Global Politics — project feedback', 250, 'Feedback on Engagement Project drafts.', GLOBAL_POLITICS_IA_REVISION_SYSTEM_PROMPT, GLOBAL_POLITICS_IA_CONFIG_JSON, U.globalPolitics),
    revision('math_aa_ia_revision', 'Mathematics AA — exploration feedback', 260, 'Feedback on Math AA exploration drafts.', MATH_AA_IA_REVISION_SYSTEM_PROMPT, MATH_AA_IA_CONFIG_JSON, U.mathAA),
    revision('math_ai_ia_revision', 'Mathematics AI — exploration feedback', 270, 'Feedback on Math AI exploration drafts.', MATH_AI_IA_REVISION_SYSTEM_PROMPT, MATH_AI_IA_CONFIG_JSON, U.mathAI),
    revision('physics_ia_revision', 'Physics — IA revision coach', 280, 'Feedback on Physics IA drafts.', PHYSICS_IA_REVISION_SYSTEM_PROMPT, PHYSICS_IA_CONFIG_JSON, U.physics),
    revision('psychology_ia_revision', 'Psychology — IA revision coach', 290, 'Feedback on Psychology IA proposal drafts.', PSYCHOLOGY_IA_REVISION_SYSTEM_PROMPT, PSYCHOLOGY_IA_CONFIG_JSON, U.psychology),
    revision('tok_essay_ia_revision', 'TOK Essay — feedback coach', 300, 'Feedback on TOK Essay drafts (external assessment).', TOK_ESSAY_IA_REVISION_SYSTEM_PROMPT, TOK_ESSAY_IA_CONFIG_JSON, U.tokEssay),
    revision('tok_exhibition_ia_revision', 'TOK Exhibition — feedback coach', 310, 'Feedback on TOK Exhibition drafts.', TOK_EXHIBITION_IA_REVISION_SYSTEM_PROMPT, TOK_EXHIBITION_IA_CONFIG_JSON, U.tokExhibition),

    {
      key: 'feynman_agent',
      name: 'Feynman Class — guided agent',
      category: 'chat',
      sortOrder: 400,
      description: 'Student teaches the AI; evaluation after the session. Placeholder: {{subjectName}}.',
      systemPrompt: FEYNMAN_AGENT_SYSTEM_PROMPT,
      userPromptTemplate: '',
      configJson: '',
      systemSuffix: '',
      isActive: true,
    },
    {
      key: 'study_learn',
      name: 'Study & Learn — IB tutor',
      category: 'chat',
      sortOrder: 410,
      description: 'Adaptive tutor using uploaded materials as Knowledge (appended at runtime).',
      systemPrompt: STUDY_LEARN_SYSTEM_PROMPT,
      userPromptTemplate: '',
      configJson: '',
      systemSuffix: '',
      isActive: true,
    },
  ];
}
