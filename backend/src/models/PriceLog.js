import mongoose from 'mongoose';

const changeSchema = new mongoose.Schema({
  level: String,
  old: Number,
  new: Number,
}, { _id: false });

const priceLogSchema = new mongoose.Schema({
  productCode: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['IMPORT_SYNC', 'MANUAL'],
    default: 'MANUAL',
  },
  costPrice: { type: Number, default: null },
  previousCostPrice: { type: Number, default: null },
  changes: { type: [changeSchema], default: [] },
  updatedBy: { type: String, default: '' },
  notes: { type: String, default: '' },
}, {
  timestamps: { createdAt: true, updatedAt: false },
});

priceLogSchema.index({ productCode: 1, createdAt: -1 });

export default mongoose.model('PriceLog', priceLogSchema);
