import mongoose from 'mongoose';

const teacherResourceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['material', 'quiz', 'flash_cards'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    content: { type: String, default: '' },
    filePath: { type: String, default: '' },
    fileName: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
    published: { type: Boolean, default: false },
    deadline: { type: Date, default: null },
  },
  { timestamps: true }
);

teacherResourceSchema.index({ createdBy: 1 });
teacherResourceSchema.index({ class: 1, published: 1 });
teacherResourceSchema.index({ class: 1, subject: 1, published: 1 });
teacherResourceSchema.index({ school: 1 });
export default mongoose.model('TeacherResource', teacherResourceSchema);
