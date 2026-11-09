'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown, HelpCircle, ArrowRight, MessageCircle } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { FilipinoPatternBackground } from './FilipinoPatternBackground';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: 'What is Groove and who is it designed for?',
    answer:
      'Groove is a dedicated performing-arts platform for San Jose del Monte, Bulacan. It connects performers across dance, vocal, acting, and theater with verified coaches, local rehearsal studios, and digital session agreements in one unified place.',
  },
  {
    question: 'Is Groove free to join and use?',
    answer:
      'Yes. Creating an account as a performer or coach is completely free. Performers pay only agreed coaching or studio session rates directly to instructors with no hidden platform subscription fees.',
  },
  {
    question: 'How do coaches get verified on Groove?',
    answer:
      'Coaches submit proof of identification, credentials, certifications, and teaching portfolios. Our administration thoroughly inspects each document before awarding the official verified badge on their public profile.',
  },
  {
    question: 'What are digital session agreements and how do they protect me?',
    answer:
      'When you book a session on Groove, the date, time, hourly rate, and session scope are automatically bound into an official digital agreement with timestamped e-signatures so neither side is forced to rely on memory.',
  },
  {
    question: 'How does the Rehearsal Studio Locator work?',
    answer:
      'The locator provides a curated directory of dance, acting, and music rehearsal studios across San Jose del Monte and surrounding Bulacan municipalities with verified location markers and amenity lists.',
  },
  {
    question: 'Can I message a coach before booking or committing?',
    answer:
      'Yes. Direct messaging lets performers discuss routine goals, song choices, rates, and schedule options with coaches before confirming or paying for a session.',
  },
  {
    question: 'What is Groovey AI and how does it assist me?',
    answer:
      'Groovey AI is our intelligent assistant powered by Google Gemini, designed to answer discipline inquiries, offer studio tips, and help navigate booking workflows 24/7.',
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const prefersReducedMotion = useReducedMotion();

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      id="faq"
      className="relative mx-auto flex w-full max-w-[1240px] flex-col items-center px-6 py-24 sm:px-8 lg:px-10 lg:py-32 scroll-mt-24"
    >
      {/* Filipino-Inspired Background Pattern */}
      <FilipinoPatternBackground variant="subtle" />

      {/* Centered Section Header */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="w-full text-center flex flex-col items-center"
      >
        <SectionHeading
          eyebrow="Help & Frequently Asked Questions"
          title="Everything you need to know about Groove."
          description="Clear answers about accounts, coach verification, digital agreements, and studio bookings."
          align="center"
          className="mx-auto"
        />
      </motion.div>

      {/* Centered Accordion List Container with Consistent Max Width */}
      <div className="mt-12 mx-auto w-full max-w-[840px] space-y-3.5">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <motion.div
              key={faq.question}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className={`w-full rounded-[20px] border transition-all duration-200 overflow-hidden ${
                isOpen
                  ? 'border-[#E8B84B]/40 bg-[#121212]/90 shadow-[0_8px_30px_rgba(232,184,75,0.08)]'
                  : 'border-white/5 bg-[#121212]/60 hover:border-white/15 hover:bg-[#121212]/80'
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 p-5 sm:p-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B84B]"
              >
                <span className="flex items-center gap-3.5">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      isOpen
                        ? 'bg-[#E8B84B] text-black shadow-[0_0_12px_rgba(232,184,75,0.4)]'
                        : 'bg-white/5 text-white/50'
                    }`}
                  >
                    0{idx + 1}
                  </span>
                  <span className="text-base font-semibold text-white tracking-wide">
                    {faq.question}
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform duration-300 ${
                    isOpen ? 'rotate-180 text-[#E8B84B]' : 'text-white/40'
                  }`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="px-6 pb-6 pt-1 text-sm leading-relaxed text-white/65 border-t border-white/5">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Centered Contact Support Card */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-10 mx-auto flex w-full max-w-[840px] flex-col sm:flex-row items-center justify-between gap-4 rounded-[20px] border border-white/5 bg-[#121212]/60 p-6 backdrop-blur-md"
      >
        <div className="flex items-center gap-3.5 text-center sm:text-left">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-[#E8B84B]/20 bg-[#E8B84B]/10 text-[#E8B84B]">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Have more questions?</p>
            <p className="text-xs text-white/55">Explore our complete knowledgebase or get in touch with our team.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/faq"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Visit Full FAQ
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/about-project"
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#E8B84B]/15 border border-[#E8B84B]/30 px-4 py-2 text-xs font-semibold text-[#E8B84B] hover:bg-[#E8B84B]/25 transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Contact Support
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

export default FaqSection;
