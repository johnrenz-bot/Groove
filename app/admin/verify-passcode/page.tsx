'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export default function AdminPasscodePage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDigitChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const updated = [...passcode];
    updated[index] = val.slice(-1);
    setPasscode(updated);

    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`code-digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !passcode[index] && index > 0) {
      const prevInput = document.getElementById(`code-digit-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = passcode.join('');
    if (fullCode.length !== 6) {
      setError('Please enter the full 6-digit administrative verification passcode.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') {
        setError('Unauthorized account role.');
        setLoading(false);
        return;
      }

      router.push('/admin/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Passcode verification failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background text-foreground font-sans">
      <div className="max-w-md w-full rounded-3xl border border-border bg-card p-8 text-center shadow-2xl">
        <div className="h-16 w-16 bg-accent-soft text-accent-text rounded-full flex items-center justify-center mx-auto mb-4 border border-accent-border">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Admin Verification</h1>
        <p className="text-muted-foreground text-xs mt-2">
          Please enter the 6-digit administrative security passcode to access the Master Control Panel.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-danger/30 bg-danger-soft p-3 text-xs text-danger flex items-center gap-2 text-left">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="flex justify-center gap-2">
            {passcode.map((digit, i) => (
              <input
                key={i}
                id={`code-digit-${i}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-xl font-bold rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground font-semibold text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{loading ? 'Verifying...' : 'Authenticate'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
