// Clean up bad product codes from catalog import
import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../src/models/Product.js';

await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected');

// 1. Find all PENDING_MAP products with bad codes
const badProds = await Product.find({
  status: 'PENDING_MAP',
  $or: [
    { code: { $regex: /\s/ } },       // contains space
    { code: { $regex: /\// } },       // contains slash
    { code: { $regex: /\n/ } },       // contains newline
    { code: { $regex: /\(/ } },        // contains parenthesis
    { code: { $regex: /^[A-ZĐ\s]{20,}$/ } }, // all caps long = section header
  ]
}).lean();

console.log(`Found ${badProds.length} products with bad codes`);

// Group by pattern
const patterns = {};
for (const p of badProds) {
  const code = p.code;
  let cat = 'other';
  if (code === 'SẴN KHO' || code === 'GIÁ LẺ CŨ' || code === 'GIÁ LẺ MỚI') cat = 'label';
  else if (/^[A-ZĐ\s]{20,}$/.test(code)) cat = 'section_header';
  else if (code.includes('/')) cat = 'has_slash';
  else if (code.includes('(') || code.includes(')')) cat = 'has_parens';
  else if (/\s/.test(code)) cat = 'has_space';
  
  if (!patterns[cat]) patterns[cat] = [];
  patterns[cat].push({ code, brand: p.brand, prCode: p.prCode, specs_source: p.specs_source });
}

for (const [cat, items] of Object.entries(patterns)) {
  console.log(`  ${cat}: ${items.length}`);
  for (const item of items.slice(0, 5)) {
    console.log(`    code="${item.code}" prCode=${item.prCode} brand=${item.brand}`);
  }
}

console.log(`\nDeleting ${badProds.length} bad products...`);
const result = await Product.deleteMany({
  _id: { $in: badProds.map(p => p._id) }
});
console.log(`Deleted ${result.deletedCount} products`);

// 2. Fix remaining PENDING_MAP products with cleanable codes
// For EZVIZ: extract just the model number 
// "H1C 2MP" -> "H1C"
// "CS-E4P (3K+6MP)" -> "CS-E4P"
// "C6N G1 4K" -> "C6N G1" (but maybe just "C6N"?)

// Let's check what remains
const remaining = await Product.find({ status: 'PENDING_MAP' }).select('code brand prCode').lean();
console.log(`\nRemaining PENDING_MAP: ${remaining.length}`);
const byBrand = {};
for (const p of remaining) {
  const code = p.code;
  const hasIssue = /\s/.test(code) || /\//.test(code) || /\(/.test(code);
  if (!byBrand[p.brand]) byBrand[p.brand] = { total: 0, withIssues: 0, samples: [] };
  byBrand[p.brand].total++;
  if (hasIssue) {
    byBrand[p.brand].withIssues++;
    if (byBrand[p.brand].samples.length < 3) {
      byBrand[p.brand].samples.push(code);
    }
  }
}

for (const [brand, info] of Object.entries(byBrand)) {
  console.log(`  ${brand}: ${info.total} total, ${info.withIssues} with issues`);
  if (info.samples.length) console.log(`    samples: ${info.samples.join(', ')}`);
}

await mongoose.disconnect();
