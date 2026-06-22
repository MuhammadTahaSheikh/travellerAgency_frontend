const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export interface PublicPackage {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  duration: number;
  maxCapacity: number;
  destinations?: { id: string; destination: string; country?: string | null; nights: number }[];
}

export interface PublicCompany {
  companyName: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  currencyLocale: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function publicFetch<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    next: { revalidate: 60 },
  });
  const data: ApiResponse<T> = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to load data');
  }
  return data.data as T;
}

export function getPublicPackages() {
  return publicFetch<PublicPackage[]>('/public/packages');
}

export function getPublicPackage(id: string) {
  return publicFetch<PublicPackage>(`/public/packages/${id}`);
}

export function getPublicCompany() {
  return publicFetch<PublicCompany>('/public/company');
}

export function formatPublicCurrency(
  amount: number | string,
  currency = 'PKR',
  locale = 'en-PK'
) {
  const value = Number(amount);
  if (Number.isNaN(value)) return '—';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

export function buildInquiryWhatsApp(phone: string, message: string) {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildInquiryEmail(email: string, subject: string, body: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
