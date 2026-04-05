import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL
    ?.trim()
    .replace(/^["']|["']$/g, '')
    .replace(/&?channel_binding=\w+/g, '')
    .replace(/\?&/, '?');

if (!DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
}

const needsSSL = DATABASE_URL.includes('sslmode=require')
    || DATABASE_URL.includes('supabase.com')
    || DATABASE_URL.includes('supabase.co');

const cleanURL = DATABASE_URL.replace(/[?&]sslmode=\w+/g, '').replace(/\?&/, '?').replace(/[?]$/, '');

const pool = new pg.Pool({
    connectionString: cleanURL,
    ssl: needsSSL ? { rejectUnauthorized: false, checkServerIdentity: () => undefined } : false,
    max: 1,
    connectionTimeoutMillis: 10000,
});

// First: Check all packages and their is_negotiable status
const checkResult = await pool.query(`
    SELECT id, name, is_negotiable, price 
    FROM packages 
    ORDER BY id
`);

console.log('\n=== CURRENT PACKAGES ===');
checkResult.rows.forEach(r => {
    console.log(`  [${r.id}] ${r.name} | is_negotiable: ${r.is_negotiable} (${typeof r.is_negotiable}) | price: ${r.price}`);
});

// Update all "Paket Pelajar" to is_negotiable = true
const updateResult = await pool.query(`
    UPDATE packages 
    SET is_negotiable = true, updated_at = NOW()
    WHERE name ILIKE '%pelajar%' OR name ILIKE '%student%'
    RETURNING id, name, is_negotiable
`);

console.log('\n=== UPDATED PACKAGES ===');
updateResult.rows.forEach(r => {
    console.log(`  [${r.id}] ${r.name} | is_negotiable: ${r.is_negotiable}`);
});

await pool.end();
console.log('\nDone!');
