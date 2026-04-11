export interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  status?: string;
}

export interface StockItem {
  id: string;
  name: string;
  unit: string;
  rate: number;
  openingQty: number;
  inQty: number;
  outQty: number;
  category?: string;
}

export interface Ledger {
  id: string;
  name: string;
  type: 'Customer' | 'Supplier';
  balance: number;
  email?: string;
  phone?: string;
  city?: string;
  gst?: string;
}

export interface VoucherItem {
  itemId: string;
  qty: number;
  rate: number;
  total: number;
}

export interface Voucher {
  id: string;
  vNo: string;
  type: 'Sales' | 'Purchase' | 'Receipt' | 'Payment' | 'Sales Order' | 'Purchase Order' | 'Credit Note' | 'Debit Note';
  date: string;
  partyId: string;
  partyName: string;
  amount: number;
  status: string;
  items: VoucherItem[];
}

export interface AppSettings {
  darkMode: boolean;
  currency: string;
  dateFormat: string;
  syncTime: string;
  company: {
    name: string;
    gstin: string;
    address: string;
  };
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface BizData {
  vouchers: Voucher[];
  ledgers: Ledger[];
  stock: StockItem[];
  users: User[];
  settings: AppSettings;
  auth: AuthCredentials;
}
