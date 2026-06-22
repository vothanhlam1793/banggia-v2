import mongoose from 'mongoose';

const SyncLogSchema = new mongoose.Schema({
  type: { type: String, required: true },     // 'kiotviet'
  created: { type: Number, default: 0 },       // số sp mới tạo
  updated: { type: Number, default: 0 },       // số sp cập nhật
  skipped: { type: Number, default: 0 },       // số sp bỏ qua
  total: { type: Number, default: 0 },         // tổng sp từ nguồn
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.SyncLog || mongoose.model('SyncLog', SyncLogSchema);
