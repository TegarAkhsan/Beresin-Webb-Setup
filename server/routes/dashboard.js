import express from 'express';
import { index } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/inertiaMiddleware.js';

const router = express.Router();

router.get('/dashboard', requireAuth, index);

export default router;
