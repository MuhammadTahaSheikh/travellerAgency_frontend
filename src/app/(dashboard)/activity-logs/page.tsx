'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { buildQueryString } from '@/lib/query';
import { ApiResponse } from '@/types';
import { Card, CardBody } from '@/components/ui/Card';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { PageHeader, LoadingSpinner, Badge, formatDateTime, EmptyState } from '@/components/ui/Common';
import { Table, TableWrapper, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@/components/ui/Table';

interface ActivityLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string };
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedDates, setAppliedDates] = useState({ startDate: '', endDate: '' });

  const loadLogs = (dates = appliedDates) => {
    setLoading(true);
    const query = buildQueryString({ startDate: dates.startDate, endDate: dates.endDate });
    api.get<ApiResponse<ActivityLog[]>>(`/activity-logs${query}`)
      .then((res) => setLogs(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLogs(); }, []);

  const handleApplyFilter = () => {
    const dates = { startDate, endDate };
    setAppliedDates(dates);
    loadLogs(dates);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setAppliedDates({ startDate: '', endDate: '' });
    loadLogs({ startDate: '', endDate: '' });
  };

  return (
    <div>
      <PageHeader title="Activity Logs" subtitle="Track login history, booking changes, financial modifications, and user actions" />

      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApply={handleApplyFilter}
        onClear={handleClearFilter}
        summary={{ count: logs.length, label: 'Logs' }}
      />

      {loading ? <LoadingSpinner label="Loading activity logs..." /> : (
        <Card>
          <CardBody className="p-0 sm:p-0">
            {logs.length === 0 ? (
              <EmptyState message="No activity logs for the selected period." />
            ) : (
              <TableWrapper>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>User</TableHeaderCell>
                      <TableHeaderCell>Action</TableHeaderCell>
                      <TableHeaderCell className="hidden sm:table-cell">Entity</TableHeaderCell>
                      <TableHeaderCell className="hidden md:table-cell">Details</TableHeaderCell>
                      <TableHeaderCell>Date & Time</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}</TableCell>
                        <TableCell><Badge>{log.action}</Badge></TableCell>
                        <TableCell className="hidden sm:table-cell">{log.entity}</TableCell>
                        <TableCell className="hidden md:table-cell text-slate-500 max-w-xs truncate">{log.details || '—'}</TableCell>
                        <TableCell className="text-slate-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</TableCell>
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
