'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { Invoice, PostingRequest, ApiResponse } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader, LoadingSpinner, formatCurrency, formatDate, EmptyState } from '@/components/ui/Common';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

interface ApprovalInvoice extends Invoice {
  remainingBalance?: number;
  totalCost?: number;
  vendorPostings?: { id: string; description: string; expectedCost: number; status: string; vendor?: { name: string } }[];
}

type Tab = 'payments' | 'posting';

export default function ApprovalsPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'posting' ? 'posting' : 'payments';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [invoices, setInvoices] = useState<ApprovalInvoice[]>([]);
  const [postingRequests, setPostingRequests] = useState<PostingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<ApiResponse<ApprovalInvoice[]>>('/approvals/pending'),
      api.get<ApiResponse<PostingRequest[]>>('/posting-requests/pending'),
    ])
      .then(([invRes, postRes]) => {
        setInvoices(invRes.data || []);
        setPostingRequests(postRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleApprove = async (inv: ApprovalInvoice) => {
    if (!confirm(`Approve invoice ${inv.invoiceNumber} and issue vouchers?`)) return;
    setActing(inv.id);
    try {
      const res = await api.post<ApiResponse<Invoice> & { message?: string }>(`/approvals/${inv.id}/approve`, {});
      alert(res.message || 'Invoice approved');
      loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (inv: ApprovalInvoice) => {
    const reason = prompt('Rejection reason (optional):');
    if (reason === null) return;
    setActing(inv.id);
    try {
      await api.post(`/approvals/${inv.id}/reject`, { reason });
      loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setActing(null);
    }
  };

  const handleApprovePosting = async (req: PostingRequest) => {
    if (!confirm('Approve and post this vendor cost to ledger?')) return;
    setActing(req.id);
    try {
      const res = await api.post<ApiResponse<PostingRequest> & { message?: string }>(`/posting-requests/${req.id}/approve`, {});
      alert(res.message || 'Posting approved');
      loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setActing(null);
    }
  };

  const handleRejectPosting = async (req: PostingRequest) => {
    const reason = prompt('Rejection reason (optional):');
    if (reason === null) return;
    setActing(req.id);
    try {
      await api.post(`/posting-requests/${req.id}/reject`, { reason });
      loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setActing(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Approvals"
        subtitle="Super Admin review queue — payment approvals and vendor posting requests"
      />

      <div className="mb-6 inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50">
        <button
          type="button"
          onClick={() => setTab('payments')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === 'payments' ? 'bg-teal-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Payment Approvals ({invoices.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('posting')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === 'posting' ? 'bg-teal-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Posting Requests ({postingRequests.length})
        </button>
      </div>

      {loading ? <LoadingSpinner label="Loading approvals..." /> : tab === 'payments' ? (
        <Card>
          <CardBody className="p-0 sm:p-0">
            {invoices.length === 0 ? (
              <EmptyState message="No invoices awaiting approval." />
            ) : (
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Invoice</TableHeaderCell>
                      <TableHeaderCell>Customer</TableHeaderCell>
                      <TableHeaderCell>Amount</TableHeaderCell>
                      <TableHeaderCell>Received</TableHeaderCell>
                      <TableHeaderCell>Balance</TableHeaderCell>
                      <TableHeaderCell className="hidden lg:table-cell">Services</TableHeaderCell>
                      <TableHeaderCell className="hidden xl:table-cell">Vendor Postings</TableHeaderCell>
                      <TableHeaderCell align="right">Actions</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-semibold">{inv.invoiceNumber}</TableCell>
                        <TableCell>
                          {inv.customer?.customerType === 'B2B'
                            ? inv.customer.companyName
                            : `${inv.customer?.firstName} ${inv.customer?.lastName}`}
                          {inv.customer?.tradePartnerId && (
                            <span className="block text-xs text-slate-500">{inv.customer.tradePartnerId}</span>
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(inv.totalAmount)}</TableCell>
                        <TableCell className="text-teal-700">{formatCurrency(inv.paidAmount)}</TableCell>
                        <TableCell className="text-amber-700">{formatCurrency(inv.remainingBalance ?? (inv.totalAmount - inv.paidAmount))}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {inv.items?.map((i) => (
                            <div key={i.id} className="py-0.5">
                              {i.serviceType}: {i.description} ({formatCurrency(i.amount)})
                              {i.costAmount ? <span className="text-slate-500"> · cost {formatCurrency(i.costAmount)}</span> : null}
                            </div>
                          ))}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm">
                          {inv.vendorPostings?.length ? inv.vendorPostings.map((vp) => (
                            <div key={vp.id} className="py-0.5">
                              {vp.status}: {vp.description} ({formatCurrency(vp.expectedCost)})
                              {vp.vendor && <span className="text-slate-500"> · {vp.vendor.name}</span>}
                            </div>
                          )) : '—'}
                        </TableCell>
                        <TableCell align="right">
                          <div className="flex justify-end gap-1">
                            <Button variant="secondary" loading={acting === inv.id} onClick={() => handleApprove(inv)} title="Approve">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button variant="secondary" loading={acting === inv.id} onClick={() => handleReject(inv)} title="Reject">
                              <XCircle className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableWrapper>
            )}
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0 sm:p-0">
            {postingRequests.length === 0 ? (
              <EmptyState message="No posting requests awaiting approval." />
            ) : (
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Booking</TableHeaderCell>
                      <TableHeaderCell>Customer</TableHeaderCell>
                      <TableHeaderCell>Vendor Posting</TableHeaderCell>
                      <TableHeaderCell>Cost</TableHeaderCell>
                      <TableHeaderCell>Requested By</TableHeaderCell>
                      <TableHeaderCell>Date</TableHeaderCell>
                      <TableHeaderCell align="right">Actions</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {postingRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-semibold">{req.booking?.bookingNumber || '—'}</TableCell>
                        <TableCell>
                          {req.booking?.customer?.companyName
                            || `${req.booking?.customer?.firstName || ''} ${req.booking?.customer?.lastName || ''}`.trim()
                            || '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {req.vendorPosting?.description || '—'}
                          {req.vendorPosting?.vendor && (
                            <span className="block text-xs text-slate-500">{req.vendorPosting.vendor.name}</span>
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(req.vendorPosting?.expectedCost || 0)}</TableCell>
                        <TableCell>
                          {req.requestedBy ? `${req.requestedBy.firstName} ${req.requestedBy.lastName}` : '—'}
                        </TableCell>
                        <TableCell>{formatDate(req.createdAt)}</TableCell>
                        <TableCell align="right">
                          <div className="flex justify-end gap-1">
                            <Button variant="secondary" loading={acting === req.id} onClick={() => handleApprovePosting(req)} title="Approve">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button variant="secondary" loading={acting === req.id} onClick={() => handleRejectPosting(req)} title="Reject">
                              <XCircle className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableWrapper>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
