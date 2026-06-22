'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import api from '@/lib/api';
import { Notification, ApiResponse } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader, LoadingSpinner, formatDate, EmptyState } from '@/components/ui/Common';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = () => {
    setLoading(true);
    api.get<ApiResponse<Notification[]>>('/notifications')
      .then((res) => setNotifications(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadNotifications(); }, []);

  const markAllRead = async () => {
    await api.put('/notifications/read-all', {});
    loadNotifications();
  };

  const markRead = async (id: string) => {
    await api.put(`/notifications/${id}/read`, {});
    loadNotifications();
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
        action={unreadCount > 0 ? <Button variant="secondary" onClick={markAllRead}>Mark All Read</Button> : undefined}
      />

      {loading ? <LoadingSpinner label="Loading notifications..." /> : notifications.length === 0 ? (
        <EmptyState message="No notifications yet." icon={<Bell className="w-7 h-7" />} />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`transition-all ${!n.isRead ? 'border-l-4 border-l-teal-500 bg-teal-50/30' : ''}`}
            >
              <CardBody>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{n.title}</h3>
                      {!n.isRead && <span className="w-2 h-2 bg-teal-500 rounded-full shrink-0" />}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {formatDate(n.createdAt)} · <span className="capitalize">{n.type.replace(/_/g, ' ').toLowerCase()}</span>
                    </p>
                  </div>
                  {!n.isRead && (
                    <Button size="sm" variant="ghost" className="shrink-0 self-start" onClick={() => markRead(n.id)}>
                      Mark Read
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
