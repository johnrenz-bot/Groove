'use client';

/**
 * HubViewShell - the responsive 3-pane shell for the hub.
 *
 * Desktop (xl):  [inbox rail | case workspace | case panel]
 * Tablet (lg):   [inbox rail | case workspace]
 *                case panel hidden - opened via the Info button as a drawer
 * Mobile (<lg):  inbox full screen; tapping a row shows the workspace with a
 *                back button; the 4 sections become a bottom tab bar;
 *                case panel becomes a bottom sheet (no X in the drawer).
 */
import React, { useState } from 'react';
import {
  LayoutGrid,
  List,
  Calendar,
  MessageSquare,
  ChevronLeft,
  Wifi,
  RefreshCw,
  CalendarDays,
  UserRound,
  X,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BookingDetail } from '@/features/appointments/services/bookingService';
import type { Profile } from '@/lib/types';
import type { HubRole, HubSection, HubView, InboxRow } from '../types';
import { HubInbox } from './HubInbox';
import { HubCaseView } from './HubCaseView';
import { HubCasePanel } from './HubCasePanel';
import { HubBoardView } from './HubBoardView';
import { HubListView } from './HubListView';
import { HubCalendarView } from './HubCalendarView';
import { HubNewMessageDialog } from './HubNewMessageDialog';

const VIEW_LABEL: Record<HubView, string> = {
  inbox: 'Inbox',
  board: 'Board',
  list: 'List',
  calendar: 'Calendar',
};
const VIEW_ICON: Record<HubView, React.ReactNode> = {
  inbox: <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />,
  board: <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />,
  list: <List className="h-3.5 w-3.5" aria-hidden="true" />,
  calendar: <Calendar className="h-3.5 w-3.5" aria-hidden="true" />,
};

const SECTION_LABEL: Record<HubSection, string> = {
  messages: 'Messages',
  appointment: 'Booking',
  agreement: 'Agreement',
  schedule: 'Schedule',
};
const SECTION_ICON: Record<HubSection, React.ReactNode> = {
  messages: <MessageSquare className="h-4 w-4" aria-hidden="true" />,
  appointment: <CalendarDays className="h-4 w-4" aria-hidden="true" />,
  agreement: <Calendar className="h-4 w-4" aria-hidden="true" />,
  schedule: <UserRound className="h-4 w-4" aria-hidden="true" />,
};

export function HubViewShell(props: {
  title: string;
  eyebrow: string;
  liveMode: 'connecting' | 'live' | 'reconnecting' | 'offline';
  onRefresh: () => void;
  refreshing: boolean;
  defaultView: HubView;
  onViewChange: (v: HubView) => void;
  activeSection: HubSection;
  onSectionChange: (s: HubSection) => void;
  role: HubRole;
  viewer: Profile;
  selected: BookingDetail | null;
  partnerProfile: Profile | null;
  rows: BookingDetail[];
  inboxRows: InboxRow[];
  busyId: number | null;
  actionError: string | null;
  flashKey: string;
  onAction: (
    detail: BookingDetail,
    action: 'accept' | 'decline' | 'complete' | 'start' | 'no_show' | 'cancel'
  ) => Promise<boolean>;
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeselect: () => void;
  onBookingFromBoard: (bookingId: number) => void;
  /** Passed through to the request form - refresh the snapshot after creation. */
  onRequestCreated?: () => void;
}) {
  const {
    title,
    eyebrow,
    liveMode,
    onRefresh,
    refreshing,
    defaultView,
    onViewChange,
    activeSection,
    onSectionChange,
    role,
    viewer,
    selected,
    partnerProfile,
    rows,
    inboxRows,
    busyId,
    actionError,
    flashKey,
    onAction,
    selectedConversationId,
    onSelectConversation,
    onDeselect,
    onBookingFromBoard,
    onRequestCreated,
  } = props;

  const [panelOpen, setPanelOpen] = useState(false);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  // A partner-only (no booking yet) thread also counts as "open".
  const workspaceOpen = Boolean(selected) || Boolean(partnerProfile);

  const closeMobile = () => {
    onDeselect();
    setPanelOpen(false);
  };

  // Sidebar rows -"- read straight from the service snapshot; fall back to
  // bookings joined on first paint so the rail is never empty while loading.
  const sidebarRows: InboxRow[] = inboxRows.length > 0
    ? inboxRows
    : rows.flatMap((d) => {
        const roleColumn = role === 'client' ? 'coach_id' : 'client_id';
        const partnerId = String(
          (d.appointment as unknown as Record<string, string | null>)[roleColumn] ?? ''
        );
        const counterparty =
          (d.appointment as unknown as Record<string, Profile | null>)[
            role === 'client' ? 'coach' : 'client'
          ] ?? null;
        if (!counterparty) return [];
        return [
          {
            partnerId,
            partner: counterparty,
            bookingCount: 1,
            lastMessage: null,
            lastMessageAt: null,
            unread: 0,
            hasBooking: true,
            booking: d,
          } as InboxRow,
        ];
      });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <HubNewMessageDialog
        open={newMessageOpen}
        role={role}
        onClose={() => setNewMessageOpen(false)}
        onPick={(partnerId) => onSelectConversation(partnerId)}
      />
      {/* Hub header — editorial chrome around the workspace */}
      <header className="shrink-0 border-b border-accent-border/60 bg-card/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-2 sm:px-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent-text">{eyebrow}</p>
            <h1 className="font-sans text-lg font-semibold leading-tight tracking-[-0.01em] text-foreground">{title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground"
              title={
                liveMode === 'live'
                  ? 'Realtime channel is live'
                  : liveMode === 'offline'
                  ? 'Offline - showing last cached data'
                  : 'Reconnecting to realtime'
              }
            >
              <span
                aria-hidden="true"
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  liveMode === 'live' ? 'bg-success' : liveMode === 'offline' ? 'bg-danger' : 'bg-warning'
                )}
              />
              <Wifi className="h-3 w-3" aria-hidden="true" />
              {liveMode === 'live' ? 'Live' : liveMode === 'offline' ? 'Offline' : 'Syncing'}
            </span>
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Refresh hub"
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-border-strong hover:bg-muted disabled:opacity-60"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              aria-label="Case details"
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-border-strong hover:bg-muted xl:hidden"
            >
              <Info className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* View toggle */}
      <div className="flex shrink-0 items-center gap-1.5   border-b border-divider bg-background px-3 py-2" role="group" aria-label="Switch view">
        {(Object.keys(VIEW_LABEL) as HubView[]).map((v) => {
          const active = v === defaultView;
          return (
            <button
              key={v}
              type="button"
              aria-pressed={active}
              onClick={() => onViewChange(v)}
              className={cn(
                'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'bg-accent text-accent-foreground' : ' border border-border bg-card text-muted-foreground hover:border-accent-border hover:text-foreground'
              )}
            >
              {VIEW_ICON[v]}
              {VIEW_LABEL[v]}
            </button>
          );
        })}
      </div>

      {actionError && (
        <div
          role="alert"
          className="mx-3 mt-2 shrink-0 rounded-2xl border border-border bg-warning-soft px-3 py-2 text-[11px] text-warning"
        >
          {actionError}
        </div>
      )}

      {/* VIEW ROOT */}
      {defaultView === 'board' ? (
        <HubBoardView
          role={role}
          rows={rows}
          busyId={busyId}
          flashKey={flashKey}
          onAction={onAction}
          onOpen={(id) => onBookingFromBoard(id)}
        />
      ) : defaultView === 'list' ? (
        <HubListView
          role={role}
          rows={rows}
          busyId={busyId}
          onAction={onAction}
          onOpen={(id) => onBookingFromBoard(id)}
        />
      ) : defaultView === 'calendar' ? (
        <HubCalendarView role={role} rows={rows} />
      ) : (
        /* INBOX SPLIT */
        <>
          <div className="flex min-h-0 flex-1">
            {/* Inbox rail - hidden on mobile when a case is open */}
            <section
              aria-label="Inbox"
              className={cn(
                'min-h-0 w-full flex-col   border-divider bg-card md:flex md:w-[320px] md:shrink-0 md:border-r',
                workspaceOpen ? 'hidden' : 'flex'
              )}
            >
              <HubInbox
                rows={sidebarRows}
                role={role}
                filter={'all'}
                onFilterChange={() => undefined}
                selected={selectedConversationId}
                onSelect={(partnerId) => onSelectConversation(partnerId)}
                onNewMessage={() => setNewMessageOpen(true)}
              />
            </section>

            {/* Case workspace - shown when a case is open */}
            {workspaceOpen ? (
              <div className="relative min-w-0 flex-1">
                <button
                  type="button"
                  onClick={closeMobile}
                  aria-label="Back to inbox"
                  className="absolute left-2 top-2 z-10 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-border bg-card shadow-sm md:hidden"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <HubCaseView
                  detail={selected}
                  partner={partnerProfile}
                  viewer={viewer}
                  role={role}
                  viewerId={viewer.id}
                  section={activeSection}
                  unreadCount={inboxRows.find((r) => r.partnerId === (partnerProfile?.id ?? ''))?.unread ?? 0}
                  onSectionChange={onSectionChange}
                  onAccept={(d) => void onAction(d, 'accept')}
                  onDecline={(d) => void onAction(d, 'decline')}
                  onStart={(d) => void onAction(d, 'start')}
                  onComplete={(d) => void onAction(d, 'complete')}
                  onNoShow={(d) => void onAction(d, 'no_show')}
                  onCancel={(d) => void onAction(d, 'cancel')}
                  onRequestCreated={onRequestCreated}
                />
              </div>
            ) : (
              <div className="hidden min-h-0 flex-1 items-center justify-center px-6 text-center md:flex">
                <div>
                  <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-foreground">No conversation selected</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {role === 'client'
                      ? 'Pick a coach on the left - every session with them lives here in one thread.'
                      : 'Pick a student on the left - every booking with them lives here in one thread.'}
                  </p>
                </div>
              </div>
            )}

            {/* Case panel - desktop only */}
            <aside
              aria-label="Case summary"
              className="hidden   border-l border-divider bg-background xl:flex xl:w-[280px] xl:shrink-0 xl:flex-col"
            >
              <HubCasePanel
                detail={selected}
                role={role}
                onOpenAgreement={() => onSectionChange('agreement')}
              />
            </aside>
          </div>

          {/* Mobile bottom tab bar */}
          <nav
            aria-label="Sections"
            className="flex shrink-0 items-stretch overflow-x-auto   border-t border-divider bg-card/95 backdrop-blur sm:hidden"
          >
            {(['messages', 'appointment', 'agreement', 'schedule'] as HubSection[]).map((s) => {
              const active = s === activeSection;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSectionChange(s)}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 px-2 text-[9px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active ? 'text-accent-text' : 'text-muted-foreground'
                  )}
                >
                  {SECTION_ICON[s]}
                  <span className="truncate">{SECTION_LABEL[s]}</span>
                </button>
              );
            })}
          </nav>

          {/* Mobile bottom sheet for case panel */}
          {panelOpen && (
            <div
              className="fixed inset-0 z-30 flex flex-col justify-end bg-black/50"
              role="dialog"
              aria-modal="true"
              aria-label="Case summary"
            >
              <div className="h-[70vh] overflow-y-auto rounded-t-3xl border border-border bg-card shadow-2xl">
                <div className="flex items-center justify-between gap-2   border-b border-divider px-4 py-3">
                  <h2 className="text-sm font-bold text-foreground">Case summary</h2>
                  <button
                    type="button"
                    onClick={() => setPanelOpen(false)}
                    aria-label="Close case summary"
                    className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <HubCasePanel
                  detail={selected}
                  role={role}
                  onOpenAgreement={() => {
                    onSectionChange('agreement');
                    setPanelOpen(false);
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

