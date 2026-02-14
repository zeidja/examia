import mongoose from 'mongoose';

const aiPromptSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    systemPrompt: { type: String, required: true },
    userPromptTemplate: { type: String, required: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('AIPrompt', aiPromptSchema);
