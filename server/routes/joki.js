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
import { upload, handleMulterError } from '../middleware/upload.js';

const router = express.Router();

// Dashboard
router.get('/joki/dashboard', requireAuth, isJoki, index);

// Task Actions
router.post('/joki/orders/:id/start', requireAuth, isJoki, startTask);

// Upload result file (joki.orders.upload)
// Gambar otomatis dikompres ke WebP sebelum upload ke Supabase
const uploadFields = upload.fields([
    { name: 'file',         maxCount: 1 },
    { name: 'proof_images', maxCount: 20 }, // tidak dibatasi ketat, max 20 per request
]);

router.post('/joki/orders/:id/upload', requireAuth, isJoki,
    (req, res, next) => uploadFields(req, res, (err) => handleMulterError(err, req, res, next)),
    uploadResult
);

// Upload milestone progress (joki.orders.milestone)
router.post('/joki/orders/:id/milestone', requireAuth, isJoki,
    (req, res, next) => uploadFields(req, res, (err) => handleMulterError(err, req, res, next)),
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
