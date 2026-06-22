// Auto-tag products based on name, group, and brand
// Run: node src/scripts/seed-tags.js

import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../models/Product.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/banggiasi-v3';

const GROUP_TAGS = {
  'CAMERA IP': 'camera-ip',
  'CAM ANALOG': 'camera-analog',
  'ĐẦU GHI / NVR': 'nvr',
  NVR: 'nvr',
  XVR: 'nvr',
  'PHỤ KIỆN': 'phu-kien',
  'MÀN HÌNH': 'man-hinh',
  'BALUN & JACK': 'phu-kien',
  'CÁP MẠNG': 'phu-kien',
  'CÁP TÍN HIỆU': 'phu-kien',
  'CÁP NGUỒN': 'phu-kien',
  'GIẮC NGUỒN': 'phu-kien',
  'NGUỒN ĐÈN': 'phu-kien',
  'NGUỒN TỔNG': 'phu-kien',
  'HỘP KỸ THUẬT': 'phu-kien',
};

const NAME_TAGS = [
  { pattern: /wifi| wireless/i, tag: 'wifi' },
  { pattern: /ngoài trời| outdoor| ngoai troi/i, tag: 'ngoai-troi' },
  { pattern: /trong nhà| indoor| trong nha/i, tag: 'trong-nha' },
  { pattern: /4g| sim/i, tag: '4g' },
  { pattern: /2mp| 2\.0mp| 2 MP/i, tag: '2mp' },
  { pattern: /4mp| 4\.0mp| 4 MP/i, tag: '4mp' },
  { pattern: /5mp| 5\.0mp| 5 MP/i, tag: '5mp' },
  { pattern: /8mp| 8\.0mp| 8 MP/i, tag: '8mp' },
  { pattern: /ptz| speed dome| quay quét/i, tag: 'ptz' },
  { pattern: /chống trộm| alarm| bao dong/i, tag: 'chong-trom' },
  { pattern: /full color| colorvu| fullcolor/i, tag: 'full-color' },
  { pattern: /motorized| varifocal| zoom/i, tag: 'zoom' },
  { pattern: /fixed| cố định| co dinh/i, tag: 'fixed' },
  { pattern: /starlight| starvis/i, tag: 'starlight' },
  { pattern: /ezviz/i, tag: 'ezviz' },
];

const BRAND_TAGS = {
  hikvision: ['hikvision'],
  dahua: ['dahua'],
  imou: ['imou'],
  kbvision: ['kbvision'],
  uniview: ['uniview'],
  avtech: ['avtech'],
};

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('[DB] Connected');

  const products = await Product.find({}).select('code name group brand tags');

  let updated = 0;
  for (const p of products) {
    const tags = new Set(p.tags || []);

    // Group-based tags
    for (const [groupKey, tag] of Object.entries(GROUP_TAGS)) {
      if (p.group && p.group.toUpperCase().includes(groupKey.toUpperCase())) {
        tags.add(tag);
      }
    }

    // Name-based tags
    for (const { pattern, tag } of NAME_TAGS) {
      if (p.name && pattern.test(p.name)) {
        tags.add(tag);
      }
    }

    // Brand tags
    if (p.brand) {
      const brandLower = p.brand.toLowerCase();
      for (const [brand, tagList] of Object.entries(BRAND_TAGS)) {
        if (brandLower.includes(brand)) {
          for (const t of tagList) tags.add(t);
        }
      }
    }

    const newTags = [...tags].sort();
    if (JSON.stringify(newTags) !== JSON.stringify((p.tags || []).sort())) {
      await Product.updateOne({ _id: p._id }, { $set: { tags: newTags } });
      updated++;
      if (updated % 100 === 0) console.log(`[Tags] Updated ${updated} products...`);
    }
  }

  console.log(`[Tags] Done! Updated ${updated}/${products.length} products`);
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
