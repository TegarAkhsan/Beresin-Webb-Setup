import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import inertia from 'inertia-node';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { shareInertiaData } from './middleware/inertiaMiddleware.js';
import authRouter from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';
import orderRouter from './routes/order.js';
import adminRouter from './routes/admin.js';
import jokiRouter from './routes/joki.js';


// Sanitize DATABASE_URL: strip quotes, whitespace, and unsupported params
const DATABASE_URL = process.env.DATABASE_URL
    ?.trim()
    .replace(/^["']|["']$/g, '')
    .replace(/&?channel_binding=\w+/g, '')
    .replace(/\?&/, '?');

if (!DATABASE_URL) {
    console.warn('CRITICAL: DATABASE_URL is not set. Database operations will fail.');
} else {
    console.log('[DB] Connecting to:', DATABASE_URL.split('@')[1]?.split('?')[0] ?? 'unknown');
}

// SSL: Supabase always requires SSL (but doesn't include sslmode= in pooler URLs)
const needsSSL = DATABASE_URL?.includes('sslmode=require')
    || DATABASE_URL?.includes('supabase.com')
    || DATABASE_URL?.includes('supabase.co');

// Strip sslmode from URL so pg doesn't conflict with our explicit ssl config
const cleanURL = DATABASE_URL?.replace(/[?&]sslmode=\w+/g, '').replace(/\?&/, '?').replace(/[?]$/, '');

const pool = new pg.Pool({
    connectionString: cleanURL,
    ssl: needsSSL ? { rejectUnauthorized: false, checkServerIdentity: () => undefined } : false,
    max: 1,                    // Serverless: 1 connection per function instance
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
    console.error('[PG POOL ERROR]', err.message);
});


const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ 
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Global Debug Logger for Netlify
app.use((req, res, next) => {
    console.log(`[NETLIFY DEBUG] ${req.method} ${req.url}`);
    next();
});

// Serve static files from 'public' directory
app.use(express.static(path.join(process.cwd(), 'public')));

const htmlTemplate = (page, viewData) => {
    let cssFile = '';
    let jsFile = '';

    const manifestPath = path.join(process.cwd(), 'public', 'build', 'manifest.json');
    let isProduction = fs.existsSync(manifestPath);

    // Fallback to environment variables if filesystem check isn't conclusive
    if (!isProduction) {
        isProduction = process.env.NODE_ENV === 'production' || !!process.env.NETLIFY;
    }

    if (isProduction) {
        try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            const appMetadata = manifest['resources/js/app.jsx'] || manifest['resources/js/app.tsx'] || manifest['resources/js/app.js'];
            
            if (appMetadata) {
                jsFile = `<script type="module" src="/build/${appMetadata.file}"></script>`;
                if (appMetadata.css && appMetadata.css.length > 0) {
                    cssFile = `<link rel="stylesheet" href="/build/${appMetadata.css[0]}">`;
                }
            }
        } catch (error) {
            console.error('Failed to load Vite manifest in production', error);
        }
    } else {
        jsFile = `
            <script type="module" src="http://localhost:5173/@vite/client"></script>
            <script type="module" src="http://localhost:5173/resources/js/app.jsx"></script>
        `;
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Beresin App (Serverless Node)</title>
    <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />
    ${cssFile}
    <script>
        window.Ziggy = { 
            url: (typeof window !== 'undefined' ? window.location.origin : ''), 
            port: null, 
            defaults: {} 
        };
    </script>
    ${jsFile}
</head>
<body class="font-sans antialiased">
    <div id="app" data-page='${page}'></div>
</body>
</html>
    `;
};

app.use(inertia(htmlTemplate));
app.use(shareInertiaData);

// Routes
app.use('/', authRouter);
app.use('/', dashboardRouter);
app.use('/', orderRouter);
app.use('/', adminRouter);
app.use('/', jokiRouter);

// TEMP DEBUG: Check packages is_negotiable field
app.get('/debug/packages', async (req, res) => {
    const pkgs = await prisma.packages.findMany({ include: { package_addons: true } });
    res.json(pkgs.map(p => ({
        id: p.id, name: p.name,
        is_negotiable: p.is_negotiable,
        is_neg_type: typeof p.is_negotiable,
        addons: p.package_addons?.length || 0
    })));
});

// Notification check endpoint (polled every 5s by AdminLayout & AuthenticatedLayout)
app.get('/notifications/check', async (req, res) => {
    try {
        const token = req.cookies?.auth_token;
        if (!token) {
            return res.json({ unread_chats: 0, pending_orders: 0, new_tasks: 0 });
        }
        const jwt = await import('jsonwebtoken');
        let decoded;
        try {
            decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'secret');
        } catch (e) {
            return res.json({ unread_chats: 0, pending_orders: 0, new_tasks: 0 });
        }

        if (decoded.role === 'admin') {
            const [unreadChats, pendingOrders] = await Promise.all([
                prisma.chats.count({
                    where: { is_admin_reply: false, is_read: false }
                }),
                prisma.orders.count({
                    where: { status: 'pending_payment', payment_proof: { not: null } }
                })
            ]);
            return res.json({ unread_chats: unreadChats, pending_orders: pendingOrders, new_tasks: 0 });
        }

        if (decoded.role === 'joki') {
            const newTasks = await prisma.orders.count({
                where: { joki_id: decoded.id, status: 'in_progress' }
            });
            return res.json({ unread_chats: 0, pending_orders: 0, new_tasks: newTasks });
        }

        // Regular user
        return res.json({ unread_chats: 0, pending_orders: 0, new_tasks: 0 });

    } catch (e) {
        // Silently return zeros on any error - don't break the page
        res.json({ unread_chats: 0, pending_orders: 0, new_tasks: 0 });
    }
});

// Customer Chat API (used by ChatWidget.jsx)
app.get('/chat', async (req, res) => {
    try {
        // requireAuth inline check
        const token = req.cookies?.auth_token;
        if (!token) return res.status(401).json([]);
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'secret');
        const messages = await prisma.chats.findMany({
            where: { user_id: decoded.id },
            orderBy: { created_at: 'asc' }
        });
        res.json(messages.map(m => ({
            ...m,
            created_at: m.created_at instanceof Date ? m.created_at.toISOString() : m.created_at
        })));
    } catch (e) {
        console.error('[CHAT GET ERROR]', e.message);
        res.status(401).json([]);
    }
});

app.post('/chat', async (req, res) => {
    try {
        const token = req.cookies?.auth_token;
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'secret');
        const { message } = req.body;
        if (!message?.trim()) return res.status(400).json({ error: 'Message required' });
        const msg = await prisma.chats.create({
            data: {
                user_id: decoded.id,
                message: message.trim(),
                is_admin_reply: false,
                created_at: new Date(),
                updated_at: new Date()
            }
        });
        res.json(msg);
    } catch (e) {
        console.error('[CHAT POST ERROR]', e.message);
        res.status(500).json({ error: 'Failed to send message' });
    }
});



// Sample Route to replace Laravel's /
app.get('/', async (req, res) => {
    try {
        console.log('[WELCOME] Fetching services from DB...');
        const [services, settings] = await Promise.all([
            prisma.services.findMany({
                include: {
                    packages: {
                        orderBy: { price: 'asc' }
                    }
                },
                orderBy: { id: 'asc' }
            }),
            prisma.settings.findMany()
        ]);

        console.log(`[WELCOME] Found ${services.length} services, ${settings.length} settings`);

        // Convert settings array to key-value map
        const settingsMap = {};
        settings.forEach(s => { settingsMap[s.key] = s.value; });

        res.inertia('Welcome', {
            canLogin: true,
            canRegister: true,
            services,
            whatsapp_number: settingsMap['whatsapp_number'] || '',
            footer_settings: settingsMap
        });
    } catch (error) {
        console.error('[WELCOME ROUTE ERROR]', error.message, error.code);
        // Still render page even if DB fails, just with empty data
        res.inertia('Welcome', {
            canLogin: true,
            canRegister: true,
            services: [],
            whatsapp_number: '',
            footer_settings: {}
        });
    }
});



// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
    console.error('[CRITICAL SERVER ERROR]', err);
    if (res.headersSent) {
        return next(err);
    }

    const isInertiaRequest = req.header('X-Inertia');
    const errorMessage = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;

    if (isInertiaRequest) {
        res.cookie('flash_error', `Server Error: ${errorMessage}`);
        const backUrl = req.get('Referer') || '/';
        console.log(`[ERROR HANDLER] Redirecting back to: ${backUrl}`);
        return res.redirect(backUrl);
    }

    res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'production' ? 'See Netlify Logs' : err.message
    });
});


export default app;
