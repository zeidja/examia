import {
  generateFlashCards,
  generateQuizzes,
  generateTOK,
  generateExternalAssessment,
  generateInternalAssessment,
  generateIdeas,
  ideasChat,
  reviewSubmission,
  studyLearnChat,
  feynmanChat,
} from '../services/openaiService.js';
import { getSubjectPaths, getMaterialFileContent, getSubjectMaterialsText, getMaterialsTextByPaths } from '../services/materialsService.js';
import Subject from '../models/Subject.js';
import { extractTextFromBuffer } from '../utils/extractText.js';
import TeacherResource from '../models/TeacherResource.js';
import fs from 'fs/promises';
import path from 'path';

async function getResourcesContext(subjectName) {
  const paths = await getSubjectPaths();
  const subjectPath = paths[subjectName];
  if (!subjectPath) return '';
  try {
    const entries = await fs.readdir(subjectPath, { withFileTypes: true });
    const names = entries.filter((e) => !e.name.startsWith('.')).map((e) => e.name);
    return `Available resources for ${subjectName}: ${names.join(', ')}. Use these as reference for content.`;
  } catch {
    return '';
  }
}

/** Get text content from a teacher resource (content field or extracted from file). */
async function getTeacherResourceContent(resourceId, user) {
  const resource = await TeacherResource.findById(resourceId).lean();
  if (!resource) return null;
  if (user.role === 'teacher' && resource.createdBy?.toString() !== user._id.toString()) return null;
  if (user.role === 'school_admin' && (user.school?._id || user.school)?.toString() !== resource.school?.toString()) return null;
  if (resource.content && String(resource.content).trim()) return String(resource.content).trim();
  if (!resource.filePath) return '';
  try {
    const buffer = await fs.readFile(resource.filePath);
    const ext = path.extname(resource.fileName || resource.filePath || '').toLowerCase();
    const mimeMap = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
    };
    const mime = mimeMap[ext] || 'text/plain';
    return await extractTextFromBuffer(buffer, mime, resource.fileName || '');
  } catch (err) {
    if (err.code === 'ENOENT') return '';
    if (err.message?.includes('Unsupported file type')) return '';
    throw err;
  }
}

/** Teachers can only generate for their assigned subject. */
function ensureTeacherSubject(req, subjectFromBody) {
  if (req.user?.role !== 'teacher' || !req.user?.subject) return;
  const teacherSubjectId = (req.user.subject?._id || req.user.subject)?.toString();
  const teacherSubjectName = req.user.subject?.name;
  const bodySubject = (subjectFromBody ?? '').toString().trim();
  if (!bodySubject) {
    throw new Error('Subject is required');
  }
  const bodyMatches =
    (teacherSubjectId && bodySubject === teacherSubjectId) ||
    (teacherSubjectName && bodySubject === teacherSubjectName);
  if (!bodyMatches) {
    const err = new Error('You can only generate content for your assigned subject');
    err.statusCode = 403;
    throw err;
  }
}

/** Resolve file-based context for flash cards / quizzes: from teacher resource or materials folder. Returns null if no file selected. */
async function getFileContextForGeneration(req) {
  const { sourceType, resourceId, materialPath } = req.body;
  if (sourceType === 'my_materials' && resourceId) {
    const content = await getTeacherResourceContent(resourceId, req.user);
    if (content == null) throw new Error('Resource not found or access denied');
    if (!content.trim()) throw new Error('The selected material has no text content. Try a different file or add content.');
    return `Use the following content as the main source for generation:\n\n${content}`;
  }
  if (sourceType === 'platform_materials' && materialPath) {
    const content = await getMaterialFileContent(materialPath);
    if (!content.trim()) throw new Error('The selected file could not be read or has no extractable text. Try a PDF, Word, or TXT file.');
    return `Use the following content as the main source for generation:\n\n${content}`;
  }
  return null;
}

export const generateFlashCardsHandler = async (req, res) => {
  try {
    const { subject, topic, count = 10 } = req.body;
    ensureTeacherSubject(req, subject);
    const context = await getFileContextForGeneration(req);
    if (context == null || !context.trim()) {
      return res.status(400).json({ success: false, message: 'You must select a material (My uploads or Platform materials) to generate from. Generation cannot run without material content.' });
    }
    const result = await generateFlashCards(subject, topic, count, context);
    res.json({ success: true, content: result });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, message: err.message || 'Generation failed' });
  }
};

export const generateQuizzesHandler = async (req, res) => {
  try {
    const { subject, topic, count = 5 } = req.body;
    ensureTeacherSubject(req, subject);
    const context = await getFileContextForGeneration(req);
    if (context == null || !context.trim()) {
      return res.status(400).json({ success: false, message: 'You must select a material (My uploads or Platform materials) to generate from. Generation cannot run without material content.' });
    }
    const result = await generateQuizzes(subject, topic, count, context);
    res.json({ success: true, content: result });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, message: err.message || 'Generation failed' });
  }
};

export const generateTOKHandler = async (req, res) => {
  try {
    const { prompt } = req.body;
    const result = await generateTOK(prompt || '');
    res.json({ success: true, content: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Generation failed' });
  }
};

export const generateExternalAssessmentHandler = async (req, res) => {
  try {
    const { subject, topic } = req.body;
    ensureTeacherSubject(req, subject);
    const context = await getResourcesContext(subject || '');
    const result = await generateExternalAssessment(subject, topic, context);
    res.json({ success: true, content: result });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, message: err.message || 'Generation failed' });
  }
};

export const generateInternalAssessmentHandler = async (req, res) => {
  try {
    const { subject, topic } = req.body;
    ensureTeacherSubject(req, subject);
    const context = await getResourcesContext(subject || '');
    const result = await generateInternalAssessment(subject, topic, context);
    res.json({ success: true, content: result });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, message: err.message || 'Generation failed' });
  }
};

export const ideaGenerationHandler = async (req, res) => {
  try {
    const {
      subject,
      student_topic_interest,
      preferred_biology_unit_or_theme,
      preferred_organism_or_system,
      teacher_constraints,
      preferred_complexity,
      industry,
      company_preference,
      key_concept,
      forward_backward,
      business_areas,
      primary_secondary,
      constraints,
      preferred_chemistry_topic_area,
      available_equipment_and_chemicals,
      time_constraints,
      safety_constraints,
      access_to_colorimeter_or_ph_meter,
      known_available_concentrations_or_stock_solutions,
      article_content,
      article_source,
      article_date,
      political_issue_interest,
      location,
      stakeholders,
      engagement_activities_possible,
      level,
      real_world_context,
      mathematical_area_interest,
      syllabus_topics_focus,
      available_resources,
      safety_and_ethics_constraints,
      preferred_physics_topic_area,
      available_equipment,
      available_materials,
      access_to_sensors_or_data_logger,
      data_source_type,
      psychological_issues_interest,
      population_of_interest,
      psychological_approach,
      research_method_preference,
    } = req.body;
    const subjectName = typeof subject === 'string' ? subject : (subject?.name ?? '');
    const context = await getResourcesContext(subjectName);
    const options = {
      student_topic_interest: student_topic_interest || subjectName,
      preferred_biology_unit_or_theme: preferred_biology_unit_or_theme || undefined,
      preferred_organism_or_system: preferred_organism_or_system || undefined,
      teacher_constraints: teacher_constraints || undefined,
      preferred_complexity: preferred_complexity || undefined,
      industry: industry || undefined,
      company_preference: company_preference || undefined,
      key_concept: key_concept || undefined,
      forward_backward: forward_backward || undefined,
      business_areas: business_areas || undefined,
      primary_secondary: primary_secondary || undefined,
      constraints: constraints || undefined,
      preferred_chemistry_topic_area: preferred_chemistry_topic_area || undefined,
      available_equipment_and_chemicals: available_equipment_and_chemicals || undefined,
      time_constraints: time_constraints || undefined,
      safety_constraints: safety_constraints || undefined,
      access_to_colorimeter_or_ph_meter: access_to_colorimeter_or_ph_meter || undefined,
      known_available_concentrations_or_stock_solutions: known_available_concentrations_or_stock_solutions || undefined,
      article_content: article_content || undefined,
      article_source: article_source || undefined,
      article_date: article_date || undefined,
      political_issue_interest: political_issue_interest || undefined,
      location: location || undefined,
      stakeholders: stakeholders || undefined,
      engagement_activities_possible: engagement_activities_possible || undefined,
      level: level || undefined,
      real_world_context: real_world_context || undefined,
      mathematical_area_interest: mathematical_area_interest || undefined,
      syllabus_topics_focus: syllabus_topics_focus || undefined,
      available_resources: available_resources || undefined,
      safety_and_ethics_constraints: safety_and_ethics_constraints || undefined,
      preferred_physics_topic_area: preferred_physics_topic_area || undefined,
      available_equipment: available_equipment || undefined,
      available_materials: available_materials || undefined,
      access_to_sensors_or_data_logger: access_to_sensors_or_data_logger || undefined,
      data_source_type: data_source_type || undefined,
      psychological_issues_interest: psychological_issues_interest || undefined,
      population_of_interest: population_of_interest || undefined,
      psychological_approach: psychological_approach || undefined,
      research_method_preference: research_method_preference || undefined,
    };
    const result = await generateIdeas(subjectName, context, options);
    res.json({ success: true, content: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Idea generation failed' });
  }
};

/** POST /ai/ideas-chat — chat-based idea generation (subject-specific; multi-turn). */
export const ideasChatHandler = async (req, res) => {
  try {
    const { subjectId, messages } = req.body;
    if (!subjectId || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'subjectId and non-empty messages array are required' });
    }
    const subject = await Subject.findById(subjectId).lean();
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    const subjectName = subject.name || '';
    const resourcesContext = await getResourcesContext(subjectName);
    const reply = await ideasChat(messages, subjectName, resourcesContext);
    res.json({ success: true, reply });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Ideas chat failed' });
  }
};

export const reviewSubmissionHandler = async (req, res) => {
  try {
    const { type, content, subject } = req.body;
    if (!content || !['internal_assessment', 'external_assessment', 'tok'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type (internal_assessment|external_assessment|tok) and content are required' });
    }
    const subjectName = typeof subject === 'string' ? subject : (subject?.name ?? '');
    const result = await reviewSubmission(type, String(content).trim(), subjectName);
    res.json({ success: true, feedback: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Review failed' });
  }
};

export const reviewSubmissionUploadHandler = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'No file uploaded. Upload a PDF, Word (.doc, .docx), or TXT file.' });
    }
    const { type, subject } = req.body;
    if (!type || !['internal_assessment', 'external_assessment', 'tok'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type (internal_assessment|external_assessment|tok) is required' });
    }
    const text = await extractTextFromBuffer(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Could not extract text from the file. Try a different file or format.' });
    }
    const subjectName = typeof subject === 'string' ? subject : (subject?.name ?? '');
    const result = await reviewSubmission(type, text.trim(), subjectName);
    res.json({ success: true, feedback: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Review failed' });
  }
};

/** POST /ai/study-learn/chat — student-only; chat with IB Tutor using subject materials as Knowledge. */
export const studyLearnChatHandler = async (req, res) => {
  try {
    const { subjectId, messages, selectedMaterialPaths } = req.body;
    if (!subjectId || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'subjectId and non-empty messages array are required' });
    }
    const subject = await Subject.findById(subjectId).lean();
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    const subjectName = subject.name || '';
    let knowledgeText;
    if (Array.isArray(selectedMaterialPaths) && selectedMaterialPaths.length > 0) {
      knowledgeText = await getMaterialsTextByPaths(selectedMaterialPaths);
    } else {
      const folderKey = (subject.materialsPath && subject.materialsPath.trim()) || subjectName;
      knowledgeText = await getSubjectMaterialsText(folderKey);
    }
    if (!knowledgeText || !knowledgeText.trim()) {
      console.warn(`[Study & Learn] No materials text for subject "${subjectName}". Select files or check materials folder.`);
    }
    const reply = await studyLearnChat(messages, knowledgeText, subjectName);
    res.json({ success: true, reply });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Chat failed' });
  }
};

/** POST /ai/feynman-chat — student-only; Guided Feynman Class: student teaches, AI asks questions then evaluates. */
export const feynmanChatHandler = async (req, res) => {
  try {
    const { subjectId, messages } = req.body;
    if (!subjectId || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'subjectId and non-empty messages array are required' });
    }
    const subject = await Subject.findById(subjectId).lean();
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    const subjectName = subject.name || '';
    const resourcesContext = await getResourcesContext(subjectName);
    const reply = await feynmanChat(messages, subjectName, resourcesContext);
    res.json({ success: true, reply });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Feynman chat failed' });
  }
};
