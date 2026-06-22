import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import PriceLog from '../models/PriceLog.js';
import { matchProduct } from '../services/matcher.js';
import 'dotenv/config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = resolve(__dirname, '../../../docs/DLVIP.csv');

function parseDLVIP(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  const rows = [];

  for (let i = 3; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
    const stt = parseInt(cols[0]);
    if (isNaN(stt) || stt === 0) continue;

    const modelName = cols[2] || '';
    const syncCode = cols[3] || '';
    const brand = cols[4] || '';
    const l4Raw = parseFloat((cols[5] || '').replace(/\./g, ''));
    const l0Raw = parseFloat((cols[6] || '').replace(/\./g, ''));

    if (!modelName) continue;

    rows.push({
      stt,
      modelName,
      syncCode,
      brand,
      l4: isNaN(l4Raw) ? 0 : l4Raw,
      l0: isNaN(l0Raw) ? 0 : l0Raw,
    });
  }
  return rows;
}

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/banggiasi-v3';
  await mongoose.connect(MONGODB_URI);
  console.log('[DB] Connected');

  const content = readFileSync(csvPath, 'utf-8');
  const rows = parseDLVIP(content);
  console.log(`Parsed ${rows.length} products from DLVIP.csv\n`);

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

    const oldPrices = {};
    for (const [level, value] of product.prices || new Map()) {
      oldPrices[level] = value;
    }

    const changes = [];
    if (!product.prices) product.prices = new Map();

    const newL4 = row.l4;
    const oldL4 = oldPrices['L4'] ?? null;
    if (oldL4 !== (newL4 || null)) {
      changes.push({ level: 'L4', old: oldL4, new: newL4 });
    }
    product.prices.set('L4', newL4);

    const newL0 = row.l0;
    const oldL0 = oldPrices['L0'] ?? null;
    if (oldL0 !== (newL0 || null)) {
      changes.push({ level: 'L0', old: oldL0, new: newL0 });
    }
    product.prices.set('L0', newL0);

    if (changes.length > 0) {
      product.priceUpdatedAt = new Date();
      await product.save();

      await PriceLog.create({
        productCode: product.code,
        type: 'MANUAL',
        changes,
        updatedBy: 'script-import-dlvip',
        notes: `DLVIP import: ${row.modelName}`,
      });

      console.log(`  OK  ${product.code.padEnd(20)} ${row.modelName.padEnd(35)} L0=${newL0} L4=${newL4}`);
      updated++;
    } else {
      console.log(` SKIP ${product.code.padEnd(20)} ${row.modelName.padEnd(35)} (no price change)`);
      skipped++;
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);

  if (unmatched.length > 0) {
    console.log(`\n=== UNMATCHED (${unmatched.length}) ===`);
    for (const r of unmatched) {
      console.log(`  ?  ${r.modelName.padEnd(35)} [${r.syncCode}] ${r.brand}`);
    }
  }

  await mongoose.disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
