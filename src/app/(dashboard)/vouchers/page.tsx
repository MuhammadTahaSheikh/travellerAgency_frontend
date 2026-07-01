'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Download, Share2, MessageCircle, Link2 } from 'lucide-react';
import api from '@/lib/api';
import { copyText } from '@/lib/documentLinks';
import { RootState } from '@/store';
import { Voucher, ApiResponse } from '@/types';
import { shareVoucherViaWhatsApp } from '@/lib/whatsapp';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader, LoadingSpinner, Badge, EmptyState } from '@/components/ui/Common';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

const FORMAT_LABELS: Record<string, string> = {
  COMPLETE: 'Complete',
  HOTEL: 'Hotel',
  TRANSPORT: 'Transport',
};

const FORMAT_ORDER = ['COMPLETE', 'HOTEL', 'TRANSPORT'] as const;

type VoucherGroup = {
  key: string;
  invoiceNumber?: string;
  guestName: string;
  vouchers: Voucher[];
};

function groupKey(v: Voucher) {
  return v.invoice?.id || v.payment?.id || v.id;
}

export default function VouchersPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const groups = useMemo<VoucherGroup[]>(() => {
    const map = new Map<string, VoucherGroup>();
    for (const v of vouchers) {
      const key = groupKey(v);
      const existing = map.get(key);
      if (existing) {
        existing.vouchers.push(v);
      } else {
        map.set(key, {
          key,
          invoiceNumber: v.invoice?.invoiceNumber,
          guestName: v.guestName,
          vouchers: [v],
        });
      }
    }
    return Array.from(map.values());
  }, [vouchers]);

  const loadData = () => {
    setLoading(true);
    setLoadError('');
    api.get<ApiResponse<Voucher[]>>('/vouchers')
      .then((res) => setVouchers(res.data || []))
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleCopyLink = async (voucher: Voucher) => {
    try {
      const res = await api.get<{ data?: { url: string } }>(`/vouchers/${voucher.id}/share-link`);
      if (!res.data?.url) throw new Error('Could not create share link');
      const copied = await copyText(res.data.url);
      alert(copied ? `Permanent link copied:\n${res.data.url}` : res.data.url);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const openVoucher = async (voucher: Voucher) => {
    try {
      const safeName = voucher.voucherNumber.replace(/[^\w.-]+/g, '-');
      const format = voucher.voucherFormat ? `-${voucher.voucherFormat.toLowerCase()}` : '';
      await api.downloadPdfFromEndpoint(
        `/vouchers/${voucher.id}/html`,
        `voucher-${safeName}${format}.pdf`,
        'portrait'
      );
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleShare = async (voucher: Voucher) => {
    try {
      await api.post(`/vouchers/${voucher.id}/share`, {});
      void shareVoucherViaWhatsApp(voucher, user);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const voucherByFormat = (group: VoucherGroup, format: string) =>
    group.vouchers.find((v) => v.voucherFormat === format);

  const groupStatus = (group: VoucherGroup) => {
    if (group.vouchers.every((v) => v.status === 'SHARED')) return 'SHARED';
    if (group.vouchers.some((v) => v.status === 'ISSUED')) return 'ISSUED';
    return group.vouchers[0]?.status || 'DRAFT';
  };

  const primaryVoucher = (group: VoucherGroup) => group.vouchers[0];

  return (
    <div>
      <PageHeader title="Vouchers" subtitle="Download complete, hotel-only, or transport vouchers after super admin approval" />

      {loadError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{loadError}</div>
      )}

      {loading ? <LoadingSpinner label="Loading vouchers..." /> : (
        <Card>
          <CardBody className="p-0 sm:p-0">
            {vouchers.length === 0 ? (
              <EmptyState message="No vouchers yet. Vouchers are created when super admin approves a paid invoice." />
            ) : (
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Invoice / Voucher</TableHeaderCell>
                      <TableHeaderCell>Guest</TableHeaderCell>
                      <TableHeaderCell>Download by Format</TableHeaderCell>
                      <TableHeaderCell>Payment</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell align="right">Actions</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {groups.map((group) => {
                      const primary = primaryVoucher(group);
                      const paymentVoucher = group.vouchers.find((v) => v.paymentStatus) || primary;
                      return (
                        <TableRow key={group.key}>
                          <TableCell className="font-semibold text-slate-900">
                            {group.invoiceNumber || primary.voucherNumber}
                            {group.vouchers.length > 1 && (
                              <span className="block text-xs font-normal text-slate-500">{group.vouchers.length} formats</span>
                            )}
                          </TableCell>
                          <TableCell>{group.guestName}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {FORMAT_ORDER.map((format) => {
                                const v = voucherByFormat(group, format);
                                if (!v) return null;
                                return (
                                  <Button
                                    key={format}
                                    variant="secondary"
                                    onClick={() => openVoucher(v)}
                                    title={`Download ${FORMAT_LABELS[format]} voucher`}
                                  >
                                    <Download className="w-4 h-4 mr-1" />
                                    {FORMAT_LABELS[format]}
                                  </Button>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {paymentVoucher.paymentStatus?.replace('_', ' ') || '—'}
                            {paymentVoucher.remainingBalance != null && paymentVoucher.remainingBalance > 0 && (
                              <span className="block text-amber-600">Bal: {paymentVoucher.remainingBalance}</span>
                            )}
                          </TableCell>
                          <TableCell><Badge status={groupStatus(group)}>{groupStatus(group)}</Badge></TableCell>
                          <TableCell align="right">
                            <div className="flex justify-end gap-2">
                              <Button variant="secondary" onClick={() => handleCopyLink(primary)} title="Copy permanent link">
                                <Link2 className="w-4 h-4" />
                              </Button>
                              <Button variant="secondary" onClick={() => void shareVoucherViaWhatsApp(primary, user)} title="Send via WhatsApp">
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                              {group.vouchers.some((v) => v.status !== 'SHARED') && (
                                <Button
                                  variant="secondary"
                                  onClick={() => {
                                    const unshared = group.vouchers.find((v) => v.status !== 'SHARED');
                                    if (unshared) handleShare(unshared);
                                  }}
                                  title="Mark shared"
                                >
                                  <Share2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
