import express from 'express';
import {
    register,
    login,
    logout,
    // Profile
    showProfile,
    updateProfile,
    updatePassword,
    deleteAccount,
    // Forgot / Reset Password
    showForgotPassword,
    sendResetLink,
    showResetPassword,
    resetPassword,
    // Email Verification
    showVerifyEmail,
    sendVerificationEmail,
    // Confirm Password
    showConfirmPassword,
    confirmPassword,
} from '../controllers/authController.js';
import { requireGuest, requireAuth } from '../middleware/inertiaMiddleware.js';

const router = express.Router();

// ─── Guest Routes ────────────────────────────────────────────────────────────

router.get('/register', requireGuest, (req, res) => {
    res.inertia('Auth/Register');
});
router.post('/register', requireGuest, register);

router.get('/login', requireGuest, (req, res) => {
    res.inertia('Auth/Login', { canResetPassword: true, status: null });
});
router.post('/login', requireGuest, login);

// Forgot Password  (password.request / password.email)
router.get('/forgot-password', requireGuest, showForgotPassword);
router.post('/forgot-password', requireGuest, sendResetLink);

// Reset Password  (password.reset / password.store)
router.get('/reset-password/:token', requireGuest, showResetPassword);
router.post('/reset-password', requireGuest, resetPassword);

// ─── Auth Routes ──────────────────────────────────────────────────────────────

router.post('/logout', requireAuth, logout);

// Email Verification  (verification.notice / verification.send / verification.verify)
router.get('/verify-email', requireAuth, showVerifyEmail);
router.post('/email/verification-notification', requireAuth, sendVerificationEmail);
// Simplified: no real signed URL verification in this Node.js port
router.get('/verify-email/:id/:hash', requireAuth, (req, res) => {
    res.cookie('flash_success', 'Email has been verified.');
    return res.redirect('/dashboard');
});

// Confirm Password  (password.confirm)
router.get('/confirm-password', requireAuth, showConfirmPassword);
router.post('/confirm-password', requireAuth, confirmPassword);

// Password Update (password.update)
router.put('/password', requireAuth, updatePassword);

// Profile routes  (profile.edit / profile.update / profile.destroy)
router.get('/profile', requireAuth, showProfile);
router.patch('/profile', requireAuth, updateProfile);
router.delete('/profile', requireAuth, deleteAccount);

export default router;
