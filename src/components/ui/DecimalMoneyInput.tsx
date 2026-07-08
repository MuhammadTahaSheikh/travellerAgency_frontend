'use client';

import { Input } from '@/components/ui/Input';
import { formatDecimalValue } from '@/lib/decimalFormat';

type DecimalMoneyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange'
> & {
  label?: string;
  hint?: string;
  error?: string;
  value: string | number | undefined | null;
  onValueChange: (value: string) => void;
  decimals?: number;
};

/** Money input: allows clearing, formats to fixed decimals on blur when non-empty. */
export function DecimalMoneyInput({
  value,
  onValueChange,
  decimals = 3,
  onBlur,
  placeholder = '0.000',
  ...props
}: DecimalMoneyInputProps) {
  const display = value === undefined || value === null || value === '' ? '' : String(value);

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={display}
      onChange={(e) => onValueChange(e.target.value)}
      onBlur={(e) => {
        const raw = e.target.value.trim();
        onValueChange(raw === '' ? '' : formatDecimalValue(raw, decimals));
        onBlur?.(e);
      }}
    />
  );
}
