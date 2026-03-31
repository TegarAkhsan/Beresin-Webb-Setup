import { prisma } from '../app.js';

const calculateJokiCommission = (order) => {
    const baseShare = parseFloat(order.base_price || 0) * 0.65;
    const rushShare = parseFloat(order.rush_fee || 0) * 0.80;
    return baseShare + rushShare;
};

const flashRedirect = (res, url, message, isError = false) => {
    res.cookie(isError ? 'flash_error' : 'flash_success', message);
    return res.redirect(url);
};

export const index = async (req, res) => {
    try {
        const user = req.user;

        const allJobs = await prisma.orders.findMany({
            where: { joki_id: user.id },
            include: {
                packages: { include: { services: true } },
                users_orders_user_idTousers: true,
                order_milestones: { orderBy: { sort_order: 'asc' } },
                reviews: true
            }
        });

        const upcomingTasks = allJobs.filter(o => !o.started_at && ['in_progress', 'pending_assignment'].includes(o.status));
        const activeTasks = allJobs.filter(o => o.started_at && ['in_progress', 'review', 'revision', 'finalization'].includes(o.status));
        const completedTasks = allJobs.filter(o => o.status === 'completed');

        const totalEarnings = completedTasks.reduce((sum, o) => sum + calculateJokiCommission(o), 0);
        const heldEarnings = activeTasks.reduce((sum, o) => sum + calculateJokiCommission(o), 0);
        const availableOrders = completedTasks.filter(o => !o.payout_request_id);
        const availableBalance = availableOrders.reduce((sum, o) => sum + calculateJokiCommission(o), 0);

        const payoutHistory = await prisma.payout_requests.findMany({
            where: { user_id: user.id },
            orderBy: { created_at: 'desc' }
        });

        const mapOrder = (o) => ({
            ...o,
            package: { ...o.packages, service: o.packages.services },
            user: o.users_orders_user_idTousers,
            milestones: o.order_milestones,
            joki_commission: calculateJokiCommission(o),
            review: o.reviews?.[0] || null
        });

        res.inertia('Dashboards/JokiDashboard', {
            upcomingTasks: upcomingTasks.map(mapOrder),
            activeTasks: activeTasks.map(mapOrder),
            completedTasks: completedTasks.map(mapOrder),
            stats: {
                total_earnings: totalEarnings,
                held_earnings: heldEarnings,
                avg_rating: 5.0,
                on_time_rate: 100,
                total_completed: completedTasks.length
            },
            financials: {
                available_balance: availableBalance,
                pending_balance: heldEarnings,
                available_orders: availableOrders.map(mapOrder),
                payout_history: payoutHistory,
                bank_details: {
                    bank_name: user.bank_name,
                    account_number: user.account_number,
                    account_holder: user.account_holder
                }
            }
        });

    } catch (error) {
        console.error('[JOKI DASHBOARD ERROR]', error.message);
        return flashRedirect(res, '/', 'Gagal memuat dashboard joki: ' + error.message, true);
    }
};

export const startTask = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.orders.update({
            where: { id: parseInt(id) },
            data: { started_at: new Date(), status: 'in_progress' }
        });
        return flashRedirect(res, '/joki/dashboard', 'Tugas berhasil dimulai');
    } catch (error) {
        console.error('[START TASK ERROR]', error.message);
        return flashRedirect(res, '/joki/dashboard', 'Gagal memulai tugas', true);
    }
};

export const uploadMilestone = async (req, res) => {
    const { id } = req.params;
    const { milestone_id, external_link, note } = req.body;

    try {
        const milestone = await prisma.order_milestones.findUnique({
            where: { id: parseInt(milestone_id) }
        });

        if (!milestone) return flashRedirect(res, '/joki/dashboard', 'Milestone tidak ditemukan', true);

        await prisma.order_milestones.update({
            where: { id: milestone.id },
            data: { status: 'submitted', submitted_link: external_link, joki_notes: note, completed_at: new Date() }
        });

        // Check if last milestone -> move order to review
        const nextMilestone = await prisma.order_milestones.findFirst({
            where: { order_id: parseInt(id), sort_order: { gt: milestone.sort_order } }
        });

        if (!nextMilestone) {
            await prisma.orders.update({
                where: { id: parseInt(id) },
                data: { status: 'review' }
            });
        }

        return flashRedirect(res, '/joki/dashboard', 'Milestone berhasil dikirim');
    } catch (error) {
        console.error('[UPLOAD MILESTONE ERROR]', error.message);
        return flashRedirect(res, '/joki/dashboard', 'Gagal mengirim milestone', true);
    }
};

export const finalizeOrder = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.orders.update({
            where: { id: parseInt(id) },
            data: { status: 'completed', completed_at: new Date() }
        });
        return flashRedirect(res, '/joki/dashboard', 'Order berhasil diselesaikan');
    } catch (error) {
        console.error('[FINALIZE ORDER ERROR]', error.message);
        return flashRedirect(res, '/joki/dashboard', 'Gagal menyelesaikan order', true);
    }
};

export const requestPayout = async (req, res) => {
    const { order_ids } = req.body;
    try {
        if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
            return flashRedirect(res, '/joki/dashboard', 'Pilih minimal satu order untuk payout', true);
        }

        const orders = await prisma.orders.findMany({
            where: { id: { in: order_ids.map(id => parseInt(id)) } }
        });

        const totalAmount = orders.reduce((sum, o) => sum + calculateJokiCommission(o), 0);

        const payout = await prisma.payout_requests.create({
            data: {
                user_id: req.user.id,
                amount: totalAmount,
                status: 'pending',
                bank_details_snapshot: JSON.stringify({
                    bank_name: req.user.bank_name,
                    account_number: req.user.account_number,
                    account_holder: req.user.account_holder
                }),
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        await prisma.orders.updateMany({
            where: { id: { in: order_ids.map(id => parseInt(id)) } },
            data: { payout_request_id: payout.id }
        });

        return flashRedirect(res, '/joki/dashboard', 'Permintaan payout berhasil dikirim');
    } catch (error) {
        console.error('[REQUEST PAYOUT ERROR]', error.message);
        return flashRedirect(res, '/joki/dashboard', 'Gagal mengirim permintaan payout', true);
    }
};

export const updateBankDetails = async (req, res) => {
    const { bank_name, account_number, account_holder } = req.body;
    try {
        await prisma.users.update({
            where: { id: req.user.id },
            data: { bank_name, account_number, account_holder, updated_at: new Date() }
        });
        return flashRedirect(res, '/joki/dashboard', 'Informasi bank berhasil diupdate');
    } catch (error) {
        console.error('[UPDATE BANK DETAILS ERROR]', error.message);
        return flashRedirect(res, '/joki/dashboard', 'Gagal update informasi bank', true);
    }
};

