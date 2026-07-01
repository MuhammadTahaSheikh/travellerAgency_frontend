'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { ApiResponse } from '@/types';

export type ExchangeRateData = {
  pkrPerSar: number;
  sarPerPkr: number;
  source: 'live' | 'cached' | 'manual';
  provider?: string;
  fetchedAt: string;
  cached: boolean;
  manualDefault: number;
};

type ExchangeRateContextValue = {
  rate: ExchangeRateData | null;
  loading: boolean;
  error: string | null;
  refresh: (force?: boolean) => Promise<void>;
  liveRateString: string;
};

const ExchangeRateContext = createContext<ExchangeRateContextValue | null>(null);

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

function formatRateTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function ExchangeRateProvider({ children }: { children: React.ReactNode }) {
  const [rate, setRate] = useState<ExchangeRateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiResponse<ExchangeRateData>>(
        `/currency/rate${force ? '?refresh=true' : ''}`
      );
      setRate(res.data || null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => refresh(), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const liveRateString = useMemo(() => {
    if (!rate) return '';
    return String(rate.pkrPerSar);
  }, [rate]);

  const value = useMemo(
    () => ({ rate, loading, error, refresh, liveRateString }),
    [rate, loading, error, refresh, liveRateString]
  );

  return <ExchangeRateContext.Provider value={value}>{children}</ExchangeRateContext.Provider>;
}

export function useExchangeRate() {
  const ctx = useContext(ExchangeRateContext);
  if (!ctx) {
    throw new Error('useExchangeRate must be used within ExchangeRateProvider');
  }
  return ctx;
}

export function formatExchangeRateLabel(rate: ExchangeRateData | null) {
  if (!rate) return 'Loading rate…';
  const time = formatRateTime(rate.fetchedAt);
  const badge = rate.source === 'live' ? 'Live' : rate.source === 'cached' ? 'Cached' : 'Manual';
  return `1 SAR = ${rate.pkrPerSar.toFixed(2)} PKR · 1 PKR = ${rate.sarPerPkr.toFixed(4)} SAR (${badge}${time ? ` · ${time}` : ''})`;
}
