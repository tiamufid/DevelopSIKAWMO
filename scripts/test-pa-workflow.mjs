import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function runTests() {
  console.log('--- 1. Testing User Existence and Password ---');
  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: 'pa@sika.com',
        mode: 'insensitive'
      }
    }
  });

  if (!user) {
    throw new Error('User PA not found!');
  }
  console.log('✓ Found user:', user.email, 'Role:', user.role);

  const isPwValid = await bcrypt.compare('pawmo2027', user.password);
  console.log('✓ Password comparison result:', isPwValid);
  if (!isPwValid) {
    throw new Error('Password mismatch!');
  }

  console.log('\n--- 2. Testing Permit Creation by PA ---');
  // Create permit planning as PA
  const createdPermit = await prisma.permitPlanning.create({
    data: {
      permitNumber: null, // PA can submit without permit number
      workDescription: 'Test Maintenance Work by PA',
      workLocation: 'PRC',
      zone: 'PRC',
      areaName: 'ORF',
      workType: 'COLD_WORK',
      riskLevel: 'LOW',
      startDate: new Date('2026-12-01T08:00:00Z'),
      endDate: new Date('2026-12-01T17:00:00Z'),
      performingAuthority: user.name,
      company: 'PT Pertamina',
      areaAuthority: 'Area Authority 1',
      siteControllerName: 'Site Controller 1',
      status: 'DRAFT',
      userId: user.id
    }
  });

  console.log('✓ Permit created successfully! ID:', createdPermit.id, 'Status:', createdPermit.status, 'PermitNumber:', createdPermit.permitNumber);

  console.log('\n--- 3. Testing Submit to PTWC ---');
  const updatedPermit = await prisma.permitPlanning.update({
    where: { id: createdPermit.id },
    data: { status: 'PENDING_PTWC' }
  });
  console.log('✓ Permit status updated to:', updatedPermit.status);

  console.log('\n--- 4. Testing PA Dashboard Query ---');
  const paPermits = await prisma.permitPlanning.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`✓ Fetched ${paPermits.length} permits for PA.`);

  console.log('\n--- 5. Cleanup Test Permit ---');
  await prisma.permitPlanning.delete({
    where: { id: createdPermit.id }
  });
  console.log('✓ Cleaned up test permit ID:', createdPermit.id);

  console.log('\n=======================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY!');
  console.log('=======================================');
}

runTests()
  .catch((e) => {
    console.error('Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
