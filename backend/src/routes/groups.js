import { Router } from 'express';
import Product from '../models/Product.js';
import Group from '../models/Group.js';
import { requireEditor } from '../middleware/auth.js';
import { ok, error } from '../lib/response.js';

const router = Router();

// GET /groups — merge từ Product + Group collection
router.get('/', async (req, res) => {
  try {
    // Lấy groups từ Product (có count > 0)
    const fromProducts = await Product.aggregate([
      { $group: { _id: '$group', count: { $sum: 1 } } },
      { $match: { _id: { $ne: null, $ne: '' } } },
      { $sort: { count: -1 } },
    ]);

    const productNames = new Set(fromProducts.map(r => r._id));

    // Lấy groups standalone (isCustom) chưa có trong Product
    const customGroups = await Group.find({ name: { $nin: [...productNames] } }).sort({ name: 1 });

    const result = [
      ...fromProducts.map(r => ({ name: r._id, count: r.count })),
      ...customGroups.map(g => ({ name: g.name, count: 0 })),
    ];

    ok(res, result);
  } catch (e) {
    error(res, e.message);
  }
});

// POST /groups — tạo nhóm mới
router.post('/', requireEditor, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return error(res, 'Tên nhóm không được trống', 400);

    const trimmed = name.trim();

    // Check trùng trong cả Product lẫn Group collection
    const existsInProduct = await Product.findOne({ group: trimmed });
    const existsInGroup = await Group.findOne({ name: trimmed });
    if (existsInProduct || existsInGroup) {
      return error(res, `Nhóm "${trimmed}" đã tồn tại`, 409);
    }

    await Group.create({ name: trimmed, isCustom: true });
    ok(res, { message: `Đã tạo nhóm "${trimmed}"` });
  } catch (e) {
    if (e.code === 11000) return error(res, `Nhóm "${name.trim()}" đã tồn tại`, 409);
    error(res, e.message);
  }
});

// POST /groups/rename
router.post('/rename', requireEditor, async (req, res) => {
  try {
    const { old, new: newName } = req.body;
    if (!old || !newName) return error(res, 'Missing old or new name', 400);

    // Cập nhật trong Product
    const result = await Product.updateMany({ group: old }, { $set: { group: newName } });

    // Cập nhật hoặc xóa trong Group collection
    const existing = await Group.findOne({ name: old });
    if (existing) {
      // Nếu newName đã tồn tại trong Group collection thì xóa old
      const newExists = await Group.findOne({ name: newName });
      if (newExists && newExists.name !== old) {
        await Group.deleteOne({ name: old });
      } else {
        existing.name = newName;
        await existing.save();
      }
    }

    ok(res, { message: `Đã đổi "${old}" → "${newName}" (${result.modifiedCount} sản phẩm)` });
  } catch (e) {
    error(res, e.message);
  }
});

// DELETE /groups/:name
router.delete('/:name', requireEditor, async (req, res) => {
  try {
    const result = await Product.updateMany({ group: req.params.name }, { $set: { group: null } });
    await Group.deleteOne({ name: req.params.name });
    ok(res, { message: `Đã xóa nhóm "${req.params.name}" khỏi ${result.modifiedCount} sản phẩm` });
  } catch (e) {
    error(res, e.message);
  }
});

export default router;
