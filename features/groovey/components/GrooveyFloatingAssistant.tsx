'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sparkles,
  X,
  Minus,
  Maximize2,
  ArrowUp,
  RotateCcw,
  Square,
  Music,
  CheckCircle2,
  ChevronDown,
  Info,
  Layers,
  MessageSquare,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { MarkdownRenderer } from './MarkdownRenderer';
import { DisciplineType } from '../types';
import { cn } from '@/components/shared/cn';

const STARTER_PROMPTS = [
  {
    icon: '💃',
    label: '5-min dynamic dance warm-up',
    prompt: 'Give me a fast 5-minute dynamic warm-up routine for contemporary and street dance.',
    discipline: 'Dance' as DisciplineType,
  },
  {
    icon: '🎤',
    label: 'Vocal breathing exercise',
    prompt: 'Guide me through a diaphragm breathing exercise to build vocal support and range.',
    discipline: 'Singing' as DisciplineType,
  },
  {
    icon: '🎭',
    label: 'Monologue audition tips',
    prompt: 'What are key techniques to connect emotionally and stay grounded in an audition monologue?',
    discipline: 'Acting' as DisciplineType,
  },
  {
    icon: '📋',
    label: 'Pre-rehearsal focus checklist',
    prompt: 'Give me a quick mental and physical checklist to prepare for today’s rehearsal.',
    discipline: 'General' as DisciplineType,
  },
];

const DISCIPLINES: DisciplineType[] = ['Singing', 'Dance', 'Acting', 'Theater', 'Auditions', 'General'];

export const GrooveyFloatingAssistant: React.FC<{ role?: 'client' | 'coach' }> = ({ role }) => {
  const pathname = usePathname();
  const router = useRouter();

  // Role drives the launcher label: clients get "Ask AI coach", coaches (and
  // admin, which shares the coach shell treatment) get "Ask AI assistant".
  // Falls back to the URL when no explicit prop is passed.
  const resolvedRole: 'client' | 'coach' =
    role ?? (pathname?.startsWith('/coach') ? 'coach' : 'client');
  const launcherLabel = resolvedRole === 'client' ? 'Ask AI coach' : 'Ask AI assistant';

  const {
    currentConversation,
    sendMessage,
    isGenerating,
    streamingText,
    stopGeneration,
    createNewConversation,
    selectedDiscipline,
    setSelectedDiscipline,
    artistProfile,
    serverHealth,
  } = useChat();

  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [showDisciplinePicker, setShowDisciplinePicker] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // If already on the full /client/groovey page, hide floating widget
  const isFullPage = pathname === '/client/groovey';

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end',
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(true);
    }
  }, [currentConversation?.messages, streamingText, isOpen, scrollToBottom]);

  const handleSend = async (textToSend?: string) => {
    const messageContent = (textToSend ?? draft).trim();
    if (!messageContent || isGenerating) return;

    if (!textToSend) {
      setDraft('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }

    try {
      await sendMessage(messageContent);
    } catch (err) {
      console.error('Failed to send floating message:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleOpenFullPage = () => {
    setIsOpen(false);
    router.push('/client/groovey');
  };

  if (isFullPage) {
    return null;
  }

  const messages = currentConversation?.messages || [];
  const firstName = artistProfile?.name && artistProfile.name !== 'Performer' ? artistProfile.name.split(' ')[0] : 'there';

  return (
    <>
      {/* FLOATING LAUNCHER BUTTON */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-40 sm:bottom-6 sm:right-6">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label={resolvedRole === 'client' ? 'Open Groovey AI coach' : 'Open Groovey AI assistant'}
            aria-expanded={isOpen}
            className={cn(
              'group relative flex items-center gap-2.5 rounded-full border border-accent-border/80 bg-card px-4 py-2.5 text-foreground shadow-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:border-accent active:scale-95 cursor-pointer select-none',
              isGenerating && 'ring-2 ring-accent ring-offset-2 ring-offset-background'
            )}
          >
            {/* Mascot Avatar with Online indicator */}
            <div className="relative shrink-0">
              <div className="h-8 w-8 rounded-full border border-border bg-muted overflow-hidden flex items-center justify-center shadow-xs">
                <Image
                  src="/groovey/grooveyy-mascot.png"
                  alt="Grooveyy Mascot"
                  width={32}
                  height={32}
                  className="h-full w-full object-cover rounded-full select-none"
                  unoptimized
                />
              </div>
              {/* Online pulse dot */}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span
                  className={cn(
                    'absolute inline-flex h-full w-full rounded-full opacity-75',
                    isGenerating ? 'animate-ping bg-accent' : 'bg-success'
                  )}
                />
                <span
                  className={cn(
                    'relative inline-flex h-2.5 w-2.5 rounded-full border border-card',
                    isGenerating ? 'bg-accent' : 'bg-success'
                  )}
                />
              </span>
            </div>

            {/* Launcher Branding */}
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold tracking-tight text-foreground flex items-center gap-1.5">
                Grooveyy AI
                <span className="rounded bg-accent/15 px-1.5 py-0.2 text-[9px] font-bold text-accent-text tracking-wide uppercase border border-accent-border/40">
                  <Sparkles className="w-2 h-2 inline mr-0.5" /> Studio
                </span>
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                {isGenerating ? 'Coaching live…' : launcherLabel}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* FLOATING CHAT PANEL */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Grooveyy AI Floating Assistant"
          data-lenis-prevent
          className={cn(
            'fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-card/95 text-foreground shadow-2xl backdrop-blur-xl transition-all duration-300 ease-out font-sans animate-in fade-in zoom-in-95 slide-in-from-bottom-3',
            // Mobile: dock to bottom with side margins
            'inset-x-3 bottom-3 max-h-[85vh] h-[540px]',
            // Desktop: anchored bottom-right
            'sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[400px] sm:h-[560px]'
          )}
        >
          {/* HEADER: GROOVEY AI PROFILE & BRANDING */}
          <div className="relative border-b border-border bg-muted/40 px-3.5 py-2.5 shrink-0">
            <div className="flex items-center justify-between gap-2">
              {/* Left: Mascot Avatar & Identity */}
              <div
                className="flex items-center gap-2.5 min-w-0 cursor-pointer group select-none"
                onClick={() => setShowProfileCard(!showProfileCard)}
                title="Click to view Grooveyy Coach details"
              >
                <div className="relative shrink-0">
                  <div className="h-8 w-8 rounded-full border border-border bg-muted overflow-hidden flex items-center justify-center shadow-xs group-hover:border-accent transition-colors">
                    <Image
                      src="/groovey/grooveyy-mascot.png"
                      alt="Grooveyy Mascot"
                      width={32}
                      height={32}
                      className="h-full w-full object-cover rounded-full select-none"
                      unoptimized
                    />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-card bg-success" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-bold text-foreground group-hover:text-accent-text transition-colors">
                      Grooveyy AI
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-accent-soft text-accent-text text-[9px] font-semibold tracking-wide uppercase border border-accent-border/50">
                      <Sparkles className="w-2 h-2 inline" /> Studio
                    </span>
                  </div>

                  {/* Discipline Selector / Subtitle */}
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDisciplinePicker(!showDisciplinePicker);
                      }}
                      className="inline-flex items-center gap-0.5 font-medium hover:text-accent-text transition-colors"
                    >
                      <span>{selectedDiscipline} Coach</span>
                      <ChevronDown className="h-2.5 w-2.5 opacity-70" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Action Controls */}
              <div className="flex items-center gap-1 text-muted-foreground">
                {/* New session */}
                <button
                  type="button"
                  onClick={() => createNewConversation(selectedDiscipline)}
                  title="New Rehearsal Session"
                  className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>

                {/* Expand to full page */}
                <button
                  type="button"
                  onClick={handleOpenFullPage}
                  title="Open full studio (/client/groovey)"
                  className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>

                {/* Minimize */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Minimize assistant"
                  className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>

                {/* Close */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close assistant"
                  className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Discipline Dropdown Picker */}
            {showDisciplinePicker && (
              <div className="absolute top-12 left-12 z-50 rounded-xl border border-border bg-card p-1 shadow-xl backdrop-blur-md min-w-[130px]">
                <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Focus Discipline
                </p>
                {DISCIPLINES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setSelectedDiscipline(d);
                      setShowDisciplinePicker(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-2.5 py-1 text-xs text-left transition-colors cursor-pointer',
                      selectedDiscipline === d
                        ? 'bg-accent-soft text-accent-text font-bold'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <span>{d}</span>
                    {selectedDiscipline === d && <CheckCircle2 className="h-3 w-3" />}
                  </button>
                ))}
              </div>
            )}

            {/* Coach Profile Details Card Popover */}
            {showProfileCard && (
              <div className="absolute top-12 left-3 right-3 z-50 rounded-xl border border-border bg-card p-3 shadow-xl backdrop-blur-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-full border border-border bg-muted overflow-hidden flex items-center justify-center">
                      <Image
                        src="/groovey/grooveyy-mascot.png"
                        alt="Grooveyy Mascot"
                        width={40}
                        height={40}
                        className="h-full w-full object-cover rounded-full"
                        unoptimized
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Grooveyy AI Coach</h4>
                      <p className="text-[10px] text-muted-foreground">Performing Arts & Audition Specialist</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProfileCard(false)}
                    className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-2.5 space-y-1.5 border-t border-border pt-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Expertise:</span>
                    <span className="font-semibold text-foreground">Singing, Dance, Acting, Auditions</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>AI Engine:</span>
                    <span className="font-semibold text-accent-text">{serverHealth.model || 'Gemini 3.8 Flash'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Status:</span>
                    <span className="font-semibold text-success flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" /> Ready
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* MESSAGE THREAD / BODY */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3.5 py-4 space-y-3.5 no-scrollbar">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-5 px-2 space-y-4">
                {/* Mascot Avatar */}
                <div className="relative inline-flex items-center justify-center">
                  <div className="relative h-16 w-16 rounded-full bg-muted shadow-xs flex items-center justify-center p-0.5 border border-border overflow-hidden">
                    <Image
                      src="/groovey/grooveyy-mascot.png"
                      alt="Grooveyy Mascot"
                      width={64}
                      height={64}
                      className="h-full w-full object-cover rounded-full select-none"
                      unoptimized
                    />
                  </div>
                  <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-accent-soft shadow-xs border border-accent-border flex items-center justify-center text-accent-text">
                    <Sparkles className="h-3 w-3" />
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    What are we rehearsing today, {firstName}?
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
                    Grooveyy is your performing arts coach for vocal technique, choreography counts, monologue tactics, and audition prep.
                  </p>
                </div>

                {/* Quick Starter Prompts */}
                <div className="w-full space-y-2 pt-1 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                    Quick suggestions
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {STARTER_PROMPTS.map((item, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSelectedDiscipline(item.discipline);
                          handleSend(item.prompt);
                        }}
                        className="group flex items-center gap-2.5 rounded-xl border border-border bg-card/80 p-2.5 text-left text-xs transition-all hover:border-accent-border hover:bg-accent-soft/40 cursor-pointer"
                      >
                        <span className="text-sm shrink-0">{item.icon}</span>
                        <span className="truncate text-[11px] font-medium text-foreground group-hover:text-accent-text">
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex flex-col g-message-in',
                        isUser ? 'items-end' : 'items-start'
                      )}
                    >
                      <div className="flex items-end gap-1.5 max-w-[90%]">
                        {!isUser && (
                          <div className="h-6 w-6 shrink-0 rounded-full border border-border bg-muted overflow-hidden flex items-center justify-center shadow-xs">
                            <Image
                              src="/groovey/grooveyy-mascot.png"
                              alt="Grooveyy Mascot"
                              width={24}
                              height={24}
                              className="h-full w-full object-cover rounded-full"
                              unoptimized
                            />
                          </div>
                        )}
                        <div
                          className={cn(
                            'rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm',
                            isUser
                              ? 'rounded-tr-xs bg-accent-soft text-foreground border border-accent-border/50'
                              : 'rounded-tl-xs bg-muted/70 text-foreground border border-border/70'
                          )}
                        >
                          {isUser ? (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          ) : (
                            <MarkdownRenderer content={msg.content} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Streaming Assistant Response */}
                {isGenerating && streamingText && (
                  <div className="flex flex-col items-start">
                    <div className="flex items-end gap-1.5 max-w-[90%]">
                      <div className="h-6 w-6 shrink-0 rounded-full border border-border bg-muted overflow-hidden flex items-center justify-center shadow-xs">
                        <Image
                          src="/groovey/grooveyy-mascot.png"
                          alt="Grooveyy Mascot"
                          width={24}
                          height={24}
                          className="h-full w-full object-cover rounded-full"
                          unoptimized
                        />
                      </div>
                      <div className="rounded-2xl rounded-tl-xs bg-muted/70 border border-border/70 px-3.5 py-2.5 text-xs leading-relaxed shadow-sm">
                        <MarkdownRenderer content={streamingText} />
                        <span className="inline-block h-3 w-1.5 ml-1 animate-pulse bg-accent align-middle" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Generating Loading State with Stop button */}
                {isGenerating && !streamingText && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-accent animate-spin">
                      <Sparkles className="h-3 w-3" />
                    </div>
                    <span>Grooveyy is composing feedback…</span>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* COMPOSER / INPUT */}
          <div className="border-t border-border bg-card/90 p-3">
            {isGenerating && (
              <div className="mb-2 flex justify-center">
                <button
                  type="button"
                  onClick={stopGeneration}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <Square className="h-3 w-3 fill-current" />
                  <span>Stop generating</span>
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-end gap-2 rounded-2xl border border-border bg-muted/50 p-1.5 transition-all focus-within:border-accent-border focus-within:ring-1 focus-within:ring-accent/40"
            >
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={`Ask Grooveyy about ${selectedDiscipline.toLowerCase()}…`}
                className="flex-1 resize-none bg-transparent px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none max-h-[100px] leading-relaxed"
              />

              <button
                type="submit"
                disabled={!draft.trim() || isGenerating}
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
                  draft.trim() && !isGenerating && 'hover:scale-105 active:scale-95'
                )}
                title="Send message (Enter)"
              >
                <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default GrooveyFloatingAssistant;
