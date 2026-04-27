import { prisma } from '../app.js';
import { uploadToStorage } from '../lib/storage.js';
import bcrypt from 'bcryptjs';

const generateInvoiceNumber = () => 'INV-' + Math.random().toString(36).substring(2, 12).toUpperCase();

const flashRedirect = (res, url, message, isError = false) => {
    const cookieName = isError ? 'flash_error' : 'flash_success';
    res.cookie(cookieName, message);
    return res.redirect(303, url);
};

// Helper: serialize dates in order objects
const serializeOrder = (o) => ({
    ...o,
    amount: Number(o.amount || 0),
    base_price: Number(o.base_price || 0),
    rush_fee: Number(o.rush_fee || 0),
    platform_fee: Number(o.platform_fee || 0),
    joki_fee: Number(o.joki_fee || 0),
    created_at: o.created_at instanceof Date ? o.created_at.toISOString() : (o.created_at || null),
    updated_at: o.updated_at instanceof Date ? o.updated_at.toISOString() : (o.updated_at || null),
    deadline: o.deadline instanceof Date ? o.deadline.toISOString() : (o.deadline || null),
    completed_at: o.completed_at instanceof Date ? o.completed_at.toISOString() : null,
    started_at: o.started_at instanceof Date ? o.started_at.toISOString() : null,
});

// Build simple Laravel-style links for pagination
function buildPaginatorLinks(total, perPage, page) {
    const lastPage = Math.ceil(total / perPage) || 1;
    const links = [];
    links.push({ url: page > 1 ? `?page=${page - 1}` : null, label: '&laquo; Previous', active: false });
    for (let i = 1; i <= lastPage; i++) {
        links.push({ url: `?page=${i}`, label: String(i), active: i === page });
    }
    links.push({ url: page < lastPage ? `?page=${page + 1}` : null, label: 'Next &raquo;', active: false });
    return links;
}

// ─── Admin Dashboard ─────────────────────────────────────────────────────────
export const index = async (req, res) => {
    try {
        const [totalOrders, activeOrders, completedOrders, totalJokis, payoutRequestsRaw, jokisRaw] = await Promise.all([
            prisma.orders.count(),
            prisma.orders.count({ where: { status: { in: ['pending_payment', 'pending_assignment', 'in_progress', 'review'] } } }),
            prisma.orders.findMany({ where: { status: 'completed' } }),
            prisma.users.count({ where: { role: 'joki' } }),
            prisma.payout_requests.findMany({
                include: { users: true, orders: { include: { packages: true } } },
                orderBy: { created_at: 'desc' }
            }),
            prisma.users.findMany({
                where: { role: 'joki' },
                include: { _count: { select: { orders_orders_joki_idTousers: { where: { status: { in: ['in_progress', 'review'] } } } } } },
                take: 5
            })
        ]);

        const revenueGross = completedOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
        const revenueOps = completedOrders.reduce((sum, o) => sum + (Number(o.amount || 0) - Number(o.joki_fee || 0)), 0);
        const jokiWorkload = jokisRaw.map(j => ({ ...j, active_jobs_count: j._count.orders_orders_joki_idTousers }))
            .sort((a, b) => b.active_jobs_count - a.active_jobs_count);

        res.inertia('Admin/Dashboard', {
            stats: { total_orders: totalOrders, active_orders: activeOrders, revenue_gross: revenueGross, revenue_ops: revenueOps, total_jokis: totalJokis },
            joki_workload: jokiWorkload,
            payoutRequests: payoutRequestsRaw.map(p => ({
                ...p,
                amount: Number(p.amount || 0),
                user: p.users,
                orders: p.orders.map(o => ({ ...o, package: o.packages }))
            }))
        });
    } catch (error) {
        console.error('[ADMIN INDEX ERROR]', error.message);
        return flashRedirect(res, '/', 'Admin dashboard error: ' + error.message, true);
    }
};

// ─── Verify Payments ─────────────────────────────────────────────────────────
export const verify = async (req, res) => {
    try {
        const [orders, additionalPaymentOrders] = await Promise.all([
            prisma.orders.findMany({
                where: { status: { in: ['pending_payment', 'waiting_approval'] } },
                include: { users_orders_user_idTousers: true, packages: { include: { services: true, package_addons: true } } },
                orderBy: { created_at: 'desc' }
            }),
            prisma.orders.findMany({
                where: { additional_payment_status: 'pending_verification' },
                include: { users_orders_user_idTousers: true, packages: { include: { services: true } } },
                orderBy: { created_at: 'desc' }
            })
        ]);

        const mapVerifyOrder = (o) => ({
            ...serializeOrder(o),
            user: o.users_orders_user_idTousers,
            package: {
                ...o.packages,
                price: Number(o.packages?.price || 0),
                service: o.packages?.services,
                addons: o.packages?.package_addons || []
            }
        });

        res.inertia('Admin/Orders/Verify', {
            orders: { data: orders.map(mapVerifyOrder) },
            additionalPaymentOrders: additionalPaymentOrders.map(o => ({
                ...serializeOrder(o),
                user: o.users_orders_user_idTousers,
                package: { ...o.packages, price: Number(o.packages?.price || 0), service: o.packages?.services }
            }))
        });
    } catch (error) {
        console.error('[ADMIN VERIFY ERROR]', error.message);
        return flashRedirect(res, '/admin', 'Gagal memuat halaman verifikasi', true);
    }
};


export const approvePayment = async (req, res) => {
    const { id } = req.params;
    try {
        const order = await prisma.orders.findUnique({ where: { id: parseInt(id) } });
        if (!order) return flashRedirect(res, '/admin/orders/verify', 'Order tidak ditemukan', true);

        let newStatus;
        let extraData = {};

        if (order.is_negotiation && order.status === 'waiting_approval') {
            // Paket pelajar: admin approve proposal → customer harus bayar dulu
            newStatus = 'pending_payment';
        } else {
            // Regular payment: admin approve bukti bayar → langsung ke queue assignment
            newStatus = 'pending_assignment';
            extraData = { payment_status: 'paid', invoice_number: generateInvoiceNumber() };
        }

        await prisma.orders.update({
            where: { id: parseInt(id) },
            data: { status: newStatus, updated_at: new Date(), ...extraData }
        });

        const msg = order.is_negotiation && order.status === 'waiting_approval'
            ? 'Proposal diterima! Customer akan diarahkan ke halaman pembayaran.'
            : 'Pembayaran berhasil disetujui';

        return flashRedirect(res, '/admin/orders/verify', msg);
    } catch (error) {
        console.error('[APPROVE PAYMENT ERROR]', error.message);
        return flashRedirect(res, '/admin/orders/verify', 'Gagal menyetujui: ' + error.message, true);
    }
};


// ─── Assign Orders ────────────────────────────────────────────────────────────
export const assign = async (req, res) => {
    const search = req.query.search || '';
    try {
        // Build search filter
        const searchWhere = search ? {
            OR: [
                { order_number: { contains: search, mode: 'insensitive' } },
                { users_orders_user_idTousers: { name: { contains: search, mode: 'insensitive' } } }
            ]
        } : {};

        const [pendingOrders, assignedOrders, jokisRaw] = await Promise.all([
            prisma.orders.findMany({
                where: { status: 'pending_assignment', ...searchWhere },
                include: { users_orders_user_idTousers: true, packages: { include: { services: true } } }
            }),
            prisma.orders.findMany({
                where: { status: { in: ['in_progress', 'review'] }, ...searchWhere },
                include: { users_orders_user_idTousers: true, packages: { include: { services: true } }, users_orders_joki_idTousers: true }
            }),
            prisma.users.findMany({
                where: { role: 'joki' },
                include: { _count: { select: { orders_orders_joki_idTousers: { where: { status: { in: ['in_progress', 'review'] } } } } } }
            })
        ]);

        const mapOrder = (o) => ({
            ...serializeOrder(o),
            user: o.users_orders_user_idTousers,
            package: { ...o.packages, price: Number(o.packages?.price || 0), service: o.packages?.services }
        });

        res.inertia('Admin/Orders/Assign', {
            orders: { data: pendingOrders.map(mapOrder) },
            assignedOrders: { data: assignedOrders.map(o => ({ ...mapOrder(o), joki: o.users_orders_joki_idTousers })) },
            jokis: jokisRaw.map(j => ({ ...j, jobs_count: j._count.orders_orders_joki_idTousers })),
            filters: { search }
        });
    } catch (error) {
        console.error('[ADMIN ASSIGN ERROR]', error.message);
        return flashRedirect(res, '/admin', 'Gagal memuat halaman assign', true);
    }
};


export const storeAssignment = async (req, res) => {
    const { id } = req.params;
    const { joki_id, assignment_type } = req.body;
    try {
        const order = await prisma.orders.findUnique({ where: { id: parseInt(id) }, include: { packages: true } });
        if (!order) return flashRedirect(res, '/admin/orders/assign', 'Order tidak ditemukan', true);

        let targetJokiId = joki_id;
        if (assignment_type === 'auto') {
            const leastBusyJoki = await prisma.users.findFirst({
                where: { role: 'joki' },
                include: { _count: { select: { orders_orders_joki_idTousers: { where: { status: { in: ['in_progress', 'review'] } } } } } },
                orderBy: { orders_orders_joki_idTousers: { _count: 'asc' } }
            });
            if (!leastBusyJoki) return flashRedirect(res, '/admin/orders/assign', 'Tidak ada joki tersedia', true);
            targetJokiId = leastBusyJoki.id;
        }

        const jokiFee = (Number(order.base_price) * 0.65) + (Number(order.rush_fee) * 0.80);
        await prisma.orders.update({
            where: { id: order.id },
            data: { joki_id: parseInt(targetJokiId), joki_fee: jokiFee, status: 'in_progress', started_at: new Date(), updated_at: new Date() }
        });

        const templates = await prisma.milestone_templates.findMany({
            where: { service_id: order.packages.service_id },
            orderBy: { sort_order: 'asc' }
        });

        if (templates.length > 0) {
            await prisma.order_milestones.createMany({
                data: templates.map(t => ({
                    order_id: order.id, name: t.name,
                    description: t.description || t.requirements,
                    weight: t.weight, sort_order: t.sort_order,
                    status: t.sort_order === 1 ? 'in_progress' : 'pending',
                    created_at: new Date(), updated_at: new Date()
                }))
            });
        }

        return flashRedirect(res, '/admin/orders/assign', 'Tugas berhasil di-assign');
    } catch (error) {
        console.error('[STORE ASSIGNMENT ERROR]', error.message);
        return flashRedirect(res, '/admin/orders/assign', 'Gagal assign tugas: ' + error.message, true);
    }
};

// ─── Payouts ──────────────────────────────────────────────────────────────────
export const processPayout = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.payout_requests.update({
            where: { id: parseInt(id) },
            data: { status: 'paid', admin_note: 'Paid via Admin Dashboard', updated_at: new Date() }
        });
        return flashRedirect(res, '/admin', 'Payout berhasil diproses');
    } catch (error) {
        console.error('[PROCESS PAYOUT ERROR]', error.message);
        return flashRedirect(res, '/admin', 'Gagal memproses payout', true);
    }
};

export const rejectPayout = async (req, res) => {
    const { id } = req.params;
    const { admin_note } = req.body;
    try {
        await prisma.payout_requests.update({
            where: { id: parseInt(id) },
            data: { status: 'rejected', admin_note: admin_note || 'Rejected by admin', updated_at: new Date() }
        });
        return flashRedirect(res, '/admin', 'Payout berhasil ditolak');
    } catch (error) {
        console.error('[REJECT PAYOUT ERROR]', error.message);
        return flashRedirect(res, '/admin', 'Gagal menolak payout', true);
    }
};

export const approveAdditionalPayment = async (req, res) => {
    const { id } = req.params;
    try {
        const order = await prisma.orders.findUnique({ where: { id: parseInt(id) } });
        if (!order) return flashRedirect(res, '/admin/orders/verify', 'Order tidak ditemukan', true);

        await prisma.orders.update({
            where: { id: parseInt(id) },
            data: {
                additional_payment_status: 'paid',
                amount: { increment: Number(order.additional_revision_fee || 0) },
                updated_at: new Date()
            }
        });
        return flashRedirect(res, '/admin/orders/verify', 'Pembayaran tambahan berhasil disetujui');
    } catch (error) {
        console.error('[APPROVE ADDITIONAL PAYMENT ERROR]', error.message);
        return flashRedirect(res, '/admin/orders/verify', 'Gagal menyetujui pembayaran tambahan', true);
    }
};


export const batchAutoAssign = async (req, res) => {
    try {
        const pendingOrders = await prisma.orders.findMany({
            where: { status: 'pending_assignment' },
            include: { packages: true }
        });

        let assigned = 0;
        for (const order of pendingOrders) {
            const leastBusyJoki = await prisma.users.findFirst({
                where: { role: 'joki' },
                include: { _count: { select: { orders_orders_joki_idTousers: { where: { status: { in: ['in_progress', 'review'] } } } } } },
                orderBy: { orders_orders_joki_idTousers: { _count: 'asc' } }
            });

            if (!leastBusyJoki) break;

            const jokiFee = (Number(order.base_price) * 0.65) + (Number(order.rush_fee) * 0.80);
            await prisma.orders.update({
                where: { id: order.id },
                data: { joki_id: leastBusyJoki.id, joki_fee: jokiFee, status: 'in_progress', started_at: new Date(), updated_at: new Date() }
            });

            const templates = await prisma.milestone_templates.findMany({
                where: { service_id: order.packages?.service_id },
                orderBy: { sort_order: 'asc' }
            });

            if (templates.length > 0) {
                await prisma.order_milestones.createMany({
                    data: templates.map(t => ({
                        order_id: order.id, name: t.name,
                        description: t.description || t.requirements,
                        weight: t.weight, sort_order: t.sort_order,
                        status: t.sort_order === 1 ? 'in_progress' : 'pending',
                        created_at: new Date(), updated_at: new Date()
                    }))
                });
            }

            assigned++;
        }

        return flashRedirect(res, '/admin/orders/assign', `${assigned} order berhasil di-assign otomatis`);
    } catch (error) {
        console.error('[BATCH AUTO-ASSIGN ERROR]', error.message);
        return flashRedirect(res, '/admin/orders/assign', 'Gagal batch assign: ' + error.message, true);
    }
};



// ─── Users ────────────────────────────────────────────────────────────────────
export const users = async (req, res) => {
    const search = req.query.search || '';
    const page   = parseInt(req.query.page || '1');
    const perPage = 15;
    const skip   = (page - 1) * perPage;

    try {
        const where = search
            ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }
            : {};

        const [allUsers, total] = await Promise.all([
            prisma.users.findMany({
                where,
                orderBy: { created_at: 'desc' },
                include: { _count: { select: { orders_orders_user_idTousers: true } } },
                skip,
                take: perPage
            }),
            prisma.users.count({ where })
        ]);

        const data = allUsers.map(u => ({
            ...u,
            orders_count: u._count.orders_orders_user_idTousers,
            created_at: u.created_at instanceof Date ? u.created_at.toISOString() : u.created_at,
        }));

        res.inertia('Admin/Users/Index', {
            users: { data, links: buildPaginatorLinks(total, perPage, page), total },
            filters: { search }
        });
    } catch (error) {
        console.error('[ADMIN USERS ERROR]', error.message);
        return flashRedirect(res, '/admin', 'Gagal memuat daftar user', true);
    }
};

export const createUser = async (req, res) => {
    res.inertia('Admin/Users/Create', {});
};

export const storeUser = async (req, res) => {
    const { name, email, password, role, specialization } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        await prisma.users.create({
            data: {
                name,
                email,
                password: hashed,
                role: role || 'customer',
                specialization: (role === 'joki' && specialization) ? specialization : null,
                created_at: new Date(),
                updated_at: new Date()
            }
        });
        return flashRedirect(res, '/admin/users', `Akun ${role === 'joki' ? 'Joki' : 'user'} berhasil dibuat`);
    } catch (error) {
        console.error('[CREATE USER ERROR]', error.message);
        return flashRedirect(res, '/admin/users/create', 'Gagal membuat user: ' + error.message, true);
    }
};

export const editUser = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma.users.findUnique({ where: { id: parseInt(id) } });
        if (!user) return flashRedirect(res, '/admin/users', 'User tidak ditemukan', true);
        res.inertia('Admin/Users/Edit', { user });
    } catch (error) {
        return flashRedirect(res, '/admin/users', 'Gagal memuat user', true);
    }
};

export const updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, email, role, password } = req.body;
    try {
        const data = { name, email, role, updated_at: new Date() };
        if (password) data.password = await bcrypt.hash(password, 10);
        await prisma.users.update({ where: { id: parseInt(id) }, data });
        return flashRedirect(res, '/admin/users', 'User berhasil diupdate');
    } catch (error) {
        return flashRedirect(res, '/admin/users', 'Gagal update user: ' + error.message, true);
    }
};

export const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.users.delete({ where: { id: parseInt(id) } });
        return flashRedirect(res, '/admin/users', 'User berhasil dihapus');
    } catch (error) {
        return flashRedirect(res, '/admin/users', 'Gagal menghapus user: ' + error.message, true);
    }
};

export const blacklistUser = async (req, res) => {
    const { id } = req.params;
    const { blacklist_reason } = req.body;
    try {
        const user = await prisma.users.findUnique({ where: { id: parseInt(id) } });
        await prisma.users.update({
            where: { id: parseInt(id) },
            data: { is_blacklisted: !user.is_blacklisted, blacklist_reason: blacklist_reason || null, updated_at: new Date() }
        });
        return flashRedirect(res, '/admin/users', user.is_blacklisted ? 'User di-unblacklist' : 'User diblacklist');
    } catch (error) {
        console.error('[BLACKLIST USER ERROR]', error.message);
        return flashRedirect(res, '/admin/users', 'Gagal update status user', true);
    }
};

// ─── Services ────────────────────────────────────────────────────────────────
export const services = async (req, res) => {
    try {
        const allServices = await prisma.services.findMany({
            include: { packages: true },
            orderBy: { id: 'asc' }
        });
        res.inertia('Admin/Services/Index', { services: allServices });
    } catch (error) {
        console.error('[ADMIN SERVICES ERROR]', error.message);
        return flashRedirect(res, '/admin', 'Gagal memuat services', true);
    }
};

export const storeService = async (req, res) => {
    const { name, slug, description, packages: pkgs } = req.body;
    try {
        const service = await prisma.services.create({
            data: { name, slug, description, created_at: new Date(), updated_at: new Date() }
        });
        if (pkgs && Array.isArray(pkgs)) {
            await prisma.packages.createMany({
                data: pkgs.map(p => ({ ...p, service_id: service.id, price: parseFloat(p.price), created_at: new Date(), updated_at: new Date() }))
            });
        }
        return flashRedirect(res, '/admin/services', 'Service berhasil dibuat');
    } catch (error) {
        console.error('[STORE SERVICE ERROR]', error.message);
        return flashRedirect(res, '/admin/services', 'Gagal membuat service: ' + error.message, true);
    }
};

export const editService = async (req, res) => {
    const { id } = req.params;
    try {
        const service = await prisma.services.findUnique({
            where: { id: parseInt(id) },
            include: { packages: true }
        });
        if (!service) return flashRedirect(res, '/admin/services', 'Service tidak ditemukan', true);
        res.inertia('Admin/Services/Edit', { service });
    } catch (error) {
        return flashRedirect(res, '/admin/services', 'Gagal memuat service', true);
    }
};

export const updateService = async (req, res) => {
    const { id } = req.params;
    const { name, slug, description } = req.body;
    try {
        await prisma.services.update({
            where: { id: parseInt(id) },
            data: { name, slug, description, updated_at: new Date() }
        });
        return flashRedirect(res, '/admin/services', 'Service berhasil diupdate');
    } catch (error) {
        return flashRedirect(res, '/admin/services', 'Gagal update service', true);
    }
};

export const deleteService = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.services.delete({ where: { id: parseInt(id) } });
        return flashRedirect(res, '/admin/services', 'Service berhasil dihapus');
    } catch (error) {
        return flashRedirect(res, '/admin/services', 'Gagal menghapus service', true);
    }
};

// ─── Packages ─────────────────────────────────────────────────────────────────

export const storePackage = async (req, res) => {
    const { serviceId } = req.params;
    const { name, description, price, features, is_negotiable, duration_days } = req.body;
    try {
        let processedFeatures = [];
        if (features) {
            processedFeatures = features.split('\n').map(f => f.trim()).filter(f => f);
        }

        await prisma.packages.create({
            data: {
                service_id: parseInt(serviceId),
                name, description,
                price: parseFloat(price || 0),
                duration_days: parseInt(duration_days || 3),
                features: JSON.stringify(processedFeatures),
                is_negotiable: is_negotiable === true || is_negotiable === 'true' || is_negotiable === '1',
                created_at: new Date(), updated_at: new Date()
            }
        });
        return flashRedirect(res, '/admin/services', 'Package berhasil dibuat');
    } catch (error) {
        console.error('[STORE PACKAGE ERROR]', error.message);
        return flashRedirect(res, '/admin/services', 'Gagal membuat package', true);
    }
};

export const updatePackage = async (req, res) => {
    const { id } = req.params;
    const { name, description, price, features, is_negotiable, duration_days } = req.body;
    try {
        let processedFeatures = [];
        if (features) {
            processedFeatures = features.split('\n').map(f => f.trim()).filter(f => f);
        }

        const pkg = await prisma.packages.findUnique({ where: { id: parseInt(id) } });
        await prisma.packages.update({
            where: { id: parseInt(id) },
            data: { 
                name, 
                description, 
                price: parseFloat(price || 0), 
                duration_days: parseInt(duration_days || 3),
                features: JSON.stringify(processedFeatures),
                is_negotiable: is_negotiable === true || is_negotiable === 'true' || is_negotiable === '1',
                updated_at: new Date() 
            }
        });
        return flashRedirect(res, '/admin/services', 'Package berhasil diupdate');
    } catch (error) {
        console.error('[UPDATE PACKAGE ERROR]', error.message);
        return flashRedirect(res, '/admin/services', 'Gagal update package', true);
    }
};

export const deletePackage = async (req, res) => {
    const { id } = req.params;
    try {
        const pkg = await prisma.packages.findUnique({ where: { id: parseInt(id) } });
        await prisma.packages.delete({ where: { id: parseInt(id) } });
        return flashRedirect(res, '/admin/services', 'Package berhasil dihapus');
    } catch (error) {
        return flashRedirect(res, '/admin/services', 'Gagal menghapus package', true);
    }
};

// ─── Addons ───────────────────────────────────────────────────────────────────

export const storeAddon = async (req, res) => {
    const { packageId } = req.params;
    const { name, description, price, is_active } = req.body;
    try {
        await prisma.package_addons.create({
            data: {
                package_id: parseInt(packageId),
                name, description,
                price: parseFloat(price || 0),
                is_active: is_active === 'true' || is_active === true || is_active === '1',
                created_at: new Date(), updated_at: new Date()
            }
        });
        const pkg = await prisma.packages.findUnique({ where: { id: parseInt(packageId) } });
        return flashRedirect(res, '/admin/services', 'Addon berhasil dibuat');
    } catch (error) {
        console.error('[STORE ADDON ERROR]', error.message);
        return flashRedirect(res, '/admin/services', 'Gagal membuat addon', true);
    }
};

export const updateAddon = async (req, res) => {
    const { id } = req.params;
    const { name, description, price, is_active } = req.body;
    try {
        const addon = await prisma.package_addons.findUnique({ where: { id: parseInt(id) } });
        const pkg = await prisma.packages.findUnique({ where: { id: addon.package_id } });
        await prisma.package_addons.update({
            where: { id: parseInt(id) },
            data: { name, description, price: parseFloat(price || 0), is_active: is_active === 'true' || is_active === true || is_active === '1', updated_at: new Date() }
        });
        return flashRedirect(res, '/admin/services', 'Addon berhasil diupdate');
    } catch (error) {
        return flashRedirect(res, '/admin/services', 'Gagal update addon', true);
    }
};

export const deleteAddon = async (req, res) => {
    const { id } = req.params;
    try {
        const addon = await prisma.package_addons.findUnique({ where: { id: parseInt(id) } });
        await prisma.package_addons.delete({ where: { id: parseInt(id) } });
        return flashRedirect(res, '/admin/services', 'Addon berhasil dihapus');
    } catch (error) {
        return flashRedirect(res, '/admin/services', 'Gagal menghapus addon', true);
    }
};



// ─── Settings ────────────────────────────────────────────────────────────────
export const settings = async (req, res) => {
    try {
        const allSettings = await prisma.settings.findMany();
        const settingsMap = allSettings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
        res.inertia('Admin/Settings/Index', { settings: settingsMap });
    } catch (error) {
        console.error('[ADMIN SETTINGS ERROR]', error.message);
        return flashRedirect(res, '/admin', 'Gagal memuat settings', true);
    }
};

export const updateSettings = async (req, res) => {
    try {
        // Save text fields
        const textFields = ['invoice_name', 'invoice_address', 'whatsapp_number', 'payment_va'];
        for (const field of textFields) {
            if (req.body[field] !== undefined) {
                let value = req.body[field];
                if (typeof value === 'object') {
                    value = JSON.stringify(value);
                }
                await prisma.settings.upsert({
                    where: { key: field },
                    update: { value: String(value) },
                    create: { key: field, value: String(value) }
                });
            }
        }

        // Handle file uploads (multer fields)
        const fileFields = ['invoice_logo', 'qris_image'];
        for (const field of fileFields) {
            const file = req.files?.[field]?.[0];
            if (file) {
                const ext = file.originalname.split('.').pop();
                const fileName = `settings/${field}-${Date.now()}.${ext}`;
                const publicUrl = await uploadToStorage(file.buffer, 'beresin-uploads', fileName, file.mimetype);
                await prisma.settings.upsert({
                    where: { key: field },
                    update: { value: publicUrl },
                    create: { key: field, value: publicUrl }
                });
            }
        }

        return flashRedirect(res, '/admin/settings', 'Settings berhasil diupdate');
    } catch (error) {
        console.error('[UPDATE SETTINGS ERROR]', error.message);
        return flashRedirect(res, '/admin/settings', 'Gagal update settings: ' + error.message, true);
    }
};

// ─── Transactions ─────────────────────────────────────────────────────────────
export const transactions = async (req, res) => {
    const { start_date, end_date, service_id } = req.query;
    const page = parseInt(req.query.page || '1');
    const perPage = 20;

    try {
        const where = { payment_status: 'paid' };
        if (start_date) where.created_at = { ...(where.created_at || {}), gte: new Date(start_date) };
        if (end_date)   where.created_at = { ...(where.created_at || {}), lte: new Date(end_date + 'T23:59:59') };
        if (service_id) where.packages = { service_id: parseInt(service_id) };

        const [allOrders, total, allServices] = await Promise.all([
            prisma.orders.findMany({
                where,
                include: {
                    users_orders_user_idTousers: true,
                    packages: { include: { services: true } },
                    users_orders_joki_idTousers: true
                },
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * perPage,
                take: perPage
            }),
            prisma.orders.count({ where }),
            prisma.services.findMany({ orderBy: { id: 'asc' } })
        ]);

        res.inertia('Admin/Transactions/Index', {
            orders: {
                data: allOrders.map(o => ({
                    ...serializeOrder(o),
                    user: o.users_orders_user_idTousers,
                    package: { ...o.packages, price: Number(o.packages?.price || 0), service: o.packages?.services },
                    joki: o.users_orders_joki_idTousers
                })),
                links: buildPaginatorLinks(total, perPage, page),
                total
            },
            services: allServices,
            filters: { start_date: start_date || '', end_date: end_date || '', service_id: service_id || '' }
        });
    } catch (error) {
        console.error('[ADMIN TRANSACTIONS ERROR]', error.message);
        return flashRedirect(res, '/admin', 'Gagal memuat transaksi', true);
    }
};

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const chat = async (req, res) => {
    try {
        const usersWithChats = await prisma.users.findMany({
            where: { role: 'customer', chats: { some: {} } },
            include: {
                chats: {
                    orderBy: { created_at: 'desc' },
                    take: 1
                },
                _count: {
                    select: { chats: { where: { is_admin_reply: false } } }
                }
            }
        });

        const conversations = usersWithChats.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            last_message: u.chats[0] ? {
                message: u.chats[0].message,
                created_at: u.chats[0].created_at instanceof Date ? u.chats[0].created_at.toISOString() : u.chats[0].created_at
            } : null,
            unread_count: u._count.chats || 0
        }));

        res.inertia('Admin/Chat/Index', { conversations });
    } catch (error) {
        console.error('[ADMIN CHAT ERROR]', error.message);
        return flashRedirect(res, '/admin', 'Gagal memuat chat', true);
    }
};

export const getChatMessages = async (req, res) => {
    const { userId } = req.params;
    try {
        const messages = await prisma.chats.findMany({
            where: { user_id: parseInt(userId) },
            orderBy: { created_at: 'asc' }
        });
        res.json(messages.map(m => ({
            ...m,
            created_at: m.created_at instanceof Date ? m.created_at.toISOString() : m.created_at
        })));
    } catch (error) {
        res.status(500).json({ error: 'Failed to load messages' });
    }
};

export const sendChatReply = async (req, res) => {
    const { userId } = req.params;
    const { message } = req.body;
    try {
        const msg = await prisma.chats.create({
            data: { user_id: parseInt(userId), message, is_admin_reply: true, created_at: new Date(), updated_at: new Date() }
        });
        res.json(msg);
    } catch (error) {
        res.status(500).json({ error: 'Failed to send message' });
    }
};

export const sendChatMessage = async (req, res) => {
    const { user_id, message } = req.body;
    try {
        await prisma.chats.create({
            data: { user_id: parseInt(user_id), message, is_admin_reply: true, created_at: new Date(), updated_at: new Date() }
        });
        return flashRedirect(res, '/admin/chat', 'Pesan terkirim');
    } catch (error) {
        return flashRedirect(res, '/admin/chat', 'Gagal mengirim pesan', true);
    }
};

// ─── Earnings ────────────────────────────────────────────────────────────────
export const earnings = async (req, res) => {
    try {
        const completedOrders = await prisma.orders.findMany({
            where: { status: 'completed' },
            include: { packages: { include: { services: true } } },
            orderBy: { completed_at: 'desc' }
        });

        const totalEarnings = completedOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
        const totalJokiFees = completedOrders.reduce((sum, o) => sum + Number(o.joki_fee || 0), 0);
        const platformRevenue = totalEarnings - totalJokiFees;

        const withdrawalRecords = await prisma.admin_withdrawals.findMany({ orderBy: { created_at: 'desc' } });
        const totalWithdrawn = withdrawalRecords.reduce((sum, w) => sum + Number(w.amount || 0), 0);

        // Bank details from settings
        const bankSettings = await prisma.settings.findMany({
            where: { key: { in: ['bank_name', 'account_number', 'account_holder'] } }
        });
        const bank_details = bankSettings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});

        // Build history array
        const history = [
            ...completedOrders.map(o => ({
                id: `order-${o.id}`,
                date: o.completed_at ? new Date(o.completed_at).toLocaleDateString('id-ID') : '-',
                order_number: o.order_number,
                type: 'income',
                source: o.packages?.services?.name ? `${o.packages.services.name} — Platform fee` : 'Order',
                amount: Number(o.platform_fee || 5000)
            })),
            ...withdrawalRecords.map(w => ({
                id: `withdraw-${w.id}`,
                date: w.created_at ? new Date(w.created_at).toLocaleDateString('id-ID') : '-',
                order_number: w.reference || `WD-${w.id}`,
                type: 'withdrawal',
                source: w.notes || 'Withdrawal',
                amount: Number(w.amount || 0)
            }))
        ].sort((a, b) => (a.date > b.date ? -1 : 1));

        res.inertia('Admin/Earnings', {
            totalEarnings: platformRevenue,
            totalWithdrawn,
            availableBalance: platformRevenue - totalWithdrawn,
            history,
            bank_details
        });
    } catch (error) {
        console.error('[ADMIN EARNINGS ERROR]', error.message);
        return flashRedirect(res, '/admin', 'Gagal memuat earnings', true);
    }
};
