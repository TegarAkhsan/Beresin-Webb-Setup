import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const packages = await prisma.packages.findMany({
    include: { package_addons: true }
});

console.log(JSON.stringify(packages.map(x => ({
    id: x.id,
    name: x.name,
    is_negotiable: x.is_negotiable,
    is_neg_type: typeof x.is_negotiable,
    price: Number(x.price),
    addons_count: x.package_addons?.length || 0
})), null, 2));

await prisma.$disconnect();
