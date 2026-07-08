'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import api from '@/lib/api';
import { Booking, ApiResponse, VendorPostingSummary } from '@/types';
import { formatCurrency, LoadingSpinner, Badge } from '@/components/ui/Common';
import { formatVendorDisplay } from '@/lib/vendorDisplay';
import { searchVendors } from '@/lib/searchableOptions';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/Input';

type BookingPostingModalProps = {
  booking: Booking | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function BookingPostingModal({ booking, open, onClose, onSuccess }: BookingPostingModalProps) {
  const [detail, setDetail] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [vendorDraft, setVendorDraft] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !booking?.id) {
      setDetail(null);
      setVendorDraft({});
      return;
    }
    setLoading(true);
    api.get<ApiResponse<Booking>>(`/bookings/${booking.id}`)
      .then((res) => {
        const b = res.data || null;
        setDetail(b);
        const draft: Record<string, string> = {};
        b?.vendorPostings?.forEach((p) => {
          draft[p.id] = p.vendor?.id || '';
        });
        setVendorDraft(draft);
      })
      .catch((err) => alert((err as Error).message))
      .finally(() => setLoading(false));
  }, [open, booking?.id]);

  if (!open || !booking) return null;

  const postings = detail?.vendorPostings || [];

  const customerName = detail?.guestName
    || detail?.customer?.companyName
    || `${detail?.customer?.firstName || ''} ${detail?.customer?.lastName || ''}`.trim()
    || '—';

  const statusLabel = (posting: VendorPostingSummary) => {
    if (posting.status === 'POSTED') return 'Posted';
    if (posting.status === 'UNASSIGNED' || !posting.vendor?.id) return 'Needs vendor';
    return 'Ready to post';
  };

  const handleAssignVendor = async (posting: VendorPostingSummary) => {
    const vendorId = vendorDraft[posting.id];
    if (!vendorId) {
      alert('Please select a vendor.');
      return;
    }
    if (posting.status === 'POSTED') {
      alert('This posting is already posted.');
      return;
    }
    setSavingId(posting.id);
    try {
      await api.put(`/vendor-postings/${posting.id}`, { vendorId });
      const refreshed = await api.get<ApiResponse<Booking>>(`/bookings/${booking.id}`);
      setDetail(refreshed.data || null);
      onSuccess?.();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Posting Status</h2>
            <p className="text-sm text-slate-500">{booking.bookingNumber} — assign vendor per service</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <LoadingSpinner label="Loading posting details..." />
          ) : (
            <>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Service details read-only — vendor select karein</p>
                <p className="mt-1 text-amber-800">
                  Yahan vendor assign karein. Post ya approval ke liye{' '}
                  <Link href="/vendor-postings" className="font-semibold text-teal-700 underline">Vendor Postings</Link> page use karein.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div><span className="text-slate-500">Customer:</span> <span className="font-medium">{customerName}</span></div>
                <div><span className="text-slate-500">Amount:</span> <span className="font-medium">{formatCurrency(detail?.totalAmount || booking.totalAmount)}</span></div>
                <div><span className="text-slate-500">Status:</span> <Badge status={detail?.status || booking.status}>{detail?.status || booking.status}</Badge></div>
              </div>

              {postings.length === 0 ? (
                <p className="text-sm text-slate-500">No service costs recorded yet for this booking.</p>
              ) : (
                <div className="space-y-3">
                  {postings.map((posting) => (
                    <div key={posting.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                      <div>
                        <p className="font-medium text-slate-900">{posting.description}</p>
                        <p className="text-sm text-slate-500">
                          {posting.serviceType} · {formatCurrency(posting.expectedCost)}
                        </p>
                        <span className={`inline-flex mt-2 px-2 py-0.5 rounded text-xs font-semibold ${
                          posting.status === 'POSTED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : posting.status === 'UNASSIGNED' || !posting.vendor?.id
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-amber-50 text-amber-700'
                        }`}>
                          {statusLabel(posting)}
                        </span>
                      </div>

                      {posting.status !== 'POSTED' && (
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                          <SearchableSelect
                            label="Assign Vendor"
                            value={vendorDraft[posting.id] || ''}
                            onChange={(v) => setVendorDraft((prev) => ({ ...prev, [posting.id]: v }))}
                            onSearch={searchVendors}
                            selectedLabel={formatVendorDisplay(posting.vendor)}
                            options={[{ value: '', label: 'Select vendor' }]}
                          />
                          <Button
                            type="button"
                            loading={savingId === posting.id}
                            onClick={() => handleAssignVendor(posting)}
                          >
                            Save Vendor
                          </Button>
                        </div>
                      )}

                      {posting.status === 'POSTED' && posting.vendor && (
                        <p className="text-sm text-slate-600">Vendor: {formatVendorDisplay(posting.vendor)}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
