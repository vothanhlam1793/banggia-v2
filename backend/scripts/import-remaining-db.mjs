// Import remaining brands (HIKVISION, KBVISION, IMOU) into MongoDB
import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import Product from '../src/models/Product.js';

const FILES = [
  { path: '/tmp/all_remaining_products.json', brand: 'HIKVISION' },
  { path: '/tmp/kbvision_imou_products.json', brand: 'KBVISION+IMOU' },
];

let allProducts = [];
for (const f of FILES) {
  const data = JSON.parse(fs.readFileSync(f.path, 'utf-8'));
  console.log(`Loaded ${data.length} products from ${f.path} (${f.brand})`);
  allProducts = allProducts.concat(data);
}

// Filter clearly non-product entries
const filtered = allProducts.filter(p => {
  if (!p.code || p.code.length < 3) return false;
  // Filter out section headers that slipped through
  if (/^[A-ZĐ\s]{15,}$/.test(p.code) && p.price === null) return false;
  if (p.code.length > 80) return false;
  return true;
});

console.log(`After filtering: ${filtered.length} products`);

await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected');

const lastPr = await Product.findOne({ prCode: { $exists: true } })
  .sort({ prCode: -1 }).select('prCode');
let prCounter = lastPr?.prCode ? parseInt(lastPr.prCode.match(/PR(\d+)/)[1]) : 0;

function nextPrCode() {
  prCounter++;
  return `PR${String(prCounter).padStart(6, '0')}`;
}

let updated = 0, created = 0, skipped = 0;

for (const p of filtered) {
  const name = p.code;
  let existing = await Product.findOne({ name });
  
  if (existing) {
    const updates = {};
    if (!existing.specs_source) updates.specs_source = p.specs_source;
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
      brand: p.brand,
      group: p.group || 'CAMERA IP',
      prices: p.price !== null ? { L6: p.price } : {},
      specs: p.specs ? { raw: p.specs } : {},
      specs_source: p.specs_source,
      images: p.images || [],
      imageUrl: (p.images && p.images[0]) || '',
      status: 'PENDING_MAP',
      priceUpdatedAt: p.price !== null ? new Date() : null,
    });
    created++;
  }
}

console.log(`\n========== DONE ==========`);
console.log(`Updated (matched): ${updated}`);
console.log(`Created (new): ${created}`);
console.log(`Next PR: PR${String(prCounter).padStart(6, '0')}`);
await mongoose.disconnect();
