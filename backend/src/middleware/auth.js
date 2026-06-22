import jwt from 'jsonwebtoken';

export function authMiddleware(req, res, next) {
  req.user = null;
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // token invalid — ignore
    }
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

export function requireEditor(req, res, next) {
  if (!req.user || !['admin', 'editor'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
