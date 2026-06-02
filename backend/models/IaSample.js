import mongoose from 'mongoose';

const iaSampleSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    filePath: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

iaSampleSchema.index({ school: 1, subject: 1, createdAt: -1 });

export default mongoose.model('IaSample', iaSampleSchema);
