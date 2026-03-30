import express from 'express';
import { index } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/inertiaMiddleware.js';

const router = express.Router();

router.get('/dashboard', requireAuth, index);

// Fallbacks for now for other roles. They will be implemented in future phases.
router.get('/admin', requireAuth, (req, res) => res.send('Admin Dashboard Coming Soon'));
router.get('/joki/dashboard', requireAuth, (req, res) => res.send('Joki Dashboard Coming Soon'));

export default router;
