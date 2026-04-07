import { prisma } from '../app.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export const register = async (req, res) => {
    try {
        const { name, email, password, password_confirmation } = req.body;

        // Validation
        if (!name || !email || !password) {
            res.cookie('errors', JSON.stringify({ message: 'All fields are required.' }));
            return res.redirect(req.get('Referer') || '/');
        }

        if (password !== password_confirmation) {
            res.cookie('errors', JSON.stringify({ password: 'The password confirmation does not match.' }));
            return res.redirect(req.get('Referer') || '/');
        }

        const existingUser = await prisma.users.findUnique({ where: { email } });
        if (existingUser) {
            res.cookie('errors', JSON.stringify({ email: 'The email has already been taken.' }));
            return res.redirect(req.get('Referer') || '/');
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        
        const user = await prisma.users.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: 'customer',
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
        
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

        return res.redirect('/dashboard'); 
    } catch (error) {
        console.error('[REGISTRATION ERROR DETAILS]', {
            message: error.message,
            stack: error.stack,
            code: error.code // Prisma error codes
        });

        res.cookie('flash_error', `Registration failed: ${error.message}`);
        return res.redirect(req.get('Referer') || '/');
    }
}


export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await prisma.users.findUnique({ where: { email } });
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            res.cookie('errors', JSON.stringify({ email: 'These credentials do not match our records.' }));
            return res.redirect(req.get('Referer') || '/');
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
        
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

        return res.redirect('/dashboard');
    } catch (error) {
        console.error('[LOGIN ERROR DETAILS]', {
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
        res.cookie('flash_error', `Login failed: System Error. Please check Server logs.`);
        return res.redirect(req.get('Referer') || '/login');
    }
}


export const logout = (req, res) => {
    res.clearCookie('token');
    return res.redirect('/');
}

// ─── Profile Controllers ────────────────────────────────────────────────────

export const showProfile = async (req, res) => {
    try {
        const user = await prisma.users.findUnique({ where: { id: req.user.id } });
        res.inertia('Profile/Edit', {
            mustVerifyEmail: false,
            status: req.query.status || null,
            user
        });
    } catch (error) {
        console.error('[SHOW PROFILE ERROR]', error.message);
        res.cookie('flash_error', 'Failed to load profile.');
        return res.redirect('/dashboard');
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { name, email, phone, university, address } = req.body;

        if (!name || !email) {
            res.cookie('errors', JSON.stringify({ name: !name ? 'Name is required.' : undefined, email: !email ? 'Email is required.' : undefined }));
            return res.redirect('/profile');
        }

        // Check if email is taken by another user
        const existingUser = await prisma.users.findFirst({
            where: { email, id: { not: req.user.id } }
        });
        if (existingUser) {
            res.cookie('errors', JSON.stringify({ email: 'Email address is already taken.' }));
            return res.redirect('/profile');
        }

        const updateData = { name, email, updated_at: new Date() };
        if (phone !== undefined) updateData.phone = phone || null;
        if (university !== undefined) updateData.university = university || null;
        if (address !== undefined) updateData.address = address || null;

        await prisma.users.update({
            where: { id: req.user.id },
            data: updateData
        });

        res.cookie('flash_success', 'Profile updated successfully.');
        return res.redirect(req.get('Referer') || '/profile');
    } catch (error) {
        console.error('[UPDATE PROFILE ERROR]', error.message);
        res.cookie('flash_error', 'Failed to update profile: ' + error.message);
        return res.redirect(req.get('Referer') || '/profile');
    }
};

export const updatePassword = async (req, res) => {
    try {
        const { current_password, password, password_confirmation } = req.body;

        if (password !== password_confirmation) {
            res.cookie('errors', JSON.stringify({ password: 'The password confirmation does not match.' }));
            return res.redirect('/profile');
        }

        const user = await prisma.users.findUnique({ where: { id: req.user.id } });
        const isPasswordValid = await bcrypt.compare(current_password, user.password);

        if (!isPasswordValid) {
            res.cookie('errors', JSON.stringify({ current_password: 'The provided password does not match your current password.' }));
            return res.redirect('/profile');
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        await prisma.users.update({
            where: { id: req.user.id },
            data: { password: hashedPassword, updated_at: new Date() }
        });

        res.cookie('flash_success', 'Password updated successfully.');
        return res.redirect('/profile');
    } catch (error) {
        console.error('[UPDATE PASSWORD ERROR]', error.message);
        res.cookie('flash_error', 'Failed to update password: ' + error.message);
        return res.redirect('/profile');
    }
};

export const deleteAccount = async (req, res) => {
    try {
        const { password } = req.body;
        const user = await prisma.users.findUnique({ where: { id: req.user.id } });
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            res.cookie('errors', JSON.stringify({ password: 'The provided password does not match your current password.' }));
            return res.redirect('/profile');
        }

        await prisma.users.delete({ where: { id: req.user.id } });

        res.clearCookie('token');
        return res.redirect('/');
    } catch (error) {
        console.error('[DELETE ACCOUNT ERROR]', error.message);
        res.cookie('flash_error', 'Failed to delete account: ' + error.message);
        return res.redirect('/profile');
    }
};

// ─── Forgot / Reset Password ─────────────────────────────────────────────────

export const showForgotPassword = (req, res) => {
    res.inertia('Auth/ForgotPassword', { status: req.query.status || null });
};

export const sendResetLink = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await prisma.users.findUnique({ where: { email } });
        if (!user) {
            // Don't reveal whether email exists (security best practice)
            res.cookie('flash_message', 'If that email exists, we sent a reset link.');
            return res.redirect('/forgot-password');
        }

        // Generate a secure random token
        const token = crypto.randomBytes(32).toString('hex');
        const now = new Date();

        // Upsert into password_reset_tokens table
        await prisma.password_reset_tokens.upsert({
            where: { email },
            create: { email, token, created_at: now },
            update: { token, created_at: now },
        });

        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const resetUrl = `${appUrl}/reset-password/${token}?email=${encodeURIComponent(email)}`;

        // Try to send email if SMTP is configured
        let emailSent = false;
        if (process.env.MAIL_HOST && process.env.MAIL_USERNAME) {
            try {
                const nodemailer = await import('nodemailer');
                const transporter = nodemailer.default.createTransport({
                    host: process.env.MAIL_HOST,
                    port: parseInt(process.env.MAIL_PORT || '587'),
                    secure: process.env.MAIL_ENCRYPTION === 'ssl',
                    auth: {
                        user: process.env.MAIL_USERNAME,
                        pass: process.env.MAIL_PASSWORD,
                    },
                });

                await transporter.sendMail({
                    from: `"${process.env.MAIL_FROM_NAME || 'Beresin App'}" <${process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME}>`,
                    to: email,
                    subject: 'Reset Your Password',
                    html: `
                        <p>Hello ${user.name},</p>
                        <p>You requested a password reset. Click the link below to set a new password:</p>
                        <p><a href="${resetUrl}" style="color:#4F46E5;font-weight:bold;">Reset Password</a></p>
                        <p>This link expires in 60 minutes.</p>
                        <p>If you did not request this, please ignore this email.</p>
                    `,
                });
                emailSent = true;
            } catch (mailError) {
                console.error('[MAIL ERROR]', mailError.message);
            }
        }

        if (!emailSent) {
            // If no SMTP, log the link so dev can use it
            console.log(`[PASSWORD RESET LINK] ${resetUrl}`);
        }

        res.cookie('flash_message', 'If that email exists, we sent a password reset link.');
        return res.redirect('/forgot-password');
    } catch (error) {
        console.error('[FORGOT PASSWORD ERROR]', error.message);
        res.cookie('flash_error', 'Failed to send reset link: ' + error.message);
        return res.redirect('/forgot-password');
    }
};

export const showResetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { email } = req.query;

        // Validate token exists
        const record = await prisma.password_reset_tokens.findUnique({ where: { email: email || '' } });
        if (!record || record.token !== token) {
            res.cookie('flash_error', 'This password reset link is invalid or has expired.');
            return res.redirect('/forgot-password');
        }

        // Check token is not older than 60 minutes
        const tokenAge = Date.now() - new Date(record.created_at).getTime();
        if (tokenAge > 60 * 60 * 1000) {
            await prisma.password_reset_tokens.delete({ where: { email: email || '' } });
            res.cookie('flash_error', 'This password reset link has expired. Please request a new one.');
            return res.redirect('/forgot-password');
        }

        res.inertia('Auth/ResetPassword', { token, email: email || '' });
    } catch (error) {
        console.error('[SHOW RESET PASSWORD ERROR]', error.message);
        res.cookie('flash_error', 'Invalid reset link.');
        return res.redirect('/forgot-password');
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { token, email, password, password_confirmation } = req.body;

        if (!password || password !== password_confirmation) {
            res.cookie('errors', JSON.stringify({ password: 'The password confirmation does not match.' }));
            return res.redirect(`/reset-password/${token}?email=${encodeURIComponent(email)}`);
        }

        if (password.length < 8) {
            res.cookie('errors', JSON.stringify({ password: 'Password must be at least 8 characters.' }));
            return res.redirect(`/reset-password/${token}?email=${encodeURIComponent(email)}`);
        }

        // Validate token
        const record = await prisma.password_reset_tokens.findUnique({ where: { email } });
        if (!record || record.token !== token) {
            res.cookie('flash_error', 'This password reset link is invalid or has expired.');
            return res.redirect('/forgot-password');
        }

        const tokenAge = Date.now() - new Date(record.created_at).getTime();
        if (tokenAge > 60 * 60 * 1000) {
            await prisma.password_reset_tokens.delete({ where: { email } });
            res.cookie('flash_error', 'This link has expired. Please request a new one.');
            return res.redirect('/forgot-password');
        }

        // Update password
        const hashedPassword = await bcrypt.hash(password, 12);
        await prisma.users.update({
            where: { email },
            data: { password: hashedPassword, updated_at: new Date() }
        });

        // Delete used token
        await prisma.password_reset_tokens.delete({ where: { email } });

        res.cookie('flash_success', 'Password has been reset successfully. Please log in with your new password.');
        return res.redirect('/login');
    } catch (error) {
        console.error('[RESET PASSWORD ERROR]', error.message);
        res.cookie('flash_error', 'Failed to reset password: ' + error.message);
        return res.redirect('/forgot-password');
    }
};

// ─── Email Verification ───────────────────────────────────────────────────────

export const showVerifyEmail = (req, res) => {
    res.inertia('Auth/VerifyEmail', { status: req.query.status || null });
};

export const sendVerificationEmail = async (req, res) => {
    // Simplified: just redirect with a notice (no real email verification in this port)
    res.cookie('flash_message', 'Verification feature is not required for this application.');
    return res.redirect('/dashboard');
};

// ─── Confirm Password ─────────────────────────────────────────────────────────

export const showConfirmPassword = (req, res) => {
    res.inertia('Auth/ConfirmPassword');
};

export const confirmPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const user = await prisma.users.findUnique({ where: { id: req.user.id } });
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            res.cookie('errors', JSON.stringify({ password: 'The provided password is incorrect.' }));
            return res.redirect('/confirm-password');
        }

        // Mark as confirmed in a cookie (valid for 3 hours)
        res.cookie('password_confirmed_at', Date.now().toString(), {
            httpOnly: true,
            maxAge: 3 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production'
        });

        const intended = req.query.redirect || '/dashboard';
        return res.redirect(intended);
    } catch (error) {
        console.error('[CONFIRM PASSWORD ERROR]', error.message);
        res.cookie('flash_error', 'Failed to confirm password: ' + error.message);
        return res.redirect('/confirm-password');
    }
};
