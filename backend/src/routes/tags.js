import { Router } from 'express';
import Product from '../models/Product.js';
import Tag from '../models/Tag.js';
import { requireEditor } from '../middleware/auth.js';
import { ok, error } from '../lib/response.js';

const router = Router();

// GET /tags — merge từ Product + Tag collection
router.get('/', async (req, res) => {
  try {
    const fromProducts = await Product.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const productNames = new Set(fromProducts.map(r => r._id));

    const customTags = await Tag.find({ name: { $nin: [...productNames] } }).sort({ name: 1 });

    const result = [
      ...fromProducts.map(r => ({ name: r._id, count: r.count })),
      ...customTags.map(t => ({ name: t.name, count: 0 })),
    ];

    ok(res, result);
  } catch (e) {
    error(res, e.message);
  }
});

// POST /tags — tạo tag mới
router.post('/', requireEditor, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return error(res, 'Tên tag không được trống', 400);

    const trimmed = name.trim();

    // Check trùng trong cả Product lẫn Tag collection
    const existsInProduct = await Product.findOne({ tags: trimmed });
    const existsInTag = await Tag.findOne({ name: trimmed });
    if (existsInProduct || existsInTag) {
      return error(res, `Tag "${trimmed}" đã tồn tại`, 409);
    }

    await Tag.create({ name: trimmed, isCustom: true });
    ok(res, { message: `Đã tạo tag "${trimmed}"` });
  } catch (e) {
    if (e.code === 11000) return error(res, `Tag "${name.trim()}" đã tồn tại`, 409);
    error(res, e.message);
  }
});

// POST /tags/rename
router.post('/rename', requireEditor, async (req, res) => {
  try {
    const { old, new: newTag } = req.body;
    if (!old || !newTag) return error(res, 'Missing old or new name', 400);

    const products = await Product.find({ tags: old });
    if (products.length === 0) {
      // Chỉ có trong Tag collection — rename ở đó
      const tag = await Tag.findOne({ name: old });
      if (!tag) return error(res, 'Tag not found', 404);
      tag.name = newTag;
      await tag.save();
      return ok(res, { message: `Đã đổi "${old}" → "${newTag}" (0 sản phẩm)` });
    }

    const ops = products.map(p => ({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { 'tags.$[elem]': newTag } },
        arrayFilters: [{ elem: old }],
      },
    }));
    await Product.bulkWrite(ops);

    // Cập nhật Tag collection
    const existing = await Tag.findOne({ name: old });
    if (existing) {
      const newExists = await Tag.findOne({ name: newTag });
      if (newExists && newExists.name !== old) {
        await Tag.deleteOne({ name: old });
      } else {
        existing.name = newTag;
        await existing.save();
      }
    }

    ok(res, { message: `Đã đổi "${old}" → "${newTag}" (${products.length} sản phẩm)` });
  } catch (e) {
    error(res, e.message);
  }
});

// DELETE /tags/:name
router.delete('/:name', requireEditor, async (req, res) => {
  try {
    const result = await Product.updateMany({ tags: req.params.name }, { $pull: { tags: req.params.name } });
    await Tag.deleteOne({ name: req.params.name });
    ok(res, { message: `Đã xóa tag "${req.params.name}" khỏi ${result.modifiedCount} sản phẩm` });
  } catch (e) {
    error(res, e.message);
  }
});

export default router;
