import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from '../models/User.js';
import AIPrompt from '../models/AIPrompt.js';
import Subject from '../models/Subject.js';
import { getAllAiPromptSeedDocuments } from '../config/aiPromptSeedData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MATERIALS_PATH = path.resolve(__dirname, '../../materials');

function getSubjectCode(folderName) {
  const map = {
    Biology: 'BIO',
    Business: 'BM',
    Chemistry: 'CHEM',
    Economics: 'ECON',
    GlobalPolitics: 'GP',
    Math: 'MATH',
    Physics: 'PHY',
    Psychology: 'PSY',
  };
  return map[folderName] || folderName.slice(0, 3).toUpperCase();
}

function loadSubjectsFromMaterials() {
  const subjects = [];
  try {
    const entries = fs.readdirSync(MATERIALS_PATH, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isDirectory() && !ent.name.startsWith('.')) {
        subjects.push({
          name: ent.name,
          code: getSubjectCode(ent.name),
          materialsPath: ent.name,
        });
      }
    }
  } catch (err) {
    console.warn('Materials folder not found or not readable:', MATERIALS_PATH, err.message);
  }
  return subjects;
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const p of getAllAiPromptSeedDocuments()) {
    await AIPrompt.findOneAndUpdate(
      { key: p.key },
      {
        $set: {
          name: p.name,
          systemPrompt: p.systemPrompt,
          userPromptTemplate: p.userPromptTemplate ?? '',
          configJson: p.configJson ?? '',
          systemSuffix: p.systemSuffix ?? '',
          description: p.description || '',
          category: p.category || 'other',
          sortOrder: typeof p.sortOrder === 'number' ? p.sortOrder : 999,
          isActive: p.isActive !== false,
        },
      },
      { upsert: true }
    );
  }
  console.log('AIPrompts seeded/updated');
  const subjectsFromFiles = loadSubjectsFromMaterials();
  if (subjectsFromFiles.length > 0) {
    for (const sub of subjectsFromFiles) {
      await Subject.findOneAndUpdate(
        { materialsPath: sub.materialsPath },
        { $set: { name: sub.name, code: sub.code, materialsPath: sub.materialsPath, isActive: true } },
        { upsert: true, new: true }
      );
    }
    console.log('Subjects synced from materials folder:', subjectsFromFiles.map((s) => s.name).join(', '));
  }
  // IA-only subjects (no materials, quizzes, flashcards, notes; only Feedback + Ideas)
  const iaOnlySubjects = [
    { name: 'TOK Essay', code: 'TOK-E', materialsPath: '', iaOnly: true },
    { name: 'TOK Exhibition', code: 'TOK-X', materialsPath: '', iaOnly: true },
  ];
  for (const sub of iaOnlySubjects) {
    await Subject.findOneAndUpdate(
      { name: sub.name },
      { $set: { name: sub.name, code: sub.code, materialsPath: sub.materialsPath || '', iaOnly: true, isActive: true } },
      { upsert: true, new: true }
    );
  }
  console.log('IA-only subjects ensured:', iaOnlySubjects.map((s) => s.name).join(', '));
  const superAdmin = await User.findOne({ role: 'super_admin' });
  if (!superAdmin) {
    await User.create({
      name: 'Super Admin',
      email: 'admin@examia.com',
      password: 'Admin123!',
      role: 'super_admin',
    });
    console.log('Super Admin created: admin@examia.com / Admin123!');
  }
  await mongoose.disconnect();
  console.log('Seed done');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
