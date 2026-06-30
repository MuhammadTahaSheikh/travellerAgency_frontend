'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, LogIn } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { BRAND_NAME } from '@/lib/brand';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/tours', label: 'Tours & Packages' },
  { href: '/#destinations', label: 'Destinations' },
  { href: '/#contact', label: 'Contact' },
];

export function PublicNavbar({ companyName }: { companyName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-[4.25rem]">
          <Link href="/" className="flex items-center gap-2.5 group hover:opacity-90 transition-opacity">
            <Logo size="sm" showText textClassName="text-slate-900 text-lg" />
            {companyName !== BRAND_NAME && (
              <span className="sr-only">{companyName}</span>
            )}
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600 hover:text-teal-700 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-teal-700 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Staff Login
            </Link>
            <Link
              href="/tours"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 shadow-sm shadow-teal-600/20 transition-all"
            >
              Explore Tours
            </Link>
          </div>

          <button
            type="button"
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-700"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Staff Login
          </Link>
          <Link
            href="/tours"
            onClick={() => setOpen(false)}
            className="block mt-2 text-center px-4 py-3 rounded-xl bg-teal-600 text-white text-sm font-semibold"
          >
            Explore Tours
          </Link>
        </div>
      )}
    </header>
  );
}
