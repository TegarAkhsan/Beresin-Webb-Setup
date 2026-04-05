import { prisma } from '../app.js';
import { uploadToStorage } from '../lib/storage.js';

const calculateJokiCommission = (order) => {
    const baseShare = Number(order.base_price || 0) * 0.65;
    const rushShare = Number(order.rush_fee || 0) * 0.80;
    return baseShare + rushShare;
};

const flashRedirect = (res, url, message, isError = false) => {
    res.cookie(isError ? 'flash_error' : 'flash_success', message);
    return res.redirect(url);
};

// Serialize Prisma DateTime fields to ISO strings
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

const mapOrder = (o) => ({
    ...serializeOrder(o),
    package: o.packages ? {
        ...o.packages,
        price: Number(o.packages.price || 0),
        service: o.packages.services || null,
    } : null,
    user: o.users_orders_user_idTousers || null,
    milestones: (o.order_milestones || []).map(m => ({
        ...m,
        created_at: m.created_at instanceof Date ? m.created_at.toISOString() : m.created_at,
        completed_at: m.completed_at instanceof Date ? m.completed_at.toISOString() : null,
    })),
    joki_commission: calculateJokiCommission(o),
    review: (o.reviews || [])[0] || null,
});

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
            },
            orderBy: { created_at: 'desc' }
        });

        // Available tasks = orders assigned to this joki but not yet started
        const upcomingTasks = allJobs.filter(o => !o.started_at && ['in_progress', 'pending_assignment'].includes(o.status));
        // Active tasks = orders that have been started
        const activeTasks = allJobs.filter(o => o.started_at && ['in_progress', 'revision', 'finalization'].includes(o.status));
        // Review tasks = submitted, waiting for customer/admin approval
        const reviewTasks = allJobs.filter(o => o.status === 'review');
        const completedTasks = allJobs.filter(o => o.status === 'completed');

        const totalEarnings = completedTasks.reduce((sum, o) => sum + calculateJokiCommission(o), 0);
        const heldEarnings = activeTasks.reduce((sum, o) => sum + calculateJokiCommission(o), 0);
        const availableOrders = completedTasks.filter(o => !o.payout_request_id);
        const availableBalance = availableOrders.reduce((sum, o) => sum + calculateJokiCommission(o), 0);

        const payoutHistory = await prisma.payout_requests.findMany({
            where: { user_id: user.id },
            orderBy: { created_at: 'desc' }
        });

        // Get full user details for bank info
        const fullUser = await prisma.users.findUnique({ where: { id: user.id } });

        res.inertia('Dashboards/JokiDashboard', {
            upcomingTasks: upcomingTasks.map(mapOrder),
            activeTasks: activeTasks.map(mapOrder),
            reviewTasks: reviewTasks.map(mapOrder),
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
                payout_history: payoutHistory.map(p => ({
                    ...p,
                    amount: Number(p.amount || 0),
                    created_at: p.created_at instanceof Date ? p.created_at.toISOString() : p.created_at,
                })),
                bank_details: {
                    bank_name: fullUser?.bank_name || null,
                    account_number: fullUser?.account_number || null,
                    account_holder: fullUser?.account_holder || null
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
            data: { started_at: new Date(), status: 'in_progress', updated_at: new Date() }
        });
        return flashRedirect(res, '/joki/dashboard', 'Tugas berhasil dimulai');
    } catch (error) {
        console.error('[START TASK ERROR]', error.message);
        return flashRedirect(res, '/joki/dashboard', 'Gagal memulai tugas', true);
    }
};

export const uploadMilestone = async (req, res) => {
    const { id } = req.params;
    const { milestone_id, external_link, note, version_label } = req.body;

    try {
        const milestone = await prisma.order_milestones.findUnique({ where: { id: parseInt(milestone_id) } });
        if (!milestone) return flashRedirect(res, '/joki/dashboard', 'Milestone tidak ditemukan', true);

        let milestoneFileUrl = null;
        if (req.file) {
            const ext = req.file.originalname.split('.').pop();
            const fileName = `milestones/order-${id}-milestone-${milestone_id}-${Date.now()}.${ext}`;
            milestoneFileUrl = await uploadToStorage(req.file.buffer, 'beresin-uploads', fileName, req.file.mimetype);
        }

        const finalLink = external_link || milestoneFileUrl || null;

        await prisma.order_milestones.update({
            where: { id: milestone.id },
            data: {
                status: 'submitted',
                submitted_link: finalLink,
                joki_notes: note,
                completed_at: new Date(),
                updated_at: new Date()
            }
        });

        // Simpan versi upload milestone ke `order_files` agar customer bisa lihat riwayat
        if (finalLink) {
            await prisma.order_files.create({
                data: {
                    order_id: parseInt(id),
                    file_path: finalLink,
                    version_label: version_label ? `${milestone.name} - ${version_label}` : `${milestone.name} - v1`,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            });

            // Kirim notifikasi via order_chats ke customer
            await prisma.order_chats.create({
                data: {
                    order_id: parseInt(id),
                    user_id: req.user.id,
                    message: `📢 Update Milestone [${milestone.name}]: Hasil pengerjaan baru telah diunggah!\nVersi: ${version_label || 'v1'}\nCatatan: ${note || '-'}\n\nSilakan cek detail milestone pada order Anda.`,
                    is_resolved: false,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            });
        }

        // If last milestone → move order to review
        const nextMilestone = await prisma.order_milestones.findFirst({
            where: { order_id: parseInt(id), sort_order: { gt: milestone.sort_order } }
        });
        if (!nextMilestone) {
            await prisma.orders.update({
                where: { id: parseInt(id) },
                data: { status: 'review', updated_at: new Date() }
            });
        }

        return flashRedirect(res, '/joki/dashboard', 'Milestone berhasil dikirim dan customer telah dinotifikasi!');
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
            data: { status: 'completed', completed_at: new Date(), updated_at: new Date() }
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
        const fullUser = await prisma.users.findUnique({ where: { id: req.user.id } });

        const payout = await prisma.payout_requests.create({
            data: {
                user_id: req.user.id,
                amount: totalAmount,
                status: 'pending',
                bank_details_snapshot: JSON.stringify({
                    bank_name: fullUser?.bank_name || '',
                    account_number: fullUser?.account_number || '',
                    account_holder: fullUser?.account_holder || ''
                }),
                created_at: new Date(),
                updated_at: new Date()
            }
        });

        await prisma.orders.updateMany({
            where: { id: { in: order_ids.map(id => parseInt(id)) } },
            data: { payout_request_id: payout.id, updated_at: new Date() }
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

// ─── Upload Result File (joki.orders.upload) ──────────────────────────────────

export const uploadResult = async (req, res) => {
    const { id } = req.params;
    const { external_link, note, version_label } = req.body;

    try {
        const order = await prisma.orders.findFirst({
            where: { id: parseInt(id) }
        });
        if (!order) return flashRedirect(res, '/joki/dashboard', 'Order tidak ditemukan', true);

        let resultFileUrl = null;
        if (req.file) {
            const ext = req.file.originalname.split('.').pop();
            const fileName = `results/order-${id}-${Date.now()}.${ext}`;
            resultFileUrl = await uploadToStorage(req.file.buffer, 'beresin-uploads', fileName, req.file.mimetype);
        }

        // Simpan versi upload ke `order_files` agar customer bisa lihat riwayat revisi
        if (resultFileUrl || external_link) {
            await prisma.order_files.create({
                data: {
                    order_id: parseInt(id),
                    file_path: resultFileUrl || external_link,
                    version_label: version_label || 'v1',
                    created_at: new Date(),
                    updated_at: new Date()
                }
            });

            // Kirim notifikasi via order_chats ke customer
            await prisma.order_chats.create({
                data: {
                    order_id: parseInt(id),
                    user_id: req.user.id,
                    message: `📢 Update Project: Hasil pengerjaan baru telah diunggah!\nVersi: ${version_label || 'v1'}\nCatatan: ${note || '-'}\n\nSilakan cek detail order Anda untuk mengunduh dan meninjau hasilnya.`,
                    is_resolved: false,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            });
        }

        await prisma.orders.update({
            where: { id: parseInt(id) },
            data: {
                result_file: resultFileUrl || order.result_file,
                result_link: external_link || order.result_link,
                joki_notes: note || order.joki_notes,
                status: 'review',
                updated_at: new Date()
            }
        });

        return flashRedirect(res, '/joki/dashboard', 'Hasil pekerjaan berhasil dikirim, dan customer telah dinotifikasi!');
    } catch (error) {
        console.error('[UPLOAD RESULT ERROR]', error.message);
        return flashRedirect(res, '/joki/dashboard', 'Gagal mengirim hasil pekerjaan', true);
    }
};

// ─── Update External Link (joki.orders.link) ─────────────────────────────────

export const updateLink = async (req, res) => {
    const { id } = req.params;
    const { link } = req.body;

    try {
        await prisma.orders.update({
            where: { id: parseInt(id) },
            data: { result_link: link, updated_at: new Date() }
        });

        return flashRedirect(res, '/joki/dashboard', 'Link berhasil diupdate');
    } catch (error) {
        console.error('[UPDATE LINK ERROR]', error.message);
        return flashRedirect(res, '/joki/dashboard', 'Gagal update link', true);
    }
};

