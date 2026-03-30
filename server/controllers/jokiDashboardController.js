import { prisma } from '../app.js';

// Helper to calculate joki commission (65% base + 80% rush)
const calculateJokiCommission = (order) => {
    const baseShare = parseFloat(order.base_price || 0) * 0.65;
    const rushShare = parseFloat(order.rush_fee || 0) * 0.80;
    return baseShare + rushShare;
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

        // Stats calculation
        const totalEarnings = completedTasks.reduce((sum, o) => sum + calculateJokiCommission(o), 0);
        const heldEarnings = activeTasks.reduce((sum, o) => sum + calculateJokiCommission(o), 0);
        
        const availableOrders = completedTasks.filter(o => !o.payout_request_id);
        const availableBalance = availableOrders.reduce((sum, o) => sum + calculateJokiCommission(o), 0);

        const payoutHistory = await prisma.payout_requests.findMany({
            where: { user_id: user.id },
            orderBy: { created_at: 'desc' }
        });

        // Mapping to match Laravel expectations
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
                avg_rating: 5.0, // Placeholder
                on_time_rate: 100, // Placeholder
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
        console.error('Joki Dashboard Error', error);
        res.status(500).send('Internal Server Error');
    }
};

export const startTask = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.orders.update({
            where: { id: parseInt(id) },
            data: {
                started_at: new Date(),
                status: 'in_progress'
            }
        });
        res.redirect('/joki/dashboard?message=Task started successfully.');
    } catch (error) {
        console.error('Start Task Error', error);
        res.status(500).send('Failed to start task');
    }
};

export const uploadMilestone = async (req, res) => {
    const { id } = req.params; // Order ID
    const { milestone_id, external_link, note } = req.body;

    try {
        const milestone = await prisma.order_milestones.findUnique({
            where: { id: parseInt(milestone_id) }
        });

        await prisma.order_milestones.update({
            where: { id: milestone.id },
            data: {
                status: 'submitted',
                submitted_link: external_link,
                joki_notes: note,
                completed_at: new Date() // For now auto-complete or mark as submitted
            }
        });

        // Check if last milestone
        const nextMilestone = await prisma.order_milestones.findFirst({
            where: {
                order_id: parseInt(id),
                sort_order: { gt: milestone.sort_order }
            }
        });

        if (!nextMilestone) {
            await prisma.orders.update({
                where: { id: parseInt(id) },
                data: { status: 'review' }
            });
        }

        res.redirect('/joki/dashboard?message=Milestone submitted successfully.');
    } catch (error) {
        console.error('Upload Milestone Error', error);
        res.status(500).send('Failed to upload milestone');
    }
};

export const finalizeOrder = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.orders.update({
            where: { id: parseInt(id) },
            data: {
                status: 'completed',
                completed_at: new Date()
            }
        });
        res.redirect('/joki/dashboard?message=Order finalized successfully.');
    } catch (error) {
        console.error('Finalize Order Error', error);
        res.status(500).send('Failed to finalize order');
    }
};

export const requestPayout = async (req, res) => {
    const { order_ids } = req.body;
    try {
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
                })
            }
        });

        await prisma.orders.updateMany({
            where: { id: { in: order_ids.map(id => parseInt(id)) } },
            data: { payout_request_id: payout.id }
        });

        res.redirect('/joki/dashboard?message=Payout request submitted.');
    } catch (error) {
        console.error('Request Payout Error', error);
        res.status(500).send('Failed to request payout');
    }
};
