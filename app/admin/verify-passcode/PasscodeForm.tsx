'use client';

import React, { useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { verifyAdminPasscode } from './actions';
import type { PasscodeResult } from './config';

const DIGITS = 6;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {pending ? 'Verifying…' : 'Authenticate'}
    </Button>
  );
}

/**
 * The 6-box passcode entry.
 *
 * Presentation only. It holds no idea what the correct code is and performs no
 * verification — `verifyAdminPasscode` is a server action, so the comparison
 * happens in the server runtime and the passcode never reaches the browser in
 * any other form than the digits the visitor typed.
 */
export function PasscodeForm() {
  const [digits, setDigits] = useState<string[]>(() => Array(DIGITS).fill(''));
  const [result, setResult] = useState<PasscodeResult | null>(null);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const setDigit = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (value && index < DIGITS - 1) inputs.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault();
      inputs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < DIGITS - 1) inputs.current[index + 1]?.focus();
  };

  return (
    <form
      action={async (formData: FormData) => {
        setResult(await verifyAdminPasscode(null, formData));
      }}
      className="mt-6 space-y-6"
    >
      {/* The joined code is submitted as one hidden field. Six separate form
          values would let the server only check whichever box happened to be
          filled. */}
      <input type="hidden" name="passcode" value={digits.join('')} />

      <fieldset>
        <legend className="sr-only">Administrative passcode</legend>
        <div className="flex justify-center gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(node) => {
                inputs.current[index] = node;
              }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              aria-label={`Digit ${index + 1}`}
              value={digit}
              onChange={(e) => setDigit(index, e.target.value)}
              onKeyDown={(e) => onKeyDown(index, e)}
              className="h-14 w-12 rounded-xl border border-border bg-muted text-center text-xl font-bold text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
            />
          ))}
        </div>
      </fieldset>

      {result?.error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-center text-xs text-danger"
        >
          {result.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

export function PasscodeHeaderIcon() {
  return (
    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-accent-border bg-accent-soft text-accent-text">
      <ShieldCheck className="h-8 w-8" aria-hidden="true" />
    </div>
  );
}

export default PasscodeForm;