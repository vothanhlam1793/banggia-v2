// Migration: assign prCode + kiotvietCode to all existing products
import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://black:***@127.0.0.1:27044/banggiasi-v3?authSource=admin';

await mongoose.connect(MONGODB_URI);
console.log('Connected to MongoDB');

const db = mongoose.connection.db;
const products = db.collection('products');

// 1. Set kiotvietCode for KiotViet-synced products (SPxxx codes)
const kvProducts = await products.find({ syncedFromKv: true, code: { $regex: /^SP\d+$/ } }).toArray();
let kvCount = 0;
for (const doc of kvProducts) {
  await products.updateOne({ _id: doc._id }, { $set: { kiotvietCode: doc.code } });
  kvCount++;
}
console.log(`kiotvietCode: updated ${kvCount} products`);

// 2. Assign prCode to all products without one
const cursor = products.find({ prCode: { $exists: false } }).sort({ _id: 1 });

// Find max existing prCode
const lastProduct = await products
  .find({ prCode: { $exists: true } })
  .sort({ prCode: -1 })
  .limit(1)
  .toArray();
let counter = 1;
if (lastProduct.length > 0 && lastProduct[0].prCode) {
  const match = lastProduct[0].prCode.match(/PR(\d+)/);
  if (match) counter = parseInt(match[1]) + 1;
}

let count = 0;
const bulkOps = [];
while (await cursor.hasNext()) {
  const doc = await cursor.next();
  const prCode = `PR${String(counter).padStart(6, '0')}`;
  bulkOps.push({
    updateOne: {
      filter: { _id: doc._id },
      update: { $set: { prCode } }
    }
  });
  counter++;
  count++;

  if (bulkOps.length >= 500) {
    await products.bulkWrite(bulkOps);
    console.log(`  ... ${count} prCodes assigned`);
    bulkOps.length = 0;
  }
}

if (bulkOps.length > 0) {
  await products.bulkWrite(bulkOps);
}

console.log(`Done: ${count} prCodes assigned (PR000001 - PR${String(counter - 1).padStart(6, '0')})`);

// Verify
const samples = await products.find({}, { projection: { code: 1, prCode: 1, kiotvietCode: 1, name: 1, _id: 0 } })
  .limit(5).toArray();
console.log('Sample:', JSON.stringify(samples, null, 2));

await mongoose.disconnect();
console.log('Disconnected');
