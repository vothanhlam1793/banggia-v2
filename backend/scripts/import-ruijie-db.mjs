// Import RUIJIE products from JSON into MongoDB
import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import Product from '../src/models/Product.js';

const DATA_FILE = '/tmp/ruijie_products.json';

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

let updated = 0, created = 0, skipped = 0;
const stats = {};

for (const p of data) {
  const brand = p.brand || 'RUIJIE';
  const group = p.group || 'THIẾT BỊ MẠNG';
  stats[group] = stats[group] || { updated: 0, created: 0 };

  const existing = await Product.findOne({ name: p.code });
  
  if (existing) {
    const set = {};
    if (!existing.specs_source) set.specs_source = p.specs_source;
    if (p.specs && !existing.specs?.raw) set.specs = { raw: p.specs };
    if (p.price !== null && p.price !== undefined) {
      if (!existing.prices || !existing.prices.get('L6')) {
        set['prices.L6'] = p.price;
        if (!existing.priceUpdatedAt) set.priceUpdatedAt = new Date();
      }
    }
    if (!existing.brand || existing.brand !== brand) set.brand = brand;
    if (!existing.group || existing.group !== group) set.group = group;
    if (Object.keys(set).length > 0) {
      await Product.updateOne({ _id: existing._id }, { $set: set });
      updated++;
      stats[group].updated++;
    } else {
      skipped++;
    }
  } else {
    await Product.create({
      code: p.code,
      name: p.code,
      prCode: nextPrCode(),
      brand,
      group,
      prices: p.price !== null && p.price !== undefined ? { L6: p.price } : {},
      specs: p.specs ? { raw: p.specs } : {},
      specs_source: p.specs_source,
      images: [],
      imageUrl: '',
      status: 'PENDING_MAP',
      priceUpdatedAt: (p.price !== null && p.price !== undefined) ? new Date() : null,
    });
    created++;
    stats[group].created++;
  }
}

console.log(`\nDone: ${updated} updated, ${created} created, ${skipped} skipped`);
console.log(`Next PR: PR${String(prCounter).padStart(6, '0')}`);
for (const [g, s] of Object.entries(stats)) {
  console.log(`  ${g}: ${s.updated} updated, ${s.created} created`);
}
await mongoose.disconnect();
