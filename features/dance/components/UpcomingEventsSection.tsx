'use client';

import React from 'react';
import { CalendarDays, MapPin, ExternalLink, Ticket, Trophy } from 'lucide-react';
import type { DanceUpdateRecord } from '../services/danceService';

interface UpcomingEventsSectionProps {
  events: DanceUpdateRecord[];
  loading?: boolean;
}

export function UpcomingEventsSection({ events, loading }: UpcomingEventsSectionProps) {
  if (loading) {
    return (
      <section id="upcoming-events" className="border-b border-[#0E1C26] bg-[#0A141C] py-16 text-white">
        <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
          <div className="h-8 w-64 animate-pulse bg-white/10" />
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 animate-pulse border border-white/10 bg-[#050B10]" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return null;
  }

  return (
    <section id="upcoming-events" className="border-b border-[#0E1C26] bg-[#0A141C] py-16 text-white">
      <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
        {/* Section Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 bg-[#C8102E]" />
              <span className="font-mono text-xs font-black uppercase tracking-widest text-[#C6F10E]">
                SCHEDULED BATTLES & COMPETITIONS
              </span>
            </div>
            <h2 className="mt-1 text-3xl font-black uppercase tracking-tight sm:text-4xl">
              UPCOMING <span className="text-[#C6F10E]">EVENTS</span>
            </h2>
          </div>
          <p className="max-w-md font-mono text-xs text-[#93A3AF]">
            Official dates, certified locations, and direct registration links for upcoming league battles.
          </p>
        </div>

        {/* Events Grid */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((evt) => {
            const dateObj = evt.event_date ? new Date(evt.event_date) : null;
            const monthStr = dateObj
              ? dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
              : 'TBD';
            const dayStr = dateObj ? dateObj.getDate() : '--';

            return (
              <div
                key={evt.id}
                className="group relative flex flex-col justify-between border border-white/10 bg-[#050B10] p-5 transition-all hover:border-[#C6F10E] hover:shadow-[0_8px_25px_rgba(198,241,14,0.15)]"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    {/* Stylized Sports Date Box */}
                    <div className="flex shrink-0 flex-col items-center justify-center border-2 border-[#C8102E] bg-[#0A141C] px-3.5 py-2 font-mono shadow-sm">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#C6F10E]">
                        {monthStr}
                      </span>
                      <span className="text-2xl font-black text-white">{dayStr}</span>
                    </div>

                    {/* Org / Category Badges */}
                    <div className="flex flex-col items-end gap-1">
                      <span className="bg-white/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
                        {evt.organization}
                      </span>
                      <span className="font-mono text-[9px] uppercase text-[#93A3AF]">
                        {evt.category}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="mt-4 line-clamp-2 font-mono text-base font-black uppercase tracking-tight text-white group-hover:text-[#C6F10E]">
                    {evt.title}
                  </h3>

                  {/* Location Info */}
                  {evt.location && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#93A3AF]">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-[#C8102E]" />
                      <span className="line-clamp-1">{evt.location}</span>
                    </div>
                  )}
                </div>

                {/* Registration Button */}
                <div className="mt-5 border-t border-white/5 pt-4">
                  <a
                    href={evt.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 border border-[#C8102E] bg-[#C8102E]/20 py-2.5 font-mono text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-[#C8102E] hover:text-white"
                  >
                    <Ticket className="h-3.5 w-3.5" />
                    <span>REGISTER / TICKETS</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
