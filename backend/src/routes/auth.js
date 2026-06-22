import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { ok, error } from '../lib/response.js';

const router = Router();

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return error(res, 'Thiếu email hoặc mật khẩu', 400);

    const user = await User.findOne({ email });
    if (!user) return error(res, 'Sai email hoặc mật khẩu', 401);

    const valid = await user.comparePassword(password);
    if (!valid) return error(res, 'Sai email hoặc mật khẩu', 401);

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name, isAdmin: user.isAdmin, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    ok(res, {
      token,
      user: { id: user._id, email: user.email, name: user.name, isAdmin: user.isAdmin, role: user.role },
    });
  } catch (e) {
    error(res, e.message);
  }
});

// GET /me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return error(res, 'User not found', 404);
    ok(res, user);
  } catch (e) {
    error(res, e.message);
  }
});

export default router;
