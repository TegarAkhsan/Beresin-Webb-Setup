import express from 'express';
import {
    index, verify, approvePayment, approveAdditionalPayment,
    assign, storeAssignment, batchAutoAssign,
    processPayout, rejectPayout,
    users, createUser, storeUser, editUser, updateUser, deleteUser, blacklistUser,
    services, storeService, editService, updateService, deleteService,
    storePackage, updatePackage, deletePackage,
    storeAddon, updateAddon, deleteAddon,
    settings, updateSettings,
    transactions,
    chat, sendChatMessage, getChatMessages, sendChatReply,
    earnings, withdrawEarnings, updateEarningsSettings
} from '../controllers/adminController.js';
import { requireAuth, isAdmin } from '../middleware/inertiaMiddleware.js';
import { upload, handleMulterError } from '../middleware/upload.js';

const router = express.Router();

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/admin', requireAuth, isAdmin, index);

// ─── Orders ───────────────────────────────────────────────────────────────────
router.get('/admin/orders/verify', requireAuth, isAdmin, verify);
router.post('/admin/orders/:id/approve', requireAuth, isAdmin, approvePayment);
router.post('/admin/orders/:id/approve-additional', requireAuth, isAdmin, approveAdditionalPayment);
// NOTE: batch must come before :id to avoid route conflict
router.post('/admin/orders/assign/batch', requireAuth, isAdmin, batchAutoAssign);
router.get('/admin/orders/assign', requireAuth, isAdmin, assign);
router.post('/admin/orders/:id/assign', requireAuth, isAdmin, storeAssignment);

// ─── Payouts ──────────────────────────────────────────────────────────────────
router.post('/admin/payouts/:id/process', requireAuth, isAdmin, processPayout);
router.post('/admin/payouts/:id/reject', requireAuth, isAdmin, rejectPayout);

// ─── Users ────────────────────────────────────────────────────────────────────
router.get('/admin/users', requireAuth, isAdmin, users);
router.get('/admin/users/create', requireAuth, isAdmin, createUser);
router.post('/admin/users', requireAuth, isAdmin, storeUser);
// router.get('/admin/users/:id/edit', requireAuth, isAdmin, editUser);
// router.post('/admin/users/:id', requireAuth, isAdmin, updateUser);
router.post('/admin/users/:id/delete', requireAuth, isAdmin, deleteUser);
router.delete('/admin/users/:id', requireAuth, isAdmin, deleteUser);
router.post('/admin/users/:id/blacklist', requireAuth, isAdmin, blacklistUser);

// ─── Services ─────────────────────────────────────────────────────────────────
router.get('/admin/services', requireAuth, isAdmin, services);
router.post('/admin/services', requireAuth, isAdmin, storeService);
router.get('/admin/services/:id/edit', requireAuth, isAdmin, editService);
router.post('/admin/services/:id', requireAuth, isAdmin, updateService);
router.put('/admin/services/:id', requireAuth, isAdmin, updateService);      // Inertia useForm put()
router.post('/admin/services/:id/delete', requireAuth, isAdmin, deleteService);
router.delete('/admin/services/:id', requireAuth, isAdmin, deleteService);   // Inertia router.delete()

// ─── Packages (admin.services.packages.store / admin.packages.update / admin.packages.destroy) ──
router.post('/admin/services/:serviceId/packages', requireAuth, isAdmin, storePackage);
router.put('/admin/packages/:id', requireAuth, isAdmin, updatePackage);
router.delete('/admin/packages/:id', requireAuth, isAdmin, deletePackage);

// ─── Addons (admin.packages.addons.store / admin.addons.update / admin.addons.destroy) ──────────
router.post('/admin/packages/:packageId/addons', requireAuth, isAdmin, storeAddon);
router.put('/admin/addons/:id', requireAuth, isAdmin, updateAddon);
router.delete('/admin/addons/:id', requireAuth, isAdmin, deleteAddon);

// ─── Settings ─────────────────────────────────────────────────────────────────
router.get('/admin/settings', requireAuth, isAdmin, settings);
router.post('/admin/settings', requireAuth, isAdmin,
    (req, res, next) => upload.fields([
        { name: 'invoice_logo', maxCount: 1 },
        { name: 'qris_image',   maxCount: 1 }
    ])(req, res, (err) => handleMulterError(err, req, res, next)),
    updateSettings
);

// ─── Transactions ─────────────────────────────────────────────────────────────
router.get('/admin/transactions', requireAuth, isAdmin, transactions);

// ─── Chat ─────────────────────────────────────────────────────────────────────
router.get('/admin/chat', requireAuth, isAdmin, chat);
router.get('/admin/chat/:userId', requireAuth, isAdmin, getChatMessages);
router.post('/admin/chat/:userId/reply', requireAuth, isAdmin, sendChatReply);
router.post('/admin/chat/send', requireAuth, isAdmin, sendChatMessage);

// ─── Earnings ─────────────────────────────────────────────────────────────────
router.get('/admin/earnings', requireAuth, isAdmin, earnings);
router.post('/admin/earnings/withdraw', requireAuth, isAdmin, withdrawEarnings);
router.post('/admin/earnings/settings', requireAuth, isAdmin, updateEarningsSettings);

export default router;
