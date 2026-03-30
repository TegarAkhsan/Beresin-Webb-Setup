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

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

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

// Sample Route to replace Laravel's /
app.get('/', async (req, res) => {
    // res.inertia corresponds to Inertia::render
    res.inertia('Welcome', {
        canLogin: true,
        canRegister: true,
        services: [],
        whatsapp_number: '',
        footer_settings: {}
    });
});

export default app;
