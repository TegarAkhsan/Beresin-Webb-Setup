import { prisma } from '../app.js';

const generateInvoiceNumber = () => 'INV-' + Math.random().toString(36).substring(2, 12).toUpperCase();

// ─── Helper: flash redirect ────────────────────────────────────────────────────
const flashRedirect = (res, url, message, isError = false) => {
    const cookieName = isError ? 'flash_error' : 'flash_success';
    res.cookie(cookieName, message);
    return res.redirect(url);
};

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

        const revenueGross = completedOrders.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0);
        const revenueOps = completedOrders.reduce((sum, o) => sum + (parseFloat(o.amount || 0) - parseFloat(o.joki_fee || 0)), 0);
        const jokiWorkload = jokisRaw.map(j => ({ ...j, active_jobs_count: j._count.orders_orders_joki_idTousers }))
            .sort((a, b) => b.active_jobs_count - a.active_jobs_count);

        res.inertia('Admin/Dashboard', {
            stats: { total_orders: totalOrders, active_orders: activeOrders, revenue_gross: revenueGross, revenue_ops: revenueOps, total_jokis: totalJokis },
            joki_workload: jokiWorkload,
            payoutRequests: payoutRequestsRaw.map(p => ({
                ...p, user: p.users,
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
                where: { additional_payment_status: 'pending' },
                include: { users_orders_user_idTousers: true, packages: { include: { services: true } } },
                orderBy: { created_at: 'desc' }
            })
        ]);

        res.inertia('Admin/Orders/Verify', {
            orders: orders.map(o => ({ ...o, user: o.users_orders_user_idTousers, package: { ...o.packages, service: o.packages.services, addons: o.packages.package_addons } })),
            additionalPaymentOrders: additionalPaymentOrders.map(o => ({ ...o, user: o.users_orders_user_idTousers, package: { ...o.packages, service: o.packages.services } }))
        });
    } catch (error) {
        console.error('[ADMIN VERIFY ERROR]', error.message);
        return flashRedirect(res, '/admin', 'Gagal memuat halaman verifikasi', true);
    }
};

export const approvePayment = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.orders.update({
            where: { id: parseInt(id) },
            data: { status: 'pending_assignment', payment_status: 'paid', invoice_number: generateInvoiceNumber() }
        });
        return flashRedirect(res, '/admin/orders/verify', 'Pembayaran berhasil disetujui');
    } catch (error) {
        console.error('[APPROVE PAYMENT ERROR]', error.message);
        return flashRedirect(res, '/admin/orders/verify', 'Gagal menyetujui pembayaran', true);
    }
};

// ─── Assign Orders ────────────────────────────────────────────────────────────
export const assign = async (req, res) => {
    try {
        const [pendingOrders, assignedOrders, jokisRaw] = await Promise.all([
            prisma.orders.findMany({
                where: { status: 'pending_assignment' },
                include: { users_orders_user_idTousers: true, packages: { include: { services: true } } }
            }),
            prisma.orders.findMany({
                where: { status: { in: ['in_progress', 'review'] } },
                include: { users_orders_user_idTousers: true, packages: { include: { services: true } }, users_orders_joki_idTousers: true }
            }),
            prisma.users.findMany({
                where: { role: 'joki' },
                include: { _count: { select: { orders_orders_joki_idTousers: { where: { status: { in: ['in_progress', 'review'] } } } } } }
            })
        ]);

        res.inertia('Admin/Orders/Assign', {
            orders: pendingOrders.map(o => ({ ...o, user: o.users_orders_user_idTousers, package: { ...o.packages, service: o.packages.services } })),
            assignedOrders: assignedOrders.map(o => ({ ...o, user: o.users_orders_user_idTousers, package: { ...o.packages, service: o.packages.services }, joki: o.users_orders_joki_idTousers })),
            jokis: jokisRaw.map(j => ({ ...j, jobs_count: j._count.orders_orders_joki_idTousers }))
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

        const jokiFee = (parseFloat(order.base_price) * 0.65) + (parseFloat(order.rush_fee) * 0.80);

        await prisma.orders.update({
            where: { id: order.id },
            data: { joki_id: parseInt(targetJokiId), joki_fee: jokiFee, status: 'in_progress' }
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
                    status: t.sort_order === 1 ? 'in_progress' : 'pending'
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
            data: { status: 'paid', admin_note: 'Paid via Admin Dashboard' }
        });
        return flashRedirect(res, '/admin', 'Payout berhasil diproses');
    } catch (error) {
        console.error('[PROCESS PAYOUT ERROR]', error.message);
        return flashRedirect(res, '/admin', 'Gagal memproses payout', true);
    }
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = async (req, res) => {
    try {
        const allUsers = await prisma.users.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                _count: { select: { orders_orders_user_idTousers: true } }
            }
        });

        res.inertia('Admin/Users/Index', {
            users: allUsers.map(u => ({ ...u, orders_count: u._count.orders_orders_user_idTousers }))
        });
    } catch (error) {
        console.error('[ADMIN USERS ERROR]', error.message);
        return flashRedirect(res, '/admin', 'Gagal memuat daftar user', true);
    }
};

export const blacklistUser = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    try {
        const user = await prisma.users.findUnique({ where: { id: parseInt(id) } });
        await prisma.users.update({
            where: { id: parseInt(id) },
            data: { is_blacklisted: !user.is_blacklisted, blacklist_reason: reason || null }
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
        console.error('[EDIT SERVICE ERROR]', error.message);
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
        console.error('[UPDATE SERVICE ERROR]', error.message);
        return flashRedirect(res, '/admin/services', 'Gagal update service', true);
    }
};

export const deleteService = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.services.delete({ where: { id: parseInt(id) } });
        return flashRedirect(res, '/admin/services', 'Service berhasil dihapus');
    } catch (error) {
        console.error('[DELETE SERVICE ERROR]', error.message);
        return flashRedirect(res, '/admin/services', 'Gagal menghapus service', true);
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
    const { settings: settingsData } = req.body; // { key: value, ... }
    try {
        const entries = Object.entries(settingsData || req.body);
        for (const [key, value] of entries) {
            await prisma.settings.upsert({
                where: { key },
                update: { value: String(value) },
                create: { key, value: String(value) }
            });
        }
        return flashRedirect(res, '/admin/settings', 'Settings berhasil diupdate');
    } catch (error) {
        console.error('[UPDATE SETTINGS ERROR]', error.message);
        return flashRedirect(res, '/admin/settings', 'Gagal update settings', true);
    }
};

// ─── Transactions ─────────────────────────────────────────────────────────────
export const transactions = async (req, res) => {
    try {
        const allOrders = await prisma.orders.findMany({
            include: {
                users_orders_user_idTousers: true,
                packages: { include: { services: true } },
                users_orders_joki_idTousers: true
            },
            orderBy: { created_at: 'desc' }
        });

        res.inertia('Admin/Transactions/Index', {
            orders: allOrders.map(o => ({
                ...o,
                user: o.users_orders_user_idTousers,
                package: { ...o.packages, service: o.packages.services },
                joki: o.users_orders_joki_idTousers
            }))
        });
    } catch (error) {
        console.error('[ADMIN TRANSACTIONS ERROR]', error.message);
        return flashRedirect(res, '/admin', 'Gagal memuat transaksi', true);
    }
};

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const chat = async (req, res) => {
    try {
        // Get all users who have sent messages
        const chats = await prisma.chats.findMany({
            include: { users: { select: { id: true, name: true, email: true, role: true } } },
            orderBy: { created_at: 'desc' },
            take: 200
        });

        // Group by user
        const chatsByUser = {};
        chats.forEach(msg => {
            const uid = msg.user_id;
            if (!chatsByUser[uid]) {
                chatsByUser[uid] = { user: msg.users, messages: [] };
            }
            chatsByUser[uid].messages.push(msg);
        });

        res.inertia('Admin/Chat/Index', {
            chatsByUser: Object.values(chatsByUser)
        });
    } catch (error) {
        console.error('[ADMIN CHAT ERROR]', error.message);
        return flashRedirect(res, '/admin', 'Gagal memuat chat', true);
    }
};

export const sendChatMessage = async (req, res) => {
    const { user_id, message } = req.body;
    try {
        await prisma.chats.create({
            data: {
                user_id: parseInt(user_id),
                message,
                is_admin_reply: true,
                created_at: new Date(),
                updated_at: new Date()
            }
        });
        return flashRedirect(res, '/admin/chat', 'Pesan terkirim');
    } catch (error) {
        console.error('[SEND CHAT ERROR]', error.message);
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

        const totalRevenue = completedOrders.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0);
        const totalJokiFees = completedOrders.reduce((sum, o) => sum + parseFloat(o.joki_fee || 0), 0);
        const platformRevenue = totalRevenue - totalJokiFees;

        const withdrawals = await prisma.admin_withdrawals.findMany({
            orderBy: { created_at: 'desc' }
        });

        const totalWithdrawn = withdrawals.reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);

        res.inertia('Admin/Earnings', {
            stats: {
                total_revenue: totalRevenue,
                total_joki_fees: totalJokiFees,
                platform_revenue: platformRevenue,
                total_withdrawn: totalWithdrawn,
                available_balance: platformRevenue - totalWithdrawn
            },
            orders: completedOrders.map(o => ({ ...o, package: { ...o.packages, service: o.packages.services } })),
            withdrawals
        });
    } catch (error) {
        console.error('[ADMIN EARNINGS ERROR]', error.message);
        return flashRedirect(res, '/admin', 'Gagal memuat earnings', true);
    }
};
