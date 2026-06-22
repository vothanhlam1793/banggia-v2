import { Router } from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Product from '../models/Product.js';
import { ok, error } from '../lib/response.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// ── OpenAPI spec ──
let _openapiSpec = null;
function openapiSpec() {
  if (!_openapiSpec) {
    _openapiSpec = JSON.parse(readFileSync(join(__dirname, '../../public/openapi.json'), 'utf8'));
  }
  return _openapiSpec;
}

router.get('/openapi.json', (req, res) => {
  res.json(openapiSpec());
});

function escRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get('/search', async (req, res) => {
  try {
    const { q, tag, group, brand, limit = 10 } = req.query;
    const filter = {};

    if (tag) filter.tags = tag;
    if (group) filter.group = group;
    if (brand) filter.brand = brand;

    if (q) {
      const regex = new RegExp(escRegex(String(q)), 'i');
      filter.$or = [{ name: regex }, { code: regex }, { brand: regex }];
    }

    const products = await Product.find({
      ...filter,
      isPublic: true,
      status: 'ACTIVE',
    })
      .select('code name brand group prices costPrice tags imageUrl')
      .sort({ group: 1, name: 1 })
      .limit(Math.min(50, Math.max(1, Number(limit))))
      .lean();

    const data = products.map(p => ({
      ...p,
      prices: p.prices && typeof p.prices === 'object' ? Object.fromEntries(Object.entries(p.prices)) : {},
    }));

    ok(res, data);
  } catch (e) {
    error(res, e.message);
  }
});

router.get('/product/:code', async (req, res) => {
  try {
    const product = await Product.findOne({ code: req.params.code }).lean();
    if (!product) return error(res, 'Product not found', 404);

    product.prices = product.prices && typeof product.prices === 'object'
      ? Object.fromEntries(Object.entries(product.prices))
      : {};

    ok(res, {
      code: product.code,
      name: product.name,
      brand: product.brand,
      group: product.group,
      prices: product.prices,
      costPrice: product.costPrice,
      status: product.status,
      tags: product.tags,
      description: product.description,
      imageUrl: product.imageUrl,
    });
  } catch (e) {
    error(res, e.message);
  }
});

router.get('/promotions', async (req, res) => {
  try {
    const products = await Product.find({
      tags: 'khuyen-mai',
      isPublic: true,
      status: 'ACTIVE',
    })
      .select('code name brand group prices tags')
      .sort({ group: 1, name: 1 })
      .limit(20)
      .lean();

    const data = products.map(p => ({
      ...p,
      prices: p.prices && typeof p.prices === 'object' ? Object.fromEntries(Object.entries(p.prices)) : {},
    }));

    ok(res, {
      promotions: data,
      message: data.length > 0
        ? `Có ${data.length} sản phẩm đang khuyến mãi`
        : 'Hiện chưa có chương trình khuyến mãi nào',
    });
  } catch (e) {
    error(res, e.message);
  }
});

// ── Agent Chatbot Tools ──

function fmtPrice(n) {
  if (n == null || n === 0) return null;
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
}

function daysAgo(date) {
  if (!date) return null;
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (d === 0) return 'Hôm nay';
  if (d === 1) return '1 ngày trước';
  return `${d} ngày trước`;
}

// GET /agent/price-lookup?q=...&limit=5
router.get('/price-lookup', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    if (!q) return error(res, 'Thiếu tham số q', 400);

    const query = String(q).trim();
    const words = query.split(/\s+/).filter(Boolean);
    const fullRegex = new RegExp(escRegex(query), 'i');

    const orClauses = [
      { name: fullRegex },
      { code: fullRegex },
      { brand: fullRegex },
    ];

    // multi-word: also match all words in name
    if (words.length > 1) {
      orClauses.push({
        $and: words.map(w => ({ name: new RegExp(escRegex(w), 'i') })),
      });
    }

    const products = await Product.find({
      isPublic: true,
      status: 'ACTIVE',
      $or: orClauses,
    })
      .select('code name brand group price costPrice prices priceUpdatedAt')
      .sort({ group: 1, name: 1 })
      .limit(Math.min(20, Math.max(1, Number(limit))))
      .lean();

    const data = products.map(p => ({
      code: p.code,
      name: p.name,
      brand: p.brand || '',
      group: p.group || '',
      sellPrice: fmtPrice(p.price) || fmtPrice(p.prices?.L4) || fmtPrice(p.prices?.L5),
      updated: daysAgo(p.priceUpdatedAt),
      priceUpdatedAt: p.priceUpdatedAt || null,
    }));

    ok(res, {
      query,
      results: data,
      total: data.length,
      message: data.length === 0
        ? `Không tìm thấy sản phẩm nào với từ khóa "${query}"`
        : `Tìm thấy ${data.length} sản phẩm`,
    });
  } catch (e) {
    error(res, e.message);
  }
});

// GET /agent/strategic
router.get('/strategic', async (req, res) => {
  try {
    const { campaign, targetCustomer } = req.query;
    const filter = {};

    if (campaign) filter['campaigns.name'] = campaign;
    if (targetCustomer) filter['campaigns.targetCustomer'] = targetCustomer;
    filter.isStrategic = true;

    const products = await Product.find(filter)
      .select('code name brand group prices costPrice isStrategic campaigns strategicPriority tags')
      .sort({ strategicPriority: -1, group: 1, name: 1 })
      .limit(100)
      .lean();

    const data = products.map(p => ({
      ...p,
      prices: p.prices && typeof p.prices === 'object' ? Object.fromEntries(Object.entries(p.prices)) : {},
    }));

    ok(res, {
      strategic: data,
      total: data.length,
      message: data.length > 0
        ? `Có ${data.length} sản phẩm chiến lược đang được đẩy`
        : 'Chưa có sản phẩm chiến lược nào',
    });
  } catch (e) {
    error(res, e.message);
  }
});

// GET /agent/price/:code
router.get('/price/:code', async (req, res) => {
  try {
    const product = await Product.findOne({
      code: req.params.code,
      isPublic: true,
      status: 'ACTIVE',
    })
      .select('code name brand group price costPrice prices priceUpdatedAt description imageUrl')
      .lean();

    if (!product) return error(res, 'Không tìm thấy sản phẩm', 404);

    ok(res, {
      code: product.code,
      name: product.name,
      brand: product.brand || '',
      group: product.group || '',
      sellPrice: fmtPrice(product.price) || fmtPrice(product.prices?.L4) || fmtPrice(product.prices?.L5),
      updated: daysAgo(product.priceUpdatedAt),
      priceUpdatedAt: product.priceUpdatedAt || null,
      description: product.description || '',
      imageUrl: product.imageUrl || '',
    });
  } catch (e) {
    error(res, e.message);
  }
});

export default router;
