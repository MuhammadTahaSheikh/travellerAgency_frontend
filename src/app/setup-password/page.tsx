'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { BRAND_NAME } from '@/lib/brand';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';

interface InviteInfo {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

function SetupPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid invite link. Ask your administrator to send a new invite.');
      setLoading(false);
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/auth/invite/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Invalid invite link');
        }
        setInvite(data.data);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await api.post('/auth/setup-password', { token, password, confirmPassword });
      setDone(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Set up your account</h1>
          <p className="text-sm text-slate-500 mt-1">Create your password to join {BRAND_NAME}</p>
        </div>

        <Card className="shadow-xl shadow-slate-200/60 border-0">
          <CardBody className="p-6 sm:p-8">
            {loading ? (
              <p className="text-sm text-slate-500 text-center py-8">Validating invite...</p>
            ) : done ? (
              <div className="text-center py-6">
                <CheckCircle className="w-12 h-12 text-teal-600 mx-auto mb-4" />
                <h2 className="text-lg font-bold text-slate-900">Account ready!</h2>
                <p className="text-sm text-slate-500 mt-2">Redirecting you to login...</p>
              </div>
            ) : error && !invite ? (
              <div className="text-center py-4">
                <p className="text-sm text-red-700 bg-red-50 border border-red-100 p-4 rounded-xl">{error}</p>
                <Link href="/login" className="inline-block mt-6 text-sm font-semibold text-teal-700 hover:text-teal-800">
                  Go to login
                </Link>
              </div>
            ) : (
              <>
                {invite && (
                  <div className="mb-6 p-4 bg-teal-50 border border-teal-100 rounded-xl text-sm">
                    <p className="font-semibold text-slate-900">{invite.firstName} {invite.lastName}</p>
                    <p className="text-slate-600 mt-1">{invite.email}</p>
                    <p className="text-teal-700 capitalize mt-1">Role: {invite.role.replace('_', ' ').toLowerCase()}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <Input
                    label="New password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                  />
                  <Input
                    label="Confirm password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    minLength={8}
                  />

                  {error && (
                    <div className="text-sm text-red-700 bg-red-50 border border-red-100 p-3.5 rounded-xl">
                      {error}
                    </div>
                  )}

                  <Button type="submit" loading={saving} size="lg" className="w-full">
                    Create password & activate
                    {!saving && <ArrowRight className="w-4 h-4" />}
                  </Button>
                </form>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <SetupPasswordForm />
    </Suspense>
  );
}
