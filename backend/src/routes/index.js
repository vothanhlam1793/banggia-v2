import { Router } from 'express';
import productsRouter from './products.js';
import pricesRouter from './prices.js';
import tagsRouter from './tags.js';
import groupsRouter from './groups.js';
import authRouter from './auth.js';
import agentRouter from './agent.js';
import importRouter from './import.js';
import usersRouter from './users.js';
import uploadRouter from './upload.js';

const router = Router();

router.use('/products', pricesRouter);
router.use('/products', productsRouter);
router.use('/tags', tagsRouter);
router.use('/groups', groupsRouter);
router.use('/auth', authRouter);
router.use('/agent', agentRouter);
router.use('/import', importRouter);
router.use('/users', usersRouter);
router.use('/upload', uploadRouter);
router.use('/', authRouter);

export default router;
