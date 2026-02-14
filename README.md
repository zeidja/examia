# Examia – IB E-Learning Platform

MERN stack e-learning system for IB (International Baccalaureate) schools. Four user types: **Super Admin**, **School Admin**, **Teachers**, **Students**. Auth with JWT + OTP password reset. AI features: Flash Cards, Quizzes, TOK (Theory of Knowledge), External Assessment, Internal Assessment.

## Stack

- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT, Nodemailer (OTP), OpenAI
- **Frontend:** React (Vite), Tailwind CSS, Framer Motion, React Router

## Setup

### 1. Environment

Copy `.env` from the project root (or create from the values you were given). Do **not** commit real API keys or passwords. The backend reads `.env` from the `backend` folder when running scripts; for `server.js` we load `dotenv` at the top so it uses the repo root `.env` if you run from root, or create `backend/.env` with the same variables and run from `backend`.

Recommended: create `backend/.env` with the same variables so `npm run dev` and `npm run seed` in `backend` work without changing directory.

### 2. Backend

```bash
cd backend
npm install
cp ../.env .env   # or create backend/.env with same vars
npm run seed      # creates Super Admin admin@examia.com / Admin123! and default AI prompts + subjects
npm run dev       # http://localhost:5001
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev       # http://localhost:3000, proxies /api to backend
```

### 4. First login

- Open http://localhost:3000
- Sign in: **admin@examia.com** / **Admin123!** (Super Admin)
- Then: create schools, manage AI prompts, view materials tree, run AI tools.

## User roles

| Role          | Capabilities |
|---------------|----------------|
| Super Admin   | Create schools, view reports, manage subjects, materials tree, AI prompts, users |
| School Admin  | Manage classes and users for their school, use AI tools |
| Teacher       | Use AI tools (flash cards, quizzes, TOK, assessments) |
| Student       | Use AI tools |

## AI features

- **Flash Cards** – subject + topic + count → AI-generated cards  
- **Quizzes** – subject + topic + count → multiple-choice questions  
- **Theory of Knowledge (TOK)** – free-form prompt → TOK-style response  
- **External Assessment** – subject + topic → exam-style task  
- **Internal Assessment** – subject + topic → IA-style task  

Prompts are configurable by Super Admin under **AI Prompts**. Placeholders: `{{subject}}`, `{{topic}}`, `{{count}}`, `{{prompt}}`.

## Materials

The `materials` folder holds IB subject resources (e.g. Biology, Business, Economics, Math, Physics, Psychology). Only the **Super Admin** can see the materials tree in the app; it is used as context for AI generation and is not shown to teachers or students.

## API (main)

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` (OTP)
- `GET/POST /api/schools`, `GET /api/schools/reports` (Super Admin)
- `GET /api/subjects`, `GET /api/classes`, `GET /api/users`
- `GET /api/materials/tree` (Super Admin)
- `GET/PUT /api/ai-prompts/:key` (Super Admin)
- `POST /api/ai/flash-cards`, `POST /api/ai/quizzes`, `POST /api/ai/tok`, `POST /api/ai/external-assessment`, `POST /api/ai/internal-assessment`

## Email templates

All outgoing emails use shared HTML templates (Examia branding and colors): **Password reset OTP**, **Password changed**, **New resource** (when a teacher publishes material/quiz/flash cards). Templates: `backend/templates/emailTemplates.js`. Optional in `.env`: **FRONTEND_URL** (so “Log in” links point to your app), **SMTP_FROM** (override From address).

## Notes

- Change **JWT_SECRET** and **OPENAI_API_KEY** (and other secrets) in production; keep `.env` out of version control.
- `OPENAI_MODEL` in `.env`: if your key doesn’t support `gpt-5-nano`, use e.g. `gpt-4o-mini` (already set in the provided .env).
- OTP emails use the SMTP settings in `.env` (e.g. Gmail app password).
