export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  role: {
    id: string;
    name: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
    description?: string;
  };
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
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

export interface BookingServiceItem {
  id?: string;
  serviceType: 'PACKAGE' | 'TICKET' | 'VISA' | 'HOTEL';
  description: string;
  amount: number;
  costAmount?: number;
  vendorId?: string;
  vendor?: Vendor;
  details?: Record<string, string>;
}

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
  totalAmount: number;
  paidAmount: number;
  discount: number;
  numTravelers: number;
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
  serviceType?: string;
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
  customer?: Customer;
  booking?: Booking;
  items?: InvoiceItem[];
}

export interface Payment {
  id: string;
  paymentNumber: string;
  amount: number;
  method: string;
  paymentDate: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  invoice?: Invoice;
}

export interface Voucher {
  id: string;
  voucherNumber: string;
  hotelName: string;
  checkInDate: string;
  checkOutDate?: string;
  guestName: string;
  roomDetails?: string;
  status: 'DRAFT' | 'ISSUED' | 'SHARED';
  booking?: Booking;
}

export interface CheckInRecord {
  id: string;
  hotelName: string;
  checkInDate: string;
  guestName?: string;
  roomDetails?: string;
  reminderSent: boolean;
  booking?: Booking;
}

export interface CustomerLedger {
  customer: Customer;
  account?: Account;
  summary: {
    totalBilled: number;
    totalPaid: number;
    outstanding: number;
    ledgerBalance: number;
  };
  invoices: Invoice[];
  bookings: { id: string; bookingNumber: string; totalAmount: number; paidAmount: number; status: string }[];
}

export interface Account {
  id: string;
  name: string;
  code: string;
  type: 'CASH' | 'BANK' | 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE';
  balance: number;
  isActive: boolean;
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
  totalRevenue: number;
  totalExpenses: number;
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
