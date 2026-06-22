// Import EZVIZ products from JSON into MongoDB
import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import Product from '../src/models/Product.js';

const DATA_FILE = '/tmp/ezviz_products.json';
const SPECS_SOURCE = 'EZVIZ - BẢNG GIÁ HÌNH ẢNH - 12.2025.xlsx';

const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
console.log(`Loaded ${data.length} products from JSON`);

await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected');

const lastPr = await Product.findOne({ prCode: { $exists: true } })
  .sort({ prCode: -1 }).select('prCode');
let prCounter = lastPr?.prCode ? parseInt(lastPr.prCode.match(/PR(\d+)/)[1]) : 0;

function nextPrCode() {
  prCounter++;
  return `PR${String(prCounter).padStart(6, '0')}`;
}

let updated = 0, created = 0;

for (const p of data) {
  const name = p.code;
  let existing = await Product.findOne({ name });
  
  if (existing) {
    const updates = {};
    if (!existing.specs_source) updates.specs_source = SPECS_SOURCE;
    if (p.specs && !existing.specs?.raw) updates.specs = { raw: p.specs };
    if (p.price !== null && p.price !== undefined) {
      if (!existing.prices || !existing.prices.get('L6')) {
        updates['prices.L6'] = p.price;
        if (!existing.priceUpdatedAt) updates.priceUpdatedAt = new Date();
      }
    }
    if (Object.keys(updates).length > 0) {
      await Product.updateOne({ _id: existing._id }, updates);
      updated++;
    }
  } else {
    await Product.create({
      code: name,
      name: name,
      prCode: nextPrCode(),
      brand: 'EZVIZ',
      group: p.group || 'CAMERA IP',
      prices: p.price !== null ? { L6: p.price } : {},
      specs: p.specs ? { raw: p.specs } : {},
      specs_source: SPECS_SOURCE,
      images: p.images || [],
      imageUrl: (p.images && p.images[0]) || '',
      status: 'PENDING_MAP',
      priceUpdatedAt: p.price !== null ? new Date() : null,
    });
    created++;
  }
}

console.log(`Done: ${updated} updated, ${created} created`);
console.log(`Next PR: PR${String(prCounter).padStart(6, '0')}`);
await mongoose.disconnect();
