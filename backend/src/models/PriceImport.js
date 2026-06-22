import mongoose from 'mongoose';

const priceImportSchema = new mongoose.Schema({
  batchId: { type: String, required: true, index: true },
  sourceName: { type: String, default: '' },
  inputCode: { type: String, default: '' },
  inputName: { type: String, required: true },
  sellPrice: { type: Number, default: 0 },
  costPrice: { type: Number, default: 0 },
  type: { type: String, enum: ['sell', 'cost'], default: 'sell', index: true },
  matchedProductCode: { type: String, default: null },
  matchedProductName: { type: String, default: null },
  matchScore: { type: Number, default: 0 },
  candidates: [{
    code: String,
    name: String,
    score: Number,
  }],
  status: {
    type: String,
    enum: ['AUTO_MATCHED', 'PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
  },
  reviewedBy: { type: String, default: null },
  reviewedAt: { type: Date, default: null },
  batchCompletedBy: { type: String, default: null },
  batchCompletedAt: { type: Date, default: null },
}, {
  timestamps: true,
});

priceImportSchema.index({ batchId: 1, status: 1 });
priceImportSchema.index({ matchedProductCode: 1 });

export default mongoose.model('PriceImport', priceImportSchema);
