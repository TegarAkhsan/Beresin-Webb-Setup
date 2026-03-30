import express from 'express';
import { register, login, logout } from '../controllers/authController.js';
import { requireGuest, requireAuth } from '../middleware/inertiaMiddleware.js';

const router = express.Router();

router.get('/register', requireGuest, (req, res) => {
    res.inertia('Auth/Register');
});

router.post('/register', requireGuest, register);

router.get('/login', requireGuest, (req, res) => {
    res.inertia('Auth/Login', {
        canResetPassword: true,
        status: null
    });
});

router.post('/login', requireGuest, login);

router.post('/logout', requireAuth, logout);

export default router;
