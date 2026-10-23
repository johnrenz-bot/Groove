'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion, useSpring } from 'framer-motion';
import { cn } from '@/components/shared/cn';
import { roleCardItem, roleCardTransition } from '@/components/ui/motion';
import type { RegistrationRole, RegistrationRoleId } from '../data/registrationRoles';
import { RolePerk } from './RolePerk';

/**
 * One full-bleed role card.
 *
 * The card is an <a> overlay rather than a wrapper around the content, so the
 * three perk buttons can live above it without nesting interactive elements.
 * The whole surface remains one Tab stop; the perks become tab stops only once
 * the card is active (or on a device without hover, where they are always
 * visible).
 */
export function RoleCard({
  role,
  active,
  dimmed,
  hidden,
  selected,
  locked,
  onHoverChange,
  onFocusChange,
  onSelect,
}: {
  role: RegistrationRole;
  active: boolean;
  dimmed: boolean;
  hidden: boolean;
  selected: boolean;
  locked: boolean;
  onHoverChange: (id: RegistrationRoleId, hovered: boolean) => void;
  onFocusChange: (id: RegistrationRoleId, focused: boolean) => void;
  onSelect: (role: RegistrationRole) => void;
}) {
  const reduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [canHover, setCanHover] = useState(false);
  const rotateX = useSpring(0, { stiffness: 180, damping: 24, mass: 0.4 });
  const rotateY = useSpring(0, { stiffness: 180, damping: 24, mass: 0.4 });

  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setCanHover(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  const glow = active || selected;
  const perksVisible = active || selected || !canHover;
  const tiltEnabled = canHover && !reduceMotion;
  const itemVariants = reduceMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1, transition: { duration: 0 } } }
    : roleCardItem;

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!tiltEnabled) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(x * 8);
    rotateX.set(-y * 8);
  };

  const resetTilt = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div variants={itemVariants} className="h-full min-h-[220px] sm:min-h-[420px]">
      <motion.div
        ref={cardRef}
        animate={{
          y: active && !reduceMotion ? -4 : 0,
          scale: hidden ? 0.96 : selected && !reduceMotion ? 1.03 : dimmed ? 0.98 : 1,
          opacity: hidden ? 0 : dimmed ? 0.85 : 1,
        }}
        transition={reduceMotion ? { duration: 0 } : roleCardTransition}
        style={{ rotateX, rotateY, transformPerspective: 1100 }}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetTilt}
        onMouseEnter={() => onHoverChange(role.id, true)}
        onMouseLeave={() => {
          resetTilt();
          onHoverChange(role.id, false);
        }}
        onFocusCapture={() => onFocusChange(role.id, true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            onFocusChange(role.id, false);
          }
        }}
        aria-hidden={hidden || undefined}
        className={cn(
          'group/role relative flex h-full min-h-[220px] flex-col justify-end overflow-hidden rounded-2xl border bg-card transition-[border-color,box-shadow] duration-300 motion-reduce:transition-none sm:min-h-[420px]',
          'focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-background',
          glow
            ? 'border-accent/60 shadow-[0_0_0_1px_rgba(244,190,77,0.24),0_26px_80px_-30px_rgba(244,190,77,0.5)]'
            : 'border-white/15 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]',
          hidden && 'pointer-events-none'
        )}
      >
        <Image
          src={role.image}
          alt={role.imageAlt}
          fill
          priority
          sizes="(min-width: 1024px) 460px, (min-width: 640px) 45vw, 100vw"
          placeholder="blur"
          blurDataURL={role.blurDataURL}
          className={cn(
            'role-card-image object-cover transition-transform duration-[600ms] ease-out motion-reduce:transition-none motion-reduce:scale-100',
            glow ? 'scale-[1.06]' : 'scale-100'
          )}
          style={
            {
              '--role-image-position': role.imagePosition,
              '--role-image-position-mobile': role.imagePositionMobile,
            } as React.CSSProperties
          }
        />

        {/* Readability: bottom-weighted, with a restrained top vignette so the
            chip never sits on a bright patch of photo. */}
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.95)_0%,rgba(0,0,0,0.78)_30%,rgba(0,0,0,0.38)_56%,transparent_78%)]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.6)_0%,rgba(0,0,0,0.18)_20%,transparent_38%)]"
          aria-hidden="true"
        />

        <Link
          href={role.href}
          data-click-sound
          tabIndex={hidden ? -1 : undefined}
          aria-label={`${role.title} — ${role.tagline} Register now.`}
          onClick={(event) => {
            // Modified clicks keep the browser's own new-tab/window behaviour.
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
              return;
            }
            event.preventDefault();
            if (!locked) onSelect(role);
          }}
          onKeyDown={(event) => {
            // Anchors do not activate on Space. Treat it like Enter so the card
            // is a complete keyboard control.
            if (event.key === ' ' || event.key === 'Spacebar') {
              event.preventDefault();
              if (!locked) onSelect(role);
            }
          }}
          className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none"
        >
          <span className="sr-only">{role.title}</span>
        </Link>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-end gap-3 p-5 sm:justify-start sm:p-6">
          <span className="inline-flex items-center rounded-full border border-accent/45 bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-text backdrop-blur-md">
            {role.chip}
          </span>
        </div>

        <div className="pointer-events-none relative z-20 mt-auto p-5 sm:p-6">
          {/* Extra copy expands upward from the fixed bottom stack, so the
              title and CTA never move while the card is hovered. */}
          <div
            className={cn(
              'grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none',
              glow ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            )}
            aria-hidden={!glow}
          >
            <div className="overflow-hidden">
              <p className="mb-3 max-w-[34ch] text-xs leading-relaxed text-white/85">
                {role.description}
              </p>
            </div>
          </div>

          <h3 className="text-[1.45rem] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-[1.6rem]">
            {role.title}
          </h3>
          <p className="mt-1 text-sm text-white/80">{role.tagline}</p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-[11px] font-bold text-accent-foreground shadow-[0_10px_30px_-12px_rgba(244,190,77,0.65)] transition-colors duration-200 motion-reduce:transition-none',
                glow && 'bg-accent-hover'
              )}
            >
              {role.id === 'coach' ? 'Register as Coach' : 'Register as Performer'}
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform duration-200 group-hover/role:translate-x-1 group-focus-within/role:translate-x-1 motion-reduce:transform-none"
                aria-hidden="true"
              />
            </span>

            <div
              className={cn(
                'pointer-events-auto flex items-center gap-1.5 transition-[opacity,transform] duration-300 motion-reduce:transition-none',
                'group-focus-within/role:visible group-focus-within/role:translate-y-0 group-focus-within/role:opacity-100',
                hidden
                  ? 'invisible'
                  : perksVisible
                    ? 'visible translate-y-0 opacity-100'
                    : 'invisible translate-y-2 opacity-0'
              )}
            >
              {role.perks.map((perk, index) => (
                <RolePerk
                  key={perk.id}
                  icon={perk.icon}
                  label={perk.label}
                  detail={perk.detail}
                  align={index === role.perks.length - 1 ? 'end' : 'center'}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default RoleCard;
