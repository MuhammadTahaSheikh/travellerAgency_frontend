'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { initAuth } from '@/store/slices/authSlice';
import { fetchAppSettings } from '@/store/slices/settingsSlice';
import { fetchUnreadCount } from '@/store/slices/notificationSlice';
import { setSidebarOpen } from '@/store/slices/uiSlice';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const sidebarOpen = useAppSelector((s) => s.ui.sidebarOpen);

  useEffect(() => {
    dispatch(initAuth());
  }, [dispatch]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      dispatch(fetchAppSettings());
      dispatch(fetchUnreadCount());
    }
  }, [isAuthenticated, router, dispatch]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        dispatch(setSidebarOpen(true));
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dispatch]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Header />
      <main
        className={`pt-[4.5rem] sm:pt-20 min-h-screen transition-all duration-300 animate-fade-in ${
          sidebarOpen ? 'lg:pl-64' : 'lg:pl-[72px]'
        } pl-0`}
      >
        <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-[1600px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
