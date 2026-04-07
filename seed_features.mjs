import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import "dotenv/config"; // Ensure .env is loaded

function createPrismaClient() {
    const DATABASE_URL = process.env.DATABASE_URL
        ?.trim()
        .replace(/^["']|["']$/g, '')
        .replace(/&?channel_binding=\w+/g, '')
        .replace(/\?&/, '?');

    if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

    const needsSSL = DATABASE_URL.includes('sslmode=require')
        || DATABASE_URL.includes('supabase.com')
        || DATABASE_URL.includes('supabase.co')
        || DATABASE_URL.includes('neon.tech');

    const cleanURL = DATABASE_URL.replace(/[?&]sslmode=\w+/g, '').replace(/\?&/, '?').replace(/[?]$/, '');

    const pool = new pg.Pool({
        connectionString: cleanURL,
        ssl: needsSSL ? { rejectUnauthorized: false, checkServerIdentity: () => undefined } : false,
        max: 1,
        connectionTimeoutMillis: 10000,
    });

    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

async function seedFeatures() {
    console.log("Mencari paket dengan nama 'Paket Pelajar'...");
    const packages = await prisma.packages.findMany({
        where: { name: 'Paket Pelajar' }
    });

    if (packages.length === 0) {
        console.log("Paket Pelajar tidak ditemukan di database.");
        return;
    }

    const defaultFeatures = [
        { name: "Desain UI/UX Khusus (Prototyping)", price: 150000, description: "Desain antarmuka eksklusif menggunakan Figma.", estimate_days: 2 },
        { name: "Integrasi Database & Rest API", price: 250000, description: "Pembuatan struktur database dinamis beserta API endpoint.", estimate_days: 3 },
        { name: "Fitur Autentikasi Lanjutan", price: 100000, description: "Sistem Login/Register dengan Role khusus atau OTP.", estimate_days: 1 },
        { name: "Fitur Realtime & Notifikasi", price: 200000, description: "Integrasi socket untuk chat atau push notifikasi realtime.", estimate_days: 2 },
        { name: "Dashboard Admin Dinamis", price: 300000, description: "Panel kontrol administrator untuk mengelola konten.", estimate_days: 4 },
        { name: "Laporan Export (PDF/Excel)", price: 100000, description: "Fitur export data operasional ke format PDF atau Excel.", estimate_days: 1 }
    ];

    let totalSeeded = 0;

    for (const pkg of packages) {
        console.log(`\nMenyiapkan fitur untuk Paket: [ID: ${pkg.id}] ${pkg.name}...`);
        
        // Hapus (reset) fitur yang lama agar tidak dobel
        await prisma.package_addons.deleteMany({
            where: { package_id: pkg.id }
        });

        // Loop untuk memasukkan addons
        for (const feat of defaultFeatures) {
            await prisma.package_addons.create({
                data: {
                    package_id: pkg.id,
                    name: feat.name,
                    price: feat.price,
                    description: feat.description,
                    is_active: true
                }
            });
            totalSeeded++;
        }
        
        // Update addon_features field untuk fallback/kompatibilitas
        await prisma.packages.update({
            where: { id: pkg.id },
            data: {
                addon_features: JSON.stringify(defaultFeatures)
            }
        });
        console.log(`✓ 6 fitur berhasil ditambahkan ke [ID: ${pkg.id}]!`);
    }

    console.log(`\nSelesai! Total ${totalSeeded} fitur ditambahkan secara keseluruhan.`);
}

seedFeatures()
    .catch(e => {
        console.error("Gagal melakukan seeding:", e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
