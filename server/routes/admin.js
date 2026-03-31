import express from 'express';
import {
    index, verify, approvePayment, assign, storeAssignment, processPayout,
    users, blacklistUser,
    services, storeService, editService, updateService, deleteService,
    settings, updateSettings,
    transactions,
    chat, sendChatMessage,
    earnings
} from '../controllers/adminController.js';
import { requireAuth, isAdmin } from '../middleware/inertiaMiddleware.js';

const router = express.Router();

// Dashboard
router.get('/admin', requireAuth, isAdmin, index);

// Orders
router.get('/admin/orders/verify', requireAuth, isAdmin, verify);
router.post('/admin/orders/:id/approve', requireAuth, isAdmin, approvePayment);
router.get('/admin/orders/assign', requireAuth, isAdmin, assign);
router.post('/admin/orders/:id/assign', requireAuth, isAdmin, storeAssignment);

// Payouts
router.post('/admin/payouts/:id/process', requireAuth, isAdmin, processPayout);

// Users
router.get('/admin/users', requireAuth, isAdmin, users);
router.post('/admin/users/:id/blacklist', requireAuth, isAdmin, blacklistUser);

// Services
router.get('/admin/services', requireAuth, isAdmin, services);
router.post('/admin/services', requireAuth, isAdmin, storeService);
router.get('/admin/services/:id/edit', requireAuth, isAdmin, editService);
router.post('/admin/services/:id', requireAuth, isAdmin, updateService);
router.post('/admin/services/:id/delete', requireAuth, isAdmin, deleteService);

// Settings
router.get('/admin/settings', requireAuth, isAdmin, settings);
router.post('/admin/settings', requireAuth, isAdmin, updateSettings);

// Transactions
router.get('/admin/transactions', requireAuth, isAdmin, transactions);

// Chat
router.get('/admin/chat', requireAuth, isAdmin, chat);
router.post('/admin/chat/send', requireAuth, isAdmin, sendChatMessage);

// Earnings
router.get('/admin/earnings', requireAuth, isAdmin, earnings);

export default router;
