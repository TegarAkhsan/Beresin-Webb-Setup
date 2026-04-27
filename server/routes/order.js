import express from 'express';
import {
    create, store, show, review, downloadInvoice,
    update, cancel, acceptResult, requestRevision,
    requestRefund, uploadAdditionalPayment, showAdditionalPayment
} from '../controllers/orderController.js';
import { requireAuth } from '../middleware/inertiaMiddleware.js';
import { upload, handleMulterError } from '../middleware/upload.js';

const router = express.Router();

// Wrapper helper untuk multer + error handler
const withUpload = (multerMiddleware) => (req, res, next) =>
    multerMiddleware(req, res, (err) => handleMulterError(err, req, res, next));

// Create order (orders.create / orders.store)
router.get('/orders/create', requireAuth, create);
router.post('/orders', requireAuth,
    withUpload(upload.fields([
        { name: 'reference_file',       maxCount: 1 },
        { name: 'previous_project_file', maxCount: 1 },
        { name: 'student_card',         maxCount: 1 },
    ])),
    store
);

// Show order (orders.show)
router.get('/orders/:id', requireAuth, show);

// Review page (orders.review)
router.get('/orders/:id/review', requireAuth, review);

// Invoice PDF (orders.invoice)
router.get('/orders/:id/invoice', requireAuth, downloadInvoice);

// Update / payment proof upload (orders.update)
// Bukti pembayaran adalah gambar → akan dikompres otomatis
router.post('/orders/:id', requireAuth,
    withUpload(upload.single('payment_proof')),
    update
);

// Cancel order (orders.cancel)
router.post('/orders/:id/cancel', requireAuth, cancel);

// Accept result / close order (orders.accept)
router.post('/orders/:id/accept', requireAuth, acceptResult);

// Request revision (orders.revision)
router.post('/orders/:id/revision', requireAuth,
    withUpload(upload.single('revision_file')),
    requestRevision
);

// Request refund (orders.refund)
router.post('/orders/:id/refund', requireAuth, requestRefund);

// Show additional payment page (orders.additional-payment.show)
router.get('/orders/:id/additional-payment', requireAuth, showAdditionalPayment);

// Upload additional payment (orders.additional-payment)
router.post('/orders/:id/additional-payment', requireAuth,
    withUpload(upload.single('payment_proof')),
    uploadAdditionalPayment
);

export default router;
