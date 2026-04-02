import { prisma } from '../app.js';

const generateOrderNumber = () => 'ORD-' + Math.random().toString(36).substring(2, 12).toUpperCase();

const flashRedirect = (res, url, message, isError = false) => {
    res.cookie(isError ? 'flash_error' : 'flash_success', message);
    return res.redirect(url);
};

export const create = async (req, res) => {
    try {
        const packages = await prisma.packages.findMany({
            include: {
                services: true,
                package_addons: {
                    where: { is_active: true }
                }
            }
        });

        // Adapting Prisma output to React Frontend Expectations
        const formattedPackages = packages.map(pkg => ({
            ...pkg,
            service: pkg.services,
            addons: pkg.package_addons
        }));

        res.inertia('Orders/Create', {
            packages: formattedPackages,
            selectedPackageId: req.query.package_id || null
        });
    } catch (error) {
        console.error('Order Create Error', error);
        res.status(500).send('Internal Server Error');
    }
};

export const store = async (req, res) => {
    const {
        package_id,
        payment_method,
        name,
        gender,
        email,
        phone,
        address,
        university,
        referral_source,
        description,
        deadline,
        notes,
        external_link,
        proposed_price,
        selected_features
    } = req.body;

    try {
        const pkg = await prisma.packages.findUnique({
            where: { id: parseInt(package_id) }
        });

        if (!pkg) {
            return res.status(404).send('Package not found');
        }

        // 1. Update User Profile (Laravel Auth::user()->update)
        await prisma.users.update({
            where: { id: req.user.id },
            data: {
                name,
                phone,
                address,
                university,
                referral_source,
                gender
            }
        });

        let amount = 0;
        let rush_fee = 0;
        let status = 'pending_payment';
        const is_negotiation = pkg.is_negotiable;

        if (is_negotiation) {
            amount = parseFloat(proposed_price);
            status = 'waiting_approval';
        } else {
            // Standard Price Calculation
            amount = parseFloat(pkg.price);

            // Rush Fee Logic (Laravel style)
            const standardDuration = pkg.duration_days || 3;
            const now = new Date();
            const standardDeadline = new Date(now.getTime() + standardDuration * 24 * 60 * 60 * 1000);
            const userDeadline = new Date(deadline);

            if (userDeadline < standardDeadline) {
                const diffTime = Math.abs(standardDeadline - userDeadline);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                rush_fee = diffDays * 25000;
                amount += rush_fee;
            }

            // Platform Fee
            amount += 5000;
        }

        // 2. Create Order
        const order = await prisma.orders.create({
            data: {
                order_number: generateOrderNumber(),
                user_id: req.user.id,
                package_id: pkg.id,
                amount: amount,
                base_price: is_negotiation ? amount : pkg.price,
                rush_fee: is_negotiation ? 0 : rush_fee,
                platform_fee: is_negotiation ? 0 : 5000,
                description: description || 'No description provided.',
                deadline: new Date(deadline),
                notes: notes || null,
                external_link: external_link || null,
                payment_method: payment_method,
                status: status,
                is_negotiation: is_negotiation,
                proposed_price: is_negotiation ? parseFloat(proposed_price) : null,
                selected_features: is_negotiation ? JSON.stringify(selected_features || []) : null,
                negotiation_deadline: is_negotiation ? new Date(deadline) : null,
            }
        });

        const message = is_negotiation
            ? 'Order proposal submitted! Waiting for admin approval for negotiation.'
            : 'Order placed successfully! Please complete payment.';

        // Redirect to show
        res.redirect(`/orders/${order.order_number}?message=${encodeURIComponent(message)}`);

    } catch (error) {
        console.error('Order Store Error', error);
        res.status(500).send('Failed to create order');
    }
};

export const show = async (req, res) => {
    const { id } = req.params; // Using order_number as ID commonly in Laravel-style routes

    try {
        const order = await prisma.orders.findFirst({
            where: {
                OR: [
                    { order_number: id },
                    { id: isNaN(parseInt(id)) ? -1 : parseInt(id) }
                ]
            },
            include: {
                packages: {
                    include: { services: true }
                },
                users_orders_joki_idTousers: true,
                users_orders_user_idTousers: true,
                order_milestones: {
                    orderBy: { sort_order: 'asc' }
                }
            }
        });

        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Authorization check
        if (order.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'joki') {
            return res.status(403).send('Forbidden');
        }

        // Fetch settings (WA number, QRIS)
        const settingsRaw = await prisma.settings.findMany({
            where: {
                key: { in: ['whatsapp_number', 'qris_image'] }
            }
        });
        const settings = settingsRaw.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});

        res.inertia('Orders/Show', {
            order: {
                ...order,
                package: {
                    ...order.packages,
                    service: order.packages?.services,     // ← map 'services' → 'service' for frontend
                    price: Number(order.packages?.price),  // ensure numeric
                },
                joki: order.users_orders_joki_idTousers,
                user: order.users_orders_user_idTousers,
                milestones: order.order_milestones,
                amount: Number(order.amount),
            },
            whatsapp_number: settings.whatsapp_number || null,
            qris_image: settings.qris_image || null,
            flash: {
                message: req.query.message || null
            }
        });


    } catch (error) {
        console.error('Order Show Error', error);
        res.status(500).send('Internal Server Error');
    }
};

export const update = async (req, res) => {
    const { id } = req.params;
    const { action } = req.body;

    try {
        const order = await prisma.orders.findUnique({
             where: { id: parseInt(id) } 
        });

        if (!order) return res.status(404).send('Order not found');

        // Confirm Payment logic
        if (action === 'confirm_payment') {
            await prisma.orders.update({
                where: { id: order.id },
                data: {
                    payment_status: 'pending_verification',
                    status: 'waiting_approval',
                }
            });
            return res.redirect(`/orders/${order.order_number}?message=Payment confirmed! Waiting for admin verification.`);
        }

        res.status(400).send('Action not supported or file upload not yet configured.');

    } catch (error) {
        console.error('Order Update Error', error);
        res.status(500).send('Internal Server Error');
    }
};

export const cancel = async (req, res) => {
    const { id } = req.params;

    try {
        const order = await prisma.orders.findUnique({ where: { id: parseInt(id) } });

        if (!order) return res.status(404).send('Order not found');
        if (order.status !== 'pending_payment') {
            return res.status(400).send('Order cannot be cancelled in current status.');
        }

        await prisma.orders.update({
            where: { id: order.id },
            data: { status: 'cancelled' }
        });

        res.redirect(`/orders/${order.order_number}?message=Order cancelled successfully.`);

    } catch (error) {
        console.error('Order Cancel Error', error);
        res.status(500).send('Internal Server Error');
    }
};
