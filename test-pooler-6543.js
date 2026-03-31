import pg from 'pg';
import 'dotenv/config';

async function testConnection(name, connectionString) {
    console.log(`\n--- Testing ${name} ---`);
    const pool = new pg.Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
    });

    try {
        const client = await pool.connect();
        console.log(`✅ ${name} Connected successfully!`);
        client.release();
    } catch (err) {
        console.error(`❌ ${name} Connection failed:`, err.message);
    } finally {
        await pool.end();
    }
}

const pooler6543 = "postgresql://postgres.shnizgwjrpaniudwvscs:BeresinAjaYuk2026@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres";
await testConnection('Pooler 6543 (Transaction Mode)', pooler6543);
