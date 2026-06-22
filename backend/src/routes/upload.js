import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../public/uploads/products');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, gif, webp, svg)'));
  },
});

const router = Router();

router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, error: 'Vui lòng chọn file ảnh' });
  }
  const url = '/uploads/products/' + req.file.filename;
  res.json({ ok: true, data: { url, filename: req.file.filename } });
});

export default router;
