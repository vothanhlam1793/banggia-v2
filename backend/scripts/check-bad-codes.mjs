// Check for remaining bad product codes
import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../src/models/Product.js';

await mongoose.connect(process.env.MONGODB_URI);

// Find all products with URL-unsafe codes
const bad = await Product.find({
  $or: [
    { code: { $regex: /\s/ } },
    { code: { $regex: /\// } },
    { code: { $regex: /\(/ } },
    { code: { $regex: /\n/ } },
  ]
}).select('code name brand status prCode').lean();

console.log(`Products with URL-unsafe codes: ${bad.length}`);
for (const p of bad.slice(0, 20)) {
  console.log(`  [${p.status}] ${p.brand} | code="${p.code}" | name="${p.name?.substring(0,40)}"`);
}

// Also check total counts
const total = await Product.countDocuments();
const pendingMap = await Product.countDocuments({ status: 'PENDING_MAP' });
const active = await Product.countDocuments({ status: 'ACTIVE' });
console.log(`\nTotal: ${total}, ACTIVE: ${active}, PENDING_MAP: ${pendingMap}`);

// Check a sample of PENDING_MAP codes
const samples = await Product.find({ status: 'PENDING_MAP' }).select('code brand').limit(10).lean();
console.log('\nSample PENDING_MAP products:');
for (const p of samples) {
  console.log(`  ${p.brand}: "${p.code}"`);
}

await mongoose.disconnect();
