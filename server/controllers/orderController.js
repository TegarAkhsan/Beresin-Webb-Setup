import { prisma } from '../app.js';

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
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const store = async (req, res) => {
    // TODO: Implement file upload (e.g. Cloudinary/S3 since Netlify is serverless)
    // TODO: Implement order creation logic based on Laravel's OrderController@store
    res.status(501).json({ message: 'Order Creation not fully implemented yet in Node.js migration.' });
};

export const show = async (req, res) => {
    // TODO: Implement order details retrieval
    res.status(501).json({ message: 'Not implemented' });
};

export const update = async (req, res) => {
    // TODO: Implement order updates (payment proof, status)
    res.status(501).json({ message: 'Not implemented' });
};
