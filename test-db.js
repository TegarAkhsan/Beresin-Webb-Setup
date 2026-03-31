import pg from 'pg';
import 'dotenv/config';

async function testConnection(name, connectionString) {
    console.log(`\n--- Testing ${name} ---`);
    console.log(`URL prefix: ${connectionString.split('@')[1]?.split('/')[0]}`);
    
    const pool = new pg.Pool({
        connectionString,
        ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 5000,
    });

    try {
        const client = await pool.connect();
        console.log(`✅ ${name} Connected successfully!`);
        const res = await client.query('SELECT current_database(), current_user, version()');
        console.log('Query result:', res.rows[0]);
        client.release();
    } catch (err) {
        console.error(`❌ ${name} Connection failed:`, err.message);
        if (err.code) console.error('Error code:', err.code);
    } finally {
        await pool.end();
    }
}

const DATABASE_URL = process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, '');
const DIRECT_URL = process.env.DIRECT_URL?.trim().replace(/^["']|["']$/g, '');

if (DATABASE_URL) await testConnection('DATABASE_URL (Pooler)', DATABASE_URL);
if (DIRECT_URL) await testConnection('DIRECT_URL (Direct)', DIRECT_URL);

// Try with sslmode=require if not already present
if (DATABASE_URL && !DATABASE_URL.includes('sslmode')) {
    const s = DATABASE_URL.includes('?') ? '&' : '?';
    await testConnection('DATABASE_URL with sslmode=require', `${DATABASE_URL}${s}sslmode=require`);
}
