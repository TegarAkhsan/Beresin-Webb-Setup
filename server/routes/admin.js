import express from 'express';
import { index, verify, approvePayment, assign, storeAssignment, processPayout } from '../controllers/adminController.js';
import { requireAuth, isAdmin } from '../middleware/inertiaMiddleware.js';

const router = express.Router();

router.get('/admin', requireAuth, isAdmin, index);
router.get('/admin/orders/verify', requireAuth, isAdmin, verify);
router.post('/admin/orders/:id/approve', requireAuth, isAdmin, approvePayment);
router.get('/admin/orders/assign', requireAuth, isAdmin, assign);
router.post('/admin/orders/:id/assign', requireAuth, isAdmin, storeAssignment);
router.post('/admin/payouts/:id/process', requireAuth, isAdmin, processPayout);

export default router;
