import { prisma } from '../app.js';

export const index = async (req, res) => {
    try {
        const user = req.user;

        // Redirect based on roles
        if (user.role === 'admin') {
            return res.redirect('/admin');
        }
        if (user.role === 'joki') {
            return res.redirect('/joki/dashboard');
        }

        // Customer dashboard
        const rawOrders = await prisma.orders.findMany({
            where: { user_id: user.id },
            include: {
                packages: {
                    include: { services: true }
                },
                users_orders_joki_idTousers: true,
                reviews: true,
                order_milestones: true
            },
            orderBy: { created_at: 'desc' }
        });

        // Adapt Prisma naming to match what the frontend expects
        const orders = rawOrders.map(o => ({
            ...o,
            package: {
                ...o.packages,
                service: o.packages?.services
            },
            joki: o.users_orders_joki_idTousers,
            review: o.reviews?.length > 0 ? o.reviews[0] : null,
            milestones: o.order_milestones
        }));

        const activeStatuses = ['pending_assignment', 'in_progress', 'review', 'revision'];

        const stats = {
            total_orders: orders.filter(o => o.status !== 'pending_payment').length,
            active_orders: orders.filter(o => activeStatuses.includes(o.status)).length,
            completed_orders: orders.filter(o => o.status === 'completed').length,
            pending_payment_orders: orders.filter(o => o.status === 'pending_payment').length,
        };

        return res.inertia('Dashboards/CustomerDashboard', {
            orders,
            stats
        });

    } catch (error) {
        console.error('[DASHBOARD ERROR]', error.message);
        res.cookie('flash_error', 'Gagal memuat dashboard: ' + error.message);
        return res.redirect('/');
    }
};
