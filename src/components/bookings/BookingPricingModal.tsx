'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '@/lib/api';
import {
  Booking,
  BookingServiceItem,
  ApiResponse,
  PriceMode,
  ServiceRow,
} from '@/types';
import { buildServiceItemsPayload, PassengerCounts } from '@/lib/bookingPricingUtils';
import { useExchangeRate } from '@/contexts/ExchangeRateContext';
import { formatCurrency, LoadingSpinner, Badge } from '@/components/ui/Common';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type BookingPricingModalProps = {
  booking: Booking | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

const toNum = (v: string | number | undefined) => parseFloat(String(v ?? 0)) || 0;
const ROW_BASED_TYPES: BookingServiceItem['serviceType'][] = ['HOTEL', 'TRANSPORT'];

export function BookingPricingModal({ booking, open, onClose, onSuccess }: BookingPricingModalProps) {
  const { rate } = useExchangeRate();
  const pkrPerSar = rate?.pkrPerSar || rate?.manualDefault || 1;
  const [detail, setDetail] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [priceAdult, setPriceAdult] = useState('0');
  const [priceChild, setPriceChild] = useState('0');
  const [priceInfant, setPriceInfant] = useState('0');
  const [serviceItems, setServiceItems] = useState<BookingServiceItem[]>([]);

  useEffect(() => {
    if (!open || !booking?.id) {
      setDetail(null);
      return;
    }
    setLoading(true);
    api.get<ApiResponse<Booking>>(`/bookings/${booking.id}`)
      .then((res) => {
        const b = res.data;
        if (!b) return;
        setDetail(b);
        setPriceAdult(String(b.priceAdult ?? 0));
        setPriceChild(String(b.priceChild ?? 0));
        setPriceInfant(String(b.priceInfant ?? 0));
        setServiceItems(
          b.serviceItems?.map((s) => {
            const rawDetails = (s.details as Record<string, unknown>) || {};
            const { rows: persistedRows, costOriginal, saleOriginal, ...restDetails } = rawDetails as Record<string, unknown> & {
              rows?: ServiceRow[]; costOriginal?: string; saleOriginal?: string;
            };
            const nativeCost = costOriginal != null ? Number(costOriginal) : Number(s.costAmount || 0);
            const nativeSale = saleOriginal != null ? Number(saleOriginal) : Number(s.amount || 0);
            return {
              ...s,
              costAmount: nativeCost,
              amount: nativeSale,
              details: (restDetails as Record<string, string>) || {},
              rows: (persistedRows as ServiceRow[]) || [],
            };
          }) || []
        );
      })
      .catch((err) => alert((err as Error).message))
      .finally(() => setLoading(false));
  }, [open, booking?.id]);

  if (!open || !booking) return null;

  const priceMode: PriceMode = detail?.priceMode || booking.priceMode || 'DETERMINED';
  const counts: PassengerCounts = {
    adults: detail?.adults ?? booking.adults ?? 1,
    children: detail?.children ?? booking.children ?? 0,
    infants: detail?.infants ?? booking.infants ?? 0,
  };

  const updateServiceItem = (idx: number, updates: Partial<BookingServiceItem>) => {
    setServiceItems((items) => items.map((item, i) => (i === idx ? { ...item, ...updates } : item)));
  };

  const updateServiceDetails = (idx: number, key: string, value: string) => {
    const item = serviceItems[idx];
    updateServiceItem(idx, { details: { ...item.details, [key]: value } });
  };

  const updateServiceRow = (idx: number, rowIdx: number, key: string, value: string) => {
    const item = serviceItems[idx];
    const rows = (item.rows || []).map((row, i) => (i === rowIdx ? { ...row, [key]: value } : row));
    updateServiceItem(idx, { rows });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const builtItems = buildServiceItemsPayload(serviceItems, counts, priceMode, pkrPerSar);
      const payload = priceMode === 'DETERMINED'
        ? {
            priceAdult: toNum(priceAdult),
            priceChild: toNum(priceChild),
            priceInfant: toNum(priceInfant),
            serviceItems: builtItems,
          }
        : { serviceItems: builtItems };

      await api.patch(`/bookings/${booking.id}/pricing`, payload);
      alert('Pricing updated successfully');
      onSuccess?.();
      onClose();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const customerName = detail?.guestName
    || detail?.customer?.companyName
    || `${detail?.customer?.firstName || ''} ${detail?.customer?.lastName || ''}`.trim()
    || '—';

  const renderServiceCosts = (costOnly: boolean) => (
    <div className="space-y-4">
      {serviceItems.length === 0 ? (
        <p className="text-sm text-slate-500">No service items on this booking.</p>
      ) : (
        serviceItems.map((item, idx) => (
          <div key={item.id || idx} className="rounded-xl border border-slate-200 p-4 bg-slate-50">
            <p className="text-sm font-semibold text-teal-700 mb-3">{item.serviceType} — {item.description}</p>

            {item.serviceType === 'VISA' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="Cost" type="number" value={String(item.costAmount || 0)} onChange={(e) => updateServiceItem(idx, { costAmount: toNum(e.target.value) })} />
                {!costOnly && (
                  <Input label="Sale" type="number" value={String(item.amount || 0)} onChange={(e) => updateServiceItem(idx, { amount: toNum(e.target.value) })} />
                )}
              </div>
            )}

            {item.serviceType === 'TICKET' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <Input label="Cost / Adult" type="number" value={item.details?.costAdult || '0'} onChange={(e) => updateServiceDetails(idx, 'costAdult', e.target.value)} hint={`${counts.adults} adult(s)`} />
                {!costOnly && <Input label="Sale / Adult" type="number" value={item.details?.saleAdult || '0'} onChange={(e) => updateServiceDetails(idx, 'saleAdult', e.target.value)} />}
                {counts.children > 0 && (
                  <>
                    <Input label="Cost / Child" type="number" value={item.details?.costChild || '0'} onChange={(e) => updateServiceDetails(idx, 'costChild', e.target.value)} hint={`${counts.children} child(ren)`} />
                    {!costOnly && <Input label="Sale / Child" type="number" value={item.details?.saleChild || '0'} onChange={(e) => updateServiceDetails(idx, 'saleChild', e.target.value)} />}
                  </>
                )}
                {counts.infants > 0 && (
                  <>
                    <Input label="Cost / Infant" type="number" value={item.details?.costInfant || '0'} onChange={(e) => updateServiceDetails(idx, 'costInfant', e.target.value)} hint={`${counts.infants} infant(s)`} />
                    {!costOnly && <Input label="Sale / Infant" type="number" value={item.details?.saleInfant || '0'} onChange={(e) => updateServiceDetails(idx, 'saleInfant', e.target.value)} />}
                  </>
                )}
              </div>
            )}

            {ROW_BASED_TYPES.includes(item.serviceType) && (item.rows || []).map((row, rowIdx) => (
              <div key={rowIdx} className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold text-slate-500 mb-2">Row #{rowIdx + 1}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {item.serviceType === 'HOTEL' ? (
                    <>
                      <Input label="Cost / Night" type="number" value={row.costPerNight || '0'} onChange={(e) => updateServiceRow(idx, rowIdx, 'costPerNight', e.target.value)} />
                      {!costOnly && <Input label="Sale / Night" type="number" value={row.salePerNight || '0'} onChange={(e) => updateServiceRow(idx, rowIdx, 'salePerNight', e.target.value)} />}
                    </>
                  ) : (
                    <>
                      <Input label="Cost" type="number" value={row.cost || '0'} onChange={(e) => updateServiceRow(idx, rowIdx, 'cost', e.target.value)} />
                      {!costOnly && <Input label="Sale" type="number" value={row.sale || '0'} onChange={(e) => updateServiceRow(idx, rowIdx, 'sale', e.target.value)} />}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Edit Pricing</h2>
            <p className="text-sm text-slate-500">{booking.bookingNumber} — COST/SALE only, rest read-only</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {loading ? (
            <LoadingSpinner label="Loading pricing..." />
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div><span className="text-slate-500">Customer:</span> <span className="font-medium">{customerName}</span></div>
                <div><span className="text-slate-500">Status:</span> <Badge status={detail?.status || booking.status}>{detail?.status || booking.status}</Badge></div>
                <div><span className="text-slate-500">Mode:</span> <span className="font-medium">{priceMode}</span></div>
              </div>

              {priceMode === 'DETERMINED' ? (
                <>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">Sale Prices (PKR)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input label="Sale / Adult" type="number" value={priceAdult} onChange={(e) => setPriceAdult(e.target.value)} hint={`${counts.adults} adult(s)`} />
                      <Input label="Sale / Child" type="number" value={priceChild} onChange={(e) => setPriceChild(e.target.value)} hint={`${counts.children} child(ren)`} />
                      <Input label="Sale / Infant" type="number" value={priceInfant} onChange={(e) => setPriceInfant(e.target.value)} hint={`${counts.infants} infant(s)`} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Total sale: {formatCurrency(counts.adults * toNum(priceAdult) + counts.children * toNum(priceChild) + counts.infants * toNum(priceInfant))}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">Service Costs</h3>
                    {renderServiceCosts(true)}
                  </div>
                </>
              ) : (
                renderServiceCosts(false)
              )}
            </>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving} disabled={loading}>Save Pricing</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
