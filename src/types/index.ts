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
  rate?: number;
  openingQty?: number;
  inQty?: number;
  outQty?: number;
  currentStock?: number;
  salesPrice?: number;
  purchasePrice?: number;
  category?: string;
}

export interface Ledger {
  id: string;
  name: string;
  group?: string;
  type: 'Customer' | 'Supplier' | string;
  openingBalance?: number;
  closingBalance: number;
  email?: string;
  phone?: string;
  city?: string;
  gst?: string;
  creditLimit?: number;
  creditDays?: number;
  salesPersonId?: string;
}

export interface VoucherItem {
  id?: string;
  itemId: string;
  description?: string;
  qty?: number;
  quantity?: number;
  rate: number;
  amount?: number;
  total?: number;
}

export interface Voucher {
  id: string;
  vNo: string;
  type: string;
  date: string;
  partyId?: string;
  partyName: string;
  amount: number;
  status: string;
  items?: VoucherItem[];
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
