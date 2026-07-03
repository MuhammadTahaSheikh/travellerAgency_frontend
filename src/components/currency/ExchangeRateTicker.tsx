'use client';

import { RefreshCw, TrendingUp } from 'lucide-react';
import { formatExchangeRateLabel, useExchangeRate } from '@/contexts/ExchangeRateContext';

export function ExchangeRateTicker() {
  const { rate, loading, error, refresh } = useExchangeRate();

  return (
    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-100 text-xs text-teal-800 max-w-[200px] md:max-w-[320px] lg:max-w-none">
      <TrendingUp className="w-3.5 h-3.5 shrink-0 text-teal-600" />
      <span className="truncate font-medium" title={rate ? formatExchangeRateLabel(rate) : undefined}>
        {loading && !rate ? 'Loading rate…' : error && !rate ? 'Rate unavailable' : formatExchangeRateLabel(rate)}
      </span>
      <button
        type="button"
        onClick={() => refresh(true)}
        disabled={loading}
        className="p-1 rounded-md hover:bg-teal-100 text-teal-700 disabled:opacity-50 shrink-0"
        title="Reload rate"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
