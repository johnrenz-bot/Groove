'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { InfoTip } from '@/components/ui/InfoTip';
import { roleCardStagger } from '@/components/ui/motion';
import { PhilippineSunMark } from '@/features/dance/components/PhilippineSunMark';
import {
  REGISTRATION_ROLES,
  type RegistrationRole,
  type RegistrationRoleId,
} from '../data/registrationRoles';
import { RoleCard } from './RoleCard';

/** Long enough for the selected card to glow before the route changes. */
const SELECT_DELAY_MS = 300;

const ROLE_INFO = [
  'Coach / Choreographer: teach and mentor, manage bookings, showcase your portfolio and set your own availability.',
  'Client / Performer: find mentors, book sessions and join the community around your discipline.',
  'Both paths take a few minutes to complete. You can refine what you offer, your rates and your availability from Settings once your account is ready.',
];

/**
 * The "Create your account" role chooser, opened from Sign in → Create account.
 * It is the only entry point that asks for a role; every other registration CTA
 * already links to a specific route and is left untouched.
 */
export function RoleSelectionModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState<RegistrationRoleId | null>(null);
  const [focused, setFocused] = useState<RegistrationRoleId | null>(null);
  const [selected, setSelected] = useState<RegistrationRoleId | null>(null);
  const selectedRef = useRef<RegistrationRoleId | null>(null);
  const timerRef = useRef<number | null>(null);

  // Keyboard focus outranks a parked mouse, so the card the user is actually
  // operating is always the one that lifts.
  const activeRole = focused ?? hovered;
  const cardStaggerVariants = reduceMotion
    ? { hidden: {}, visible: { transition: { staggerChildren: 0, delayChildren: 0 } } }
    : roleCardStagger;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  // Every close path goes through here (Escape, overlay, close button and the
  // footer link), so resetting on close does not need an effect that watches
  // `open` and triggers a second render.
  const handleClose = useCallback(() => {
    clearTimer();
    selectedRef.current = null;
    setSelected(null);
    setHovered(null);
    setFocused(null);
    onClose();
  }, [clearTimer, onClose]);

  const handleHoverChange = useCallback(
    (id: RegistrationRoleId, isHovered: boolean) => {
      setHovered((current) => (isHovered ? id : current === id ? null : current));
    },
    []
  );

  const handleFocusChange = useCallback(
    (id: RegistrationRoleId, isFocused: boolean) => {
      setFocused((current) => (isFocused ? id : current === id ? null : current));
    },
    []
  );

  const handleSelect = useCallback(
    (role: RegistrationRole) => {
      if (selectedRef.current) return;
      selectedRef.current = role.id;
      setSelected(role.id);

      // Keep the selected state on screen briefly so the global click sound is
      // not clipped by navigation. Reduced motion navigates immediately.
      const delay = reduceMotion ? 0 : SELECT_DELAY_MS;
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        router.push(role.href);
      }, delay);
    },
    [clearTimer, reduceMotion, router]
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="3xl"
      animated
      descriptionId="role-selection-description"
      bodyClassName="pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6"
      title={
        <span className="flex flex-col items-start gap-2">
          <span className="g-eyebrow">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Join GroovePH
          </span>
          <span className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Create your account
          </span>
        </span>
      }
      description={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>Choose the path that fits you.</span>
          <InfoTip
            title="Choosing a role"
            short="Not sure which path fits? Here is the short version."
            details={ROLE_INFO}
            label="Compare the Coach and Performer paths"
          />
        </span>
      }
      headerAccent={
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 text-[#C9A24C] opacity-[0.16]"
          animate={reduceMotion ? { rotate: 0 } : { rotate: 360 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 120, repeat: Infinity, ease: 'linear' }
          }
        >
          <PhilippineSunMark size={176} className="h-full w-full" />
        </motion.div>
      }
    >
      <motion.div
        variants={cardStaggerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5"
      >
        {REGISTRATION_ROLES.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            active={activeRole === role.id}
            dimmed={activeRole !== null && activeRole !== role.id && selected === null}
            hidden={selected !== null && selected !== role.id}
            selected={selected === role.id}
            locked={selected !== null}
            onHoverChange={handleHoverChange}
            onFocusChange={handleFocusChange}
            onSelect={handleSelect}
          />
        ))}
      </motion.div>

      <p className="mt-6 border-t border-divider pt-5 text-center text-xs text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/login"
          onClick={handleClose}
          className="group/signin relative inline-block font-semibold text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Sign in
          <span
            aria-hidden="true"
            className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-accent transition-transform duration-300 group-hover/signin:scale-x-100 group-focus-visible/signin:scale-x-100 motion-reduce:transition-none"
          />
        </Link>
      </p>
    </Modal>
  );
}

export default RoleSelectionModal;
