export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  invitePending?: boolean;
  inviteExpired?: boolean;
  role: {
    id: string;
    name: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
    description?: string;
  };
}

export interface Customer {
  id: string;
  customerType?: 'B2C' | 'B2B';
  firstName: string;
  lastName: string;
  companyName?: string;
  contactPerson?: string;
  ntn?: string;
  tradePartnerId?: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
  passportNo?: string;
  nationalId?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Package {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  maxCapacity: number;
  isActive: boolean;
  destinations?: { id: string; destination: string; country?: string; nights: number }[];
}

export type ServiceRow = Record<string, string>;

export interface BookingServiceItem {
  id?: string;
  serviceType: 'PACKAGE' | 'TICKET' | 'VISA' | 'HOTEL' | 'TRANSPORT';
  description: string;
  amount: number;
  costAmount?: number;
  vendorId?: string;
  vendor?: Vendor;
  details?: Record<string, string>;
  /** Repeatable rows for multi-entry services (hotel rooms, transport sectors). */
  rows?: ServiceRow[];
}

export type BookingType = 'B2B' | 'B2C';
export type PriceMode = 'DETERMINED' | 'BREAKDOWN';

export interface Vendor {
  id: string;
  name: string;
  category: 'HOTEL' | 'VISA' | 'TICKETING' | 'OTHER';
  contactPerson?: string;
  email?: string;
  phone?: string;
  account?: Account;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  bookingType?: BookingType;
  guestName?: string;
  currency?: 'PKR' | 'SAR';
  priceMode?: PriceMode;
  totalAmount: number;
  paidAmount: number;
  discount: number;
  numTravelers: number;
  adults?: number;
  children?: number;
  infants?: number;
  priceAdult?: number;
  priceChild?: number;
  priceInfant?: number;
  travelDate?: string;
  returnDate?: string;
  notes?: string;
  customer?: Customer;
  package?: Package;
  serviceItems?: BookingServiceItem[];
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  costAmount?: number;
  serviceType?: string;
  vendorId?: string;
  details?: Record<string, string>;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED';
  issueDate: string;
  dueDate: string;
  confirmedAt?: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  shareToken?: string;
  customer?: Customer;
  booking?: Booking;
  items?: InvoiceItem[];
}

export interface Payment {
  id: string;
  paymentNumber: string;
  amount: number;
  currency?: 'PKR' | 'SAR';
  exchangeRate?: number;
  amountPkr?: number;
  amountSar?: number;
  method: string;
  paymentDate: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  invoice?: Invoice;
}

export interface Voucher {
  id: string;
  voucherNumber: string;
  voucherFormat?: 'COMPLETE' | 'HOTEL' | 'TRANSPORT';
  hotelName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  guestName: string;
  roomDetails?: string;
  paymentStatus?: string;
  remainingBalance?: number;
  status: 'DRAFT' | 'ISSUED' | 'SHARED';
  shareToken?: string;
  booking?: Booking;
  invoice?: Invoice;
  payment?: Payment;
}

export interface CheckInRecord {
  id: string;
  scheduleType?: 'HOTEL' | 'TRANSPORT' | 'TICKET' | 'VISA' | 'PACKAGE';
  hotelName?: string;
  checkInDate?: string;
  transportDate?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  guestName?: string;
  roomDetails?: string;
  vendorPosted?: boolean;
  reminderSent: boolean;
  booking?: Booking;
}

export interface CustomerLedger {
  customer: Customer;
  account?: Account;
  ledgerDetail?: { currency: string; balancePkr: number; balanceSar: number; balance: number };
  summary: {
    totalBilled: number;
    totalPaid: number;
    outstanding: number;
    ledgerBalance: number;
    ledgerBalancePkr?: number;
    ledgerBalanceSar?: number;
  };
  invoices: Invoice[];
  bookings: { id: string; bookingNumber: string; totalAmount: number; paidAmount: number; status: string }[];
  transactions?: LedgerTransactionRow[];
}

export interface LedgerTransactionRow {
  id: string;
  debit: number;
  credit: number;
  currency?: string;
  exchangeRate?: number;
  amountPkr?: number;
  amountSar?: number;
  paymentMethod?: string;
  remarks?: string;
  attachmentPath?: string;
  description?: string;
  runningBalance?: number;
  runningBalancePkr?: number;
  runningBalanceSar?: number;
  journalEntry: { entryNumber: string; date: string; description: string };
  account: { name: string; type?: string };
  bankAccount?: { name: string; type?: string } | null;
}

export interface Account {
  id: string;
  name: string;
  code: string;
  type: 'CASH' | 'BANK' | 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE';
  balance: number;
  balancePkr?: number;
  balanceSar?: number;
  isActive: boolean;
  customerId?: string | null;
  vendorId?: string | null;
  employeeId?: string | null;
  customer?: { id: string; firstName: string; lastName: string; phone?: string };
  vendor?: { id: string; name: string; category: string };
  employee?: { id: string; firstName: string; lastName: string };
}

export interface LedgerAccountGroup {
  label: string;
  accounts: Account[];
  totalBalance: number;
  totalBalancePkr?: number;
  totalBalanceSar?: number;
}

export interface TrialBalanceRow {
  accountId: string;
  accountName: string;
  accountCode: string;
  accountType: string;
  customerId?: string | null;
  vendorId?: string | null;
  employeeId?: string | null;
  debit: number;
  credit: number;
  balance: number;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalCustomers: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  totalPackages: number;
  totalInvoices: number;
  overdueInvoices: number;
  pendingApprovals?: number;
  totalRevenue: number;
  totalSale?: number;
  totalExpenses: number;
  paidExpenses?: number;
  actualExpenses?: number;
  pendingExpenses?: number;
  estimatedProfit?: number;
  netProfit: number;
  unreadNotifications: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary?: {
    count?: number;
    totalAmount?: number;
    total?: number;
  };
}
