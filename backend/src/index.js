import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import { authMiddleware } from './middleware/auth.js';
import restRouter from './routes/index.js';
import importRouter from './routes/import.js';
import { productImagesRouter } from './routes/upload.js';
import User from './models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());
app.use(authMiddleware);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.get('/api/v1/api-docs', (_, res) => res.render('api-docs'));

app.use('/import', importRouter);

app.use('/uploads/products', productImagesRouter);
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/v1', restRouter);

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/banggiasi-v3';
const DEFAULT_ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
const DEFAULT_ADMIN_NAME = process.env.DEFAULT_ADMIN_NAME || 'Admin';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD;

try {
  await mongoose.connect(MONGODB_URI);
  console.log('[DB] Connected to MongoDB');

  const existing = await User.findOne({ email: DEFAULT_ADMIN_EMAIL });
  if (!existing) {
    if (!DEFAULT_ADMIN_PASSWORD) {
      throw new Error('DEFAULT_ADMIN_PASSWORD is required when the admin user does not exist');
    }
    await User.create({
      email: DEFAULT_ADMIN_EMAIL,
      name: DEFAULT_ADMIN_NAME,
      password: DEFAULT_ADMIN_PASSWORD,
      isAdmin: true,
      role: 'admin',
    });
    console.log(`[DB] Default admin created: ${DEFAULT_ADMIN_EMAIL}`);
  } else if (!existing.role) {
    existing.role = 'admin';
    existing.isAdmin = true;
    await existing.save();
    console.log('[DB] Admin role updated to admin');
  }

  await new Promise(resolve => app.listen({ port: PORT }, resolve));
  console.log(`[Server] Ready at http://localhost:${PORT}`);
} catch (e) {
  console.error('Failed to start server:', e);
  process.exit(1);
}
