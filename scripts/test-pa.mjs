import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function test() {
  const users = await prisma.user.findMany();
  console.log('All users:');
  for (const u of users) {
    console.log(`- ID: ${u.id}, Email: ${u.email}, Role: ${u.role}, Name: ${u.name}`);
    if (u.email.toLowerCase().includes('pa@sika.com')) {
      const match = await bcrypt.compare('pawmo2027', u.password);
      console.log(`  Password 'pawmo2027' matches: ${match}`);
    }
  }
}

test().finally(() => prisma.$disconnect());
