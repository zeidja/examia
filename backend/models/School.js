import mongoose from 'mongoose';

const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    country: { type: String, default: '' },
    logo: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    settings: {
      timezone: { type: String, default: 'UTC' },
      language: { type: String, default: 'en' },
    },
  },
  { timestamps: true }
);

function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'school';
}

schoolSchema.pre('save', async function (next) {
  if (!this.slug && this.name) {
    let slug = slugify(this.name);
    let count = 0;
    let candidate = slug;
    const SchoolModel = mongoose.model('School');
    while (await SchoolModel.exists({ slug: candidate })) {
      count++;
      candidate = `${slug}-${count}`;
    }
    this.slug = candidate;
  }
  next();
});

schoolSchema.index({ name: 'text', email: 'text' });
export default mongoose.model('School', schoolSchema);
