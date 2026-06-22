import { Router } from 'express';
import User from '../models/User.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { ok, error } from '../lib/response.js';

const router = Router();

// All routes require admin
router.use(requireAuth, requireAdmin);

// GET /users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort('-createdAt');
    ok(res, users);
  } catch (e) {
    error(res, e.message);
  }
});

// POST /users
router.post('/', async (req, res) => {
  try {
    const { email, name, password, role } = req.body;
    if (!email || !name || !password) return error(res, 'Thiếu thông tin', 400);
    if (password.length < 6) return error(res, 'Mật khẩu ít nhất 6 ký tự', 400);

    const exists = await User.findOne({ email });
    if (exists) return error(res, 'Email đã tồn tại', 400);

    const user = await User.create({ email, name, password, role: role || 'viewer' });
    ok(res, { id: user._id, email: user.email, name: user.name, role: user.role });
  } catch (e) {
    error(res, e.message);
  }
});

// PUT /users/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, role, password } = req.body;
    const update = {};
    if (name) update.name = name;
    if (role) update.role = role;
    if (password) {
      if (password.length < 6) return error(res, 'Mật khẩu ít nhất 6 ký tự', 400);
      update.password = password; // will be hashed by pre-save
    }

    const user = await User.findById(req.params.id);
    if (!user) return error(res, 'Không tìm thấy user', 404);

    // Cannot change own role
    if (req.user.id === user._id.toString() && role) {
      return error(res, 'Không thể tự đổi role của mình', 400);
    }

    Object.assign(user, update);
    await user.save();

    ok(res, { id: user._id, email: user.email, name: user.name, role: user.role });
  } catch (e) {
    error(res, e.message);
  }
});

// DELETE /users/:id
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return error(res, 'Không tìm thấy user', 404);
    if (req.user.id === user._id.toString()) {
      return error(res, 'Không thể xóa chính mình', 400);
    }
    await User.deleteOne({ _id: req.params.id });
    ok(res, { deleted: true });
  } catch (e) {
    error(res, e.message);
  }
});

export default router;
