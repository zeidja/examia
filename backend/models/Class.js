import mongoose from 'mongoose';

const classSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    grade: { type: String, default: '' },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    /** Assigned teachers; when empty, any teacher in the school may view the class (backward compatible). */
    teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

classSchema.index({ school: 1, name: 1 });
export default mongoose.model('Class', classSchema);
