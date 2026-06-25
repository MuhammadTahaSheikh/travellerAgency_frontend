'use client';

import { useEffect, useState } from 'react';
import { Users, CalendarCheck, DollarSign, TrendingUp, TrendingDown, Package, FileText, Receipt } from 'lucide-react';
import api from '@/lib/api';
import { DashboardStats, ApiResponse, Booking } from '@/types';
import { StatCard } from '@/components/ui/Card';
import { PageHeader, LoadingSpinner, formatCurrency, formatDate, Badge, EmptyState } from '@/components/ui/Common';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ApiResponse<{ stats: DashboardStats; recentBookings: Booking[] }>>('/dashboard/stats')
      .then((res) => {
        setStats(res.data!.stats);
        setRecentBookings(res.data!.recentBookings);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner label="Loading dashboard..." />;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Real-time overview of bookings, revenue, and agency performance"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 mb-6 sm:mb-8">
        <StatCard title="Total Customers" value={stats?.totalCustomers || 0} icon={<Users className="w-5 h-5" />} color="teal" />
        <StatCard title="Total Bookings" value={stats?.totalBookings || 0} subtitle={`${stats?.pendingBookings} pending`} icon={<CalendarCheck className="w-5 h-5" />} color="blue" />
        <StatCard title="Total Revenue" value={formatCurrency(stats?.totalRevenue || 0)} subtitle="Payments received" icon={<DollarSign className="w-5 h-5" />} color="green" />
        <StatCard title="Cost of Sales" value={formatCurrency(stats?.totalCostOfSales || 0)} subtitle="Vendor costs on bookings" icon={<TrendingDown className="w-5 h-5" />} color="red" />
        <StatCard title="Net Profit" value={formatCurrency(stats?.netProfit || 0)} subtitle="Revenue − vendor costs − expenses" icon={<TrendingUp className="w-5 h-5" />} color="purple" />
        <StatCard title="Active Packages" value={stats?.totalPackages || 0} icon={<Package className="w-5 h-5" />} color="teal" />
        <StatCard title="Total Invoices" value={stats?.totalInvoices || 0} subtitle={`${stats?.overdueInvoices} overdue`} icon={<FileText className="w-5 h-5" />} color="amber" />
        <StatCard title="Operating Expenses" value={formatCurrency(stats?.totalExpenses || 0)} subtitle="Rent, salaries, misc." icon={<Receipt className="w-5 h-5" />} color="red" />
        <StatCard title="Confirmed Bookings" value={stats?.confirmedBookings || 0} icon={<CalendarCheck className="w-5 h-5" />} color="green" />
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-bold text-slate-900">Recent Bookings</h3>
          <p className="text-xs text-slate-500 mt-0.5">Latest booking activity across your agency</p>
        </CardHeader>
        <CardBody className="p-0 sm:p-0">
          {recentBookings.length === 0 ? (
            <EmptyState message="No bookings yet. Create your first booking to get started." />
          ) : (
            <TableWrapper>
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Booking #</TableHeaderCell>
                    <TableHeaderCell>Customer</TableHeaderCell>
                    <TableHeaderCell className="hidden sm:table-cell">Package</TableHeaderCell>
                    <TableHeaderCell>Amount</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell className="hidden md:table-cell">Date</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {recentBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-semibold text-slate-900">{booking.bookingNumber}</TableCell>
                      <TableCell>{booking.customer?.firstName} {booking.customer?.lastName}</TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[140px] truncate">{booking.package?.name}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(booking.totalAmount)}</TableCell>
                      <TableCell><Badge status={booking.status}>{booking.status}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-slate-500">{formatDate(booking.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
