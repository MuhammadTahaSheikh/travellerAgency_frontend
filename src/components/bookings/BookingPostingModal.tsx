'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '@/lib/api';
import { Booking, ApiResponse, VendorPostingSummary } from '@/types';
import { formatCurrency, LoadingSpinner, Badge } from '@/components/ui/Common';
import { Button } from '@/components/ui/Button';
import { canDirectPost } from '@/lib/bookingStatus';
import { User } from '@/types';

type BookingPostingModalProps = {
  booking: Booking | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  user: User | null;
};

export function BookingPostingModal({ booking, open, onClose, onSuccess, user }: BookingPostingModalProps) {
  const [detail, setDetail] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !booking?.id) {
      setDetail(null);
      return;
    }
    setLoading(true);
    api.get<ApiResponse<Booking>>(`/bookings/${booking.id}`)
      .then((res) => setDetail(res.data || null))
      .catch((err) => alert((err as Error).message))
      .finally(() => setLoading(false));
  }, [open, booking?.id]);

  if (!open || !booking) return null;

  const postings = detail?.vendorPostings || [];
  const directPost = canDirectPost(user);

  const handleDirectPost = async (posting: VendorPostingSummary) => {
    if (!confirm(`Post "${posting.description}" to vendor ledger?`)) return;
    setActing(posting.id);
    try {
      await api.post(`/bookings/${booking.id}/vendor-postings/${posting.id}/confirm`, {});
      alert('Vendor posting confirmed');
      onSuccess?.();
      onClose();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setActing(null);
    }
  };

  const handleRequestPosting = async (posting: VendorPostingSummary) => {
    if (!confirm(`Send posting request for "${posting.description}" to Super Admin?`)) return;
    setActing(posting.id);
    try {
      const res = await api.post<ApiResponse<unknown> & { message?: string }>('/posting-requests', {
        bookingId: booking.id,
        vendorPostingId: posting.id,
      });
      alert(res.message || 'Posting request sent');
      onSuccess?.();
      onClose();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setActing(null);
    }
  };

  const customerName = detail?.guestName
    || detail?.customer?.companyName
    || `${detail?.customer?.firstName || ''} ${detail?.customer?.lastName || ''}`.trim()
    || '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Edit Posting Status</h2>
            <p className="text-sm text-slate-500">{booking.bookingNumber} — read-only booking, posting only</p>
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
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div><span className="text-slate-500">Customer:</span> <span className="font-medium">{customerName}</span></div>
                <div><span className="text-slate-500">Amount:</span> <span className="font-medium">{formatCurrency(detail?.totalAmount || booking.totalAmount)}</span></div>
                <div><span className="text-slate-500">Status:</span> <Badge status={detail?.status || booking.status}>{detail?.status || booking.status}</Badge></div>
              </div>

              {postings.length === 0 ? (
                <p className="text-sm text-slate-500">No vendor postings yet. Postings are created when the booking is confirmed.</p>
              ) : (
                <div className="space-y-3">
                  {postings.map((posting) => (
                    <div key={posting.id} className="rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{posting.description}</p>
                        <p className="text-sm text-slate-500">
                          {posting.serviceType} · {posting.vendor?.name || 'No vendor'} · {formatCurrency(posting.expectedCost)}
                        </p>
                        <span className={`inline-flex mt-2 px-2 py-0.5 rounded text-xs font-semibold ${
                          posting.status === 'POSTED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {posting.status}
                        </span>
                      </div>
                      {posting.status === 'PENDING' && (
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {!posting.vendor?.id && (
                            <p className="text-xs text-amber-700">Assign vendor on Vendor Postings before posting</p>
                          )}
                          {directPost ? (
                            <Button
                              type="button"
                              loading={acting === posting.id}
                              disabled={!posting.vendor?.id}
                              onClick={() => handleDirectPost(posting)}
                            >
                              Post Now
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="secondary"
                              loading={acting === posting.id}
                              disabled={!posting.vendor?.id}
                              onClick={() => handleRequestPosting(posting)}
                            >
                              Request Posting
                            </Button>
                          )}
                        </div>
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
