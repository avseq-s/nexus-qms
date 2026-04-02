import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // --- Users ---
  const adminHash = await bcrypt.hash('Admin@123', 12);
  const qualityHash = await bcrypt.hash('Quality@123', 12);
  const storeHash = await bcrypt.hash('Store@123', 12);
  const purchaseHash = await bcrypt.hash('Purchase@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@nexusqms.com' },
    update: {},
    create: {
      email: 'admin@nexusqms.com',
      name: 'Admin User',
      password: adminHash,
      role: Role.ADMIN,
    },
  });

  const quality = await prisma.user.upsert({
    where: { email: 'quality@nexusqms.com' },
    update: {},
    create: {
      email: 'quality@nexusqms.com',
      name: 'Quality Inspector',
      password: qualityHash,
      role: Role.QUALITY,
    },
  });

  const store = await prisma.user.upsert({
    where: { email: 'store@nexusqms.com' },
    update: {},
    create: {
      email: 'store@nexusqms.com',
      name: 'Store Manager',
      password: storeHash,
      role: Role.STORE,
    },
  });

  const purchase = await prisma.user.upsert({
    where: { email: 'purchase@nexusqms.com' },
    update: {},
    create: {
      email: 'purchase@nexusqms.com',
      name: 'Purchase Team',
      password: purchaseHash,
      role: Role.PURCHASE,
    },
  });

  console.log('Created users:', [admin.email, quality.email, store.email, purchase.email]);

  // --- Suppliers ---
  const mouser = await prisma.supplier.upsert({
    where: { code: 'SUP-001' },
    update: {},
    create: {
      name: 'Mouser Electronics',
      code: 'SUP-001',
      isApproved: true,
      performanceRating: 98.0,
    },
  });

  const digikey = await prisma.supplier.upsert({
    where: { code: 'SUP-002' },
    update: {},
    create: {
      name: 'DigiKey',
      code: 'SUP-002',
      isApproved: true,
      performanceRating: 96.0,
    },
  });

  const avnet = await prisma.supplier.upsert({
    where: { code: 'SUP-003' },
    update: {},
    create: {
      name: 'Avnet',
      code: 'SUP-003',
      isApproved: true,
      performanceRating: 88.0,
    },
  });

  await prisma.supplier.upsert({
    where: { code: 'SUP-004' },
    update: {},
    create: {
      name: 'Local Supplier A',
      code: 'SUP-004',
      isApproved: false,
      performanceRating: 74.0,
    },
  });

  console.log('Created suppliers');

  // --- Components ---
  const res10k = await prisma.component.upsert({
    where: { partNumber: 'RES-0603-10K' },
    update: {},
    create: {
      partNumber: 'RES-0603-10K',
      description: 'Resistor 10K 0603 1%',
      category: 'Resistor',
      mslLevel: 1,
    },
  });

  const cap100n = await prisma.component.upsert({
    where: { partNumber: 'CAP-0402-100N' },
    update: {},
    create: {
      partNumber: 'CAP-0402-100N',
      description: 'Capacitor 100nF 0402 50V',
      category: 'Capacitor',
      mslLevel: 1,
    },
  });

  const ic_mcu = await prisma.component.upsert({
    where: { partNumber: 'IC-STM32F103' },
    update: {},
    create: {
      partNumber: 'IC-STM32F103',
      description: 'STM32F103 ARM Cortex-M3 MCU',
      category: 'IC',
      mslLevel: 3,
      shelfLifeDays: 365,
    },
  });

  console.log('Created components');

  // --- Sample GRN ---
  const grn1 = await prisma.grn.upsert({
    where: { grnNumber: 'GRN-1092' },
    update: {},
    create: {
      grnNumber: 'GRN-1092',
      supplierId: mouser.id,
      status: 'IQC_PASSED',
    },
  });

  const grn2 = await prisma.grn.upsert({
    where: { grnNumber: 'GRN-1095' },
    update: {},
    create: {
      grnNumber: 'GRN-1095',
      supplierId: avnet.id,
      status: 'PENDING_IQC',
    },
  });

  console.log('Created GRNs');

  // --- GRN Items & Reels ---
  const existingItem1 = await prisma.grnItem.findFirst({
    where: { grnId: grn1.id, componentId: res10k.id },
  });

  if (!existingItem1) {
    const item1 = await prisma.grnItem.create({
      data: {
        grnId: grn1.id,
        componentId: res10k.id,
        declaredQty: 5000,
      },
    });

    await prisma.reel.create({
      data: {
        componentId: res10k.id,
        grnId: grn1.id,
        supplierLot: 'LOT-2026-001',
        quantity: 5000,
        location: 'SHELF-A1',
        status: 'ACCEPTED',
      },
    });

    await prisma.iqcInspection.create({
      data: {
        grnItemId: item1.id,
        inspectorId: quality.id,
        status: 'PASS',
        remarks: 'All dimensions within spec',
      },
    });
  }

  const existingItem2 = await prisma.grnItem.findFirst({
    where: { grnId: grn2.id, componentId: ic_mcu.id },
  });

  if (!existingItem2) {
    await prisma.grnItem.create({
      data: {
        grnId: grn2.id,
        componentId: ic_mcu.id,
        declaredQty: 100,
      },
    });

    await prisma.reel.create({
      data: {
        componentId: ic_mcu.id,
        grnId: grn2.id,
        supplierLot: 'LOT-2026-042',
        quantity: 100,
        status: 'QUARANTINE',
      },
    });
  }

  console.log('Created GRN items and reels');

  // --- Audit Log ---
  await prisma.auditLog.create({
    data: {
      userId: store.id,
      action: 'CREATE',
      entityType: 'GRN',
      entityId: grn2.id,
      newValue: { grnNumber: 'GRN-1095', status: 'PENDING_IQC' },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: quality.id,
      action: 'UPDATE',
      entityType: 'GRN',
      entityId: grn1.id,
      oldValue: { status: 'PENDING_IQC' },
      newValue: { status: 'IQC_PASSED' },
    },
  });

  console.log('Created audit logs');

  console.log('\nSeed complete!');
  console.log('\nDefault login credentials:');
  console.log('  Admin:    admin@nexusqms.com    / Admin@123');
  console.log('  Quality:  quality@nexusqms.com  / Quality@123');
  console.log('  Store:    store@nexusqms.com    / Store@123');
  console.log('  Purchase: purchase@nexusqms.com / Purchase@123');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
