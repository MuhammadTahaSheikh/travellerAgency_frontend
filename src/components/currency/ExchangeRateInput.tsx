'use client';

import { Input } from '@/components/ui/Input';
import { useExchangeRate } from '@/contexts/ExchangeRateContext';

type ExchangeRateInputProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  required?: boolean;
};

export function ExchangeRateInput({
  label = 'Exchange Rate (PKR per SAR)',
  value,
  onChange,
  hint,
  required,
}: ExchangeRateInputProps) {
  const { rate, liveRateString } = useExchangeRate();

  return (
    <div>
      <Input
        label={label}
        type="number"
        step="0.0001"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        hint={hint}
        required={required}
      />
      {rate && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>
            Live: <strong className="text-teal-700">1 SAR = {rate.pkrPerSar.toFixed(2)} PKR</strong>
            {' · '}
            <strong className="text-teal-700">1 PKR = {rate.sarPerPkr.toFixed(4)} SAR</strong>
          </span>
          {liveRateString && liveRateString !== value && (
            <button
              type="button"
              onClick={() => onChange(liveRateString)}
              className="text-teal-700 font-semibold hover:underline"
            >
              Use live rate
            </button>
          )}
        </div>
      )}
    </div>
  );
}
