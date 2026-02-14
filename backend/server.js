import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import schoolRoutes from './routes/schoolRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import classRoutes from './routes/classRoutes.js';
import userRoutes from './routes/userRoutes.js';
import materialsRoutes from './routes/materialsRoutes.js';
import aiPromptRoutes from './routes/aiPromptRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import ideaRoutes from './routes/ideaRoutes.js';

connectDB();

const app = express();
const PORT = process.env.PORT || 5001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/users', userRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/ai-prompts', aiPromptRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/ideas', ideaRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: err.message || 'Server error' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
