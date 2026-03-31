import serverless from 'serverless-http';
import app from '../../server/app.js';

// Flag to ensure seed only runs once per cold start
let seeded = false;

const baseHandler = serverless(app);

export const handler = async (event, context) => {
    // Run seed once on cold start (only if DATABASE_URL is available)
    if (!seeded && process.env.DATABASE_URL) {
        seeded = true; // set immediately to prevent concurrent runs
        try {
            // Lazy import to avoid breaking the handler if seed.js has any issue
            const { runSeed } = await import('../../server/seed.js');
            await runSeed();
        } catch (err) {
            console.error('[SEED ON STARTUP FAILED]', err.message);
            // Don't crash the server if seed fails
        }
    }

    return baseHandler(event, context);
};
