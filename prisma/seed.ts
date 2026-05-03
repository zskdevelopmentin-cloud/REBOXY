import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');
    
    // Hash password for seed users
    const passwordHash = await bcrypt.hash('REBOXY@2026', 10);
    
    // Create Companies
    const company1 = await prisma.company.create({
        data: {
            name: 'REBOXY TRADERS',
            gstin: '27AADCB2230M1Z2',
            address: '123 Business Avenue, Mumbai',
            financialYear: '23-24',
            tallyConnected: true,
        }
    });

    const company2 = await prisma.company.create({
        data: {
            name: 'ACME ENTERPRISES',
            gstin: '27AAECE2230M1Z2',
            address: '456 Tech Park, Pune',
            financialYear: '23-24',
            tallyConnected: false,
        }
    });

    // Create Users
    await prisma.user.createMany({
        data: [
            {
                email: 'admin@reboxy.local',
                password: passwordHash,
                name: 'Super Admin',
                role: 'SUPER_ADMIN',
            },
            {
                email: 'zsk.developmentin@gmail.com',
                password: passwordHash,
                name: 'ZSK Admin',
                role: 'ADMIN',
                companyId: company1.id
            },
            {
                email: 'staff@reboxy.local',
                password: passwordHash,
                name: 'Sales Rep 1',
                role: 'SALES_STAFF',
                companyId: company1.id
            }
        ]
    });

    // Create Ledgers (Parties)
    const ledger1 = await prisma.ledger.create({
        data: {
            companyId: company1.id,
            name: 'Global Corp',
            group: 'Sundry Debtors',
            closingBalance: 45000,
            type: 'Customer',
            contactPerson: 'Mr. John',
            phone: '9876543210'
        }
    });

    const ledger2 = await prisma.ledger.create({
        data: {
            companyId: company1.id,
            name: 'Tech Suppliers Ltd',
            group: 'Sundry Creditors',
            closingBalance: -15000,
            type: 'Supplier',
            contactPerson: 'Mr. Smith',
            phone: '9876543211'
        }
    });

    // Create Inventory Items
    const item1 = await prisma.inventoryItem.create({
        data: {
            companyId: company1.id,
            name: 'Laptop Pro X',
            category: 'Electronics',
            unit: 'Nos',
            openingStock: 50,
            currentStock: 45,
            salesPrice: 75000,
            purchasePrice: 65000,
        }
    });

    // Create Vouchers
    await prisma.voucher.create({
        data: {
            companyId: company1.id,
            vNo: 'SAL/23-24/001',
            type: 'Sales',
            date: new Date(),
            partyId: ledger1.id,
            amount: 75000,
            status: 'COMPLETED',
            items: {
                create: [
                    {
                        itemId: item1.id,
                        description: 'Laptop Pro X (Grey)',
                        quantity: 1,
                        rate: 75000,
                        amount: 75000
                    }
                ]
            }
        }
    });

    console.log('Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
