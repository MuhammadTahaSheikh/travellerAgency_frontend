'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout, loadUser } from '@/store/slices/authSlice';
import { fetchAppSettings } from '@/store/slices/settingsSlice';
import { fetchUnreadCount } from '@/store/slices/notificationSlice';
import { setSidebarOpen } from '@/store/slices/uiSlice';
import { setUnauthorizedHandler } from '@/lib/authSession';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

function AuthLoadingShell() {
  return <div className="min-h-screen bg-slate-50" aria-busy="true" />;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, initialized } = useAppSelector((s) => s.auth);
  const sidebarOpen = useAppSelector((s) => s.ui.sidebarOpen);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      dispatch(logout());
      router.replace('/login');
    });
    return () => setUnauthorizedHandler(null);
  }, [dispatch, router]);

  useEffect(() => {
    if (!initialized) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      dispatch(logout());
      router.replace('/login');
      return;
    }

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    dispatch(fetchAppSettings());
    dispatch(fetchUnreadCount());
    dispatch(loadUser());
  }, [initialized, isAuthenticated, router, dispatch]);

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

  if (!initialized || !isAuthenticated) {
    return <AuthLoadingShell />;
  }

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
