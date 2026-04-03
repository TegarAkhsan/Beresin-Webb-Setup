import express from 'express';
import { create, store, show, update, cancel } from '../controllers/orderController.js';
import { requireAuth } from '../middleware/inertiaMiddleware.js';
import { upload } from '../middleware/upload.js';


const router = express.Router();

router.get('/orders/create', requireAuth, create);
router.post('/orders', requireAuth,
    upload.fields([
        { name: 'reference_file', maxCount: 1 },
        { name: 'previous_project_file', maxCount: 1 },
        { name: 'student_card', maxCount: 1 }
    ]),
    store
);
router.get('/orders/:id', requireAuth, show);
router.post('/orders/:id', requireAuth, upload.single('payment_proof'), update);
router.post('/orders/:id/cancel', requireAuth, cancel);

export default router;
