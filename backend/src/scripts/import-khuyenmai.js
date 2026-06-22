import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import PriceLog from '../models/PriceLog.js';
import { matchProduct } from '../services/matcher.js';
import 'dotenv/config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = resolve(__dirname, '../../../docs/BANG-GIA-KHUYENMAI.csv');

function parseKhuyenmai(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
    const modelName = cols[1] || '';
    const priceStr = (cols[2] || '').replace(/\./g, '');
    const price = parseFloat(priceStr);
    const branch = cols[3] || '';

    if (!modelName || isNaN(price)) continue;

    rows.push({ modelName, price, branch });
  }
  return rows;
}

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/banggiasi-v3';
  await mongoose.connect(MONGODB_URI);
  console.log('[DB] Connected');

  const content = readFileSync(csvPath, 'utf-8');
  const rows = parseKhuyenmai(content);
  console.log(`Parsed ${rows.length} products from BANG-GIA-KHUYENMAI.csv\n`);

  let updated = 0;
  let skipped = 0;
  let unmatched = [];

  for (const row of rows) {
    const candidates = await matchProduct(row.modelName, 5);

    if (candidates.length === 0) {
      unmatched.push(row);
      skipped++;
      continue;
    }

    const best = candidates[0];
    const product = await Product.findOne({ code: best.code });

    if (!product) {
      unmatched.push(row);
      skipped++;
      continue;
    }

    let hasChange = false;
    if (!product.prices) product.prices = new Map();

    const oldL4 = product.prices.get('L4');
    const newL4 = row.price;
    if (oldL4 !== newL4) {
      product.prices.set('L4', newL4);
      hasChange = true;
    }

    if (!product.tags.includes('khuyen-mai')) {
      product.tags.push('khuyen-mai');
      hasChange = true;
    }

    if (hasChange) {
      product.priceUpdatedAt = new Date();
      await product.save();

      await PriceLog.create({
        productCode: product.code,
        type: 'MANUAL',
        changes: oldL4 !== newL4 ? [{ level: 'L4', old: oldL4 ?? null, new: newL4 }] : [],
        updatedBy: 'script-import-khuyenmai',
        notes: `Khuyến mãi import: ${row.modelName} (${row.branch})`,
      });

      console.log(`  OK  ${product.code.padEnd(20)} ${row.modelName.padEnd(35)} L4=${newL4} +tag khuyen-mai`);
      updated++;
    } else {
      console.log(` SKIP ${product.code.padEnd(20)} ${row.modelName.padEnd(35)} (already imported)`);
      skipped++;
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);

  if (unmatched.length > 0) {
    console.log(`\n=== UNMATCHED (${unmatched.length}) ===`);
    for (const r of unmatched) {
      console.log(`  ?  ${r.modelName.padEnd(40)} ${r.price} [${r.branch}]`);
    }
  }

  await mongoose.disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
