'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { login } from '@/store/slices/authSlice';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loading, error, isAuthenticated, initialized } = useAppSelector((s) => s.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (initialized && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [initialized, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setLocalError('Email and password are required.');
      return;
    }
    // Clear stale session so login never sends an old token
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    const result = await dispatch(login({ email: normalizedEmail, password }));
    if (login.fulfilled.match(result)) {
      router.push('/dashboard');
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-950 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-600/30 via-slate-950 to-slate-950" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-teal-500 rounded-full blur-[100px]" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-8">
            <Logo size="lg" imageClassName="bg-white/95 ring-1 ring-white/20 shadow-lg" />
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold tracking-tight leading-tight">
            Manage your travel agency with confidence
          </h1>
          <p className="mt-6 text-lg text-slate-400 max-w-md leading-relaxed">
            Bookings, payments, ledger, and reports — everything your team needs in one professional platform.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4 max-w-md">
            {['Customer Management', 'Internal Ledger', 'Financial Reports', 'Role-Based Access'].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-slate-300">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                {f}
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 border border-white/20 text-sm font-semibold hover:bg-white/15 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              View public website & tours
            </Link>
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex flex-col bg-slate-50">
        <div className="bg-teal-600 text-white px-4 py-3 text-center text-sm">
          <span className="text-teal-100">Looking for travel packages?</span>{' '}
          <Link href="/" className="font-semibold underline underline-offset-2 hover:text-teal-50">
            Visit our public website →
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md animate-fade-in">
          <p className="text-xs font-bold uppercase tracking-wider text-teal-600 mb-2">Staff only</p>
          <div className="lg:hidden text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{BRAND_NAME}</h1>
            <p className="text-slate-500 mt-1 text-sm">{BRAND_TAGLINE}</p>
          </div>

          <Card className="shadow-xl shadow-slate-200/60 border-0">
            <CardBody className="p-6 sm:p-8">
              <div className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Staff portal login</h2>
                {/* <p className="text-sm text-slate-500 mt-1">Employees & admins only — not for customers</p> */}
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />

                {displayError && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-100 p-3.5 rounded-xl">
                    {displayError}
                  </div>
                )}

                <Button type="submit" loading={loading} size="lg" className="w-full">
                  Sign In
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </Button>
              </form>

              {/* <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Demo access</p>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <p><span className="font-medium text-slate-700">Password:</span> admin123</p>
                  <p>superadmin@travel.com · admin@travel.com · employee@travel.com</p>
                </div>
              </div> */}
            </CardBody>
          </Card>
        </div>
        </div>
      </div>
    </div>
  );
}
