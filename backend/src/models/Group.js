import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  isCustom: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Group || mongoose.model('Group', groupSchema);
