// Import DAHUA products from JSON into MongoDB
import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import Product from '../src/models/Product.js';

const DATA_FILE = '/tmp/dahua_products.json';
const SPECS_SOURCE = 'DAHUA THÁNG 12.2025.xlsx';

const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
console.log(`Loaded ${data.length} products from JSON`);

await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected to MongoDB');

// Filter out non-product rows
const products = data.filter(p => {
  if (!p.code || p.code.length < 3) return false;
  if (p.code === 'GIÁ LẺ CŨ' || p.code === 'GIÁ LẺ MỚI') return false;
  if (/^[A-ZĐ\s]{10,}$/.test(p.code)) return false;
  return true;
});
console.log(`After filtering: ${products.length} products`);

// Get last PR code
const lastPr = await Product.findOne({ prCode: { $exists: true } })
  .sort({ prCode: -1 }).select('prCode');
let prCounter = lastPr?.prCode ? parseInt(lastPr.prCode.match(/PR(\d+)/)[1]) : 0;

function nextPrCode() {
  prCounter++;
  return `PR${String(prCounter).padStart(6, '0')}`;
}

let updated = 0, created = 0, skipped = 0;

for (const p of products) {
  const name = p.code; // model code is the name
  
  // Check if exists by name
  let existing = await Product.findOne({ name });
  
  if (existing) {
    const updates = {};
    
    // Only update specs_source if not set
    if (!existing.specs_source) updates.specs_source = SPECS_SOURCE;
    
    // Add specs if we have them and product doesn't
    if (p.specs && !existing.specs?.raw) {
      updates.specs = { raw: p.specs };
    }
    
    // Set L6 price
    if (p.price !== null && p.price !== undefined) {
      if (!existing.prices || !existing.prices.get('L6')) {
        updates['prices.L6'] = p.price;
        if (!existing.priceUpdatedAt) updates.priceUpdatedAt = new Date();
      }
    }
    
    // Prefix images with /admin for Next.js rewrite
    const dbImages = (p.images || []).map(u => '/admin' + u);
    
    // Add images if new
    if (dbImages.length > 0) {
      const existingImages = existing.images || [];
      const newImages = dbImages.filter(u => !existingImages.includes(u));
      if (newImages.length > 0) {
        updates['$push'] = { images: { $each: newImages } };
        if (!existing.imageUrl) updates.imageUrl = newImages[0];
      }
    }
    
    if (Object.keys(updates).length > 0) {
      await Product.updateOne({ _id: existing._id }, updates);
      updated++;
    }
  } else {
    // Create new product
    await Product.create({
      code: name,
      name: name,
      prCode: nextPrCode(),
      brand: 'DAHUA',
      group: p.group || 'CAMERA IP',
      prices: p.price !== null ? { L6: p.price } : {},
      specs: p.specs ? { raw: p.specs } : {},
      specs_source: SPECS_SOURCE,
      images: (p.images || []).map(u => '/admin' + u),
      imageUrl: (p.images && p.images[0]) ? '/admin' + p.images[0] : '',
      status: 'PENDING_MAP',
      priceUpdatedAt: p.price !== null ? new Date() : null,
    });
    created++;
  }
}

console.log(`\n========== DONE ==========`);
console.log(`Updated (matched): ${updated}`);
console.log(`Created (new): ${created}`);
console.log(`Next PR code: PR${String(prCounter).padStart(6, '0')}`);

// Show sample
const sample = await Product.findOne({ specs_source: SPECS_SOURCE })
  .select('code prCode name brand group prices specs_source -_id');
console.log('Sample:', JSON.stringify(sample, null, 2));

await mongoose.disconnect();
