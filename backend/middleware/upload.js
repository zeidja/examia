import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv',
    ];
    if (allowed.includes(file.mimetype) || file.originalname?.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) or CSV files are allowed'));
    }
  },
});

export const uploadExcel = upload.single('file');

const materialStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${(file.originalname || 'file').replace(/[^a-zA-Z0-9.-]/g, '_')}`),
});
const materialUpload = multer({
  storage: materialStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/png',
      'image/jpeg',
    ];
    if (allowed.includes(file.mimetype) || /\.(pdf|doc|docx|txt|png|jpg|jpeg)$/i.test(file.originalname || '')) {
      cb(null, true);
    } else {
      cb(new Error('Allowed: PDF, Word, TXT, images'));
    }
  },
});
export const uploadMaterial = materialUpload.single('file');

// Review submission (TOK, IA, EA): memory storage for text extraction
const reviewSubmissionStorage = multer.memoryStorage();
const reviewSubmissionUpload = multer({
  storage: reviewSubmissionStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype) || /\.(pdf|doc|docx|txt)$/i.test(file.originalname || '')) {
      cb(null, true);
    } else {
      cb(new Error('Allowed: PDF, Word (.doc, .docx), or TXT'));
    }
  },
});
export const uploadReviewSubmission = reviewSubmissionUpload.single('file');

export const uploadsDir = UPLOADS_DIR;
