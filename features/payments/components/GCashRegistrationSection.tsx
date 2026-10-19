'use client';

import React from 'react';
import { QrCode, Smartphone } from 'lucide-react';
import { GCashQrUploader } from './GCashQrField';

/**
 * The optional GCash block on the registration forms.
 *
 * WHY IT IS A SEPARATE COMPONENT AND NOT PART OF RegistrationFormFields
 *   `RegistrationFormFields` already has an `extraFields` slot, but that sits in
 *   the two-column grid beside the username field — wrong shape for a QR slot,
 *   and it would have meant editing a shared form to serve one optional feature.
 *   The register pages render this between the identity documents and the terms
 *   instead, so neither existing flow changes shape.
 *
 * WHY IT IS DEFERRED, NOT UPLOADED HERE
 *   At this point in registration the member has no session, and
 *   `payment-qr-codes` policies are `TO authenticated`. An upload here would be
 *   refused. The page holds the file and calls `attachGCashQrAfterSignup` once
 *   `signUp()` has produced a session — the same ordering the ID document uses.
 *
 * OPTIONAL MEANS OPTIONAL
 *   No field here is required. Leaving it empty writes nothing, and a failure
 *   after the account exists is reported without discarding the registration.
 */
export interface GCashRegistrationSectionProps {
  accountName: string;
  accountNumber: string;
  notes: string;
  file: File | null;
  onAccountNameChange: (value: string) => void;
  onAccountNumberChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  /** Message from a failed post-signup save, shown against the section. */
  error?: string | null;
  disabled?: boolean;
  audience: 'client' | 'coach';
}

export function GCashRegistrationSection({
  accountName,
  accountNumber,
  notes,
  file,
  onAccountNameChange,
  onAccountNumberChange,
  onNotesChange,
  onFileChange,
  error,
  disabled = false,
  audience,
}: GCashRegistrationSectionProps) {
  return (
    <fieldset
      className="space-y-4 border-t border-border pt-8"
      aria-labelledby="reg-legend-gcash"
    >
      <div className="flex items-start gap-3.5 pb-1">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent-border bg-accent-soft text-accent-text">
          <Smartphone className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <h3
            id="reg-legend-gcash"
            className="text-[15px] font-semibold tracking-[-0.01em] text-foreground"
          >
            GCash Payments
            <span className="ml-2 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Optional
            </span>
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {audience === 'coach'
              ? 'Add a GCash account and QR code so clients can pay your session fees without exchanging numbers.'
              : 'Add a GCash account and QR code so you can settle session fees with your coach quickly.'}{' '}
            You can skip this and add it later from your profile.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="g-label" htmlFor="reg-gcash-name">
            GCash Registered Name
          </label>
          <input
            id="reg-gcash-name"
            type="text"
            value={accountName}
            onChange={(e) => onAccountNameChange(e.target.value)}
            placeholder="e.g. Juan Dela Cruz"
            autoComplete="off"
            disabled={disabled}
            className="g-input mt-1.5 w-full"
          />
        </div>
        <div>
          <label className="g-label" htmlFor="reg-gcash-number">
            GCash Mobile Number
          </label>
          <input
            id="reg-gcash-number"
            type="tel"
            inputMode="numeric"
            value={accountNumber}
            onChange={(e) => onAccountNumberChange(e.target.value)}
            placeholder="0917 123 4567"
            autoComplete="off"
            disabled={disabled}
            className="g-input mt-1.5 w-full"
          />
          <p className="g-field-hint">11 digits starting with 09.</p>
        </div>
      </div>

      <div>
        <label className="g-label" htmlFor="reg-gcash-notes">
          Payment Instructions
        </label>
        <input
          id="reg-gcash-notes"
          type="text"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="e.g. Send the booking reference in your GCash message."
          autoComplete="off"
          disabled={disabled}
          className="g-input mt-1.5 w-full"
        />
      </div>

      <GCashQrUploader
        mode="deferred"
        file={file}
        onFileChange={onFileChange}
        disabled={disabled}
        error={error}
      />

      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <QrCode className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
        Your QR image is stored in a private bucket and is never published elsewhere on Groove.
      </p>
    </fieldset>
  );
}

export default GCashRegistrationSection;