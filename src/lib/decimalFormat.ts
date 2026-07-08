/** Formats numeric input/display values with fixed decimal places (e.g. 75.000). */
export function formatDecimalValue(value: string | number | undefined | null, decimals = 3): string {
  if (value === '' || value == null) return '';
  const n = parseFloat(String(value));
  if (Number.isNaN(n)) return String(value);
  return n.toFixed(decimals);
}

export function parseDecimalInput(value: string): string {
  const cleaned = value.replace(/[^\d.-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return cleaned;
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? cleaned : String(n);
}

export const DECIMAL_INPUT_PROPS = {
  step: '0.001' as const,
};

/** Display stored money — empty string when unset/zero for editing UX. */
export function moneyFieldValue(value: string | number | undefined | null, showZero = false): string {
  if (value === undefined || value === null || value === '') return '';
  const n = parseFloat(String(value));
  if (Number.isNaN(n)) return String(value);
  if (!showZero && n === 0) return '';
  return String(value);
}
