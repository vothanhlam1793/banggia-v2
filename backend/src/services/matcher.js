import Product from '../models/Product.js';

const ABBR_MAP = {
  'WD': 'Western',
  'SG': 'Seagate',
  'WT': 'Western',
  'IMOU': 'Imou',
  'EZVIZ': 'Ezviz',
  'DAHUA': 'Dahua',
  'HIK': 'Hikvision',
  'KB': 'KBVision',
};

export function expandAbbr(text) {
  return text.replace(/\b(WD|SG|WT|HIK|KB)\b/gi, m => ABBR_MAP[m.toUpperCase()] || m);
}

export function normalizeName(text) {
  return expandAbbr(text)
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function matchProduct(name, limit = 10) {
  const cleaned = normalizeName(name);
  const tokens = cleaned
    .replace(/[^a-zA-Z0-9\u00C0-\u1EF9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1)
    .join(' ');

  if (!tokens) return [];

  const results = await Product.find(
    { $text: { $search: tokens } },
    { code: 1, name: 1, brand: 1, group: 1, score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .lean();

  return results.map(r => ({
    code: r.code,
    name: r.name,
    brand: r.brand,
    group: r.group,
    score: r.score,
  }));
}

export async function findByCode(code) {
  return Product.findOne({ code }).select('code name brand group').lean();
}
