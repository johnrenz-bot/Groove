'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, CheckCircle2, Users, Calendar, Star, Shield, FileText, Bot } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/shared/cn';
import { useScrollReveal } from '@/components/shared/useScrollReveal';

export function FinalCta() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1, rootMargin: '0px 0px -100px 0px' });

  const benefits = [
    { icon: Calendar, title: 'Book rehearsals & sessions', description: 'Real-time calendar with instant confirmation.' },
    { icon: Shield, title: 'Verified coaches & studios', description: 'Reviewed and approved before they appear.' },
    { icon: FileText, title: 'Digital contracts & e-signatures', description: 'Legally binding agreements, signed online.' },
    { icon: Users, title: 'Community Showcase', description: 'Share performances, get feedback, connect.' },
    { icon: Bot, title: 'Groovey AI Assistant', description: '24/7 instant answers about bookings and policies.' },
  ];

  return (
    <section ref={ref} className="g-section mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
      <div className="relative rounded-3xl overflow-hidden">
        {/* Background pattern - brick tile */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#C9A24A]/5 via-transparent to-transparent" />
        <div
          className="absolute inset-0 -z-10 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30h60M30 0v60' stroke='%23C9A24A' stroke-width='0.5' stroke-opacity='0.3'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
          }}
          aria-hidden="true"
        />

        {/* Sunburst star behind heading */}
        <div
          className="absolute top-10 left-1/2 -translate-x-1/2 -z-10 w-48 h-48 bg-gradient-to-r from-[#C9A24A]/20 to-transparent rounded-full blur-2xl"
          aria-hidden="true"
        />

        <div className="relative px-6 py-16 sm:px-12 sm:py-20 lg:px-16 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <p className="gl-hero-badge inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/80 backdrop-blur-sm mb-6">
              <Sparkles className="h-3.5 w-3.5 text-[#C9A24A]" aria-hidden="true" />
              Ready to begin
            </p>

            <h2 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl mb-6">
              Ready to take the stage?
            </h2>

            <p className="mx-auto max-w-xl text-base leading-relaxed text-white/60 mb-10 sm:text-lg">
              Join the growing community of performers and coaches in San Jose del Monte.
              Sign up in minutes and start your journey today.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button
                size="lg"
                className="rounded-full bg-[#C9A24A] px-8 py-4 text-base font-semibold text-black hover:bg-[#F5B52E] hover:shadow-[0_0_40px_rgba(201,162,74,0.5)]"
                trailingIcon={<ArrowRight className="h-5 w-5" />}
              >
                Get started free
              </Button>
              <a
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2.5 rounded-full border border-white/20 bg-transparent px-6 text-[0.9375rem] font-semibold tracking-[-0.01em] text-white transition-all duration-200 hover:-translate-y-px hover:bg-white/[0.05] hover:border-[#C9A24A]/50"
              >
                Sign in
              </a>
            </div>

            {/* Benefits row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 text-left"
            >
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.08 }}
                  className="flex items-start gap-3 p-5 rounded-xl border border-white/10 bg-white/[0.03] hover:border-[#C9A24A]/30 hover:bg-white/[0.05] transition-all"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C9A24A]/10 text-[#C9A24A]">
                    <benefit.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-semibold text-white">{benefit.title}</p>
                    <p className="text-sm text-white/60">{benefit.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default FinalCta;