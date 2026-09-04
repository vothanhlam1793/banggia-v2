import { Router } from 'express';
import Product from '../models/Product.js';
import { requireAuth, requireEditor, requireAdmin } from '../middleware/auth.js';
import { ok, error, paginated } from '../lib/response.js';

const router = Router();

const DEFAULT_STALE = {
  'CAMERA IP': 3,
  'CAM ANALOG': 7,
  NVR: 7,
  XVR: 7,
  'PHỤ KIỆN': 30,
};

function normalizeImageUrl(value) {
  return typeof value === 'string'
    ? value.replace(/^http:\/\/(?:localhost|127\.0\.0\.1):10202(?=\/uploads\/)/, '')
    : value;
}

function buildFilter({ search, brand, group, status, isPublic, tag } = {}) {
  const filter = {};
  if (brand) filter.brand = brand;
  if (group) filter.group = group;
  if (status) filter.status = status;
  if (isPublic !== undefined) filter.isPublic = isPublic === 'true' || isPublic === true;
  if (tag) filter.tags = tag;
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { name: regex },
      { code: regex },
      { brand: regex },
      { group: regex },
    ];
  }
  return filter;
}

// GET /products
router.get('/', async (req, res) => {
  try {
    const { search, brand, group, status, isPublic, tag } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 50);
    const skip = (page - 1) * limit;

    const filter = buildFilter({ search, brand, group, status, isPublic, tag });
    const [items, total] = await Promise.all([
      Product.find(filter).sort({ group: 1, name: 1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);
    paginated(res, { items, total, page, limit });
  } catch (e) {
    error(res, e.message);
  }
});

// GET /brands — distinct brands for dropdown
router.get('/brands', async (req, res) => {
  try {
    const brands = await Product.distinct('brand', { brand: { $ne: null, $ne: '' } });
    const sorted = brands.sort((a, b) => a.localeCompare(b, 'vi'));
    ok(res, sorted);
  } catch (e) {
    error(res, e.message);
  }
});

// GET /products/count
router.get('/count', async (req, res) => {
  try {
    const filter = buildFilter(req.query);
    const total = await Product.countDocuments(filter);
    ok(res, total);
  } catch (e) {
    error(res, e.message);
  }
});

// GET /products/stale
router.get('/stale', async (req, res) => {
  try {
    const { group, status, hasPrice, search, staleStatus } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 200));
    const skip = (page - 1) * limit;

    const filter = {};
    if (group) filter.group = group;
    if (status) filter.status = status;
    if (hasPrice === 'true') filter.priceUpdatedAt = { $ne: null };
    if (hasPrice === 'false') filter.priceUpdatedAt = null;
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { code: regex }];
    }

    const allItems = await Product.find(filter).sort({ priceUpdatedAt: 1 }).lean();

    const now = new Date();
    const all = allItems.map(p => {
      const daysSince = p.priceUpdatedAt
        ? Math.floor((now - new Date(p.priceUpdatedAt)) / (1000 * 60 * 60 * 24))
        : 999;
      const staleDays = p.priceStaleDays || 7;
      return {
        ...p,
        prices: p.prices && typeof p.prices === 'object' ? Object.fromEntries(Object.entries(p.prices)) : {},
        daysSinceUpdate: daysSince,
        isStale: daysSince > staleDays,
        isWarning: daysSince > staleDays * 0.7,
      };
    });

    let data = all.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);

    if (staleStatus === 'noPrice') data = data.filter(p => p.daysSinceUpdate >= 999);
    else if (staleStatus === 'stale') data = data.filter(p => p.isStale && p.daysSinceUpdate < 999);
    else if (staleStatus === 'warning') data = data.filter(p => p.isWarning && !p.isStale);
    else if (staleStatus === 'ok') data = data.filter(p => !p.isWarning && p.daysSinceUpdate < 999);

    const filteredTotal = data.length;
    const sliced = data.slice(skip, skip + limit);

    paginated(res, { items: sliced, total: filteredTotal, page, limit });
  } catch (e) {
    error(res, e.message);
  }
});

// GET /products/strategic
router.get('/strategic', async (req, res) => {
  try {
    const { campaign, targetCustomer, isStrategic, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 50);
    const skip = (page - 1) * limit;

    const filter = {};
    if (isStrategic === 'true') filter.isStrategic = true;
    if (campaign) filter['campaigns.name'] = campaign;
    if (targetCustomer) filter['campaigns.targetCustomer'] = targetCustomer;
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { code: regex }, { brand: regex }];
    }

    if (!filter.isStrategic && !campaign && !targetCustomer) {
      filter.$or = filter.$or || [];
      filter.isStrategic = true;
      filter.$or.push({ 'campaigns.0': { $exists: true } });
    }

    const sort = { strategicPriority: -1, group: 1, name: 1 };
    const [items, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);

    const data = items.map(p => ({
      ...p,
      prices: p.prices && typeof p.prices === 'object' ? Object.fromEntries(Object.entries(p.prices)) : {},
    }));

    paginated(res, { items: data, total, page, limit });
  } catch (e) {
    error(res, e.message);
  }
});

// GET /products/campaigns — distinct campaign names
router.get('/campaigns', async (req, res) => {
  try {
    const result = await Product.distinct('campaigns.name', { 'campaigns.0': { $exists: true } });
    ok(res, result.filter(Boolean).sort());
  } catch (e) {
    error(res, e.message);
  }
});

// POST /products/:code/campaigns
router.post('/:code/campaigns', requireEditor, async (req, res) => {
  try {
    const product = await Product.findOne({ code: req.params.code });
    if (!product) return error(res, 'Product not found', 404);

    const { name, startDate, endDate, targetMargin, targetCustomer, note } = req.body;
    if (!name) return error(res, 'Campaign name is required', 400);

    product.campaigns.push({ name, startDate, endDate, targetMargin, targetCustomer, note });
    product.isStrategic = true;
    await product.save();

    ok(res, product);
  } catch (e) {
    error(res, e.message);
  }
});

// DELETE /products/:code/campaigns/:campaignId
router.delete('/:code/campaigns/:campaignId', requireEditor, async (req, res) => {
  try {
    const product = await Product.findOne({ code: req.params.code });
    if (!product) return error(res, 'Product not found', 404);

    product.campaigns = product.campaigns.filter(
      (c) => c._id.toString() !== req.params.campaignId
    );
    if (product.campaigns.length === 0) {
      product.isStrategic = false;
    }
    await product.save();

    ok(res, product);
  } catch (e) {
    error(res, e.message);
  }
});

// GET /products/:code/logs  (must be before /:code)
router.get('/:code/logs', async (req, res) => {
  try {
    const PriceLog = (await import('../models/PriceLog.js')).default;
    const logs = await PriceLog.find({ productCode: req.params.code }).sort({ createdAt: -1 }).limit(50).lean();
    const data = logs.map(l => ({
      ...l,
      id: l._id.toString(),
      createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : null,
    }));
    ok(res, data);
  } catch (e) {
    error(res, e.message);
  }
});

// GET /products/last-sync - Lấy thông tin lần sync cuối
router.get('/last-sync', requireAuth, async (req, res) => {
  try {
    const SyncLog = (await import('../models/SyncLog.js')).default;
    const last = await SyncLog.findOne({ type: 'kiotviet' }).sort({ createdAt: -1 }).lean();
    ok(res, last || null);
  } catch (e) {
    error(res, e.message);
  }
});

// GET /products/:code
router.get('/:code', async (req, res) => {
  try {
    const product = await Product.findOne({ code: req.params.code }).lean();
    if (!product) return error(res, 'Product not found', 404);
    product.prices = product.prices && typeof product.prices === 'object' ? Object.fromEntries(Object.entries(product.prices)) : {};
    ok(res, product);
  } catch (e) {
    error(res, e.message);
  }
});

// PATCH /products/:code
router.patch('/:code', requireEditor, async (req, res) => {
  try {
    const product = await Product.findOne({ code: req.params.code });
    if (!product) return error(res, 'Product not found', 404);

    const allowed = ['name', 'brand', 'group', 'status', 'isPublic', 'tags', 'description', 'category', 'imageUrl', 'images', 'priceStaleDays', 'specs', 'specs_updated_at', 'isStrategic', 'campaigns', 'strategicPriority'];
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        product[field] = field === 'imageUrl'
          ? normalizeImageUrl(req.body[field])
          : field === 'images' && Array.isArray(req.body[field])
            ? req.body[field].map(normalizeImageUrl)
            : req.body[field];
      }
    }

    if (req.body.group && req.body.group !== product._originalGroup) {
      product.priceStaleDays = DEFAULT_STALE[req.body.group] || 7;
    }

    await product.save();
    product.prices = product.prices && typeof product.prices === 'object' ? Object.fromEntries(Object.entries(product.prices)) : {};
    ok(res, product);
  } catch (e) {
    error(res, e.message);
  }
});

// POST /products/sync-kiotviet
router.post('/sync-kiotviet', requireAdmin, async (req, res) => {
  try {
    const https = await import('https');
    const { KIOTVIET_CLIENT_ID, KIOTVIET_CLIENT_SECRET, KIOTVIET_RETAILER } = process.env;
    if (!KIOTVIET_CLIENT_ID || !KIOTVIET_CLIENT_SECRET || !KIOTVIET_RETAILER) {
      return error(res, 'Thiếu cấu hình KiotViet (KIOTVIET_CLIENT_ID, KIOTVIET_CLIENT_SECRET, KIOTVIET_RETAILER)', 500);
    }

    // 1. Get token
    const tokenData = await new Promise((resolve, reject) => {
      const postData = new URLSearchParams({
        scopes: 'PublicApi.Access',
        grant_type: 'client_credentials',
        client_id: KIOTVIET_CLIENT_ID,
        client_secret: KIOTVIET_CLIENT_SECRET,
      }).toString();
      const req = https.request('https://id.kiotviet.vn/connect/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) },
        timeout: 15000,
      }, resp => { let body = ''; resp.on('data', c => body += c); resp.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } }); });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Token timeout')); });
      req.write(postData);
      req.end();
    });
    if (!tokenData.access_token) return error(res, 'Lỗi xác thực KiotViet: ' + JSON.stringify(tokenData), 500);
    const token = tokenData.access_token;

    // Brand → Group mapping
    const BRAND_GROUP = {
      DAHUA: 'CAMERA IP', HIKVISION: 'CAMERA IP', KBVISION: 'CAMERA IP',
      IMOU: 'CAMERA IP', EZVIZ: 'CAMERA IP', XIAOMI: 'CAMERA IP',
      'TP-LINK': 'THIẾT BỊ MẠNG', RUIJIE: 'THIẾT BỊ MẠNG', NETIS: 'THIẾT BỊ MẠNG', Tenda: 'THIẾT BỊ MẠNG', MERCUSYS: 'THIẾT BỊ MẠNG',
      'WESTERN DIGITAL': 'Ổ CỨNG', Seagate: 'Ổ CỨNG', Samsung: 'Ổ CỨNG',
    };
    const CAT_GROUP = {
      CAMERA: 'CAMERA IP', 'Camera Wifi': 'CAMERA IP', 'ĐẦU GHI': 'ĐẦU GHI', COMBO: 'COMBO',
      'Đèn NLMT': 'ĐÈN NLMT', 'NGUỒN ADAPTER': 'PHỤ KIỆN', 'PHỤ KIỆN': 'PHỤ KIỆN',
      'CÁP MẠNG': 'PHỤ KIỆN', 'CÁP XOẮN': 'PHỤ KIỆN', 'Ổ CỨNG': 'Ổ CỨNG',
      'Tủ mạng': 'PHỤ KIỆN', 'THIẾT BỊ BỔ SUNG': 'PHỤ KIỆN', BALUN: 'PHỤ KIỆN',
      'Chuột - Bàn phím': 'PHỤ KIỆN', Jack: 'PHỤ KIỆN', 'Chân đế': 'PHỤ KIỆN',
      Ống: 'PHỤ KIỆN', 'Thiết bị chống sét': 'PHỤ KIỆN', 'THẺ NHỚ': 'THẺ NHỚ',
      'MÀN HÌNH': 'MÀN HÌNH', LOA: 'LOA', Switch: 'THIẾT BỊ MẠNG', Router: 'THIẾT BỊ MẠNG', 'Access Point': 'THIẾT BỊ MẠNG',
    };

    // 2. Fetch all KiotViet products
    let allProducts = [];
    let current = 0;
    const pageSize = 100;
    while (true) {
      const data = await new Promise((resolve, reject) => {
        const req = https.request(`https://public.kiotapi.com/products?pageSize=${pageSize}&currentItem=${current}`, {
          headers: { Retailer: KIOTVIET_RETAILER, Authorization: `Bearer ${token}` },
          timeout: 30000,
        }, resp => { let body = ''; resp.on('data', c => body += c); resp.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } }); });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('API timeout')); });
        req.end();
      });
      allProducts.push(...data.data);
      current += data.data.length;
      if (current >= data.total) break;
    }

    // 3. Process each product
    let created = 0, updated = 0, skipped = 0;
    for (const kp of allProducts) {
      const code = (kp.code || '').trim();
      const catName = (kp.categoryName || '').trim();
      if (!code || catName === 'Chưa phân loại') { skipped++; continue; }

      let group = CAT_GROUP[catName] || (BRAND_GROUP[catName] ? BRAND_GROUP[catName] : catName);
      let brand = BRAND_GROUP[catName] ? catName : '';

      const existing = await Product.findOne({ code });
      if (existing) {
        if (brand && !existing.brand) existing.brand = brand;
        if (group) existing.group = group;
        // Sync KiotViet images if available
        if (kp.images && Array.isArray(kp.images) && kp.images.length > 0) {
          const urls = kp.images.map((img) => img || '').filter(Boolean);
          if (urls.length > 0) {
            existing.images = urls;
            if (!existing.imageUrl) existing.imageUrl = urls[0];
          }
        }
        await existing.save();
        updated++;
      } else {
        await Product.create({
          code,
          name: kp.name || code,
          brand: brand || '',
          group: group || 'Khác',
          status: 'PENDING_MAP',
          isPublic: false,
        });
        created++;
      }
    }

    // 4. Save sync date
    const SyncLog = (await import('../models/SyncLog.js')).default;
    await SyncLog.create({
      type: 'kiotviet',
      created: created,
      updated: updated,
      skipped: skipped,
      total: allProducts.length,
    });

    ok(res, {
      message: `Đồng bộ xong: ${created} mới, ${updated} cập nhật, ${skipped} bỏ qua`,
      created,
      updated,
      skipped,
      total: allProducts.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (e) {
    error(res, 'Lỗi đồng bộ KiotViet: ' + (e.message || e));
  }
});

export default router;
