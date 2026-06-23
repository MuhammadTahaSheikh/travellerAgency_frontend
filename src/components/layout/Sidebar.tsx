'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Users,
  Package,
  CalendarCheck,
  FileText,
  CreditCard,
  Receipt,
  BookOpen,
  BarChart3,
  Bell,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  Plane,
  Activity,
  X,
  Building2,
  Ticket,
  CalendarDays,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { toggleSidebar, closeMobileMenu } from '@/store/slices/uiSlice';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
  { href: '/customers', label: 'Customers', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
  { href: '/packages', label: 'Packages', icon: Package, roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
  { href: '/bookings', label: 'Bookings', icon: CalendarCheck, roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
  { href: '/invoices', label: 'Invoices', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
  { href: '/payments', label: 'Payments', icon: CreditCard, roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
  { href: '/vouchers', label: 'Vouchers', icon: Ticket, roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
  { href: '/check-ins', label: 'Check-ins', icon: CalendarDays, roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
  { href: '/vendors', label: 'Vendors', icon: Building2, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/expenses', label: 'Expenses', icon: Receipt, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/ledger', label: 'Ledger', icon: BookOpen, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/notifications', label: 'Notifications', icon: Bell, roles: ['SUPER_ADMIN', 'ADMIN', 'USER'] },
  { href: '/users', label: 'Users', icon: Shield, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/activity-logs', label: 'Activity Logs', icon: Activity, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['SUPER_ADMIN'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((s) => s.ui.sidebarOpen);
  const mobileMenuOpen = useAppSelector((s) => s.ui.mobileMenuOpen);
  const userRole = useAppSelector((s) => s.auth.user?.role.name);

  const filteredNav = navItems.filter((item) => userRole && item.roles.includes(userRole));

  useEffect(() => {
    dispatch(closeMobileMenu());
  }, [pathname, dispatch]);

  const handleNavClick = () => {
    dispatch(closeMobileMenu());
  };

  return (
    <>
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => dispatch(closeMobileMenu())}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          'fixed left-0 top-0 h-full z-50 flex flex-col transition-all duration-300 ease-in-out',
          'bg-slate-950 text-white border-r border-slate-800/50',
          'w-72 lg:w-64',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          !sidebarOpen && 'lg:w-[72px]'
        )}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg shadow-teal-500/20 shrink-0">
              <Plane className="w-5 h-5" />
            </div>
            {(sidebarOpen || mobileMenuOpen) && (
              <div className="min-w-0 lg:block">
                <h2 className="font-bold text-sm truncate">Moazin Travel</h2>
                <p className="text-[11px] text-slate-400 truncate">Agency Management</p>
              </div>
            )}
          </div>
          <button
            onClick={() => dispatch(closeMobileMenu())}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto overscroll-contain px-2 space-y-0.5">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                title={!sidebarOpen ? item.label : undefined}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/25'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                )}
              >
                <Icon className={clsx('w-5 h-5 shrink-0', isActive && 'text-white')} />
                <span className={clsx('truncate', !sidebarOpen && 'lg:hidden')}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => dispatch(toggleSidebar())}
          className="hidden lg:flex items-center justify-center py-3 border-t border-slate-800/80 text-slate-500 hover:text-white hover:bg-slate-800/50 transition-colors"
        >
          {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </aside>
    </>
  );
}
