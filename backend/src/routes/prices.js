import { Router } from 'express';
import Product from '../models/Product.js';
import PriceLog from '../models/PriceLog.js';
import { requireEditor } from '../middleware/auth.js';
import { ok, error } from '../lib/response.js';

const router = Router();

// POST /products/:code/prices
router.post('/:code/prices', requireEditor, async (req, res) => {
  try {
    const { code } = req.params;
    const { prices, notes } = req.body;

    if (!prices || Object.keys(prices).length === 0) {
      return error(res, 'Nhập ít nhất 1 mức giá', 400);
    }

    const product = await Product.findOne({ code });
    if (!product) return error(res, 'Product not found', 404);

    const changes = [];
    product.prices = product.prices || new Map();

    for (const [level, value] of Object.entries(prices)) {
      const newVal = value != null ? Number(value) : 0;
      const oldVal = product.prices.get(level) ?? null;
      if (oldVal !== newVal) {
        changes.push({ level, old: oldVal, new: newVal });
      }
      product.prices.set(level, newVal);
    }
    product.priceUpdatedAt = new Date();
    await product.save();

    if (changes.length > 0) {
      await PriceLog.create({
        productCode: code,
        type: 'MANUAL',
        changes,
        updatedBy: req.user?.email || 'system',
        notes: notes || '',
      });
    }

    product.prices = product.prices ? Object.fromEntries(product.prices) : {};
    ok(res, product);
  } catch (e) {
    error(res, e.message);
  }
});

export default router;
