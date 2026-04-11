import { BizData, Ledger, StockItem, Voucher, VoucherItem } from '../types';

export const SEED_KEY = 'reboxy_data';

export const generateSeedData = (): BizData => {
  const customers: Ledger[] = Array.from({ length: 15 }, (_, i) => ({
    id: `cus_${i}`,
    name: `Customer ${i + 1} Enterprises`,
    type: 'Customer',
    balance: Math.floor(Math.random() * 500000) + 10000,
    email: `contact${i}@example.com`,
    phone: `91${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
    city: ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Surat'][Math.floor(Math.random() * 5)],
    gst: `27AAAAA${Math.floor(Math.random() * 9000 + 1000)}A1Z${i}`
  }));

  const suppliers: Ledger[] = Array.from({ length: 10 }, (_, i) => ({
    id: `sup_${i}`,
    name: `Supplier ${String.fromCharCode(65 + i)} Wholesale`,
    type: 'Supplier',
    balance: Math.floor(Math.random() * 300000) + 20000,
    phone: `81${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
    email: `vendor${i}@example.com`
  }));

  const stockItems: StockItem[] = Array.from({ length: 20 }, (_, i) => ({
    id: `item_${i}`,
    name: `Product ${i + 1} - Premium Grade`,
    unit: 'PCS',
    rate: Math.floor(Math.random() * 2000) + 100,
    openingQty: Math.floor(Math.random() * 100) + 20,
    inQty: Math.floor(Math.random() * 50),
    outQty: Math.floor(Math.random() * 40),
    category: ['Electronics', 'Industrial', 'Retail'][Math.floor(Math.random() * 3)]
  }));

  const vouchers: Voucher[] = [];

  // Seed 50 Sales Transactions
  for (let i = 0; i < 50; i++) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    vouchers.push({
      id: `vch_s_${i}`,
      vNo: `INV/${2400 + i}`,
      type: 'Sales',
      date: date.toISOString(),
      partyId: customers[Math.floor(Math.random() * customers.length)].id,
      partyName: customers[Math.floor(Math.random() * customers.length)].name,
      amount: Math.floor(Math.random() * 50000) + 5000,
      status: 'Fulfilled',
      items: [{ itemId: 'item_1', qty: 2, rate: 500, total: 1000 }]
    });
  }

  // Seed 20 Purchase Transactions
  for (let i = 0; i < 20; i++) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    vouchers.push({
      id: `vch_p_${i}`,
      vNo: `PUR/${1100 + i}`,
      type: 'Purchase',
      date: date.toISOString(),
      partyId: suppliers[Math.floor(Math.random() * suppliers.length)].id,
      partyName: suppliers[Math.floor(Math.random() * suppliers.length)].name,
      amount: Math.floor(Math.random() * 40000) + 10000,
      status: 'Fulfilled',
      items: [{ itemId: 'item_2', qty: 5, rate: 1200, total: 6000 }]
    });
  }

  return {
    vouchers: vouchers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    ledgers: [...customers, ...suppliers],
    stock: stockItems,
    users: [
      { id: '1', name: 'Admin User', role: 'Super Admin', email: 'admin@reboxy.com', phone: '9876543210' },
      { id: '2', name: 'Sales Rep 1', role: 'Salesperson', email: 'rep1@reboxy.com', phone: '9876543211', status: 'Checked In' }
    ],
    settings: {
      darkMode: false,
      currency: 'INR',
      dateFormat: 'DD/MM/YYYY',
      syncTime: new Date().toISOString(),
      company: {
        name: 'REBOXY TRADERS',
        gstin: '27AAAAA0000A1Z5',
        address: '123 Business Hub, Indore, MP'
      }
    },
    auth: {
      username: 'user',
      password: 'password'
    }
  } as BizData;
};
