export type Role = 'Admin' | 'Manager' | 'Cashier';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  costPrice: number;
  sellingPrice: number;
  category: string;
  stockLevel: number;
  minStockAlert: number;
  section: string;
  company?: string;
  bulkCost: number;
  bulkPrice: number;
  bulkSize: number;
  bulkBarcode?: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'Cash' | 'FIB' | 'Debt';

export interface CartItem extends Product {
  quantity: number;
  isGift?: boolean;
}

export interface Sale {
  id: string;
  cashierId: string;
  items: {
    productId: string;
    name: string;
    quantity: number;
    price: number; // selling price at time of sale
    cost: number;  // cost price at time of sale
  }[];
  totalAmount: number;
  totalProfit: number;
  paymentMethod: PaymentMethod;
  paymentAmount: number; // How much paid upfront
  discount: number; // Discount amount applied
  debtCustomerId?: string; // If Debt payment
  debtCustomer?: { name: string }; // For reports
  createdAt: string;
  status: 'Completed' | 'Returned' | 'Void';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  totalPurchases: number;
  totalPaid: number;
  remainingDebt: number;
  createdAt: string;
}

export interface DebtPayment {
  id: string;
  customerId: string;
  amount: number;
  date: string;
  notes: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  totalPurchases: number;
  totalPaid: number;
  remainingDebt: number;
  createdAt: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string;
  notes: string;
  createdAt: string;
}

export interface Settings {
  shopName: string;
  phone: string;
  address: string;
  receiptFooter: string;
  usdRate: number;
  telegramBotToken?: string;
  telegramChatId?: string;
}
