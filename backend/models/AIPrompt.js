import mongoose from 'mongoose';

const aiPromptSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    systemPrompt: { type: String, required: true },
    userPromptTemplate: { type: String, default: '' },
    /** Large JSON or structured config appended after system prompt (IA generators / revision). */
    configJson: { type: String, default: '' },
    /** Extra system instructions after CONFIG (e.g. quiz rationale reminder). */
    systemSuffix: { type: String, default: '' },
    description: { type: String, default: '' },
    category: { type: String, default: 'other' },
    sortOrder: { type: Number, default: 999 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('AIPrompt', aiPromptSchema);
