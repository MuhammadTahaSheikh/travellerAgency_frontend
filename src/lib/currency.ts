const CURRENCY_LOCALES: Record<string, string> = {
  PKR: 'en-PK',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  AED: 'en-AE',
  SAR: 'en-SA',
  TRY: 'tr-TR',
  INR: 'en-IN',
};

let currencyCode = 'PKR';
let locale = 'en-PK';

export function setCurrencyConfig(code: string, customLocale?: string) {
  const normalized = (code || 'PKR').toUpperCase().trim();
  currencyCode = normalized;
  locale = customLocale || CURRENCY_LOCALES[normalized] || 'en-PK';
}

export function getCurrencyCode() {
  return currencyCode;
}

export function getCurrencyLocale() {
  return locale;
}

export function formatCurrency(amount: number | string, currencyOverride?: string) {
  const value = Number(amount);
  if (Number.isNaN(value)) return '—';
  const code = currencyOverride ? currencyOverride.toUpperCase().trim() : currencyCode;
  const formatLocale = currencyOverride
    ? (CURRENCY_LOCALES[code] || locale)
    : locale;
  try {
    return new Intl.NumberFormat(formatLocale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${code} ${value.toLocaleString()}`;
  }
}

export function getPriceLabel() {
  return `Price (${currencyCode})`;
}

export const CURRENCY_OPTIONS = [
  { value: 'PKR', label: 'PKR — Pakistani Rupee' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'SAR', label: 'SAR — Saudi Riyal' },
  { value: 'TRY', label: 'TRY — Turkish Lira' },
  { value: 'INR', label: 'INR — Indian Rupee' },
];
