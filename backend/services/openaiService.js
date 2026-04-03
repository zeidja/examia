import OpenAI from 'openai';
import { loadActivePrompt, buildSystemPrompt } from './aiPromptLoader.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function fillTemplate(template, vars = {}) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v ?? ''));
  }
  return out;
}

/** @deprecated Use loadActivePrompt from aiPromptLoader — kept for any external callers. */
export async function getPromptConfig(key) {
  const pack = await loadActivePrompt(key);
  if (!pack) return null;
  return {
    key,
    systemPrompt: buildSystemPrompt(pack),
    userPromptTemplate: pack.userPromptTemplate,
    isActive: true,
  };
}

export async function generateWithPrompt(key, userVars = {}, extraSystemContext = '') {
  const pack = await loadActivePrompt(key);
  if (!pack) throw new Error(`AI prompt not found or disabled: ${key}`);
  const systemPrompt = buildSystemPrompt(pack) + (extraSystemContext ? '\n\n' + extraSystemContext : '');
  const userContent = fillTemplate(pack.userPromptTemplate || '', userVars);
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

async function ideaGenCompletion(promptKey, userContent, temperature = 0.7) {
  const pack = await loadActivePrompt(promptKey);
  if (!pack) throw new Error(`AI prompt not found or disabled: ${promptKey}`);
  const systemContent = buildSystemPrompt(pack);
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
    temperature,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}

async function runRevisionCoach(promptKey, draftText) {
  const pack = await loadActivePrompt(promptKey);
  if (!pack) throw new Error(`Revision coach not found or disabled: ${promptKey}`);
  const systemContent = buildSystemPrompt(pack);
  const userContent = fillTemplate(pack.userPromptTemplate || '', { content: (draftText || '').trim() });
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

export async function generateFlashCards(subject, topic, count = 10, resourcesContext = '') {
  return generateWithPrompt(
    'flash_cards',
    { subject, topic, count: String(count) },
    resourcesContext
  );
}

export async function generateQuizzes(subject, topic, count = 5, resourcesContext = '') {
  const extra = (resourcesContext || '').trim() ? resourcesContext.trim() : '';
  return generateWithPrompt('quizzes', { subject, topic, count: String(count) }, extra);
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
  const resourcesNote = (resourcesContext || '').trim() ? `\n\nAvailable platform materials for context (use only to inspire scope):\n${resourcesContext.trim()}` : '';
  const userContent =
    `Generate IB Biology IA investigation ideas for a student with the following interest/topic: "${interest}".\n` +
    (options.preferred_biology_unit_or_theme ? `Preferred unit/theme: ${options.preferred_biology_unit_or_theme}. ` : '') +
    (options.preferred_organism_or_system ? `Preferred organism/system: ${options.preferred_organism_or_system}. ` : '') +
    (options.preferred_complexity ? `Preferred complexity: ${options.preferred_complexity}. ` : '') +
    (options.teacher_constraints ? `Teacher constraints: ${options.teacher_constraints}. ` : '') +
    `\nOutput a set of 5 feasible, syllabus-grounded ideas with the structure required by the CONFIG. Use clear headings and bullet points. Do not output raw JSON only. End with "Choose one idea to develop further."${resourcesNote}`;
  return ideaGenCompletion('biology_idea_generator', userContent, 0.7);
}

/** Business IA Idea Generator: generates Research Project ideas using Business-specific prompt + CONFIG. */
export async function generateBusinessIdeas(subjectName, resourcesContext = '', options = {}) {
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
  return ideaGenCompletion('business_idea_generator', userContent, 0.7);
}

/** Chemistry IA Idea Generator: generates investigation ideas using Chemistry-specific prompt + CONFIG. */
export async function generateChemistryIdeas(subjectOrInterest, resourcesContext = '', options = {}) {
  const interest = options.student_topic_interest || (typeof subjectOrInterest === 'string' ? subjectOrInterest : subjectOrInterest?.name) || 'General chemistry';
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
  return ideaGenCompletion('chemistry_idea_generator', userContent, 0.7);
}

/** Economics IA Article Checker & Planner: evaluates article suitability, recommends one key concept, brief commentary plan, and diagrams. */
export async function generateEconomicsArticleCheck(subjectName, resourcesContext = '', options = {}) {
  const articleText = (options.article_content || '').trim();
  const hasArticle = articleText.length > 0;
  const sourceNote = options.article_source ? `\nSource: ${options.article_source}` : '';
  const dateNote = options.article_date ? `\nPublication date (if known): ${options.article_date}` : '';
  const userContent = hasArticle
    ? `The student has selected the following article. Perform the article suitability check and provide the key concept recommendation, very brief commentary plan (bullet points), and recommended diagrams (bullet points) using exactly the OUTPUT FORMAT specified. Do not write any commentary text or model paragraphs.\n\n--- Article ---\n\n${articleText}${sourceNote}${dateNote}`
    : `The student has not yet provided an article. Ask them to paste the article text and, if available, the source and publication date, so you can perform the suitability check and commentary plan. Use a neutral, student-facing tone.`;
  return ideaGenCompletion('economics_idea_generator', userContent, 0.4);
}

/** Global Politics Engagement Project Idea Generator: generates 3–5 engagement project ideas using prompt + CONFIG. */
export async function generateGlobalPoliticsIdeas(subjectName, resourcesContext = '', options = {}) {
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
  return ideaGenCompletion('global_politics_idea_generator', userContent, 0.7);
}

/** Mathematics AA IA Idea Generator: generates 3–5 Exploration ideas using prompt + CONFIG (real-life enforced). */
export async function generateMathAAIdeas(subjectName, resourcesContext = '', options = {}) {
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
  return ideaGenCompletion('math_aa_idea_generator', userContent, 0.7);
}

/** Mathematics AI (Applications and Interpretation) IA Idea Generator: generates 3–5 Exploration ideas using prompt + CONFIG. */
export async function generateMathAIIdeas(subjectName, resourcesContext = '', options = {}) {
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
  return ideaGenCompletion('math_ai_idea_generator', userContent, 0.7);
}

/** Physics IA Idea Generator: generates 5 investigation ideas using Physics-specific prompt + CONFIG (syllabus-grounded, school-lab feasible). */
export async function generatePhysicsIdeas(subjectOrInterest, resourcesContext = '', options = {}) {
  const interest = options.student_topic_interest || (typeof subjectOrInterest === 'string' ? subjectOrInterest : subjectOrInterest?.name) || 'General physics';
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
  return ideaGenCompletion('physics_idea_generator', userContent, 0.7);
}

/** Psychology IA Research Proposal Idea Generator: generates 3 research proposal ideas using prompt + CONFIG (real-life, population, ethics). */
export async function generatePsychologyIdeas(subjectName, resourcesContext = '', options = {}) {
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
  return ideaGenCompletion('psychology_idea_generator', userContent, 0.7);
}

async function buildIdeasChatSystemPrompt(subjectName) {
  const name = (subjectName && (typeof subjectName === 'string' ? subjectName : subjectName?.name)) || 'General';
  const lower = name.toLowerCase();
  let key = null;
  if (lower.includes('tok essay')) key = 'tok_essay_idea_generator';
  else if (lower.includes('tok exhibition')) key = 'tok_exhibition_idea_generator';
  else if (lower.includes('biology')) key = 'biology_idea_generator';
  else if (lower.includes('business')) key = 'business_idea_generator';
  else if (lower.includes('chemistry')) key = 'chemistry_idea_generator';
  else if (lower.includes('economic')) key = 'economics_idea_generator';
  else if (lower.includes('global') && lower.includes('politic')) key = 'global_politics_idea_generator';
  else if (lower.includes('physic')) key = 'physics_idea_generator';
  else if (lower.includes('psycholog')) key = 'psychology_idea_generator';
  else if (lower.includes('math')) key = isMathAI(name) ? 'math_ai_idea_generator' : 'math_aa_idea_generator';

  if (key) {
    const pack = await loadActivePrompt(key);
    if (pack) return buildSystemPrompt(pack);
  }
  const fallback = await loadActivePrompt('idea_generation');
  if (fallback) return buildSystemPrompt(fallback);
  return `You are an IB tutor helping students generate project and assessment ideas for ${name}. Use the conversation to ask clarifying questions when needed, then suggest structured ideas. Be concise and aligned with IB standards.`;
}

/** Ideas chat: multi-turn conversation for IA/assessment idea generation (subject-specific system prompt + CONFIG). */
export async function ideasChat(messages, subjectName, resourcesContext = '') {
  const systemBase = await buildIdeasChatSystemPrompt(subjectName);
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
  if (type === 'external_assessment' && lower.includes('tok essay')) {
    return tokEssayFeedback(content);
  }
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
    if (lower.includes('tok exhibition')) return tokExhibitionIARevisionFeedback(content);
  }
  const key = type === 'internal_assessment' ? 'review_internal_assessment' : type === 'external_assessment' ? 'review_external_assessment' : 'review_tok';
  return generateWithPrompt(key, { content, subject: subjectName || 'General' });
}

/** Biology IA Revision Coach */
export async function biologyIARevisionFeedback(iaDraftText) {
  return runRevisionCoach('biology_ia_revision', iaDraftText);
}

export async function businessIARevisionFeedback(iaDraftText) {
  return runRevisionCoach('business_ia_revision', iaDraftText);
}

export async function chemistryIARevisionFeedback(iaDraftText) {
  return runRevisionCoach('chemistry_ia_revision', iaDraftText);
}

export async function economicsIARevisionFeedback(iaDraftText) {
  return runRevisionCoach('economics_ia_revision', iaDraftText);
}

export async function globalPoliticsIARevisionFeedback(iaDraftText) {
  return runRevisionCoach('global_politics_ia_revision', iaDraftText);
}

export async function mathAAIARevisionFeedback(iaDraftText) {
  return runRevisionCoach('math_aa_ia_revision', iaDraftText);
}

export async function mathAIIARevisionFeedback(iaDraftText) {
  return runRevisionCoach('math_ai_ia_revision', iaDraftText);
}

export async function physicsIARevisionFeedback(iaDraftText) {
  return runRevisionCoach('physics_ia_revision', iaDraftText);
}

export async function psychologyIARevisionFeedback(iaDraftText) {
  return runRevisionCoach('psychology_ia_revision', iaDraftText);
}

export async function tokEssayFeedback(essayText) {
  return runRevisionCoach('tok_essay_ia_revision', essayText);
}

export async function tokExhibitionIARevisionFeedback(exhibitionText) {
  return runRevisionCoach('tok_exhibition_ia_revision', exhibitionText);
}

export async function generateQuizReportTips(summary) {
  return generateWithPrompt('quiz_report_tips', { summary: summary || 'No attempt data.' });
}

/** Study & Learn chat: conversation with IB Tutor using subject materials as Knowledge. */
export async function studyLearnChat(messages, knowledgeText, subjectName = '') {
  const pack = await loadActivePrompt('study_learn');
  if (!pack) throw new Error('Study & Learn prompt is not configured.');
  const knowledge = (knowledgeText || '').trim()
    ? `\n\nKnowledge (uploaded materials — use only this to answer):\n${knowledgeText.trim()}`
    : '\n\nNo uploaded materials for this subject. If the student asks about specific content, respond: "There are no materials for this subject yet, so I can\'t answer from your course content."';
  const base = buildSystemPrompt(pack);
  const systemContent = fillTemplate(base, { subjectName: subjectName || '' }) + knowledge;
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
  const pack = await loadActivePrompt('feynman_agent');
  if (!pack) throw new Error('Feynman agent prompt is not configured.');
  const systemContent = fillTemplate(buildSystemPrompt(pack), { subjectName: subjectName || 'this subject' });
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
