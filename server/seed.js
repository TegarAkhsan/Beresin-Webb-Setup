import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, '');

if (!DATABASE_URL) {
    console.error('CRITICAL: DATABASE_URL is not set.');
    process.exit(1);
}

const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedUsers() {
    console.log('🌱 Seeding users...');

    const users = [
        { name: 'Admin Beresin', email: 'admin@beresin.com', role: 'admin', password: 'password' },
        { name: 'Joki Pro',      email: 'joki@beresin.com',  role: 'joki',  password: 'password' },
        { name: 'Customer A',   email: 'customer@beresin.com', role: 'customer', password: 'password' },
    ];

    for (const u of users) {
        const existing = await prisma.users.findUnique({ where: { email: u.email } });
        if (existing) {
            console.log(`  ✅ User already exists: ${u.email}`);
            continue;
        }
        const hashed = await bcrypt.hash(u.password, 12);
        await prisma.users.create({
            data: {
                name: u.name,
                email: u.email,
                role: u.role,
                password: hashed,
                created_at: new Date(),
                updated_at: new Date(),
            }
        });
        console.log(`  ➕ Created user: ${u.email} (${u.role})`);
    }
}

async function seedSettings() {
    console.log('🌱 Seeding settings...');

    const settings = [
        { key: 'whatsapp_number', value: '6281234567890' },
        { key: 'instagram_url', value: 'https://instagram.com/beresin__id' },
        { key: 'email_contact', value: 'admin@beresin.com' },
        { key: 'footer_description', value: 'Platform jasa digital terpercaya untuk kebutuhan Web Development, UI/UX Design, dan Mobile App. Solusi cepat, aman, dan berkualitas.' },
    ];

    for (const s of settings) {
        await prisma.settings.upsert({
            where: { key: s.key },
            update: { value: s.value },
            create: { key: s.key, value: s.value },
        });
        console.log(`  ✅ Setting: ${s.key}`);
    }
}

async function seedServices() {
    console.log('🌱 Seeding services & packages...');

    const servicesData = [
        {
            name: 'Web Development',
            slug: 'web-development',
            description: 'Jasa pembuatan website profesional',
            packages: [
                {
                    name: 'Paket Dasar',
                    price: 500000,
                    description: 'Cocok untuk landing page atau web sederhana',
                    duration_days: 3,
                    features: JSON.stringify(['Website statis / dinamis sederhana', 'CRUD sederhana', 'Auth login/register', 'Database MySQL', 'UI basic (Bootstrap/Tailwind)', 'Max 5 halaman']),
                },
                {
                    name: 'Paket Menengah',
                    price: 1500000,
                    description: 'Untuk aplikasi web dengan fitur lengkap',
                    duration_days: 7,
                    features: JSON.stringify(['Full CRUD kompleks', 'Role & permission', 'Dashboard admin', 'Integrasi API sederhana', 'Upload file & media', 'Validasi data', 'Max 10 halaman']),
                },
                {
                    name: 'Paket Atas',
                    price: 3000000,
                    description: 'Sistem kompleks skala besar',
                    duration_days: 15,
                    features: JSON.stringify(['Sistem multi-role & multi-level', 'REST API / Backend service', 'Payment gateway', 'Optimasi performa', 'Security hardening', 'Deployment & dokumentasi']),
                },
                {
                    name: 'Paket Pelajar',
                    price: 0,
                    description: 'Solusi hemat untuk pelajar/mahasiswa',
                    duration_days: 3,
                    is_negotiable: true,
                    features: JSON.stringify(['Harga Negotiable', 'Fitur Negotiable', 'Konsultasi Gratis', 'Waktu Pengerjaan Fleksibel']),
                },
            ]
        },
        {
            name: 'UI/UX Design & Research',
            slug: 'ui-ux-design',
            description: 'Desain antarmuka dan pengalaman pengguna',
            packages: [
                {
                    name: 'Paket Dasar',
                    price: 300000,
                    duration_days: 3,
                    features: JSON.stringify(['Wireframe low-fidelity', 'User flow sederhana', 'Desain 1–3 halaman']),
                },
                {
                    name: 'Paket Menengah',
                    price: 800000,
                    duration_days: 7,
                    features: JSON.stringify(['Wireframe mid-fidelity', 'Desain UI (Figma)', 'Design system dasar', 'User flow lengkap']),
                },
                {
                    name: 'Paket Atas',
                    price: 1500000,
                    duration_days: 15,
                    features: JSON.stringify(['UX research (persona & pain point)', 'High-fidelity design', 'Prototype interaktif', 'Usability testing', 'Dokumentasi UX']),
                },
                {
                    name: 'Paket Pelajar',
                    price: 0,
                    description: 'Solusi hemat untuk pelajar/mahasiswa',
                    duration_days: 3,
                    is_negotiable: true,
                    features: JSON.stringify(['Harga Negotiable', 'Fitur Negotiable', 'Konsultasi Gratis', 'Waktu Pengerjaan Fleksibel']),
                },
            ]
        },
        {
            name: 'Mobile Development',
            slug: 'mobile-development',
            description: 'Pembuatan aplikasi Android/iOS',
            packages: [
                {
                    name: 'Paket Dasar',
                    price: 1000000,
                    duration_days: 3,
                    features: JSON.stringify(['Aplikasi Flutter sederhana', 'CRUD lokal / API', 'UI basic']),
                },
                {
                    name: 'Paket Menengah',
                    price: 2500000,
                    duration_days: 7,
                    features: JSON.stringify(['Auth & role user', 'API integration', 'State management', 'Responsive UI']),
                },
                {
                    name: 'Paket Atas',
                    price: 5000000,
                    duration_days: 15,
                    features: JSON.stringify(['Arsitektur scalable', 'Push notification', 'Payment integration', 'Performance optimization', 'Build & publish readiness']),
                },
                {
                    name: 'Paket Pelajar',
                    price: 0,
                    description: 'Solusi hemat untuk pelajar/mahasiswa',
                    duration_days: 3,
                    is_negotiable: true,
                    features: JSON.stringify(['Harga Negotiable', 'Fitur Negotiable', 'Konsultasi Gratis', 'Waktu Pengerjaan Fleksibel']),
                },
            ]
        },
    ];

    for (const svc of servicesData) {
        const existing = await prisma.services.findUnique({ where: { slug: svc.slug } });
        if (existing) {
            console.log(`  ✅ Service already exists: ${svc.name}`);
            continue;
        }

        const { packages, ...serviceData } = svc;
        const created = await prisma.services.create({
            data: {
                ...serviceData,
                created_at: new Date(),
                updated_at: new Date(),
            }
        });

        for (const pkg of packages) {
            await prisma.packages.create({
                data: {
                    ...pkg,
                    service_id: created.id,
                    created_at: new Date(),
                    updated_at: new Date(),
                }
            });
        }
        console.log(`  ➕ Created service: ${svc.name} with ${packages.length} packages`);
    }
}

async function main() {
    console.log('\n🚀 Starting database seed...\n');
    try {
        await seedUsers();
        await seedSettings();
        await seedServices();
        console.log('\n✅ Seeding complete!\n');
    } catch (error) {
        console.error('\n❌ Seed failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();
