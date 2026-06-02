/**
 * Demo data for testers: school "CMS", school admin, one teacher per active subject,
 * two classes with five students each. All logins use password Demo12@.
 *
 * Prerequisite: run `npm run seed` once so Subject documents exist (synced from materials).
 *
 * Usage: npm run seed:demo-cms
 */
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { seedDemoSchool } from './lib/seedDemoSchool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

seedDemoSchool({
  schoolName: 'CMS',
  emailDomain: 'cms.edu',
  emailKeyword: 'cms',
  adminDisplayName: 'CMS — School admin',
  markdownTitle: 'CMS demo accounts',
  markdownFilename: 'demo-cms-accounts.md',
  npmScript: 'seed:demo-cms',
  scriptsDir: __dirname,
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
