'use client';

import { useRouter } from 'next/navigation';
import { Bell, LogOut, Menu, User } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { toggleMobileMenu } from '@/store/slices/uiSlice';
import { getUserRole } from '@/lib/permissions';
import { Logo } from '@/components/brand/Logo';
import Link from 'next/link';
import { ExchangeRateTicker } from '@/components/currency/ExchangeRateTicker';

export function Header() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const unreadCount = useAppSelector((s) => s.notifications.unreadCount);
  const sidebarOpen = useAppSelector((s) => s.ui.sidebarOpen);
  const roleName = getUserRole(user);

  const handleLogout = () => {
    dispatch(logout());
    router.push('/login');
  };

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'U';

  return (
    <header
      className={`fixed top-0 right-0 h-16 z-30 transition-all duration-300 ${
        sidebarOpen ? 'lg:left-64' : 'lg:left-[72px]'
      } left-0`}
    >
      <div className="h-full mx-2 sm:mx-4 mt-2 mb-0">
        <div className="h-14 glass-card rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between px-3 sm:px-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => dispatch(toggleMobileMenu())}
              className="lg:hidden p-2 -ml-1 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="lg:hidden">
              <Logo size="sm" showText subtitle="Management System" subtitleClassName="text-slate-500" />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 justify-center lg:justify-start lg:ml-2">
            <ExchangeRateTicker />
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Link
              href="/notifications"
              className="relative p-2.5 text-slate-500 hover:text-teal-600 rounded-xl hover:bg-teal-50 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            <div className="hidden sm:block w-px h-8 bg-slate-200 mx-1" />

            <div className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2">
              <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {initials}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-slate-900 leading-tight">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[11px] text-slate-500 capitalize">
                  {roleName?.replace('_', ' ').toLowerCase()}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2.5 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
