import { prisma } from '../app.js';

const generateInvoiceNumber = () => {
    return 'INV-' + Math.random().toString(36).substring(2, 12).toUpperCase();
};

export const index = async (req, res) => {
    try {
        const completedOrders = await prisma.orders.findMany({
            where: { status: 'completed' }
        });

        const totalOrders = await prisma.orders.count();
        const activeOrders = await prisma.orders.count({
            where: { status: { in: ['pending_payment', 'pending_assignment', 'in_progress', 'review'] } }
        });

        const revenueGross = completedOrders.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0);
        // Assuming operational commission is (amount - joki_fee)
        const revenueOps = completedOrders.reduce((sum, o) => sum + (parseFloat(o.amount || 0) - parseFloat(o.joki_fee || 0)), 0);

        const totalJokis = await prisma.users.count({
            where: { role: 'joki' }
        });

        const payoutRequests = await prisma.payout_requests.findMany({
            include: {
                users: true,
                orders: {
                    include: { packages: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        // Joki Workload
        const jokis = await prisma.users.findMany({
            where: { role: 'joki' },
            include: {
                _count: {
                    select: {
                        orders_orders_joki_idTousers: {
                            where: { status: { in: ['in_progress', 'review'] } }
                        }
                    }
                }
            },
            take: 5
        });

        const jokiWorkload = jokis.map(j => ({
            ...j,
            active_jobs_count: j._count.orders_orders_joki_idTousers
        })).sort((a, b) => b.active_jobs_count - a.active_jobs_count);

        res.inertia('Admin/Dashboard', {
            stats: {
                total_orders: totalOrders,
                active_orders: activeOrders,
                revenue_gross: revenueGross,
                revenue_ops: revenueOps,
                total_jokis: totalJokis
            },
            joki_workload: jokiWorkload,
            payoutRequests: payoutRequests.map(p => ({
                ...p,
                user: p.users,
                orders: p.orders.map(o => ({ ...o, package: o.packages }))
            }))
        });

    } catch (error) {
        console.error('Admin Index Error', error);
        res.status(500).send('Internal Server Error');
    }
};

export const verify = async (req, res) => {
    try {
        const orders = await prisma.orders.findMany({
            where: {
                status: { in: ['pending_payment', 'waiting_approval'] }
            },
            include: {
                users_orders_user_idTousers: true,
                packages: {
                    include: { services: true, package_addons: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        const additionalPaymentOrders = await prisma.orders.findMany({
            where: { additional_payment_status: 'pending' },
            include: {
                users_orders_user_idTousers: true,
                packages: { include: { services: true } }
            },
            orderBy: { created_at: 'desc' }
        });

        res.inertia('Admin/Orders/Verify', {
            orders: orders.map(o => ({
                ...o,
                user: o.users_orders_user_idTousers,
                package: { ...o.packages, service: o.packages.services, addons: o.packages.package_addons }
            })),
            additionalPaymentOrders: additionalPaymentOrders.map(o => ({
                ...o,
                user: o.users_orders_user_idTousers,
                package: { ...o.packages, service: o.packages.services }
            }))
        });
    } catch (error) {
        console.error('Admin Verify Error', error);
        res.status(500).send('Internal Server Error');
    }
};

export const approvePayment = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.orders.update({
            where: { id: parseInt(id) },
            data: {
                status: 'pending_assignment',
                payment_status: 'paid',
                invoice_number: generateInvoiceNumber()
            }
        });
        res.redirect('/admin/orders/verify?message=Payment approved successfully.');
    } catch (error) {
        console.error('Approve Payment Error', error);
        res.status(500).send('Failed to approve payment');
    }
};

export const assign = async (req, res) => {
    try {
        const pendingOrders = await prisma.orders.findMany({
            where: { status: 'pending_assignment' },
            include: {
                users_orders_user_idTousers: true,
                packages: { include: { services: true } }
            }
        });

        const assignedOrders = await prisma.orders.findMany({
            where: { status: { in: ['in_progress', 'review'] } },
            include: {
                users_orders_user_idTousers: true,
                packages: { include: { services: true } },
                users_orders_joki_idTousers: true
            }
        });

        const jokis = await prisma.users.findMany({
            where: { role: 'joki' },
            include: {
                _count: {
                    select: {
                        orders_orders_joki_idTousers: {
                            where: { status: { in: ['in_progress', 'review'] } }
                        }
                    }
                }
            }
        });

        res.inertia('Admin/Orders/Assign', {
            orders: pendingOrders.map(o => ({
                ...o,
                user: o.users_orders_user_idTousers,
                package: { ...o.packages, service: o.packages.services }
            })),
            assignedOrders: assignedOrders.map(o => ({
                ...o,
                user: o.users_orders_user_idTousers,
                package: { ...o.packages, service: o.packages.services },
                joki: o.users_orders_joki_idTousers
            })),
            jokis: jokis.map(j => ({
                ...j,
                jobs_count: j._count.orders_orders_joki_idTousers
            }))
        });
    } catch (error) {
        console.error('Admin Assign Error', error);
        res.status(500).send('Internal Server Error');
    }
};

export const storeAssignment = async (req, res) => {
    const { id } = req.params;
    const { joki_id, assignment_type } = req.body;

    try {
        const order = await prisma.orders.findUnique({
            where: { id: parseInt(id) },
            include: { packages: true }
        });

        let targetJokiId = joki_id;

        if (assignment_type === 'auto') {
            const leastBusyJoki = await prisma.users.findFirst({
                where: { role: 'joki' },
                include: {
                    _count: {
                        select: {
                            orders_orders_joki_idTousers: {
                                where: { status: { in: ['in_progress', 'review'] } }
                            }
                        }
                    }
                },
                orderBy: {
                    orders_orders_joki_idTousers: { _count: 'asc' }
                }
            });

            if (!leastBusyJoki) return res.status(400).send('No joki available');
            targetJokiId = leastBusyJoki.id;
        }

        // Calculate Fee (65% base + 80% rush)
        const baseShare = parseFloat(order.base_price) * 0.65;
        const rushShare = parseFloat(order.rush_fee) * 0.80;
        const jokiFee = baseShare + rushShare;

        await prisma.orders.update({
            where: { id: order.id },
            data: {
                joki_id: parseInt(targetJokiId),
                joki_fee: jokiFee,
                status: 'in_progress'
            }
        });

        // Generate Milestones from Template
        const templates = await prisma.milestone_templates.findMany({
            where: { service_id: order.packages.service_id },
            orderBy: { sort_order: 'asc' }
        });

        if (templates.length > 0) {
            await prisma.order_milestones.createMany({
                data: templates.map(t => ({
                    order_id: order.id,
                    name: t.name,
                    description: t.description || t.requirements,
                    weight: t.weight,
                    sort_order: t.sort_order,
                    status: t.sort_order === 1 ? 'in_progress' : 'pending'
                }))
            });
        }

        res.redirect('/admin/orders/assign?message=Task assigned successfully.');

    } catch (error) {
        console.error('Store Assignment Error', error);
        res.status(500).send('Failed to assign task');
    }
};

export const processPayout = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.payout_requests.update({
            where: { id: parseInt(id) },
            data: {
                status: 'paid',
                admin_note: 'Paid via Admin Dashboard'
            }
        });
        res.redirect('/admin?message=Payout processed successfully.');
    } catch (error) {
        console.error('Process Payout Error', error);
        res.status(500).send('Failed to process payout');
    }
};
