import { Router } from 'express';
import multer from 'multer';
import PriceImport from '../models/PriceImport.js';
import Product from '../models/Product.js';
import { requireAuth, requireEditor } from '../middleware/auth.js';
import { ok, error, paginated } from '../lib/response.js';
import { matchProduct, findByCode, normalizeName } from '../services/matcher.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function generateUUID() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function detectDelimiter(line) {
  const pipes = (line.match(/\|/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  return pipes >= commas ? '|' : ',';
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines[0]);
  const split = (l) => l.split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());

  const first = split(lines[0]);
  const isHeader = first.some(h => /^(code|mã|name|tên|price|giá|giá bán|giá nhập)/i.test(h));

  let headers, dataStart;
  if (isHeader) {
    headers = first;
    dataStart = 1;
  } else {
    headers = [];
    dataStart = 0;
  }

  const mapCol = (h, rowIdx) => {
    const lower = h.toLowerCase();
    if (/^(code|mã|mã sp|sp)/i.test(lower)) return 'code';
    if (/^(name|tên|tên hàng|tên mã|tên hàng cnm|tên hàng creta)/i.test(lower)) return 'name';
    if (/^(price|giá|giá bán|giá bán \(creta\)|sell)/i.test(lower)) return 'sellPrice';
    if (/^(giá nhập|nhập|cost|giá vốn)/i.test(lower)) return 'costPrice';
    return null;
  };

  const rows = [];
  for (let i = dataStart; i < lines.length; i++) {
    const cols = split(lines[i]);
    if (cols.length === 0 || cols.every(c => !c)) continue;

    if (isHeader) {
      const row = {};
      headers.forEach((h, idx) => {
        const key = mapCol(h, idx);
        if (key) row[key] = cols[idx];
      });
      if (row.name) rows.push(row);
    } else {
      if (cols.length >= 2) {
        const row = { name: cols[0], sellPrice: cols[1] };
        if (cols.length >= 3) row.code = cols[2];
        rows.push(row);
      } else if (cols.length === 1 && /^SP\d+/i.test(cols[0])) {
        rows.push({ code: cols[0], name: '', sellPrice: 0 });
      }
    }
  }

  return { headers, rows };
}

function looksLikeCode(val) {
  return /^SP\d+/i.test(val) || /^(DA|IM|EZ)-\d+$/i.test(val);
}

// POST /sell/upload — import giá bán
router.post('/sell/upload', requireEditor, upload.single('file'), async (req, res) => {
  await handleUpload(req, res, 'sell');
});

// POST /cost/upload — import giá nhập
router.post('/cost/upload', requireEditor, upload.single('file'), async (req, res) => {
  await handleUpload(req, res, 'cost');
});

async function handleUpload(req, res, importType) {
  try {
    if (!req.file) return error(res, 'No file uploaded', 400);

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    if (ext !== 'csv' && ext !== 'txt') return error(res, 'Only CSV files allowed', 400);

    const content = req.file.buffer.toString('utf-8');
    const { rows } = parseCSV(content);
    if (rows.length === 0) return error(res, 'No valid rows found', 400);

    const batchId = generateUUID();
    const sourceName = req.body.source || req.file.originalname.replace(/\.[^.]+$/, '');
    const results = [];

    for (const row of rows) {
      const name = row.name || row.code || '';
      const sellPrice = parseFloat(row.sellPrice || 0) || 0;
      const costPrice = parseFloat(row.costPrice || 0) || 0;
      const inputCode = row.code || '';

      if (!name && !inputCode) continue;

      const entry = {
        batchId,
        sourceName,
        inputCode,
        inputName: name,
        sellPrice,
        costPrice,
        type: importType,
        candidates: [],
        status: 'PENDING',
      };

      if (inputCode && looksLikeCode(inputCode)) {
        const product = await findByCode(inputCode);
        if (product) {
          entry.matchedProductCode = product.code;
          entry.matchedProductName = product.name;
          entry.matchScore = 1;
          entry.status = 'AUTO_MATCHED';
        }
      }

      if (entry.status !== 'AUTO_MATCHED' && name) {
        entry.candidates = await matchProduct(name, 10);
        if (entry.candidates.length > 0) {
          entry.matchedProductCode = entry.candidates[0].code;
          entry.matchedProductName = entry.candidates[0].name;
          entry.matchScore = entry.candidates[0].score;
        }
      }

      const doc = await PriceImport.create(entry);
      results.push(doc.toObject());
    }

    ok(res, {
      batchId,
      sourceName,
      total: results.length,
      autoMatched: results.filter(r => r.status === 'AUTO_MATCHED').length,
      pending: results.filter(r => r.status === 'PENDING').length,
    });
  } catch (e) {
    error(res, e.message);
  }
}

// POST /bulk — import bằng JSON payload (cho agent)
router.post('/bulk', requireEditor, async (req, res) => {
  try {
    const { sourceName, type, items } = req.body;
    if (!sourceName) return error(res, 'sourceName is required', 400);
    if (!type || !['sell', 'cost'].includes(type)) return error(res, 'type must be "sell" or "cost"', 400);
    if (!items || !Array.isArray(items) || items.length === 0) return error(res, 'items array is required', 400);

    const batchId = generateUUID();
    const results = [];

    for (const item of items) {
      const inputCode = (item.code || '').trim();
      const inputName = (item.name || item.code || '').trim();
      const price = parseFloat(item.price || 0) || 0;

      if (!inputCode && !inputName) continue;

      const entry = {
        batchId,
        sourceName,
        inputCode,
        inputName,
        sellPrice: type === 'sell' ? price : 0,
        costPrice: type === 'cost' ? price : 0,
        type,
        candidates: [],
        status: 'PENDING',
      };

      if (inputCode && looksLikeCode(inputCode)) {
        const product = await findByCode(inputCode);
        if (product) {
          entry.matchedProductCode = product.code;
          entry.matchedProductName = product.name;
          entry.matchScore = 1;
          entry.status = 'AUTO_MATCHED';
        }
      }

      if (entry.status !== 'AUTO_MATCHED' && inputName) {
        entry.candidates = await matchProduct(inputName, 10);
        if (entry.candidates.length > 0) {
          entry.matchedProductCode = entry.candidates[0].code;
          entry.matchedProductName = entry.candidates[0].name;
          entry.matchScore = entry.candidates[0].score;
        }
      }

      const doc = await PriceImport.create(entry);
      results.push(doc.toObject());
    }

    ok(res, {
      batchId,
      sourceName,
      total: results.length,
      autoMatched: results.filter(r => r.status === 'AUTO_MATCHED').length,
      pending: results.filter(r => r.status === 'PENDING').length,
    });
  } catch (e) {
    error(res, e.message);
  }
});
router.get('/search', requireAuth, async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q.trim()) return ok(res, []);
    const results = await matchProduct(q, 15);
    ok(res, results);
  } catch (e) {
    error(res, e.message);
  }
});

// GET /pending?type=sell|cost
router.get('/pending', requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const filter = { status: 'PENDING' };
    if (req.query.type) filter.type = req.query.type;
    const [items, total] = await Promise.all([
      PriceImport.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      PriceImport.countDocuments(filter),
    ]);
    paginated(res, { items, total, page, limit });
  } catch (e) {
    error(res, e.message);
  }
});

// GET /batch/:batchId
router.get('/batch/:batchId', requireAuth, async (req, res) => {
  try {
    const items = await PriceImport.find({ batchId: req.params.batchId }).sort({ createdAt: 1 }).lean();
    const stats = {
      total: items.length,
      autoMatched: items.filter(i => i.status === 'AUTO_MATCHED').length,
      pending: items.filter(i => i.status === 'PENDING').length,
      approved: items.filter(i => i.status === 'APPROVED').length,
      rejected: items.filter(i => i.status === 'REJECTED').length,
    };
    ok(res, { batchId: req.params.batchId, stats, items });
  } catch (e) {
    error(res, e.message);
  }
});

// GET /batches?type=sell|cost
router.get('/batches', requireAuth, async (req, res) => {
  try {
    const match = {};
    if (req.query.type) match.type = req.query.type;

    const batches = await PriceImport.aggregate([
      { $match: match },
      { $group: {
        _id: '$batchId',
        sourceName: { $first: '$sourceName' },
        total: { $sum: 1 },
        autoMatched: { $sum: { $cond: [{ $eq: ['$status', 'AUTO_MATCHED'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0] } },
        completedBy: { $first: '$batchCompletedBy' },
        completedAt: { $first: '$batchCompletedAt' },
        createdAt: { $first: '$createdAt' },
      }},
      { $sort: { createdAt: -1 } },
    ]);
    ok(res, batches);
  } catch (e) {
    error(res, e.message);
  }
});

// POST /batch/approve
router.post('/batch/approve', requireEditor, async (req, res) => {
  try {
    const { batchId } = req.body;
    if (!batchId) return error(res, 'batchId required', 400);

    const entries = await PriceImport.find({ batchId, status: { $in: ['PENDING', 'AUTO_MATCHED'] } });
    let approved = 0;

    for (const entry of entries) {
      if (!entry.matchedProductCode) continue;

      const product = await Product.findOne({ code: entry.matchedProductCode });
      if (!product) continue;

      entry.status = 'APPROVED';
      entry.reviewedBy = req.user?.email || 'unknown';
      entry.reviewedAt = new Date();
      await entry.save();

      if (!product.prices) product.prices = new Map();
      if (entry.type === 'cost') {
        entry.oldCostPrice = product.costPrice;
        product.costPrice = entry.costPrice || entry.sellPrice;
      } else {
        entry.oldSellPrice = product.prices.get('L4');
        product.prices.set('L4', entry.sellPrice);
      }
      product.priceUpdatedAt = new Date();
      await product.save();

      approved++;
    }

    ok(res, { approved, total: entries.length });
  } catch (e) {
    error(res, e.message);
  }
});

// POST /batch/complete — đánh dấu batch hoàn thành
router.post('/batch/complete', requireEditor, async (req, res) => {
  try {
    const { batchId } = req.body;
    if (!batchId) return error(res, 'batchId required', 400);

    const pending = await PriceImport.countDocuments({ batchId, status: { $in: ['PENDING', 'AUTO_MATCHED'] } });
    if (pending > 0) return error(res, `Còn ${pending} items chưa xử lý`, 400);

    const result = await PriceImport.updateMany(
      { batchId },
      { $set: { batchCompletedBy: req.user?.email || 'unknown', batchCompletedAt: new Date() } }
    );

    ok(res, { completed: result.modifiedCount, completedBy: req.user?.email });
  } catch (e) {
    error(res, e.message);
  }
});

// POST /:id/approve
router.post('/:id/approve', requireEditor, async (req, res) => {
  try {
    const entry = await PriceImport.findById(req.params.id);
    if (!entry) return error(res, 'Not found', 404);

    const productCode = req.body.productCode || entry.matchedProductCode;
    if (!productCode) return error(res, 'productCode required', 400);

    const product = await Product.findOne({ code: productCode });
    if (!product) return error(res, 'Product not found', 404);

    entry.matchedProductCode = product.code;
    entry.matchedProductName = product.name;
    entry.status = 'APPROVED';
    entry.reviewedBy = req.user?.email || 'unknown';
    entry.reviewedAt = new Date();
    await entry.save();

    if (!product.prices) product.prices = new Map();
    if (entry.type === 'cost') {
      entry.oldCostPrice = product.costPrice;
      product.costPrice = entry.costPrice || entry.sellPrice;
    } else {
      entry.oldSellPrice = product.prices.get('L4');
      product.prices.set('L4', entry.sellPrice);
    }
    product.priceUpdatedAt = new Date();
    await product.save();

    ok(res, entry.toObject());
  } catch (e) {
    error(res, e.message);
  }
});

// POST /:id/reject
router.post('/:id/reject', requireEditor, async (req, res) => {
  try {
    const entry = await PriceImport.findById(req.params.id);
    if (!entry) return error(res, 'Not found', 404);

    entry.status = 'REJECTED';
    entry.reviewedBy = req.user?.email || 'unknown';
    entry.reviewedAt = new Date();
    await entry.save();

    ok(res, entry.toObject());
  } catch (e) {
    error(res, e.message);
  }
});

// POST /:id/undo — revert APPROVED/REJECTED → PENDING
router.post('/:id/undo', requireEditor, async (req, res) => {
  try {
    const entry = await PriceImport.findById(req.params.id);
    if (!entry) return error(res, 'Not found', 404);
    if (entry.status !== 'APPROVED' && entry.status !== 'REJECTED')
      return error(res, 'Only approved or rejected items can be undone', 400);

    // Revert product price if was approved
    if (entry.status === 'APPROVED') {
      const product = await Product.findOne({ code: entry.matchedProductCode });
      if (product) {
        if (entry.type === 'cost') {
          product.costPrice = entry.oldCostPrice ?? product.costPrice;
        } else {
          product.prices.set('L4', entry.oldSellPrice ?? product.prices.get('L4'));
        }
        await product.save();
      }
    }

    entry.status = 'PENDING';
    entry.matchedProductCode = null;
    entry.matchedProductName = null;
    entry.reviewedBy = null;
    entry.reviewedAt = null;
    await entry.save();

    ok(res, entry.toObject());
  } catch (e) {
    error(res, e.message);
  }
});

// GET /review — EJS review page (no auth required, handles login inline)
router.get('/review', async (req, res) => {
  try {
    if (!req.user) {
      return res.send(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Import Review - BangGia</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .login-box { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,.3); width: 360px; }
    .login-box h1 { font-size: 20px; margin-bottom: 8px; color: #1a1a2e; }
    .login-box p { color: #666; font-size: 13px; margin-bottom: 24px; }
    .login-box input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 12px; font-size: 14px; }
    .login-box button { width: 100%; padding: 10px; background: #4361ee; color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .login-box button:hover { background: #3a56d4; }
    .login-box .error { color: #e74c3c; font-size: 13px; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="login-box">
    <h1>BangGia Import</h1>
    <p>Đăng nhập để tiếp tục</p>
    <div class="error" id="error"></div>
    <input type="email" id="email" placeholder="Email" value="admin@example.com">
    <input type="password" id="password" placeholder="Password" value="admin123">
    <button onclick="doLogin()">Đăng nhập</button>
  </div>
  <script>
    async function doLogin() {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.ok && data.data.token) {
          localStorage.setItem('token', data.data.token);
          location.reload();
        } else {
          document.getElementById('error').textContent = data.error || 'Login failed';
        }
      } catch(e) {
        document.getElementById('error').textContent = 'Network error';
      }
    }
  </script>
</body>
</html>`);
    }

    const batchId = req.query.batch;
    let batches = [];
    let items = [];

    if (batchId) {
      items = await PriceImport.find({ batchId, status: { $in: ['PENDING', 'AUTO_MATCHED'] } }).sort({ createdAt: 1 }).lean();
    } else {
      items = await PriceImport.find({ status: 'PENDING' }).sort({ createdAt: -1 }).limit(100).lean();
    }

    batches = await PriceImport.aggregate([
      { $match: { status: { $in: ['PENDING', 'AUTO_MATCHED'] } } },
      { $group: { _id: '$batchId', sourceName: { $first: '$sourceName' }, count: { $sum: 1 }, createdAt: { $first: '$createdAt' } } },
      { $sort: { createdAt: -1 } },
    ]);

    res.render('import-review', {
      items,
      batches,
      currentBatch: batchId,
      user: req.user,
    });
  } catch (e) {
    res.status(500).send('Error: ' + e.message);
  }
});

export default router;
