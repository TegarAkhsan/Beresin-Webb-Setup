import { prisma } from '../app.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Middleware to parse token and share Inertia Data
export const shareInertiaData = async (req, res, next) => {
    let user = null;
    
    // Cookie parsing happens before this middleware
    const token = req.cookies?.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            user = await prisma.users.findUnique({ 
                where: { id: decoded.id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    profile_photo_path: true
                }
            });
        } catch (error) {
            // Token is invalid or expired
            res.clearCookie('token');
        }
    }

    // Assign to req object so other controllers can use `req.user`
    req.user = user;

    // Attach res.inertia function to use req.Inertia from inertia-node
    res.inertia = function(component, props = {}) {
        const sharedProps = {
            auth: {
                user: user
            },
            flash: {
                message: req.cookies?.flash_message || null,
                success: req.cookies?.flash_success || null,
                error: req.cookies?.flash_error || null,
                show_dashboard_prompt: req.cookies?.flash_show_dashboard_prompt || null,
            },
            vapid_public_key: process.env.VAPID_PUBLIC_KEY || null,
            ...props
        };

        // Clear flash cookies after sending them once
        if (req.cookies?.flash_message) res.clearCookie('flash_message');
        if (req.cookies?.flash_success) res.clearCookie('flash_success');
        if (req.cookies?.flash_error) res.clearCookie('flash_error');
        if (req.cookies?.flash_show_dashboard_prompt) res.clearCookie('flash_show_dashboard_prompt');

        if (!req.Inertia) {
            console.error('Inertia middleware not initialized properly');
            return res.status(500).send('Inertia error');
        }

        return req.Inertia.render({ component, props: sharedProps });
    };

    next();
};

// Express version of Laravel's 'auth' middleware
export const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.redirect('/login');
    }
    next();
};

export const requireGuest = (req, res, next) => {
    if (req.user) {
        return res.redirect('/dashboard');
    }
    next();
};
