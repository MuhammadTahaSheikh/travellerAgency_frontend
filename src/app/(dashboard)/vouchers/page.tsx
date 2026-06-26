'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { ExternalLink, Share2, MessageCircle } from 'lucide-react';
import api from '@/lib/api';
import { RootState } from '@/store';
import { Voucher, ApiResponse } from '@/types';
import { shareVoucherViaWhatsApp } from '@/lib/whatsapp';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader, LoadingSpinner, Badge, formatDate, EmptyState } from '@/components/ui/Common';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

export default function VouchersPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadData = () => {
    setLoading(true);
    setLoadError('');
    api.get<ApiResponse<Voucher[]>>('/vouchers')
      .then((res) => setVouchers(res.data || []))
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const openVoucher = async (id: string) => {
    try {
      const html = await api.getHtml(`/vouchers/${id}/html`);
      const blob = new Blob([html], { type: 'text/html' });
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleShare = async (voucher: Voucher) => {
    try {
      await api.post(`/vouchers/${voucher.id}/share`, {});
      shareVoucherViaWhatsApp(voucher, user);
      loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div>
      <PageHeader title="Hotel Vouchers" subtitle="Vouchers issued after verified payments" />

      {loadError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{loadError}</div>
      )}

      {loading ? <LoadingSpinner label="Loading vouchers..." /> : (
        <Card>
          <CardBody className="p-0 sm:p-0">
            {vouchers.length === 0 ? (
              <EmptyState message="No vouchers yet. Vouchers are auto-created when a verified payment is made for a booking with hotel services." />
            ) : (
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Voucher #</TableHeaderCell>
                      <TableHeaderCell>Guest</TableHeaderCell>
                      <TableHeaderCell>Hotel</TableHeaderCell>
                      <TableHeaderCell>Check-in</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell align="right">Actions</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {vouchers.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-semibold">{v.voucherNumber}</TableCell>
                        <TableCell>{v.guestName}</TableCell>
                        <TableCell>{v.hotelName}</TableCell>
                        <TableCell>{formatDate(v.checkInDate)}</TableCell>
                        <TableCell><Badge status={v.status}>{v.status}</Badge></TableCell>
                        <TableCell align="right">
                          <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => openVoucher(v.id)}><ExternalLink className="w-4 h-4" /></Button>
                            <Button variant="secondary" onClick={() => shareVoucherViaWhatsApp(v, user)} title="Send via WhatsApp"><MessageCircle className="w-4 h-4" /></Button>
                            {v.status !== 'SHARED' && (
                              <Button variant="secondary" onClick={() => handleShare(v)} title="Mark shared"><Share2 className="w-4 h-4" /></Button>
                            )}
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
