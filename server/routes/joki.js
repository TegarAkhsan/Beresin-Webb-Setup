import express from 'express';
import { index, startTask, uploadMilestone, finalizeOrder, requestPayout, updateBankDetails } from '../controllers/jokiDashboardController.js';
import { requireAuth, isJoki } from '../middleware/inertiaMiddleware.js';

const router = express.Router();

router.get('/joki/dashboard', requireAuth, isJoki, index);
router.post('/joki/orders/:id/start', requireAuth, isJoki, startTask);
router.post('/joki/orders/:id/milestone', requireAuth, isJoki, uploadMilestone);
router.post('/joki/orders/:id/finalize', requireAuth, isJoki, finalizeOrder);
router.post('/joki/payout/request', requireAuth, isJoki, requestPayout);
router.post('/joki/bank-details', requireAuth, isJoki, updateBankDetails);

export default router;
