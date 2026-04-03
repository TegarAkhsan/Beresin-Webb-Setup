import { prisma } from '../app.js';
import { uploadToStorage } from '../lib/storage.js';

const generateOrderNumber = () => 'ORD-' + Math.random().toString(36).substring(2, 12).toUpperCase();

const flashRedirect = (res, url, message, isError = false) => {
    res.cookie(isError ? 'flash_error' : 'flash_success', message);
    return res.redirect(url);
};

// Helper: serialize Prisma order to JSON-safe object
const serializeOrder = (order) => ({
    ...order,
    amount: Number(order.amount || 0),
    base_price: Number(order.base_price || 0),
    rush_fee: Number(order.rush_fee || 0),
    platform_fee: Number(order.platform_fee || 0),
    joki_fee: Number(order.joki_fee || 0),
    additional_revision_fee: Number(order.additional_revision_fee || 0),
    created_at: order.created_at instanceof Date ? order.created_at.toISOString() : (order.created_at ? new Date(order.created_at).toISOString() : new Date().toISOString()),
    updated_at: order.updated_at instanceof Date ? order.updated_at.toISOString() : null,
    deadline: order.deadline instanceof Date ? order.deadline.toISOString() : order.deadline,
    completed_at: order.completed_at instanceof Date ? order.completed_at.toISOString() : null,
    started_at: order.started_at instanceof Date ? order.started_at.toISOString() : null,
});

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

        const formattedPackages = packages.map(pkg => ({
            ...pkg,
            price: Number(pkg.price),
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
        package_id, payment_method, name, gender, email,
        phone, address, university, referral_source, description,
        deadline, notes, external_link, proposed_price, selected_features
    } = req.body;

    try {
        const pkg = await prisma.packages.findUnique({ where: { id: parseInt(package_id) } });
        if (!pkg) {
            res.cookie('flash_error', 'Package not found.');
            return res.redirect('/orders/create' + (package_id ? `?package_id=${package_id}` : ''));
        }

        // Update User Profile (only non-null fields to avoid overwriting existing data)
        const profileUpdate = { updated_at: new Date() };
        if (name) profileUpdate.name = name;
        if (phone) profileUpdate.phone = phone;
        if (address) profileUpdate.address = address;
        if (university) profileUpdate.university = university;
        if (referral_source) profileUpdate.referral_source = referral_source;
        if (gender) profileUpdate.gender = gender;

        await prisma.users.update({
            where: { id: req.user.id },
            data: profileUpdate
        });

        let amount = 0;
        let rush_fee = 0;
        let status = 'pending_payment';
        const is_negotiation = pkg.is_negotiable;

        if (is_negotiation) {
            amount = parseFloat(proposed_price) || 0;
            status = 'waiting_approval';
        } else {
            amount = parseFloat(pkg.price);
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
            amount += 5000; // Platform fee
        }

        // Handle optional file uploads (from upload.fields middleware)
        let referenceFileUrl = null;
        let previousProjectFileUrl = null;
        let studentCardUrl = null;

        try {
            if (req.files) {
                if (req.files['reference_file']?.[0]) {
                    const f = req.files['reference_file'][0];
                    const ext = f.originalname.split('.').pop();
                    const fileName = `orders/reference-${req.user.id}-${Date.now()}.${ext}`;
                    referenceFileUrl = await uploadToStorage(f.buffer, 'beresin-uploads', fileName, f.mimetype);
                }
                if (req.files['previous_project_file']?.[0]) {
                    const f = req.files['previous_project_file'][0];
                    const ext = f.originalname.split('.').pop();
                    const fileName = `orders/previous-${req.user.id}-${Date.now()}.${ext}`;
                    previousProjectFileUrl = await uploadToStorage(f.buffer, 'beresin-uploads', fileName, f.mimetype);
                }
                if (req.files['student_card']?.[0]) {
                    const f = req.files['student_card'][0];
                    const ext = f.originalname.split('.').pop();
                    const fileName = `orders/student-card-${req.user.id}-${Date.now()}.${ext}`;
                    studentCardUrl = await uploadToStorage(f.buffer, 'beresin-uploads', fileName, f.mimetype);
                }
            }
        } catch (uploadError) {
            console.error('[ORDER FILE UPLOAD ERROR]', uploadError.message);
            // Non-fatal: continue creating the order without the files
        }

        const now = new Date();
        const order = await prisma.orders.create({
            data: {
                order_number: generateOrderNumber(),
                user_id: req.user.id,
                package_id: pkg.id,
                amount,
                base_price: is_negotiation ? amount : parseFloat(pkg.price),
                rush_fee: is_negotiation ? 0 : rush_fee,
                platform_fee: is_negotiation ? 0 : 5000,
                description: description || 'No description provided.',
                deadline: new Date(deadline),
                notes: notes || null,
                external_link: external_link || null,
                reference_file: referenceFileUrl || null,
                previous_project_file: previousProjectFileUrl || null,
                student_card: studentCardUrl || null,
                payment_method: payment_method || 'qris',
                status,
                is_negotiation,
                proposed_price: is_negotiation ? parseFloat(proposed_price) : null,
                selected_features: is_negotiation ? JSON.stringify(selected_features || []) : null,
                negotiation_deadline: is_negotiation ? new Date(deadline) : null,
                created_at: now,
                updated_at: now,
            }
        });

        const message = is_negotiation
            ? 'Order proposal submitted! Waiting for admin approval.'
            : 'Order placed successfully! Please complete payment.';

        res.redirect(`/orders/${order.order_number}?message=${encodeURIComponent(message)}`);

    } catch (error) {
        console.error('Order Store Error', error.message, error.code);
        res.cookie('flash_error', 'Gagal membuat order: ' + error.message);
        return res.redirect('/orders/create' + (package_id ? `?package_id=${package_id}` : ''));
    }
};

export const show = async (req, res) => {
    const { id } = req.params;

    try {
        const order = await prisma.orders.findFirst({
            where: {
                OR: [
                    { order_number: id },
                    { id: isNaN(parseInt(id)) ? -1 : parseInt(id) }
                ]
            },
            include: {
                packages: { include: { services: true } },
                users_orders_joki_idTousers: true,
                users_orders_user_idTousers: true,
                order_milestones: { orderBy: { sort_order: 'asc' } }
            }
        });

        if (!order) return res.status(404).send('Order not found');

        if (order.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'joki') {
            return res.status(403).send('Forbidden');
        }

        const settingsRaw = await prisma.settings.findMany({
            where: { key: { in: ['whatsapp_number', 'qris_image'] } }
        });
        const settings = settingsRaw.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});

        const serialized = serializeOrder(order);

        res.inertia('Orders/Show', {
            order: {
                ...serialized,
                package: {
                    ...order.packages,
                    price: Number(order.packages?.price || 0),
                    service: order.packages?.services,
                },
                joki: order.users_orders_joki_idTousers,
                user: order.users_orders_user_idTousers,
                milestones: (order.order_milestones || []).map(m => ({
                    ...m,
                    created_at: m.created_at instanceof Date ? m.created_at.toISOString() : m.created_at,
                    updated_at: m.updated_at instanceof Date ? m.updated_at.toISOString() : m.updated_at,
                    completed_at: m.completed_at instanceof Date ? m.completed_at.toISOString() : null,
                })),
            },
            whatsapp_number: settings.whatsapp_number || null,
            qris_image: settings.qris_image || null,
            flash: { message: req.query.message || null }
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
        const order = await prisma.orders.findFirst({
            where: {
                OR: [
                    { order_number: id },
                    { id: isNaN(parseInt(id)) ? -1 : parseInt(id) }
                ]
            }
        });

        if (!order) return res.status(404).send('Order not found');

        // --- Handle: Upload Payment Proof ---
        if (req.file) {
            try {
                const ext = req.file.originalname.split('.').pop();
                const fileName = `payment-proofs/${order.order_number}-${Date.now()}.${ext}`;
                const publicUrl = await uploadToStorage(req.file.buffer, 'beresin-uploads', fileName, req.file.mimetype);

                await prisma.orders.update({
                    where: { id: order.id },
                    data: {
                        payment_proof: publicUrl,
                        updated_at: new Date()
                    }
                });

                return res.redirect(`/orders/${order.order_number}?message=Payment proof uploaded! Please confirm to notify admin.`);
            } catch (uploadError) {
                console.error('[UPLOAD ERROR]', uploadError.message);
                return flashRedirect(res, `/orders/${order.order_number}`, 'Gagal upload bukti pembayaran: ' + uploadError.message, true);
            }
        }

        // --- Handle: Confirm Payment ---
        if (action === 'confirm_payment') {
            await prisma.orders.update({
                where: { id: order.id },
                data: {
                    payment_status: 'pending_verification',
                    status: 'waiting_approval',
                    updated_at: new Date()
                }
            });
            return res.redirect(`/orders/${order.order_number}?message=Payment confirmed! Waiting for admin verification.`);
        }

        return res.status(400).send('Unknown action.');

    } catch (error) {
        console.error('Order Update Error', error);
        res.status(500).send('Internal Server Error');
    }
};

export const cancel = async (req, res) => {
    const { id } = req.params;
    try {
        const order = await prisma.orders.findFirst({
            where: {
                OR: [{ order_number: id }, { id: isNaN(parseInt(id)) ? -1 : parseInt(id) }]
            }
        });

        if (!order) return res.status(404).send('Order not found');
        if (order.status !== 'pending_payment') {
            return res.status(400).send('Order cannot be cancelled in current status.');
        }

        await prisma.orders.update({
            where: { id: order.id },
            data: { status: 'cancelled', updated_at: new Date() }
        });

        res.redirect(`/orders/${order.order_number}?message=Order cancelled successfully.`);
    } catch (error) {
        console.error('Order Cancel Error', error);
        res.status(500).send('Internal Server Error');
    }
};
