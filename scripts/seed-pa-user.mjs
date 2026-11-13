import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'PA@sika.com';
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log('User PA sudah ada:', existing.email, 'role:', existing.role);
    return;
  }

  const hashedPassword = await bcrypt.hash('pawmo2027', 10);

  const user = await prisma.user.create({
    data: {
      name: 'Performing Authority',
      email,
      password: hashedPassword,
      role: 'PA',
    },
  });

  console.log('User PA berhasil dibuat:', user.email, 'role:', user.role);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
