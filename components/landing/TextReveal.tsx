'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface TextRevealProps {
  children: string;
  className?: string;
  /** Delay before animation starts (ms) */
  delay?: number;
  /** Stagger delay between characters/words (ms) */
  stagger?: number;
  /** Whether to animate by character or word */
  mode?: 'character' | 'word';
}

/**
 * TextReveal - Staggered text entrance animation.
 *
 * Animates text in character by character or word by word with a stagger effect.
 * Creates a premium, cinematic feel for headings and important text.
 * Respects prefers-reduced-motion.
 */
export function TextReveal({
  children,
  className = '',
  delay = 0,
  stagger = 30,
  mode = 'character',
}: TextRevealProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <span className={className}>{children}</span>;
  }

  // Split text based on mode
  const words = children.split(' ');
  const textArray = mode === 'character'
    ? children.split('')
    : words.map((word, i) => (
        <React.Fragment key={i}>
          {word}
          {i < words.length - 1 && '\u00A0'}
        </React.Fragment>
      ));

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: stagger / 1000, delayChildren: delay / 1000 } as const,
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
      transition: {
        type: 'spring' as const,
        damping: 12,
        stiffness: 100,
      },
    },
  };

  return (
    <motion.span
      className={className}
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
    >
      {textArray.map((char, index) => (
        <motion.span
          key={index}
          variants={child}
          style={{ display: 'inline-block', whiteSpace: 'pre' }}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
}

export default TextReveal;
