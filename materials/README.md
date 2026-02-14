# Examia — Materials file structure

This folder holds **subject-specific learning materials** (PDF, Word, TXT) used by Study & Learn, Feynman, and other AI features.

## Folder naming

Create **one folder per subject**. The folder name must match what the platform expects (see below). Supported file types: **.pdf**, **.doc**, **.docx**, **.txt**.

### Standard subjects (single pathway)

| Subject name in app   | Materials folder name |
|-----------------------|------------------------|
| Biology               | `Biology`             |
| Business / Business Management | `Business`   |
| Chemistry             | `Chemistry`            |
| Economics             | `Economics`            |
| Global Politics       | `GlobalPolitics`      |
| Physics               | `Physics`             |
| Psychology            | `Psychology`          |
| Mathematics (generic) | `Math`                |

### Mathematics — two pathways (IB DP)

We support **two mathematics subjects** with separate configs and materials:

| Subject name in app              | Materials folder name | Use case |
|----------------------------------|------------------------|----------|
| **Mathematics AA** / **Math AA** | `MathAA`              | Analysis and Approaches (IA revision + Ideas use AA config) |
| **Mathematics AI** / **Math AI** | `MathAI`              | Applications and Interpretation (IA revision + Ideas use AI config) |

- Create **`MathAA`** for Mathematics: Analysis and Approaches.
- Create **`MathAI`** for Mathematics: Applications and Interpretation.
- You can also keep a single **`Math`** folder for a generic “Mathematics” subject (then the app uses Math AA config by default when the subject name does not specify AI).

**Subject name routing (AI vs AA):**

- If the subject name contains **“Math AI”**, **“Mathematics AI”**, **“Applications”**, or **“Interpretation”** (in a math context), the app uses **Math AI** configs (Applications and Interpretation) for Ideas and Internal Assessment feedback.
- Otherwise, for math subjects the app uses **Math AA** configs (Analysis and Approaches).

## Recommended structure inside each folder

Organize files by topic or unit so students and the AI can use them clearly. Example:

```
materials/
├── README.md
├── Biology/
│   ├── A - Unity and diversity/
│   │   ├── A1 - Diversity of organisms.pdf
│   │   └── A2 - Cells.pdf
│   └── B - Form and function/
│       └── ...
├── MathAA/
│   ├── Topic 1 - Number and algebra.pdf
│   ├── Topic 2 - Functions.pdf
│   └── ...
├── MathAI/
│   ├── Topic 1 - Number and algebra.pdf
│   └── ...
├── Physics/
│   └── ...
└── ...
```

- Use **subfolders** if you have many files (e.g. by unit or theme).
- **File and folder names** are used as context for the AI; clear names improve Study & Learn and Feynman suggestions.

## Summary

1. **One folder per subject** under `materials/`.
2. **Math has two options:** use **`MathAA`** and/or **`MathAI`** (and optionally **`Math`** for generic Mathematics).
3. **Subject names** in the app should match the table above (e.g. “Mathematics AA”, “Mathematics AI”) so the correct config and materials folder are used.
4. Only **.pdf**, **.doc**, **.docx**, **.txt** are read for AI features.
