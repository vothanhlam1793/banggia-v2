import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import { authMiddleware } from './middleware/auth.js';
import restRouter from './routes/index.js';
import importRouter from './routes/import.js';
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

app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/v1', restRouter);

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/banggiasi-v3';

try {
  await mongoose.connect(MONGODB_URI);
  console.log('[DB] Connected to MongoDB');

  const existing = await User.findOne({ email: 'admin@example.com' });
  if (!existing) {
    await User.create({
      email: 'admin@example.com',
      name: 'Admin',
      password: 'admin123',
      isAdmin: true,
      role: 'admin',
    });
    console.log('[DB] Default admin created: admin@example.com / admin123');
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
