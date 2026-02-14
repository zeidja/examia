import OpenAI from 'openai';
import AIPrompt from '../models/AIPrompt.js';
import { BIOLOGY_IA_REVISION_SYSTEM_PROMPT, BIOLOGY_IA_CONFIG_JSON } from '../config/biologyIARevision.js';
import { BUSINESS_IA_REVISION_SYSTEM_PROMPT, BUSINESS_IA_CONFIG_JSON } from '../config/businessIARevision.js';
import { CHEMISTRY_IA_REVISION_SYSTEM_PROMPT, CHEMISTRY_IA_CONFIG_JSON } from '../config/chemistryIARevision.js';
import { ECONOMICS_IA_REVISION_SYSTEM_PROMPT, ECONOMICS_IA_CONFIG_JSON } from '../config/economicsIARevision.js';
import { GLOBAL_POLITICS_IA_REVISION_SYSTEM_PROMPT, GLOBAL_POLITICS_IA_CONFIG_JSON } from '../config/globalPoliticsIARevision.js';
import { MATH_AA_IA_REVISION_SYSTEM_PROMPT, MATH_AA_IA_CONFIG_JSON } from '../config/mathAAIARevision.js';
import { MATH_AI_IA_REVISION_SYSTEM_PROMPT, MATH_AI_IA_CONFIG_JSON } from '../config/mathAIIARevision.js';
import { PHYSICS_IA_REVISION_SYSTEM_PROMPT, PHYSICS_IA_CONFIG_JSON } from '../config/physicsIARevision.js';
import { PSYCHOLOGY_IA_REVISION_SYSTEM_PROMPT, PSYCHOLOGY_IA_CONFIG_JSON } from '../config/psychologyIARevision.js';
import { BIOLOGY_IDEA_GENERATOR_SYSTEM_PROMPT, BIOLOGY_IDEA_CONFIG_JSON } from '../config/biologyIdeaGenerator.js';
import { BUSINESS_IDEA_GENERATOR_SYSTEM_PROMPT, BUSINESS_IDEA_CONFIG_JSON } from '../config/businessIdeaGenerator.js';
import { CHEMISTRY_IDEA_GENERATOR_SYSTEM_PROMPT, CHEMISTRY_IDEA_CONFIG_JSON } from '../config/chemistryIdeaGenerator.js';
import { ECONOMICS_IDEA_GENERATOR_SYSTEM_PROMPT, ECONOMICS_IDEA_CONFIG_JSON } from '../config/economicsIdeaGenerator.js';
import { GLOBAL_POLITICS_IDEA_GENERATOR_SYSTEM_PROMPT, GLOBAL_POLITICS_IDEA_CONFIG_JSON } from '../config/globalPoliticsIdeaGenerator.js';
import { MATH_AA_IDEA_GENERATOR_SYSTEM_PROMPT, MATH_AA_IDEA_CONFIG_JSON } from '../config/mathAAIdeaGenerator.js';
import { MATH_AI_IDEA_GENERATOR_SYSTEM_PROMPT, MATH_AI_IDEA_CONFIG_JSON } from '../config/mathAIIdeaGenerator.js';
import { PHYSICS_IDEA_GENERATOR_SYSTEM_PROMPT, PHYSICS_IDEA_CONFIG_JSON } from '../config/physicsIdeaGenerator.js';
import { PSYCHOLOGY_IDEA_GENERATOR_SYSTEM_PROMPT, PSYCHOLOGY_IDEA_CONFIG_JSON } from '../config/psychologyIdeaGenerator.js';
import { FEYNMAN_AGENT_SYSTEM_PROMPT } from '../config/feynmanAgent.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function fillTemplate(template, vars = {}) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v ?? ''));
  }
  return out;
}

export async function getPromptConfig(key) {
  const doc = await AIPrompt.findOne({ key, isActive: true });
  return doc;
}

export async function generateWithPrompt(key, userVars = {}, extraSystemContext = '') {
  const config = await getPromptConfig(key);
  if (!config) throw new Error(`AI prompt not found: ${key}`);
  const systemPrompt = (config.systemPrompt || '') + (extraSystemContext ? '\n\n' + extraSystemContext : '');
  const userContent = fillTemplate(config.userPromptTemplate, userVars);
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.7,
  });
  const text = completion.choices?.[0]?.message?.content ?? '';
  return text;
}

export async function generateFlashCards(subject, topic, count = 10, resourcesContext = '') {
  return generateWithPrompt(
    'flash_cards',
    { subject, topic, count: String(count) },
    resourcesContext
  );
}

/** Extra instruction so quiz JSON always includes rationale (explanation) per question. */
const QUIZ_RATIONALE_INSTRUCTION = `
OUTPUT REQUIREMENT: Your response must be a single valid JSON object with a "questions" array. Every question object MUST include:
- "question" (string), "options" (array of 4 strings), "correct" (number 0-3), and "rationale" (string).
- "rationale": a short explanation of why the correct answer is right, based on the material. This is shown to students after they answer. Do not omit it.`;

export async function generateQuizzes(subject, topic, count = 5, resourcesContext = '') {
  const extraContext = (resourcesContext || '').trim()
    ? resourcesContext.trim() + QUIZ_RATIONALE_INSTRUCTION
    : QUIZ_RATIONALE_INSTRUCTION;
  return generateWithPrompt(
    'quizzes',
    { subject, topic, count: String(count) },
    extraContext
  );
}

export async function generateTOK(promptText, resourcesContext = '') {
  return generateWithPrompt('tok', { prompt: promptText }, resourcesContext);
}

export async function generateExternalAssessment(subject, topic, resourcesContext = '') {
  return generateWithPrompt('external_assessment', { subject, topic }, resourcesContext);
}

export async function generateInternalAssessment(subject, topic, resourcesContext = '') {
  return generateWithPrompt('internal_assessment', { subject, topic }, resourcesContext);
}

/** True when subject is Mathematics: Applications and Interpretation (AI). Used to route to Math AI configs/prompts. */
function isMathAI(subjectName) {
  const n = (subjectName || '').toLowerCase().trim();
  if (!n.includes('math') && !n.includes('mathematic')) return false;
  return (
    n.includes('math ai') ||
    n.includes('mathematics ai') ||
    n.includes('applications') ||
    n.includes('interpretation') ||
    (n.includes('applied') && (n.includes('math') || n.includes('mathematic')))
  );
}

export async function generateIdeas(subject, resourcesContext = '', options = {}) {
  const subjectName = (subject && (typeof subject === 'string' ? subject : subject?.name)) || 'General';
  const lower = subjectName.toLowerCase();
  if (lower.includes('biology')) {
    return generateBiologyIdeas(subjectName, resourcesContext, {
      student_topic_interest: options.student_topic_interest || subjectName,
      preferred_biology_unit_or_theme: options.preferred_biology_unit_or_theme,
      preferred_organism_or_system: options.preferred_organism_or_system,
      teacher_constraints: options.teacher_constraints,
      preferred_complexity: options.preferred_complexity,
    });
  }
  if (lower.includes('business')) {
    return generateBusinessIdeas(subjectName, resourcesContext, {
      industry: options.industry,
      company_preference: options.company_preference,
      key_concept: options.key_concept,
      forward_backward: options.forward_backward,
      business_areas: options.business_areas,
      primary_secondary: options.primary_secondary,
      constraints: options.constraints,
    });
  }
  if (lower.includes('chemistry')) {
    return generateChemistryIdeas(subjectName, resourcesContext, {
      student_topic_interest: options.student_topic_interest || subjectName,
      preferred_chemistry_topic_area: options.preferred_chemistry_topic_area,
      teacher_constraints: options.teacher_constraints,
      available_equipment_and_chemicals: options.available_equipment_and_chemicals,
      time_constraints: options.time_constraints,
      safety_constraints: options.safety_constraints,
      access_to_colorimeter_or_ph_meter: options.access_to_colorimeter_or_ph_meter,
      known_available_concentrations_or_stock_solutions: options.known_available_concentrations_or_stock_solutions,
    });
  }
  if (lower.includes('economic')) {
    return generateEconomicsArticleCheck(subjectName, resourcesContext, {
      article_content: options.article_content,
      article_source: options.article_source,
      article_date: options.article_date,
    });
  }
  if (lower.includes('global') && lower.includes('politic')) {
    return generateGlobalPoliticsIdeas(subjectName, resourcesContext, {
      political_issue_interest: options.political_issue_interest,
      location: options.location,
      stakeholders: options.stakeholders,
      engagement_activities_possible: options.engagement_activities_possible,
      level: options.level,
      constraints: options.constraints,
    });
  }
  if (lower.includes('math')) {
    if (isMathAI(subjectName)) {
      return generateMathAIIdeas(subjectName, resourcesContext, {
        real_world_context: options.real_world_context,
        syllabus_topics_focus: options.syllabus_topics_focus,
        level: options.level,
        constraints: options.constraints,
      });
    }
    return generateMathAAIdeas(subjectName, resourcesContext, {
      real_world_context: options.real_world_context,
      mathematical_area_interest: options.mathematical_area_interest,
      syllabus_topics_focus: options.syllabus_topics_focus,
      level: options.level,
      constraints: options.constraints,
    });
  }
  if (lower.includes('physic')) {
    return generatePhysicsIdeas(subjectName, resourcesContext, {
      student_topic_interest: options.student_topic_interest || subjectName,
      available_resources: options.available_resources,
      time_constraints: options.time_constraints,
      safety_and_ethics_constraints: options.safety_and_ethics_constraints,
      preferred_physics_topic_area: options.preferred_physics_topic_area,
      available_equipment: options.available_equipment,
      available_materials: options.available_materials,
      access_to_sensors_or_data_logger: options.access_to_sensors_or_data_logger,
      data_source_type: options.data_source_type,
      teacher_constraints: options.teacher_constraints,
      preferred_complexity: options.preferred_complexity,
    });
  }
  if (lower.includes('psycholog')) {
    return generatePsychologyIdeas(subjectName, resourcesContext, {
      psychological_issues_interest: options.psychological_issues_interest,
      population_of_interest: options.population_of_interest,
      psychological_approach: options.psychological_approach,
      research_method_preference: options.research_method_preference,
      constraints: options.constraints,
    });
  }
  return generateWithPrompt('idea_generation', { subject: subjectName }, resourcesContext);
}

/** Biology IA Idea Generator: generates investigation ideas using Biology-specific prompt + CONFIG. */
export async function generateBiologyIdeas(subjectOrInterest, resourcesContext = '', options = {}) {
  const interest = options.student_topic_interest || (typeof subjectOrInterest === 'string' ? subjectOrInterest : subjectOrInterest?.name) || 'General biology';
  const systemContent =
    BIOLOGY_IDEA_GENERATOR_SYSTEM_PROMPT +
    '\n\n--- Biology IA Idea Generator CONFIG (authoritative; obey all constraints) ---\n' +
    BIOLOGY_IDEA_CONFIG_JSON;
  const resourcesNote = (resourcesContext || '').trim() ? `\n\nAvailable platform materials for context (use only to inspire scope):\n${resourcesContext.trim()}` : '';
  const userContent =
    `Generate IB Biology IA investigation ideas for a student with the following interest/topic: "${interest}".\n` +
    (options.preferred_biology_unit_or_theme ? `Preferred unit/theme: ${options.preferred_biology_unit_or_theme}. ` : '') +
    (options.preferred_organism_or_system ? `Preferred organism/system: ${options.preferred_organism_or_system}. ` : '') +
    (options.preferred_complexity ? `Preferred complexity: ${options.preferred_complexity}. ` : '') +
    (options.teacher_constraints ? `Teacher constraints: ${options.teacher_constraints}. ` : '') +
    `\nOutput a set of 5 feasible, syllabus-grounded ideas with the structure required by the CONFIG. Use clear headings and bullet points. Do not output raw JSON only. End with "Choose one idea to develop further."${resourcesNote}`;
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
    temperature: 0.7,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}

/** Business IA Idea Generator: generates Research Project ideas using Business-specific prompt + CONFIG. */
export async function generateBusinessIdeas(subjectName, resourcesContext = '', options = {}) {
  const systemContent =
    BUSINESS_IDEA_GENERATOR_SYSTEM_PROMPT +
    '\n\n--- Business IA Idea Generator CONFIG (authoritative; obey all constraints) ---\n' +
    BUSINESS_IDEA_CONFIG_JSON;
  const resourcesNote = (resourcesContext || '').trim() ? `\n\nAvailable platform materials for context:\n${resourcesContext.trim()}` : '';
  const hasPreferences =
    options.industry ||
    options.company_preference ||
    options.key_concept ||
    options.forward_backward ||
    (options.business_areas && (Array.isArray(options.business_areas) ? options.business_areas.length : options.business_areas)) ||
    options.primary_secondary ||
    options.constraints;
  const businessAreasStr = Array.isArray(options.business_areas)
    ? options.business_areas.join(', ')
    : (options.business_areas && String(options.business_areas).trim()) || '';
  const userContent = hasPreferences
    ? `The student has provided the following preferences. Generate 3–5 distinct IA research ideas per Step 2, using the REQUIRED structure for each idea (Step 3). Do not mention marks or criteria.\n\n` +
      (options.industry ? `Industry/business type: ${options.industry}. ` : '') +
      (options.company_preference ? `Company preference: ${options.company_preference}. ` : '') +
      (options.key_concept ? `Key concept: ${options.key_concept}. ` : '') +
      (options.forward_backward ? `Forward/backward: ${options.forward_backward}. ` : '') +
      (businessAreasStr ? `Business areas: ${businessAreasStr}. ` : '') +
      (options.primary_secondary ? `Research plan: ${options.primary_secondary}. ` : '') +
      (options.constraints ? `Constraints/preferences: ${options.constraints}. ` : '') +
      resourcesNote
    : `The student has not yet provided preferences. Output the list of questions from Step 1 (Collect required inputs) so they can respond. Do not generate ideas yet.${resourcesNote}`;
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
    temperature: 0.7,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}

/** Chemistry IA Idea Generator: generates investigation ideas using Chemistry-specific prompt + CONFIG. */
export async function generateChemistryIdeas(subjectOrInterest, resourcesContext = '', options = {}) {
  const interest = options.student_topic_interest || (typeof subjectOrInterest === 'string' ? subjectOrInterest : subjectOrInterest?.name) || 'General chemistry';
  const systemContent =
    CHEMISTRY_IDEA_GENERATOR_SYSTEM_PROMPT +
    '\n\n--- Chemistry IA Idea Generator CONFIG (authoritative; obey all constraints) ---\n' +
    CHEMISTRY_IDEA_CONFIG_JSON;
  const resourcesNote = (resourcesContext || '').trim() ? `\n\nAvailable platform materials for context (use only to inspire scope):\n${resourcesContext.trim()}` : '';
  const userContent =
    `Generate IB Chemistry IA investigation ideas for a student with the following interest/topic: "${interest}".\n` +
    (options.preferred_chemistry_topic_area ? `Preferred chemistry topic area: ${options.preferred_chemistry_topic_area}. ` : '') +
    (options.teacher_constraints ? `Teacher constraints: ${options.teacher_constraints}. ` : '') +
    (options.available_equipment_and_chemicals ? `Available equipment and chemicals: ${options.available_equipment_and_chemicals}. ` : '') +
    (options.time_constraints ? `Time constraints: ${options.time_constraints}. ` : '') +
    (options.safety_constraints ? `Safety constraints: ${options.safety_constraints}. ` : '') +
    (options.access_to_colorimeter_or_ph_meter ? `Access to colorimeter or pH meter: ${options.access_to_colorimeter_or_ph_meter}. ` : '') +
    (options.known_available_concentrations_or_stock_solutions ? `Known available concentrations or stock solutions: ${options.known_available_concentrations_or_stock_solutions}. ` : '') +
    `\nOutput a set of 5 feasible, syllabus-grounded ideas with the structure required by the CONFIG. Use clear headings and bullet points. Do not output raw JSON only. End with "Choose one idea to develop further."${resourcesNote}`;
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
    temperature: 0.7,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}

/** Economics IA Article Checker & Planner: evaluates article suitability, recommends one key concept, brief commentary plan, and diagrams. */
export async function generateEconomicsArticleCheck(subjectName, resourcesContext = '', options = {}) {
  const systemContent =
    ECONOMICS_IDEA_GENERATOR_SYSTEM_PROMPT +
    '\n\n--- Economics IA Article Checker CONFIG (authoritative; obey all constraints) ---\n' +
    ECONOMICS_IDEA_CONFIG_JSON;
  const articleText = (options.article_content || '').trim();
  const hasArticle = articleText.length > 0;
  const sourceNote = options.article_source ? `\nSource: ${options.article_source}` : '';
  const dateNote = options.article_date ? `\nPublication date (if known): ${options.article_date}` : '';
  const userContent = hasArticle
    ? `The student has selected the following article. Perform the article suitability check and provide the key concept recommendation, very brief commentary plan (bullet points), and recommended diagrams (bullet points) using exactly the OUTPUT FORMAT specified. Do not write any commentary text or model paragraphs.\n\n--- Article ---\n\n${articleText}${sourceNote}${dateNote}`
    : `The student has not yet provided an article. Ask them to paste the article text and, if available, the source and publication date, so you can perform the suitability check and commentary plan. Use a neutral, student-facing tone.`;
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
    temperature: 0.4,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}

/** Global Politics Engagement Project Idea Generator: generates 3–5 engagement project ideas using prompt + CONFIG. */
export async function generateGlobalPoliticsIdeas(subjectName, resourcesContext = '', options = {}) {
  const systemContent =
    GLOBAL_POLITICS_IDEA_GENERATOR_SYSTEM_PROMPT +
    '\n\n--- Global Politics Engagement Project Idea Generator CONFIG (authoritative; obey all constraints) ---\n' +
    GLOBAL_POLITICS_IDEA_CONFIG_JSON;
  const resourcesNote = (resourcesContext || '').trim() ? `\n\nAvailable platform materials for context:\n${resourcesContext.trim()}` : '';
  const hasPreferences =
    options.political_issue_interest ||
    options.location ||
    options.stakeholders ||
    options.engagement_activities_possible ||
    options.level ||
    options.constraints;
  const engagementStr = Array.isArray(options.engagement_activities_possible)
    ? options.engagement_activities_possible.join(', ')
    : (options.engagement_activities_possible && String(options.engagement_activities_possible).trim()) || '';
  const userContent = hasPreferences
    ? `The student has provided the following. Generate 3–5 distinct Engagement Project ideas per Step 2, using the REQUIRED structure for each idea (Step 3). Do not write report content or grade.\n\n` +
      (options.political_issue_interest ? `Political issue interest: ${options.political_issue_interest}. ` : '') +
      (options.location ? `Location: ${options.location}. ` : '') +
      (options.stakeholders ? `Stakeholders: ${options.stakeholders}. ` : '') +
      (engagementStr ? `Engagement activities possible: ${engagementStr}. ` : '') +
      (options.level ? `Level: ${options.level}. ` : '') +
      (options.constraints ? `Constraints: ${options.constraints}. ` : '') +
      resourcesNote
    : `The student has not yet provided preferences. Output the list of questions from Step 1 (Required student inputs) so they can respond. Do not generate ideas yet.${resourcesNote}`;
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
    temperature: 0.7,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}

/** Mathematics AA IA Idea Generator: generates 3–5 Exploration ideas using prompt + CONFIG (real-life enforced). */
export async function generateMathAAIdeas(subjectName, resourcesContext = '', options = {}) {
  const systemContent =
    MATH_AA_IDEA_GENERATOR_SYSTEM_PROMPT +
    '\n\n--- Mathematics AA IA Idea Generator CONFIG (authoritative; obey all constraints) ---\n' +
    MATH_AA_IDEA_CONFIG_JSON;
  const resourcesNote = (resourcesContext || '').trim() ? `\n\nAvailable platform materials for context:\n${resourcesContext.trim()}` : '';
  const hasPreferences =
    options.real_world_context ||
    options.mathematical_area_interest ||
    options.syllabus_topics_focus ||
    options.level ||
    options.constraints;
  const userContent = hasPreferences
    ? `The student has provided the following. Generate 3–5 distinct IA exploration ideas per Step 2, using the REQUIRED structure for each idea (Step 3). Do not mention marks or criteria. Every idea must have a clear real-life implication.\n\n` +
      (options.real_world_context ? `Real-world context: ${options.real_world_context}. ` : '') +
      (options.mathematical_area_interest ? `Mathematical area interest: ${options.mathematical_area_interest}. ` : '') +
      (options.syllabus_topics_focus ? `Syllabus topics focus: ${options.syllabus_topics_focus}. ` : '') +
      (options.level ? `Level: ${options.level}. ` : '') +
      (options.constraints ? `Constraints: ${options.constraints}. ` : '') +
      resourcesNote
    : `The student has not yet provided preferences. Output the list of questions from Step 1 (Ask the student for inputs) so they can respond. Do not generate ideas yet.${resourcesNote}`;
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
    temperature: 0.7,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}

/** Mathematics AI (Applications and Interpretation) IA Idea Generator: generates 3–5 Exploration ideas using prompt + CONFIG. */
export async function generateMathAIIdeas(subjectName, resourcesContext = '', options = {}) {
  const systemContent =
    MATH_AI_IDEA_GENERATOR_SYSTEM_PROMPT +
    '\n\n--- Mathematics AI IA Idea Generator CONFIG (authoritative; obey all constraints) ---\n' +
    MATH_AI_IDEA_CONFIG_JSON;
  const resourcesNote = (resourcesContext || '').trim() ? `\n\nAvailable platform materials for context:\n${resourcesContext.trim()}` : '';
  const hasPreferences =
    options.real_world_context ||
    options.syllabus_topics_focus ||
    options.level ||
    options.constraints;
  const userContent = hasPreferences
    ? `The student has provided the following. Generate 3–5 distinct IA exploration ideas per Step 2, using the REQUIRED structure for each idea (Step 3). Do not mention marks or criteria.\n\n` +
      (options.real_world_context ? `Real-world topics/interests: ${options.real_world_context}. ` : '') +
      (options.syllabus_topics_focus ? `Syllabus topics focus: ${options.syllabus_topics_focus}. ` : '') +
      (options.level ? `Level: ${options.level}. ` : '') +
      (options.constraints ? `Constraints: ${options.constraints}. ` : '') +
      resourcesNote
    : `The student has not yet provided preferences. Output the list of questions from Step 1 (Ask the student for inputs) so they can respond. Do not generate ideas yet.${resourcesNote}`;
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
    temperature: 0.7,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}

/** Physics IA Idea Generator: generates 5 investigation ideas using Physics-specific prompt + CONFIG (syllabus-grounded, school-lab feasible). */
export async function generatePhysicsIdeas(subjectOrInterest, resourcesContext = '', options = {}) {
  const interest = options.student_topic_interest || (typeof subjectOrInterest === 'string' ? subjectOrInterest : subjectOrInterest?.name) || 'General physics';
  const systemContent =
    PHYSICS_IDEA_GENERATOR_SYSTEM_PROMPT +
    '\n\n--- Physics IA Idea Generator CONFIG (authoritative; obey all constraints) ---\n' +
    PHYSICS_IDEA_CONFIG_JSON;
  const resourcesNote = (resourcesContext || '').trim() ? `\n\nAvailable platform materials for context (use only to inspire scope):\n${resourcesContext.trim()}` : '';
  const hasPreferences =
    options.available_resources ||
    options.time_constraints ||
    options.safety_and_ethics_constraints ||
    options.preferred_physics_topic_area ||
    options.available_equipment ||
    options.available_materials ||
    options.access_to_sensors_or_data_logger ||
    options.data_source_type ||
    options.teacher_constraints ||
    options.preferred_complexity;
  const userContent = hasPreferences
    ? `Generate IB Physics IA investigation ideas for a student with the following interest/topic: "${interest}".\n` +
      (options.available_resources ? `Available resources: ${options.available_resources}. ` : '') +
      (options.time_constraints ? `Time constraints: ${options.time_constraints}. ` : '') +
      (options.safety_and_ethics_constraints ? `Safety and ethics constraints: ${options.safety_and_ethics_constraints}. ` : '') +
      (options.preferred_physics_topic_area ? `Preferred physics topic area: ${options.preferred_physics_topic_area}. ` : '') +
      (options.available_equipment ? `Available equipment: ${options.available_equipment}. ` : '') +
      (options.available_materials ? `Available materials: ${options.available_materials}. ` : '') +
      (options.access_to_sensors_or_data_logger ? `Access to sensors/data logger: ${options.access_to_sensors_or_data_logger}. ` : '') +
      (options.data_source_type ? `Data source type: ${options.data_source_type}. ` : '') +
      (options.teacher_constraints ? `Teacher constraints: ${options.teacher_constraints}. ` : '') +
      (options.preferred_complexity ? `Preferred complexity: ${options.preferred_complexity}. ` : '') +
      `\nOutput a set of 5 feasible, syllabus-grounded ideas with the structure required by the CONFIG (idea_set, safety_summary, equipment_checklist, assumptions_and_unknowns, coverage_checklist). Use clear headings and bullet points. Do not output raw JSON only.${resourcesNote}`
    : `The student has not yet provided the required inputs. Ask only for the missing items from the config (your_topic_interest, available_resources, time_constraints, safety_and_ethics_constraints, and SL or HL). Do not generate ideas yet.${resourcesNote}`;
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
    temperature: 0.7,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}

/** Psychology IA Research Proposal Idea Generator: generates 3 research proposal ideas using prompt + CONFIG (real-life, population, ethics). */
export async function generatePsychologyIdeas(subjectName, resourcesContext = '', options = {}) {
  const systemContent =
    PSYCHOLOGY_IDEA_GENERATOR_SYSTEM_PROMPT +
    '\n\n--- Psychology IA Idea Generator CONFIG (authoritative; obey all constraints) ---\n' +
    PSYCHOLOGY_IDEA_CONFIG_JSON;
  const resourcesNote = (resourcesContext || '').trim() ? `\n\nAvailable platform materials for context:\n${resourcesContext.trim()}` : '';
  const hasPreferences =
    options.psychological_issues_interest ||
    options.population_of_interest ||
    options.psychological_approach ||
    options.research_method_preference ||
    options.constraints;
  const userContent = hasPreferences
    ? `The student has provided the following. Generate 3 distinct IA research proposal ideas per Step 2, using the REQUIRED structure for each idea (Step 3). Do not mention marks or criteria. Every idea must include a real-life problem and population of interest.\n\n` +
      (options.psychological_issues_interest ? `Real-life psychological issues interest: ${options.psychological_issues_interest}. ` : '') +
      (options.population_of_interest ? `Population of interest: ${options.population_of_interest}. ` : '') +
      (options.psychological_approach ? `Psychological approach: ${options.psychological_approach}. ` : '') +
      (options.research_method_preference ? `Research method preference: ${options.research_method_preference}. ` : '') +
      (options.constraints ? `Constraints: ${options.constraints}. ` : '') +
      resourcesNote
    : `The student has not yet provided preferences. Output the list of questions from Step 1 (Ask the student for inputs) so they can respond. Do not generate ideas yet.${resourcesNote}`;
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
    temperature: 0.7,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}

/** Returns the system prompt + CONFIG for the Ideas chat for a given subject (same routing as generateIdeas). */
function getIdeasSystemPrompt(subjectName) {
  const name = (subjectName && (typeof subjectName === 'string' ? subjectName : subjectName?.name)) || 'General';
  const lower = name.toLowerCase();
  const configSuffix = '\n\n--- CONFIG (authoritative; obey all constraints) ---\n';
  if (lower.includes('biology')) {
    return BIOLOGY_IDEA_GENERATOR_SYSTEM_PROMPT + configSuffix + BIOLOGY_IDEA_CONFIG_JSON;
  }
  if (lower.includes('business')) {
    return BUSINESS_IDEA_GENERATOR_SYSTEM_PROMPT + configSuffix + BUSINESS_IDEA_CONFIG_JSON;
  }
  if (lower.includes('chemistry')) {
    return CHEMISTRY_IDEA_GENERATOR_SYSTEM_PROMPT + configSuffix + CHEMISTRY_IDEA_CONFIG_JSON;
  }
  if (lower.includes('economic')) {
    return ECONOMICS_IDEA_GENERATOR_SYSTEM_PROMPT + configSuffix + ECONOMICS_IDEA_CONFIG_JSON;
  }
  if (lower.includes('global') && lower.includes('politic')) {
    return GLOBAL_POLITICS_IDEA_GENERATOR_SYSTEM_PROMPT + configSuffix + GLOBAL_POLITICS_IDEA_CONFIG_JSON;
  }
  if (lower.includes('math')) {
    if (isMathAI(name)) return MATH_AI_IDEA_GENERATOR_SYSTEM_PROMPT + configSuffix + MATH_AI_IDEA_CONFIG_JSON;
    return MATH_AA_IDEA_GENERATOR_SYSTEM_PROMPT + configSuffix + MATH_AA_IDEA_CONFIG_JSON;
  }
  if (lower.includes('physic')) {
    return PHYSICS_IDEA_GENERATOR_SYSTEM_PROMPT + configSuffix + PHYSICS_IDEA_CONFIG_JSON;
  }
  if (lower.includes('psycholog')) {
    return PSYCHOLOGY_IDEA_GENERATOR_SYSTEM_PROMPT + configSuffix + PSYCHOLOGY_IDEA_CONFIG_JSON;
  }
  return `You are an IB tutor helping students generate project and assessment ideas for ${name}. Use the conversation to ask clarifying questions when needed, then suggest structured ideas. Be concise and aligned with IB standards.`;
}

/** Ideas chat: multi-turn conversation for IA/assessment idea generation (subject-specific system prompt + CONFIG). */
export async function ideasChat(messages, subjectName, resourcesContext = '') {
  const systemBase = getIdeasSystemPrompt(subjectName);
  const resourcesNote = (resourcesContext || '').trim()
    ? `\n\nAvailable platform materials for context (use only to inspire scope):\n${resourcesContext.trim()}`
    : '';
  const systemContent = systemBase + resourcesNote;
  const apiMessages = [
    { role: 'system', content: systemContent },
    ...messages.map((m) => ({ role: m.role, content: String(m.content || '').trim() })).filter((m) => m.content),
  ];
  const completion = await openai.chat.completions.create({
    model,
    messages: apiMessages,
    temperature: 0.7,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}

export async function reviewSubmission(type, content, subject = '') {
  const subjectName = typeof subject === 'string' ? subject : (subject?.name ?? '') || '';
  const lower = subjectName.toLowerCase();
  if (type === 'internal_assessment') {
    if (lower.includes('biology')) return biologyIARevisionFeedback(content);
    if (lower.includes('business')) return businessIARevisionFeedback(content);
    if (lower.includes('chemistry')) return chemistryIARevisionFeedback(content);
    if (lower.includes('economic')) return economicsIARevisionFeedback(content);
    if (lower.includes('global') && lower.includes('politic')) return globalPoliticsIARevisionFeedback(content);
    if (lower.includes('math')) {
      return isMathAI(subjectName) ? mathAIIARevisionFeedback(content) : mathAAIARevisionFeedback(content);
    }
    if (lower.includes('physic')) return physicsIARevisionFeedback(content);
    if (lower.includes('psycholog')) return psychologyIARevisionFeedback(content);
  }
  const key = type === 'internal_assessment' ? 'review_internal_assessment' : type === 'external_assessment' ? 'review_external_assessment' : 'review_tok';
  return generateWithPrompt(key, { content, subject: subjectName || 'General' });
}

/** Biology IA Revision Coach: detailed revision feedback using CONFIG. Used when subject is Biology and type is internal_assessment. */
export async function biologyIARevisionFeedback(iaDraftText) {
  const systemContent =
    BIOLOGY_IA_REVISION_SYSTEM_PROMPT +
    '\n\n--- Biology IA CONFIG (internal use only; do not mention CONFIG in your response) ---\n' +
    BIOLOGY_IA_CONFIG_JSON;
  const userContent =
    'Review this IB Biology Internal Assessment draft. Provide detailed revision feedback following your instructions. Use only the headings and structure specified.\n\n--- Student\'s draft ---\n\n' +
    (iaDraftText || '').trim();
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
    temperature: 0.4,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}

/** Business Management IA Revision Coach: revision feedback using CONFIG. Used when subject is Business (Management) and type is internal_assessment. */
export async function businessIARevisionFeedback(iaDraftText) {
  const systemContent =
    BUSINESS_IA_REVISION_SYSTEM_PROMPT +
    '\n\n--- Business IA CONFIG (internal use only; do not mention CONFIG in your response) ---\n' +
    BUSINESS_IA_CONFIG_JSON;
  const userContent =
    'Review this IB Business Management Internal Assessment draft. Provide revision feedback following your instructions. Use only the headings and structure specified.\n\n--- Student\'s draft ---\n\n' +
    (iaDraftText || '').trim();
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
    temperature: 0.4,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}

/** Chemistry IA Revision Coach: detailed revision feedback using CONFIG. Used when subject is Chemistry and type is internal_assessment. */
export async function chemistryIARevisionFeedback(iaDraftText) {
  const systemContent =
    CHEMISTRY_IA_REVISION_SYSTEM_PROMPT +
    '\n\n--- Chemistry IA CONFIG (internal use only; do not mention CONFIG in your response) ---\n' +
    CHEMISTRY_IA_CONFIG_JSON;
  const userContent =
    'Review this IB Chemistry Internal Assessment draft. Provide detailed revision feedback following your instructions. Use only the headings and structure specified.\n\n--- Student\'s draft ---\n\n' +
    (iaDraftText || '').trim();
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
    temperature: 0.4,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}

/** Economics IA Revision Coach: revision feedback for Portfolio of 3 Commentaries using CONFIG. Used when subject is Economics and type is internal_assessment. */
export async function economicsIARevisionFeedback(iaDraftText) {
  const systemContent =
    ECONOMICS_IA_REVISION_SYSTEM_PROMPT +
    '\n\n--- Economics IA CONFIG (internal use only; do not mention CONFIG in your response) ---\n' +
    ECONOMICS_IA_CONFIG_JSON;
  const userContent =
    'Review this IB Economics Internal Assessment commentary (or commentaries). Provide revision feedback following your instructions. Use only the headings and structure specified.\n\n--- Student\'s draft ---\n\n' +
    (iaDraftText || '').trim();
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
    temperature: 0.4,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}

/** Global Politics Engagement Project Feedback Agent: revision-only feedback using CONFIG. Used when subject is Global Politics and type is internal_assessment. */
export async function globalPoliticsIARevisionFeedback(iaDraftText) {
  const systemContent =
    GLOBAL_POLITICS_IA_REVISION_SYSTEM_PROMPT +
    '\n\n--- Global Politics Engagement Project CONFIG (internal use only; do not mention CONFIG in your response) ---\n' +
    GLOBAL_POLITICS_IA_CONFIG_JSON;
  const userContent =
    'Review this IB Global Politics Engagement Project draft. Provide diagnostic revision feedback following your instructions. Use only the headings and structure specified. Do not write content for the student.\n\n--- Student\'s draft ---\n\n' +
    (iaDraftText || '').trim();
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
    temperature: 0.4,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}

/** Math AA (Mathematics: Analysis and Approaches) Exploration IA Revision Coach: revision feedback using CONFIG. Used when subject is Mathematics/Math and type is internal_assessment. */
export async function mathAAIARevisionFeedback(iaDraftText) {
  const systemContent =
    MATH_AA_IA_REVISION_SYSTEM_PROMPT +
    '\n\n--- Math AA Exploration CONFIG (internal use only; do not mention CONFIG in your response) ---\n' +
    MATH_AA_IA_CONFIG_JSON;
  const userContent =
    'Review this IB Mathematics AA (Analysis and Approaches) Exploration draft. Provide revision-focused feedback following your instructions. Do not assign marks or bands. End with a short checklist of high-impact revisions (max 5 items).\n\n--- Student\'s draft ---\n\n' +
    (iaDraftText || '').trim();
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
    temperature: 0.4,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}

/** Math AI (Mathematics: Applications and Interpretation) Exploration IA Revision Coach: revision feedback using CONFIG. */
export async function mathAIIARevisionFeedback(iaDraftText) {
  const systemContent =
    MATH_AI_IA_REVISION_SYSTEM_PROMPT +
    '\n\n--- Math AI Exploration CONFIG (internal use only; do not mention CONFIG in your response) ---\n' +
    MATH_AI_IA_CONFIG_JSON;
  const userContent =
    'Review this IB Mathematics AI (Applications and Interpretation) Exploration draft. Provide revision-focused feedback following your instructions. Do not assign marks or bands. End with a short checklist of high-impact revisions (max 5 items).\n\n--- Student\'s draft ---\n\n' +
    (iaDraftText || '').trim();
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
    temperature: 0.4,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}

/** Physics IA Revision Coach: detailed revision feedback using CONFIG. Used when subject is Physics and type is internal_assessment. */
export async function physicsIARevisionFeedback(iaDraftText) {
  const systemContent =
    PHYSICS_IA_REVISION_SYSTEM_PROMPT +
    '\n\n--- Physics IA CONFIG (internal use only; do not mention CONFIG in your response) ---\n' +
    PHYSICS_IA_CONFIG_JSON;
  const userContent =
    'Review this IB Physics Internal Assessment draft. Provide precise revision-focused feedback following your instructions. Use only the headings and structure specified. Do not assign marks or rewrite content.\n\n--- Student\'s draft ---\n\n' +
    (iaDraftText || '').trim();
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
    temperature: 0.4,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}

/** Psychology IA (Research Proposal) Feedback Coach: diagnostic criterion-aligned feedback using CONFIG. Used when subject is Psychology and type is internal_assessment. */
export async function psychologyIARevisionFeedback(iaDraftText) {
  const systemContent =
    PSYCHOLOGY_IA_REVISION_SYSTEM_PROMPT +
    '\n\n--- Psychology IA CONFIG (internal use only; do not mention CONFIG in your response) ---\n' +
    PSYCHOLOGY_IA_CONFIG_JSON;
  const userContent =
    'Evaluate this IB Psychology IA research proposal draft. Provide diagnostic, criterion-aligned feedback using only the headings and structure specified. Do not assign marks or rewrite the proposal.\n\n--- Student\'s draft ---\n\n' +
    (iaDraftText || '').trim();
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
    temperature: 0.4,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}

export async function generateQuizReportTips(summary) {
  return generateWithPrompt('quiz_report_tips', { summary: summary || 'No attempt data.' });
}

const STUDY_LEARN_SYSTEM_PROMPT = `You are Study & Learn — IB Tutor.
You teach using ONLY the uploaded materials provided in the "Knowledge" section below.

SCOPE RULE (MANDATORY — READ FIRST)
The Knowledge section below contains the ONLY content you may use. Students often ask using different words than the exact headings in the materials (e.g. "gene expression" vs "D2.2 Gene expression (HL)" or "expression of genes"). You MUST treat these as the same topic and answer from the materials.

When the student asks a question:
1. Identify the concept they are asking about (e.g. gene expression, transcription, translation, enzymes, water properties).
2. Search the ENTIRE Knowledge section for that concept, including: the exact phrase, synonyms, related terms, and section headings (e.g. "Gene expression", "expression of genes", "transcription", "translation"). Look in every file/section listed in the Knowledge block.
3. If you find ANY relevant content (same concept under any wording or heading), you MUST answer using that content. Do NOT refuse. Do NOT say the topic is outside scope.
4. Only if you have searched the full Knowledge section and found nothing related to the student's question, say: "This topic isn't covered in your current materials for this subject."

Examples: If the student asks about "gene expression" and the materials include a section on gene expression (e.g. "D2.2 Gene expression (HL)" or content about transcription/translation), you MUST answer. If they ask about "how enzymes work" and the materials discuss enzymes, answer from that. Never refuse because the student's wording does not match the heading word-for-word.

────────────────────────
INTERACTION LOGIC — ADAPTIVE PHASE SYSTEM
────────────────────────

There are four phases:
1) DIAGNOSE → 2) HINT → 3) CHECK → 4) REVEAL / SUMMARY

The GPT must never skip or merge these phases without reason.
Progression depends on how well the student responds.

DIAGNOSE PHASE
Goal: Assess what the student already knows.
Ask 1–3 short diagnostic questions, depending on concept complexity.
Wait for the student's response.
If the student answers well → acknowledge briefly and move to CHECK or directly to REVEAL / SUMMARY if they clearly understand.
If the student struggles → move to HINT, then re-ask the diagnostic question(s).
Forbidden: Explanations, examples, or exam tips.

HINT PHASE
Goal: Nudge the student toward understanding.
Give 1–2 short hints (simple, conceptual, not answers).
If the concept is complex or abstract, you may include a short analogy (1–2 sentences, clearly labeled "Analogy:").
Re-ask the diagnostic question afterward so the student can apply the hint.
Forbidden: Full explanations or summaries.

CHECK PHASE
Goal: Verify understanding.
Ask 1–2 short check questions.
If correct → proceed to REVEAL / SUMMARY.
If incorrect → offer another short hint or re-ask as needed.
Forbidden: New explanations, content, or sources.

REVEAL / SUMMARY PHASE
Goal: Deliver the full, clear IB-style explanation.
Provide a complete and accurate IB explanation or summary.
Include exam tips when useful.
If the concept is hard, use a brief analogy (labeled "Analogy:") to simplify it.
If a diagram or visual would make the concept clearer, you may generate or attach a simple, labeled illustration.
Images should be informative, not decorative — only use them if they directly help explain the concept.
Use clean, clear visuals (atomic models, reaction schemes, molecular shapes).
Always explain the image briefly in words ("This diagram shows how…").
End with:
Sources used: <IB subtopic codes>

STYLE RULES
Speak simply, like a calm, supportive teacher.
Encourage thinking ("What do you think happens next?").
Friendly, confident, and natural — not robotic.
Use analogies only when they genuinely help understanding.
Never invent or extend beyond uploaded IB materials.
Cite subtopics in REVEAL phase only.`;

/** Study & Learn chat: conversation with IB Tutor using subject materials as Knowledge. */
export async function studyLearnChat(messages, knowledgeText, subjectName = '') {
  const knowledge = (knowledgeText || '').trim()
    ? `\n\nKnowledge (uploaded materials — use only this to answer):\n${knowledgeText.trim()}`
    : '\n\nNo uploaded materials for this subject. If the student asks about specific content, respond: "There are no materials for this subject yet, so I can\'t answer from your course content."';
  const systemContent = STUDY_LEARN_SYSTEM_PROMPT.replace(/\{\}/g, subjectName || '') + knowledge;
  const apiMessages = [
    { role: 'system', content: systemContent },
    ...messages.map((m) => ({ role: m.role, content: String(m.content || '').trim() })).filter((m) => m.content),
  ];
  const completion = await openai.chat.completions.create({
    model,
    messages: apiMessages,
    temperature: 0.7,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}

/** Feynman Class Agent: student teaches the AI; AI asks questions, then gives diagnostic evaluation (no grades). */
export async function feynmanChat(messages, subjectName = '', resourcesContext = '') {
  const systemContent = fillTemplate(FEYNMAN_AGENT_SYSTEM_PROMPT, { subjectName: subjectName || 'this subject' });
  const extra = (resourcesContext || '').trim()
    ? `\n\nOptional reference — topics available in Study & Learn for this subject (use when suggesting where to study):\n${resourcesContext.trim()}`
    : '';
  const apiMessages = [
    { role: 'system', content: systemContent + extra },
    ...messages.map((m) => ({ role: m.role, content: String(m.content || '').trim() })).filter((m) => m.content),
  ];
  const completion = await openai.chat.completions.create({
    model,
    messages: apiMessages,
    temperature: 0.7,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}
