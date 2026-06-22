'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { buildQueryString } from '@/lib/query';
import { ApiResponse } from '@/types';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { PageHeader, LoadingSpinner, formatCurrency, TabGroup, EmptyState } from '@/components/ui/Common';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

const reportTypes = [
  { id: 'income-statement', label: 'Income Statement', endpoint: '/reports/income-statement' },
  { id: 'profit-loss', label: 'Profit & Loss', endpoint: '/reports/profit-loss' },
  { id: 'cash-flow', label: 'Cash Flow', endpoint: '/reports/cash-flow' },
  { id: 'expenses', label: 'Expense Report', endpoint: '/reports/expenses' },
  { id: 'customer-outstanding', label: 'Outstanding', endpoint: '/reports/customer-outstanding' },
  { id: 'daily-collection', label: 'Daily Collection', endpoint: '/reports/daily-collection' },
];

function StatCard({ label, value, variant }: { label: string; value: string; variant: 'green' | 'red' | 'blue' | 'teal' }) {
  const styles = {
    green: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    red: 'bg-red-50 border-red-100 text-red-700',
    blue: 'bg-sky-50 border-sky-100 text-sky-700',
    teal: 'bg-teal-50 border-teal-100 text-teal-700',
  };
  return (
    <div className={`p-4 sm:p-5 rounded-2xl border ${styles[variant]}`}>
      <p className="text-xs sm:text-sm font-medium opacity-80">{label}</p>
      <p className="text-xl sm:text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState(reportTypes[0].id);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedDates, setAppliedDates] = useState({ startDate: '', endDate: '' });

  const loadReport = (reportId: string, dates = appliedDates) => {
    const report = reportTypes.find((r) => r.id === reportId);
    if (!report) return;

    setActiveReport(reportId);
    setLoading(true);
    const query = buildQueryString({
      startDate: dates.startDate,
      endDate: dates.endDate,
      date: dates.startDate || dates.endDate ? dates.startDate || dates.endDate : undefined,
    });
    api.get<ApiResponse<Record<string, unknown>>>(`${report.endpoint}${query}`)
      .then((res) => setData(res.data || null))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadReport(activeReport); }, []);

  const handleApplyFilter = () => {
    const dates = { startDate, endDate };
    setAppliedDates(dates);
    loadReport(activeReport, dates);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setAppliedDates({ startDate: '', endDate: '' });
    loadReport(activeReport, { startDate: '', endDate: '' });
  };

  return (
    <div>
      <PageHeader title="Financial Reports" subtitle="Income statement, P&L, cash flow, expenses, and customer outstanding" />

      <TabGroup
        tabs={reportTypes}
        active={activeReport}
        onChange={(id) => loadReport(id, appliedDates)}
      />

      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApply={handleApplyFilter}
        onClear={handleClearFilter}
      />

      {loading ? <LoadingSpinner label="Generating report..." /> : data ? (
        <Card>
          <CardHeader>
            <h3 className="font-bold text-slate-900">{reportTypes.find((r) => r.id === activeReport)?.label}</h3>
          </CardHeader>
          <CardBody>
            {activeReport === 'income-statement' || activeReport === 'profit-loss' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard label="Total Income" value={formatCurrency((data.totalIncome as number) || 0)} variant="green" />
                  <StatCard label="Total Expenses" value={formatCurrency((data.totalExpenses as number) || 0)} variant="red" />
                  <StatCard label="Net Income" value={formatCurrency((data.netIncome as number) || 0)} variant="teal" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3">Income Breakdown</h4>
                    <div className="space-y-2">
                      {Object.entries((data.income as Record<string, number>) || {}).map(([key, val]) => (
                        <div key={key} className="flex justify-between py-2 text-sm border-b border-slate-100">
                          <span className="text-slate-600 capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className="font-medium text-emerald-700">{formatCurrency(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3">Expense Breakdown</h4>
                    <div className="space-y-2">
                      {Object.entries((data.expenses as Record<string, number>) || {}).map(([key, val]) => (
                        <div key={key} className="flex justify-between py-2 text-sm border-b border-slate-100">
                          <span className="text-slate-600 capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className="font-medium text-red-600">{formatCurrency(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : activeReport === 'cash-flow' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Cash Inflows" value={formatCurrency(((data.inflows as { total: number })?.total) || 0)} variant="green" />
                <StatCard label="Cash Outflows" value={formatCurrency(((data.outflows as { total: number })?.total) || 0)} variant="red" />
                <StatCard label="Net Cash Flow" value={formatCurrency((data.netCashFlow as number) || 0)} variant="teal" />
              </div>
            ) : activeReport === 'customer-outstanding' ? (
              <div>
                <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-100">
                  <p className="text-sm text-amber-700 font-medium">Total Outstanding</p>
                  <p className="text-2xl sm:text-3xl font-bold text-amber-800 mt-1">{formatCurrency((data.totalOutstanding as number) || 0)}</p>
                </div>
                {((data.customers as { invoiceNumber: string; customer: { firstName: string; lastName: string }; outstanding: number }[]) || []).length === 0 ? (
                  <EmptyState message="No outstanding customer balances." />
                ) : (
                  <TableWrapper>
                    <Table>
                      <TableHead>
                        <tr>
                          <TableHeaderCell>Invoice</TableHeaderCell>
                          <TableHeaderCell>Customer</TableHeaderCell>
                          <TableHeaderCell align="right">Outstanding</TableHeaderCell>
                        </tr>
                      </TableHead>
                      <TableBody>
                        {((data.customers as { invoiceNumber: string; customer: { firstName: string; lastName: string }; outstanding: number }[]) || []).map((item, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-semibold">{item.invoiceNumber}</TableCell>
                            <TableCell>{item.customer?.firstName} {item.customer?.lastName}</TableCell>
                            <TableCell align="right" className="font-medium text-amber-700">{formatCurrency(item.outstanding)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableWrapper>
                )}
              </div>
            ) : activeReport === 'daily-collection' ? (
              <StatCard label="Total Collection" value={formatCurrency((data.total as number) || 0)} variant="teal" />
            ) : (
              <StatCard label="Total Expenses" value={formatCurrency((data.total as number) || 0)} variant="red" />
            )}
          </CardBody>
        </Card>
      ) : (
        <EmptyState message="No report data available for the selected period." />
      )}
    </div>
  );
}
