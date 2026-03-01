/**
 * Sync subjects from the materials folder into the database.
 * Run from repo root: node backend/scripts/syncSubjects.js
 * Requires .env with MONGODB_URI.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { getMaterialsFolderNames } from '../services/materialsService.js';
import Subject from '../models/Subject.js';
import connectDB from '../config/db.js';

const CODE_MAP = {
  Biology: 'BIO',
  Business: 'BM',
  Chemistry: 'CHEM',
  Economics: 'ECON',
  GlobalPolitics: 'GP',
  Math: 'MATH',
  Physics: 'PHY',
  Psychology: 'PSY',
};

function getCode(name) {
  return CODE_MAP[name] || name.slice(0, 3).toUpperCase();
}

async function sync() {
  await connectDB();
  const folderNames = await getMaterialsFolderNames();
  const synced = [];
  for (const name of folderNames) {
    const subject = await Subject.findOneAndUpdate(
      { materialsPath: name },
      { $set: { name, code: getCode(name), materialsPath: name, isActive: true } },
      { upsert: true, new: true }
    );
    synced.push(subject);
  }
  const deactivated = await Subject.updateMany(
    { materialsPath: { $nin: folderNames }, isActive: true },
    { $set: { isActive: false } }
  );
  const deactivatedCount = deactivated.modifiedCount || 0;
  console.log('Synced subjects:', synced.map((s) => s.name).join(', '));
  if (deactivatedCount > 0) console.log('Deactivated:', deactivatedCount, 'subject(s)');
  await mongoose.disconnect();
  process.exit(0);
}

sync().catch((err) => {
  console.error(err);
  process.exit(1);
});
