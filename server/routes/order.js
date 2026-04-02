import express from 'express';
import { create, store, show, update, cancel } from '../controllers/orderController.js';
import { requireAuth } from '../middleware/inertiaMiddleware.js';
import { upload } from '../app.js';

const router = express.Router();

router.get('/orders/create', requireAuth, create);
router.post('/orders', requireAuth, store);
router.get('/orders/:id', requireAuth, show);
router.post('/orders/:id', requireAuth, upload.single('payment_proof'), update);
router.post('/orders/:id/cancel', requireAuth, cancel);

export default router;
