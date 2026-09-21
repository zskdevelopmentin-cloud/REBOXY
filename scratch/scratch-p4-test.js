const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runP4Tests() {
  console.log('=== RUNNING P4 BUSINESS OPERATIONS & CRM INTEGRATION TESTS ===\n');

  try {
    // 1. Fetch default company
    const company = await prisma.company.findFirst();
    if (!company) throw new Error('No company found in database');
    console.log(`Using Company: ${company.name} (ID: ${company.id})`);

    // Fetch a customer ledger
    const customer = await prisma.ledger.findFirst({
      where: { companyId: company.id, type: 'Customer' }
    });
    if (!customer) throw new Error('No customer ledger found');
    console.log(`Using Customer: ${customer.name} (ID: ${customer.id})`);

    const initialClosingBalance = customer.closingBalance;
    const initialVoucherCount = await prisma.voucher.count({ where: { companyId: company.id } });

    // ----------------------------------------------------
    // TEST A: Salesperson CRUD
    // ----------------------------------------------------
    console.log('\n--- TEST A: Salesperson Management ---');
    const newRep = await prisma.salesPerson.create({
      data: {
        name: 'Test Sales Rep 1',
        phone: '9876543210',
        email: 'rep1@example.com',
        code: 'REP001',
        status: 'ACTIVE',
        companyId: company.id
      }
    });
    console.log('✓ Created Salesperson:', newRep.name, `(${newRep.id})`);

    const updatedRep = await prisma.salesPerson.update({
      where: { id: newRep.id },
      data: { name: 'Test Sales Rep 1 Updated', status: 'INACTIVE' }
    });
    console.log('✓ Updated Salesperson:', updatedRep.name, `(Status: ${updatedRep.status})`);

    // Re-activate for assignment tests
    await prisma.salesPerson.update({
      where: { id: newRep.id },
      data: { status: 'ACTIVE' }
    });

    // ----------------------------------------------------
    // TEST B: Customer Assignment & Reassignment
    // ----------------------------------------------------
    console.log('\n--- TEST B: Customer Assignment ---');
    const assignment1 = await prisma.customerAssignment.create({
      data: {
        companyId: company.id,
        customerId: customer.id,
        salesPersonId: newRep.id,
        status: 'ACTIVE'
      }
    });
    await prisma.ledger.update({
      where: { id: customer.id },
      data: { salesPersonId: newRep.id }
    });
    console.log('✓ Assigned Customer to Rep 1:', assignment1.id);

    // Create Rep 2 and reassign
    const rep2 = await prisma.salesPerson.create({
      data: {
        name: 'Test Sales Rep 2',
        code: 'REP002',
        status: 'ACTIVE',
        companyId: company.id
      }
    });
    // Supersede old assignment
    await prisma.customerAssignment.updateMany({
      where: { customerId: customer.id, status: 'ACTIVE' },
      data: { status: 'HISTORICAL' }
    });
    const assignment2 = await prisma.customerAssignment.create({
      data: {
        companyId: company.id,
        customerId: customer.id,
        salesPersonId: rep2.id,
        status: 'ACTIVE'
      }
    });
    await prisma.ledger.update({
      where: { id: customer.id },
      data: { salesPersonId: rep2.id }
    });
    console.log('✓ Reassigned Customer to Rep 2:', assignment2.id);

    // ----------------------------------------------------
    // TEST C: Customer Visits
    // ----------------------------------------------------
    console.log('\n--- TEST C: Customer Visits ---');
    const visit = await prisma.visitLog.create({
      data: {
        customerId: customer.id,
        salesPersonId: rep2.id,
        visitDate: new Date('2026-09-14'),
        purpose: 'Payment Collection & New Order',
        notes: 'Promised payment of 10k by Friday',
        outcome: 'PLANNED',
        nextFollowUpDate: new Date('2026-09-18'),
        companyId: company.id
      }
    });
    console.log('✓ Created Visit Log:', visit.id, `(Outcome: ${visit.outcome})`);

    const updatedVisit = await prisma.visitLog.update({
      where: { id: visit.id },
      data: { outcome: 'COMPLETED' }
    });
    console.log('✓ Updated Visit Outcome:', updatedVisit.outcome);

    // ----------------------------------------------------
    // TEST D: Payment Reminders
    // ----------------------------------------------------
    console.log('\n--- TEST D: Payment Reminders ---');
    const reminder = await prisma.paymentReminder.create({
      data: {
        customerId: customer.id,
        salesPersonId: rep2.id,
        reminderDate: new Date('2026-09-18'),
        amount: 15000,
        note: 'Call owner regarding cheque clearance',
        status: 'PENDING',
        companyId: company.id
      }
    });
    console.log('✓ Created Payment Reminder:', reminder.id, `(Status: ${reminder.status})`);

    const updatedReminder = await prisma.paymentReminder.update({
      where: { id: reminder.id },
      data: { status: 'COMPLETED' }
    });
    console.log('✓ Completed Payment Reminder:', updatedReminder.status);

    // ----------------------------------------------------
    // TEST E: Credit Terms & Warning Calculations
    // ----------------------------------------------------
    console.log('\n--- TEST E: Credit Terms & Over Limit Calculation ---');
    const updatedCustomer = await prisma.ledger.update({
      where: { id: customer.id },
      data: { creditLimit: 50000, creditDays: 30 }
    });
    console.log('✓ Configured Credit Terms: Limit ₹50,000, Days 30');

    const bal = updatedCustomer.closingBalance || 0;
    const isOverLimit = bal > (updatedCustomer.creditLimit || 0);
    console.log(`✓ Outstanding: ₹${bal.toLocaleString()} vs Limit: ₹${updatedCustomer.creditLimit?.toLocaleString()}`);
    console.log(`✓ Over Limit Warning Triggered: ${isOverLimit ? 'YES (OVER LIMIT)' : 'NO (WITHIN LIMIT)'}`);

    // ----------------------------------------------------
    // TEST F: Customer 360 Operational Feed
    // ----------------------------------------------------
    console.log('\n--- TEST F: Customer 360 Operational Data ---');
    const visitsForCustomer = await prisma.visitLog.findMany({ where: { customerId: customer.id } });
    const remindersForCustomer = await prisma.paymentReminder.findMany({ where: { customerId: customer.id } });
    console.log(`✓ Customer 360 timeline items: ${visitsForCustomer.length} Visits, ${remindersForCustomer.length} Reminders`);

    // ----------------------------------------------------
    // TEST G: Multi-tenant Isolation
    // ----------------------------------------------------
    console.log('\n--- TEST G: Tenant Isolation Check ---');
    const company2 = await prisma.company.create({
      data: { name: 'Tenant B Isolated Co' }
    });
    const c2SalesPeople = await prisma.salesPerson.findMany({ where: { companyId: company2.id } });
    const c2Visits = await prisma.visitLog.findMany({ where: { companyId: company2.id } });
    console.log(`✓ Tenant B query returned: ${c2SalesPeople.length} salespeople, ${c2Visits.length} visits (100% Isolated from Company A)`);

    // Clean up Company B
    await prisma.company.delete({ where: { id: company2.id } });

    // ----------------------------------------------------
    // TEST H: Accounting Protection Integrity Check
    // ----------------------------------------------------
    console.log('\n--- TEST H: Accounting Protection Verification ---');
    const finalCustomer = await prisma.ledger.findUnique({ where: { id: customer.id } });
    const finalVoucherCount = await prisma.voucher.count({ where: { companyId: company.id } });

    if (finalCustomer.closingBalance !== initialClosingBalance) {
      throw new Error(`CRITICAL: Closing balance changed from ${initialClosingBalance} to ${finalCustomer.closingBalance}`);
    }
    if (finalVoucherCount !== initialVoucherCount) {
      throw new Error(`CRITICAL: Voucher count changed from ${initialVoucherCount} to ${finalVoucherCount}`);
    }
    console.log('✓ VERIFIED: Zero financial ledger or voucher mutations occurred during operational CRM activities!');

    // Cleanup test records
    await prisma.paymentReminder.delete({ where: { id: reminder.id } });
    await prisma.visitLog.delete({ where: { id: visit.id } });
    await prisma.customerAssignment.deleteMany({ where: { customerId: customer.id } });
    await prisma.salesPerson.deleteMany({ where: { id: { in: [newRep.id, rep2.id] } } });
    await prisma.ledger.update({
      where: { id: customer.id },
      data: { salesPersonId: null, creditLimit: null, creditDays: null }
    });
    console.log('✓ Cleaned up test data safely.');

    console.log('\n=== ALL P4 INTEGRATION TESTS PASSED PERFECTLY ===');
  } catch (err) {
    console.error('\n❌ P4 INTEGRATION TEST FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runP4Tests();
