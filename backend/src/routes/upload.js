import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import https from 'https';
import { Client } from 'minio';

const BUCKET = process.env.MINIO_BUCKET || 'product-images';
const PRODUCT_IMAGE_PREFIX = (process.env.MINIO_PRODUCT_IMAGE_PREFIX || 'uploads/products')
  .replace(/^\/+|\/+$/g, '');
let client;
let bucketReady;

function getClient() {
  if (client) return client;

  const endPoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  if (!endPoint || !accessKey || !secretKey) {
    throw new Error('MinIO configuration is incomplete');
  }

  const useSSL = process.env.MINIO_USE_SSL === 'true';
  client = new Client({
    endPoint,
    port: Number(process.env.MINIO_PORT || 9000),
    useSSL,
    accessKey,
    secretKey,
    transportAgent: useSSL && process.env.MINIO_REJECT_UNAUTHORIZED === 'false'
      ? new https.Agent({ rejectUnauthorized: false })
      : undefined,
  });
  return client;
}

async function ensureBucket() {
  if (!bucketReady) {
    const minio = getClient();
    bucketReady = minio.bucketExists(BUCKET).then((exists) => (
      exists ? undefined : minio.makeBucket(BUCKET)
    ));
  }
  try {
    return await bucketReady;
  } catch (e) {
    bucketReady = undefined;
    throw e;
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
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

router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, error: 'Vui lòng chọn file ảnh' });
  }

  try {
    await ensureBucket();
    const filename = Date.now() + '-' + Math.round(Math.random() * 1E9)
      + path.extname(req.file.originalname).toLowerCase();
    const objectName = `${PRODUCT_IMAGE_PREFIX}/${filename}`;
    await getClient().putObject(BUCKET, objectName, req.file.buffer, req.file.size, {
      'Content-Type': req.file.mimetype,
    });
    const url = '/uploads/products/' + filename;
    res.json({ ok: true, data: { url, filename } });
  } catch (e) {
    console.error('[MinIO] Upload failed:', e);
    res.status(500).json({ ok: false, error: 'Không thể lưu ảnh' });
  }
});

export const productImagesRouter = Router();

productImagesRouter.get('/:filename', async (req, res, next) => {
  try {
    const minio = getClient();
    const objectNames = [
      `${PRODUCT_IMAGE_PREFIX}/${req.params.filename}`,
      `uploads/products/${req.params.filename}`,
      req.params.filename,
    ].filter((value, index, values) => values.indexOf(value) === index);
    let objectName;
    let stat;
    for (const candidate of objectNames) {
      try {
        stat = await minio.statObject(BUCKET, candidate);
        objectName = candidate;
        break;
      } catch (e) {
        if (e.code !== 'NoSuchKey' && e.code !== 'NotFound') throw e;
      }
    }
    if (!objectName) return next();
    const stream = await minio.getObject(BUCKET, objectName);
    res.setHeader('Content-Type', stat.metaData?.['content-type'] || 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    stream.on('error', next);
    stream.pipe(res);
  } catch (e) {
    if (
      e.code === 'NoSuchKey'
      || e.code === 'NoSuchBucket'
      || e.code === 'NotFound'
      || e.message === 'MinIO configuration is incomplete'
    ) return next();
    console.error('[MinIO] Read failed:', e);
    return res.status(500).end();
  }
});

export default router;
