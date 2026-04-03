import express from 'express';
import {
    index,
    startTask,
    uploadResult,
    uploadMilestone,
    updateLink,
    finalizeOrder,
    requestPayout,
    updateBankDetails
} from '../controllers/jokiDashboardController.js';
import { requireAuth, isJoki } from '../middleware/inertiaMiddleware.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Dashboard
router.get('/joki/dashboard', requireAuth, isJoki, index);

// Task Actions
router.post('/joki/orders/:id/start', requireAuth, isJoki, startTask);

// Upload result file (joki.orders.upload) — was MISSING → caused 404 in screenshot
router.post('/joki/orders/:id/upload', requireAuth, isJoki,
    upload.single('result_file'),
    uploadResult
);

// Upload milestone progress (joki.orders.milestone)
router.post('/joki/orders/:id/milestone', requireAuth, isJoki,
    upload.single('milestone_file'),
    uploadMilestone
);

// Update external link (joki.orders.link)
router.post('/joki/orders/:id/link', requireAuth, isJoki, updateLink);

// Finalize order (joki.finalize-order)
router.post('/joki/orders/:id/finalize', requireAuth, isJoki, finalizeOrder);

// Payout
router.post('/joki/payout/request', requireAuth, isJoki, requestPayout);
router.post('/joki/payout/settings', requireAuth, isJoki, updateBankDetails);
router.post('/joki/bank-details', requireAuth, isJoki, updateBankDetails); // legacy alias

export default router;
