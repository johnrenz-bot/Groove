'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  FileText,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { cn } from '@/components/shared/cn';
import { AuthButton } from './AuthUI';
import { SuccessCheck } from './AuthWizard';

/* ==========================================================================
   MODAL KIT
   --------------------------------------------------------------------------
   One accessible modal primitive (portal, focus trap, Esc, overlay click,
   focus restore, body scroll lock) plus the flows the registration pages
   need: Terms/Privacy, image preview, leave confirmation and submit success.
   ========================================================================== */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  className,
  bodyClassName,
  closeLabel = 'Close dialog',
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  size?: ModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  closeLabel?: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFirst = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const preferred = panel.querySelector<HTMLElement>('[data-autofocus]');
      const target = preferred ?? panel.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus({ preventScroll: true });
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (item) => item.offsetParent !== null || item === document.activeElement
      );
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      window.cancelAnimationFrame(focusFirst);
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      restoreRef.current?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="rw-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.2 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            className={cn('rw-modal', `rw-modal--${size}`, className)}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 14 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.7 }}
          >
            <header className="rw-modal-head">
              <div className="rw-modal-title-wrap">
                <h2 id={titleId} className="rw-modal-title">
                  {title}
                </h2>
                {description ? (
                  <p id={descriptionId} className="rw-modal-desc">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="rw-icon-btn rw-modal-close"
                aria-label={closeLabel}
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className={cn('rw-modal-body', bodyClassName)}>{children}</div>

            {footer ? <footer className="rw-modal-foot">{footer}</footer> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

/* ─── Terms / privacy ───────────────────────────────────────────────────── */

const TERMS_SECTIONS = [
  {
    title: '1. Your account',
    body: 'Groove System accounts are for individual performers, clients and coaches. Keep your login details private and let us know if you believe someone else has accessed your account.',
  },
  {
    title: '2. Bookings and payments',
    body: 'Session details, rates and payment methods are agreed between the client and the coach. Groove System provides the platform for discovery, scheduling and records, and does not hold funds on your behalf.',
  },
  {
    title: '3. Conduct',
    body: 'Treat every member with respect. Harassment, discrimination, unsafe studio practices and misrepresentation of your identity or credentials are grounds for suspension.',
  },
  {
    title: '4. Content you upload',
    body: 'You keep ownership of the photos, videos and documents you upload. You grant Groove System permission to store and display them for the purpose of operating your profile and verifying your identity.',
  },
  {
    title: '5. Verification documents',
    body: 'Government IDs and selfies are used only for identity review. They are stored privately, are never shown on your public profile, and are handled by the verification team.',
  },
  {
    title: '6. Cancellations',
    body: 'Cancellation windows are set per session. Repeated late cancellations or no-shows may affect your ability to book or accept sessions in the future.',
  },
  {
    title: '7. Changes',
    body: 'We may update these terms as the platform grows. Material changes will be announced in-app before they take effect.',
  },
];

const PRIVACY_SECTIONS = [
  {
    title: '1. What we collect',
    body: 'Your name, contact details, account credentials, location, profile content and the verification documents you choose to upload.',
  },
  {
    title: '2. How we use it',
    body: 'To create and secure your account, match clients with coaches, process bookings, and review identity documents. We do not sell personal data.',
  },
  {
    title: '3. Who can see it',
    body: 'Public profile details are visible to other members. Contact details, birth date and verification documents stay private and are only accessible to you and authorised reviewers.',
  },
  {
    title: '4. Storage and security',
    body: 'Data is stored with our authentication and storage providers using access rules that scope every file to its owner. No system is perfectly secure, so use a strong unique password.',
  },
  {
    title: '5. Your choices',
    body: 'You can update your profile at any time, request a copy of your data, or ask us to delete your account. Some records may be retained where the law requires it.',
  },
  {
    title: '6. Contact',
    body: 'Questions about privacy can be sent through the support link in your account settings.',
  },
];

export function TermsModal({
  open,
  onClose,
  onAccept,
  kind = 'terms',
  requireScroll = true,
}: {
  open: boolean;
  onClose: () => void;
  onAccept?: () => void;
  kind?: 'terms' | 'privacy';
  requireScroll?: boolean;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReachedEnd(false);
    setAcknowledged(false);
    const frame = window.requestAnimationFrame(() => {
      const node = bodyRef.current;
      if (!node) return;
      if (node.scrollHeight <= node.clientHeight + 8) setReachedEnd(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const isTerms = kind === 'terms';
  const sections = isTerms ? TERMS_SECTIONS : PRIVACY_SECTIONS;
  const canAccept = !requireScroll || reachedEnd;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isTerms ? 'Terms & Conditions' : 'Privacy Policy'}
      description={
        isTerms
          ? 'The agreement that covers bookings, conduct and your account.'
          : 'How Groove System handles the information you share with us.'
      }
      bodyClassName="rw-modal-body--flush"
      footer={
        <>
          <AuthButton type="button" variant="ghost" onClick={onClose}>
            Cancel
          </AuthButton>
          <AuthButton
            type="button"
            disabled={!canAccept || (isTerms && !acknowledged)}
            onClick={() => {
              onAccept?.();
              onClose();
            }}
          >
            {isTerms ? 'I have read and agree' : 'I understand'}
          </AuthButton>
        </>
      }
    >
      <div
        ref={bodyRef}
        className="rw-terms-scroll"
        tabIndex={0}
        onScroll={(event) => {
          const node = event.currentTarget;
          if (node.scrollTop + node.clientHeight >= node.scrollHeight - 24) setReachedEnd(true);
        }}
      >
        <div className="rw-terms-body">
          <div className="rw-terms-badge">
            {isTerms ? <FileText className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            <span>GroovePH · Effective 2026</span>
          </div>
          {sections.map((section) => (
            <section key={section.title} className="rw-terms-section">
              <h3>{section.title}</h3>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
        <div className="rw-terms-fade" aria-hidden="true" />
      </div>

      <div className="rw-terms-ack">
        <label className="rw-terms-check">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            disabled={!canAccept}
          />
          <span>
            {isTerms
              ? 'I have read and agree to the Terms & Conditions and Privacy Policy.'
              : 'I have read the Privacy Policy.'}
          </span>
        </label>
        {!canAccept ? (
          <p className="rw-terms-hint">Scroll to the end to enable this confirmation.</p>
        ) : null}
      </div>
    </Modal>
  );
}

/* ─── Image preview ─────────────────────────────────────────────────────── */

function PreviewBody({ src, name }: { src: string; name: string }) {
  const [zoom, setZoom] = useState(1);

  return (
    <div className="rw-preview">
      <div className="rw-preview-stage">
        {/* Blob/data URLs cannot be optimised by next/image. */}
        <img
          src={src}
          alt={name}
          className="rw-preview-image"
          style={{ transform: `scale(${zoom})` }}
        />
      </div>
      <div className="rw-preview-bar">
        <span className="rw-preview-name">{name}</span>
        <div className="rw-preview-zoom">
          <button
            type="button"
            className="rw-icon-btn"
            aria-label="Zoom out"
            onClick={() => setZoom((value) => Math.max(0.5, Math.round((value - 0.25) * 100) / 100))}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="rw-preview-zoom-value">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="rw-icon-btn"
            aria-label="Zoom in"
            onClick={() => setZoom((value) => Math.min(3, Math.round((value + 0.25) * 100) / 100))}
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rw-icon-btn"
            aria-label="Reset zoom"
            onClick={() => setZoom(1)}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ImagePreviewModal({
  open,
  onClose,
  src,
  name = 'Document preview',
}: {
  open: boolean;
  onClose: () => void;
  src: string | null;
  name?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} size="xl" title={name} closeLabel="Close preview">
      {src ? <PreviewBody src={src} name={name} /> : null}
    </Modal>
  );
}

/* ─── Leave confirmation ────────────────────────────────────────────────── */

export function ConfirmLeaveModal({
  open,
  onClose,
  onLeave,
}: {
  open: boolean;
  onClose: () => void;
  onLeave: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Leave registration?"
      description="Your progress on this device will be cleared."
      footer={
        <>
          <AuthButton type="button" variant="ghost" onClick={onClose}>
            Keep editing
          </AuthButton>
          <AuthButton type="button" variant="danger" onClick={onLeave}>
            Leave
          </AuthButton>
        </>
      }
    >
      <div className="rw-confirm-body">
        <span className="rw-confirm-icon" aria-hidden="true">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <p>
          You have started filling in this form. If you leave now, anything you typed or uploaded
          that has not been submitted will be lost.
        </p>
      </div>
    </Modal>
  );
}

/* ─── Success ───────────────────────────────────────────────────────────── */

export function SuccessModal({
  open,
  onClose,
  onCta,
  title = 'Registration submitted',
  description,
  ctaLabel = 'Continue to sign in',
  details,
}: {
  open: boolean;
  onClose: () => void;
  onCta: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  ctaLabel?: string;
  details?: Array<{ label: string; value: React.ReactNode; highlight?: boolean }>;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={title}
      footer={
        <AuthButton type="button" className="rw-success-cta" onClick={onCta}>
          {ctaLabel}
        </AuthButton>
      }
    >
      <div className="rw-success">
        <SuccessCheck />
        {description ? <p className="rw-success-desc">{description}</p> : null}

        {details && details.length > 0 ? (
          <dl className="rw-success-details">
            {details.map((detail, index) => (
              <div key={`${detail.label}-${index}`} className="rw-success-row">
                <dt>{detail.label}</dt>
                <dd data-highlight={detail.highlight ? 'true' : undefined}>{detail.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <ul className="rw-success-steps">
          <li>
            <span aria-hidden="true">
              <Check className="h-3.5 w-3.5" />
            </span>
            Keep an eye on your inbox for a confirmation email.
          </li>
          <li>
            <span aria-hidden="true">
              <Check className="h-3.5 w-3.5" />
            </span>
            Our team reviews verification documents within 1–2 business days.
          </li>
        </ul>
      </div>
    </Modal>
  );
}

