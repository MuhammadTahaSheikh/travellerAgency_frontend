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
  createdAt: string;
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
  customer?: Customer;
  booking?: Booking;
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
