'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '@/lib/api';
import { Booking, ApiResponse, VendorPostingSummary } from '@/types';
import { formatCurrency, LoadingSpinner, Badge } from '@/components/ui/Common';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { DecimalMoneyInput } from '@/components/ui/DecimalMoneyInput';

type BookingRefundModalProps = {
  booking: Booking | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function BookingRefundModal({ booking, open, onClose, onSuccess }: BookingRefundModalProps) {
  const [detail, setDetail] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scope, setScope] = useState<'booking' | 'service'>('booking');
  const [vendorPostingId, setVendorPostingId] = useState('');
  const [customerAmount, setCustomerAmount] = useState('');
  const [vendorAmount, setVendorAmount] = useState('');
  const [currency, setCurrency] = useState<'PKR' | 'SAR'>('PKR');
  const [notes, setNotes] = useState('');

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
  const selectedPosting = postings.find((p) => p.id === vendorPostingId);
  const vendorPosted = selectedPosting?.status === 'POSTED';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(customerAmount);
    if (!amount || amount <= 0) {
      alert('Enter a valid refund amount.');
      return;
    }
    if (scope === 'service' && !vendorPostingId) {
      alert('Select a service for service-level refund.');
      return;
    }
    if (scope === 'service' && vendorPosted && (!vendorAmount || parseFloat(vendorAmount) <= 0)) {
      alert('Enter the amount the vendor is returning.');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/bookings/${booking.id}/refund`, {
        customerAmount: amount,
        currency,
        vendorAmount: vendorPosted ? parseFloat(vendorAmount) : undefined,
        vendorPostingId: scope === 'service' ? vendorPostingId : undefined,
        notes: notes || undefined,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Process Refund</h2>
            <p className="text-sm text-slate-500">{booking.bookingNumber}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {loading ? (
            <LoadingSpinner label="Loading..." />
          ) : (
            <>
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                <Badge status={detail?.status || booking.status}>{detail?.status || booking.status}</Badge>
                <span className="ml-2 text-slate-600">Total: {formatCurrency(detail?.totalAmount || booking.totalAmount)}</span>
              </div>

              <Select
                label="Refund Scope"
                value={scope}
                onChange={(e) => setScope(e.target.value as 'booking' | 'service')}
                options={[
                  { value: 'booking', label: 'Whole Booking' },
                  { value: 'service', label: 'Per Service' },
                ]}
              />

              {scope === 'service' && (
                <Select
                  label="Service"
                  value={vendorPostingId}
                  onChange={(e) => setVendorPostingId(e.target.value)}
                  options={[
                    { value: '', label: 'Select service' },
                    ...postings.map((p: VendorPostingSummary) => ({
                      value: p.id,
                      label: `${p.serviceType} — ${p.description} (${p.status})`,
                    })),
                  ]}
                />
              )}

              <Select
                label="Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'PKR' | 'SAR')}
                options={[{ value: 'PKR', label: 'PKR' }, { value: 'SAR', label: 'SAR' }]}
              />

              <DecimalMoneyInput
                label="Amount to return to customer"
                value={customerAmount}
                onValueChange={setCustomerAmount}
                required
              />

              {scope === 'service' && selectedPosting && vendorPosted && (
                <DecimalMoneyInput
                  label="Amount vendor is returning"
                  value={vendorAmount}
                  onValueChange={setVendorAmount}
                  required
                />
              )}

              {scope === 'service' && selectedPosting && !vendorPosted && selectedPosting.status !== 'CANCELLED' && (
                <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                  Vendor not posted yet — service cost will be reduced from internal records.
                </p>
              )}

              <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>Process Refund</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
