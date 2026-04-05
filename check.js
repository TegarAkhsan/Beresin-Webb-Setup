import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const pkg = await prisma.packages.findFirst({
    where: { name: { contains: 'Pelajar' } },
    include: { package_addons: true }
  });
  console.dir(pkg, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
