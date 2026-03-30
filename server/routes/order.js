import express from 'express';
import { create, store, show, update } from '../controllers/orderController.js';
import { requireAuth } from '../middleware/inertiaMiddleware.js';

const router = express.Router();

router.get('/orders/create', requireAuth, create);
router.post('/orders', requireAuth, store);
router.get('/orders/:order', requireAuth, show);
router.post('/orders/:order', requireAuth, update);

// Other routes (review, invoice, accept, revision) to be implemented incrementally...

export default router;
