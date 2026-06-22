import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  brand: { type: String, default: '' },
  group: { type: String, default: '' },
  prices: {
    type: Map,
    of: Number,
    default: {},
  },
  costPrice: { type: Number, default: 0 },
  prCode: { type: String, unique: true, sparse: true, index: true },
  kiotvietCode: { type: String, default: '' },
  specs: { type: mongoose.Schema.Types.Mixed, default: {} },
  specs_source: { type: String, default: '' },
  specs_updated_at: { type: Date, default: null },
  priceStaleDays: { type: Number, default: 7 },
  priceUpdatedAt: { type: Date, default: null },
  status: {
    type: String,
    enum: ['ACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED', 'PENDING_MAP'],
    default: 'PENDING_MAP',
  },
  isPublic: { type: Boolean, default: false },
  tags: { type: [String], default: [] },
  description: { type: String, default: '' },
  category: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  images: { type: [String], default: [] },
  syncedFromKv: { type: Boolean, default: false },
  isStrategic: { type: Boolean, default: false },
  campaigns: [{
    name: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    targetMargin: { type: Number },
    targetCustomer: { type: String },
    note: { type: String },
  }],
  strategicPriority: { type: Number, default: 0 },
}, {
  timestamps: true,
});

productSchema.index({ group: 1, status: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ isPublic: 1, status: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ name: 'text', code: 'text' });

export default mongoose.model('Product', productSchema);
