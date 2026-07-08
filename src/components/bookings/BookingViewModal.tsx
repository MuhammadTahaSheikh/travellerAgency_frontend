'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '@/lib/api';
import { Booking, ApiResponse } from '@/types';
import { formatCurrency, formatDate, Badge, LoadingSpinner } from '@/components/ui/Common';
import { formatVendorDisplay } from '@/lib/vendorDisplay';
import { getPaymentStatus, getPostingStatus } from '@/lib/bookingStatus';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';

type BookingViewModalProps = {
  bookingId: string | null;
  open: boolean;
  onClose: () => void;
};

export function BookingViewModal({ bookingId, open, onClose }: BookingViewModalProps) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !bookingId) {
      setBooking(null);
      return;
    }
    setLoading(true);
    api.get<ApiResponse<Booking>>(`/bookings/${bookingId}`)
      .then((res) => setBooking(res.data || null))
      .catch((err) => alert((err as Error).message))
      .finally(() => setLoading(false));
  }, [open, bookingId]);

  if (!open) return null;

  const customerName = booking?.guestName
    || booking?.customer?.companyName
    || `${booking?.customer?.firstName || ''} ${booking?.customer?.lastName || ''}`.trim()
    || '—';

  const createdByName = booking?.createdBy
    ? `${booking.createdBy.firstName} ${booking.createdBy.lastName}`.trim()
    : '—';

  const exchangeRate = booking?.serviceItems
    ?.map((s) => s.details?.exchangeRate)
    .find((v) => v && Number(v) > 0);

  const paymentStatus = booking ? getPaymentStatus(booking) : 'Unpaid';
  const postingStatus = booking ? getPostingStatus(booking) : 'Un-Posted';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Booking Details</h2>
            <p className="text-sm text-slate-500">{booking?.bookingNumber || 'Loading...'}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <LoadingSpinner label="Loading booking..." />
          ) : booking ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ReadOnlyField label="Booking #" value={booking.bookingNumber} />
                <ReadOnlyField label="Customer" value={customerName} />
                <ReadOnlyField label="Status" value={<Badge status={booking.status}>{booking.status}</Badge>} />
                <ReadOnlyField label="Type" value={booking.bookingType || '—'} />
                <ReadOnlyField label="Total Amount" value={formatCurrency(booking.totalAmount)} />
                <ReadOnlyField label="Paid Amount" value={formatCurrency(booking.paidAmount)} />
                <ReadOnlyField label="Payment Status" value={paymentStatus} />
                <ReadOnlyField label="Posting Status" value={postingStatus} />
                <ReadOnlyField label="Travel Date" value={booking.travelDate ? formatDate(booking.travelDate) : '—'} />
                <ReadOnlyField label="Return Date" value={booking.returnDate ? formatDate(booking.returnDate) : '—'} />
                <ReadOnlyField label="Passengers" value={`${booking.adults ?? booking.numTravelers}A / ${booking.children ?? 0}C / ${booking.infants ?? 0}I`} />
                <ReadOnlyField label="Price Mode" value={booking.priceMode || '—'} />
                <ReadOnlyField label="Currency" value={booking.currency || 'PKR'} />
                <ReadOnlyField label="Exchange Rate" value={exchangeRate ? `${Number(exchangeRate).toFixed(3)} PKR/SAR` : '—'} />
                <ReadOnlyField label="Package" value={booking.package?.name || '—'} />
                <ReadOnlyField label="Created By" value={createdByName} />
                <ReadOnlyField label="Created" value={formatDate(booking.createdAt)} />
              </div>

              {booking.priceMode === 'DETERMINED' && (
                <Card>
                  <CardBody>
                    <h3 className="font-semibold text-slate-800 mb-3">Determined Pricing</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <ReadOnlyField label="Price / Adult" value={formatCurrency(booking.priceAdult || 0)} />
                      <ReadOnlyField label="Price / Child" value={formatCurrency(booking.priceChild || 0)} />
                      <ReadOnlyField label="Price / Infant" value={formatCurrency(booking.priceInfant || 0)} />
                    </div>
                  </CardBody>
                </Card>
              )}

              {booking.serviceItems && booking.serviceItems.length > 0 && (
                <Card>
                  <CardBody className="p-0 sm:p-0">
                    <div className="px-4 py-3 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-800">Service Items</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3">Cost</th>
                            <th className="px-4 py-3">Sale</th>
                            <th className="px-4 py-3">Vendor</th>
                            <th className="px-4 py-3">Vendor Res#</th>
                          </tr>
                        </thead>
                        <tbody>
                          {booking.serviceItems.map((item) => (
                            <tr key={item.id || item.description} className="border-t border-slate-100">
                              <td className="px-4 py-3 font-medium">{item.serviceType}</td>
                              <td className="px-4 py-3">
                                <div>{item.description}</div>
                                {item.details?.sector && (
                                  <div className="text-xs text-slate-500">Sector: {item.details.sector}</div>
                                )}
                                {item.details?.airline && (
                                  <div className="text-xs text-slate-500">Airline: {item.details.airline}</div>
                                )}
                              </td>
                              <td className="px-4 py-3">{formatCurrency(item.costAmount || 0)}</td>
                              <td className="px-4 py-3">{formatCurrency(item.amount || 0)}</td>
                              <td className="px-4 py-3">{formatVendorDisplay(item.vendor)}</td>
                              <td className="px-4 py-3">{item.details?.vendorResNo || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardBody>
                </Card>
              )}

              {booking.vendorPostings && booking.vendorPostings.length > 0 && (
                <Card>
                  <CardBody className="p-0 sm:p-0">
                    <div className="px-4 py-3 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-800">Vendor Postings</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {booking.vendorPostings.map((p) => (
                        <div key={p.id} className="px-4 py-3 text-sm">
                          <div className="font-medium">{p.description}</div>
                          <div className="text-slate-500">
                            {p.serviceType} · {formatVendorDisplay(p.vendor)} · {formatCurrency(p.expectedCost)} · {p.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )}

              {booking.notes && (
                <ReadOnlyField label="Notes" value={booking.notes} />
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Booking not found.</p>
          )}

          <div className="mt-6 flex justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
