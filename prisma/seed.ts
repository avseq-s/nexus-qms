/**
 * Nexus QMS — Database Seed Script
 *
 * Populates the MongoDB database with realistic initial data for development
 * and demonstration purposes. Safe to run multiple times — all operations
 * use upsert so existing records are never duplicated.
 *
 * Run with:  npm run db:seed
 *
 * Default login credentials created by this script:
 *   Admin:    admin@nexusqms.com    / Admin@123
 *   Quality:  quality@nexusqms.com  / Quality@123
 *   Store:    store@nexusqms.com    / Store@123
 *   Purchase: purchase@nexusqms.com / Purchase@123
 */

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ---------------------------------------------------------------------------
  // USERS
  // One user per role so every part of the UI can be tested independently.
  // Passwords are bcrypt-hashed with cost factor 12 (production-safe).
  // ---------------------------------------------------------------------------
  const adminHash    = await bcrypt.hash('Admin@123',    12);
  const qualityHash  = await bcrypt.hash('Quality@123',  12);
  const storeHash    = await bcrypt.hash('Store@123',    12);
  const purchaseHash = await bcrypt.hash('Purchase@123', 12);

  // upsert: creates the record if it doesn't exist; does nothing if it does
  const admin = await prisma.user.upsert({
    where:  { email: 'admin@nexusqms.com' },
    update: {},
    create: {
      email:    'admin@nexusqms.com',
      name:     'Admin User',
      password: adminHash,
      role:     Role.ADMIN,
    },
  });

  const quality = await prisma.user.upsert({
    where:  { email: 'quality@nexusqms.com' },
    update: {},
    create: {
      email:    'quality@nexusqms.com',
      name:     'Quality Inspector',
      password: qualityHash,
      role:     Role.QUALITY,
    },
  });

  const store = await prisma.user.upsert({
    where:  { email: 'store@nexusqms.com' },
    update: {},
    create: {
      email:    'store@nexusqms.com',
      name:     'Store Manager',
      password: storeHash,
      role:     Role.STORE,
    },
  });

  const purchase = await prisma.user.upsert({
    where:  { email: 'purchase@nexusqms.com' },
    update: {},
    create: {
      email:    'purchase@nexusqms.com',
      name:     'Purchase Team',
      password: purchaseHash,
      role:     Role.PURCHASE,
    },
  });

  console.log('Created users:', [admin.email, quality.email, store.email, purchase.email]);

  // ---------------------------------------------------------------------------
  // SUPPLIERS
  // Mix of approved and unapproved suppliers to test the supplier approval flow.
  // ---------------------------------------------------------------------------
  const mouser = await prisma.supplier.upsert({
    where:  { code: 'SUP-001' },
    update: {},
    create: {
      name:              'Mouser Electronics',
      code:              'SUP-001',
      isApproved:        true,
      performanceRating: 98.0, // Near-perfect delivery and quality record
    },
  });

  // digikey is created but not used in GRNs below — exists for UI listing
  await prisma.supplier.upsert({
    where:  { code: 'SUP-002' },
    update: {},
    create: {
      name:              'DigiKey',
      code:              'SUP-002',
      isApproved:        true,
      performanceRating: 96.0,
    },
  });

  const avnet = await prisma.supplier.upsert({
    where:  { code: 'SUP-003' },
    update: {},
    create: {
      name:              'Avnet',
      code:              'SUP-003',
      isApproved:        true,
      performanceRating: 88.0,
    },
  });

  // Unapproved supplier — demonstrates the approval gate in the purchase workflow
  await prisma.supplier.upsert({
    where:  { code: 'SUP-004' },
    update: {},
    create: {
      name:              'Local Supplier A',
      code:              'SUP-004',
      isApproved:        false,
      performanceRating: 74.0,
    },
  });

  console.log('Created suppliers');

  // ---------------------------------------------------------------------------
  // COMPONENTS
  // Typical SMT electronic components with varying MSL levels and shelf lives.
  // ---------------------------------------------------------------------------
  const res10k = await prisma.component.upsert({
    where:  { partNumber: 'RES-0603-10K' },
    update: {},
    create: {
      partNumber:    'RES-0603-10K',
      description:   'Resistor 10K 0603 1%',
      category:      'Resistor',
      mslLevel:      1,          // MSL 1 = unlimited floor life, no bake required
    },
  });

  await prisma.component.upsert({
    where:  { partNumber: 'CAP-0402-100N' },
    update: {},
    create: {
      partNumber:    'CAP-0402-100N',
      description:   'Capacitor 100nF 0402 50V',
      category:      'Capacitor',
      mslLevel:      1,
    },
  });

  const ic_mcu = await prisma.component.upsert({
    where:  { partNumber: 'IC-STM32F103' },
    update: {},
    create: {
      partNumber:    'IC-STM32F103',
      description:   'STM32F103 ARM Cortex-M3 MCU',
      category:      'IC',
      mslLevel:      3,           // MSL 3 = 168-hour floor life after dry pack opened
      shelfLifeDays: 365,         // Must be used within 1 year of receipt
    },
  });

  console.log('Created components');

  // ---------------------------------------------------------------------------
  // GOODS RECEIPT NOTES (GRNs)
  // grn1 has passed IQC; grn2 is still pending inspection.
  // ---------------------------------------------------------------------------
  const grn1 = await prisma.grn.upsert({
    where:  { grnNumber: 'GRN-1092' },
    update: {},
    create: {
      grnNumber:  'GRN-1092',
      supplierId: mouser.id,
      status:     'IQC_PASSED', // Inspection complete — reels moved to ACCEPTED
    },
  });

  const grn2 = await prisma.grn.upsert({
    where:  { grnNumber: 'GRN-1095' },
    update: {},
    create: {
      grnNumber:  'GRN-1095',
      supplierId: avnet.id,
      status:     'PENDING_IQC', // Awaiting quality inspection
    },
  });

  console.log('Created GRNs');

  // ---------------------------------------------------------------------------
  // GRN ITEMS, REELS, AND IQC INSPECTIONS
  //
  // GRN items link a component to a GRN (one line per component type).
  // Reels are the physical spools created from a GRN item.
  // IqcInspections record the pass/fail result for each GRN item.
  //
  // We check for existing items before creating to keep the seed idempotent,
  // because GrnItem has no unique constraint to upsert on.
  // ---------------------------------------------------------------------------

  // --- GRN-1092: 10K resistors from Mouser (already passed IQC) ---
  const existingItem1 = await prisma.grnItem.findFirst({
    where: { grnId: grn1.id, componentId: res10k.id },
  });

  if (!existingItem1) {
    const item1 = await prisma.grnItem.create({
      data: {
        grnId:       grn1.id,
        componentId: res10k.id,
        declaredQty: 5000, // Quantity on the supplier delivery note
      },
    });

    // Physical reel created after IQC acceptance
    await prisma.reel.create({
      data: {
        componentId: res10k.id,
        grnId:       grn1.id,
        supplierLot: 'LOT-2026-001',
        quantity:    5000,
        location:    'SHELF-A1',
        status:      'ACCEPTED', // Cleared for use in production
      },
    });

    // IQC inspection record — all checks passed
    await prisma.iqcInspection.create({
      data: {
        grnItemId:   item1.id,
        inspectorId: quality.id,
        status:      'PASS',
        remarks:     'All dimensions within spec',
      },
    });
  }

  // --- GRN-1095: STM32 MCUs from Avnet (pending IQC — reels in QUARANTINE) ---
  const existingItem2 = await prisma.grnItem.findFirst({
    where: { grnId: grn2.id, componentId: ic_mcu.id },
  });

  if (!existingItem2) {
    await prisma.grnItem.create({
      data: {
        grnId:       grn2.id,
        componentId: ic_mcu.id,
        declaredQty: 100,
      },
    });

    // Reel stays in QUARANTINE until quality inspector completes the IQC
    await prisma.reel.create({
      data: {
        componentId: ic_mcu.id,
        grnId:       grn2.id,
        supplierLot: 'LOT-2026-042',
        quantity:    100,
        status:      'QUARANTINE',
      },
    });
  }

  console.log('Created GRN items and reels');

  // ---------------------------------------------------------------------------
  // AUDIT LOGS
  // Demonstrates the traceability trail that ISO 9001 requires.
  // ---------------------------------------------------------------------------

  // Log: store manager received GRN-1095
  await prisma.auditLog.create({
    data: {
      userId:     store.id,
      action:     'CREATE',
      entityType: 'GRN',
      entityId:   grn2.id,
      newValue:   { grnNumber: 'GRN-1095', status: 'PENDING_IQC' },
    },
  });

  // Log: quality inspector updated GRN-1092 status after passing IQC
  await prisma.auditLog.create({
    data: {
      userId:     quality.id,
      action:     'UPDATE',
      entityType: 'GRN',
      entityId:   grn1.id,
      oldValue:   { status: 'PENDING_IQC' },
      newValue:   { status: 'IQC_PASSED' },
    },
  });

  console.log('Created audit logs');

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
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
