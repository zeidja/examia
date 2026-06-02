import mongoose from 'mongoose';

const schoolEventSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    startAt: { type: Date, required: true },
    endAt: { type: Date, default: null },
    allDay: { type: Boolean, default: true },
    /** null = whole school; otherwise only that class sees the event (plus admins). */
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

schoolEventSchema.index({ school: 1, startAt: 1 });
schoolEventSchema.index({ school: 1, class: 1, startAt: 1 });

export default mongoose.model('SchoolEvent', schoolEventSchema);
