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

const pooler5432 = "postgresql://postgres.shnizgwjrpaniudwvscs:BeresinAjaYuk2026@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";
await testConnection('Pooler 5432 (Session Mode)', pooler5432);
