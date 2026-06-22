// Clean up more garbage from import
import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../src/models/Product.js';

await mongoose.connect(process.env.MONGODB_URI);

// Find all PENDING_MAP products with suspicious codes
const suspicious = await Product.find({
  status: 'PENDING_MAP',
  $or: [
    { code: { $regex: /^\d+$/ } },           // pure numbers = prices
    { code: { $regex: /^SP\d+$/ } },          // SP codes shouldn't be PENDING_MAP
    { code: { $regex: /\s/ } },               // spaces in code
    { code: { $regex: /[()]/ } },             // parentheses
  ]
}).select('code name brand prCode').lean();

console.log(`Suspicious PENDING_MAP products: ${suspicious.length}`);

// Group them
const groups = {};
for (const p of suspicious) {
  let cat = 'other';
  if (/^\d+$/.test(p.code)) cat = 'price_as_code';
  else if (/^SP\d+$/.test(p.code)) cat = 'sp_code';
  else if (/\s/.test(p.code)) cat = 'has_space';
  else if (/[()]/.test(p.code)) cat = 'has_parens';
  
  if (!groups[cat]) groups[cat] = [];
  groups[cat].push(p);
}

for (const [cat, items] of Object.entries(groups)) {
  console.log(`  ${cat}: ${items.length}`);
  for (const item of items.slice(0, 5)) {
    console.log(`    "${item.code}" brand=${item.brand} prCode=${item.prCode}`);
  }
}

// Auto-delete price_as_code and sp_code entries
const toDelete = suspicious.filter(p => /^\d+$/.test(p.code) || /^SP\d+$/.test(p.code));
console.log(`\nDeleting ${toDelete.length} clearly wrong products...`);

if (toDelete.length > 0) {
  const result = await Product.deleteMany({
    _id: { $in: toDelete.map(p => p._id) }
  });
  console.log(`Deleted ${result.deletedCount} products`);
}

// Check remaining
const remaining = await Product.countDocuments({ status: 'PENDING_MAP' });
console.log(`\nRemaining PENDING_MAP: ${remaining}`);

// Spot check some codes
const samples = await Product.find({ status: 'PENDING_MAP' }).select('code brand').limit(10).lean();
for (const p of samples) {
  const urlSafe = !(/[\s/()]/.test(p.code));
  console.log(`  ${urlSafe ? '✓' : '✗'} ${p.brand}: "${p.code}"`);
}

await mongoose.disconnect();
