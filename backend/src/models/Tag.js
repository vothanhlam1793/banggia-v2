import mongoose from 'mongoose';

const tagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  isCustom: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Tag || mongoose.model('Tag', tagSchema);
