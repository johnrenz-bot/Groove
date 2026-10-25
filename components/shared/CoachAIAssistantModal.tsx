'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Bot,
  Send,
  Sparkles,
  Loader2,
  MapPin,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { MarkdownRenderer } from '@/features/groovey/components/MarkdownRenderer';
import { getInitials } from '@/lib/utils';
import {
  ModalCloseButton,
  MODAL_CLOSE_BUTTON_CLASS,
  MODAL_HEADER_CLASS,
  MODAL_OVERLAY_CLASS,
  MODAL_PANEL_CLASS,
  useModalDismiss,
} from '@/components/ui/Modal';
import { cn } from '@/components/shared/cn';

export interface CoachAIContext {
  id?: string;
  fullName: string;
  role?: string | null;
  talents?: string | null;
  genres?: string | null;
  bio?: string | null;
  serviceFee?: number | null;
  hourlyRate?: number | null;
  duration?: string | null;
  location?: string | null;
  address?: string | null;
  photoUrl?: string | null;
}

interface CoachAIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  coachContext?: CoachAIContext | null;
}

interface MessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
}

function CoachAIModalContent({
  coachContext,
  onClose,
}: {
  coachContext?: CoachAIContext | null;
  onClose: () => void;
}) {
  const coachId = coachContext?.id || '';
  const coachName = coachContext?.fullName || 'Groove Coach';
  const firstName = coachName.split(' ')[0] || 'the coach';
  const talents = coachContext?.talents;

  const buildGreeting = useCallback(() => {
    const disciplineText = talents ? ` specializing in **${talents}**` : '';
    return `Hello! I am **Coach ${coachName}'s** AI Assistant${disciplineText}.\n\nAsk me anything about their dance/performing arts styles, beginner suitability, unique coaching strengths, session rates, or booking guidelines!`;
  }, [coachName, talents]);

  const [messages, setMessages] = useState<MessageItem[]>(() => [
    {
      id: `greeting-${coachId}`,
      sender: 'assistant',
      text: buildGreeting(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [msgCounter, setMsgCounter] = useState(1);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const starterPrompts = [
    {
      label: '🎭 Styles taught',
      prompt: `What dance and performing arts styles does Coach ${firstName} teach?`,
    },
    {
      label: '🌱 Beginner friendly?',
      prompt: `Is Coach ${firstName} suitable for beginners with no prior experience?`,
    },
    {
      label: '✨ What makes them unique?',
      prompt: `What makes Coach ${firstName} different and what is their coaching background?`,
    },
    {
      label: '💰 Rates & duration',
      prompt: `What are Coach ${firstName}'s session rates, duration, and booking guidelines?`,
    },
  ];

  const handleSendPrompt = async (promptText: string) => {
    const text = promptText.trim();
    if (!text || loading) return;

    setInput('');
    const currentCount = msgCounter;
    setMsgCounter((prev) => prev + 2);

    const userMsgId = `user-${currentCount}`;
    const newMessages: MessageItem[] = [
      ...messages,
      { id: userMsgId, sender: 'user', text },
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Build history excluding initial greeting
      const history = newMessages
        .slice(1, -1)
        .map((m) => ({ role: m.sender, content: m.text }));

      const res = await fetch('/api/ai/coach-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          coachId: coachContext?.id,
          history,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${currentCount + 1}`,
            sender: 'assistant',
            text: data.error || 'I could not answer this question right now. Please try asking again.',
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${currentCount + 1}`,
          sender: 'assistant',
          text: data.answer || 'I could not generate an answer right now.',
        },
      ]);
    } catch (err) {
      console.error('[CoachAIModal] network error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${currentCount + 1}`,
          sender: 'assistant',
          text: 'Network connection issue. Please check your connection and try again.',
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendPrompt(input);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `greeting-${coachId}-${msgCounter}`,
        sender: 'assistant',
        text: buildGreeting(),
      },
    ]);
    setInput('');
  };

  const initials = getInitials(
    coachName.replace(/^Coach\s+/i, '').split(' ')[0] || 'C',
    coachName.replace(/^Coach\s+/i, '').split(' ')[1] || 'H'
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ask AI about Coach ${coachName}`}
      className={cn(
        MODAL_PANEL_CLASS,
        'h-[32rem] max-h-[92vh] max-w-lg animate-in fade-in zoom-in-95 duration-300'
      )}
    >
      {/* Header */}
      <div className={cn(MODAL_HEADER_CLASS, 'items-center gap-3 p-4 sm:p-4')}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-10 h-10 rounded-2xl bg-accent-soft border border-accent-border/60 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
            {coachContext?.photoUrl ? (
              <Image
                src={coachContext.photoUrl}
                alt={coachName}
                width={40}
                height={40}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <span className="text-xs font-bold text-accent-text uppercase">
                {initials}
              </span>
            )}
            <span
              className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-card"
              title="AI Assistant Active"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-foreground truncate">
                Coach {coachName.replace(/^Coach\s+/i, '')} Assistant
              </h3>
              <Sparkles className="w-3.5 h-3.5 text-accent-text shrink-0" />
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate">
              <span className="truncate">
                {coachContext?.talents || 'Performing Arts'}
              </span>
              {(coachContext?.location || coachContext?.address) && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-0.5 truncate">
                    <MapPin className="w-3 h-3 text-accent-text shrink-0" />
                    {coachContext.location || coachContext.address}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleResetChat}
            className={MODAL_CLOSE_BUTTON_CLASS}
            aria-label="Reset conversation"
            title="Reset conversation"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
          </button>
          <ModalCloseButton onClose={onClose} label="Close assistant" />
        </div>
      </div>

      {/* Quick Question Chips */}
      <div className="px-3.5 py-2 bg-muted/30 border-b border-border/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none shrink-0">
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1 shrink-0 pl-0.5 pr-1">
          <HelpCircle className="w-3 h-3 text-accent-text" />
          Ask:
        </span>
        {starterPrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendPrompt(p.prompt)}
            disabled={loading}
            className="shrink-0 px-2.5 py-1 rounded-full bg-card hover:bg-accent-soft text-foreground hover:text-accent-text text-[11px] font-medium border border-border shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-40"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Message Stream */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs min-h-0 bg-background/50"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'assistant' ? (
              <div className="max-w-[88%] bg-card border border-border text-foreground rounded-2xl rounded-tl-sm p-3.5 shadow-xs space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-accent-text uppercase tracking-wide mb-1">
                  <Bot className="w-3.5 h-3.5" />
                  <span>Coach Assistant</span>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
                  <MarkdownRenderer content={m.text} />
                </div>
              </div>
            ) : (
              <div className="max-w-[82%] bg-accent text-accent-foreground font-medium rounded-2xl rounded-tr-sm p-3.5 shadow-xs leading-relaxed">
                {m.text}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm p-3.5 flex items-center gap-2 text-muted-foreground text-xs shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-accent-text shrink-0" />
              <span>Coach Assistant is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Prompt Input Composer */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-border bg-card flex flex-col gap-1.5 shrink-0"
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder={`Ask about Coach ${firstName}'s styles, beginner prep, rates...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 h-10 px-3.5 rounded-xl bg-muted/60 border border-border focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none text-xs text-foreground placeholder:text-muted-foreground transition"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="h-10 w-10 rounded-xl bg-accent text-accent-foreground hover:bg-accent-hover disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95"
            aria-label="Send question"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between px-1 text-[10px] text-muted-foreground">
          <span>Enter to send • Answers grounded on verified profile</span>
          <span className="text-accent-text font-medium">Groovey AI Engine</span>
        </div>
      </form>
    </div>
  );
}

export function CoachAIAssistantModal({
  isOpen,
  onClose,
  coachContext,
}: CoachAIAssistantModalProps) {
  const { backdropProps } = useModalDismiss({
    open: isOpen,
    onClose,
    dismissOnBackdrop: false,
  });

  if (!isOpen) return null;

  const coachKey = coachContext?.id || coachContext?.fullName || 'default-coach';

  return (
    <div
      className={cn(MODAL_OVERLAY_CLASS, 'animate-in fade-in')}
      role="presentation"
      {...backdropProps}
    >
      <CoachAIModalContent
        key={coachKey}
        coachContext={coachContext}
        onClose={onClose}
      />
    </div>
  );
}

export default CoachAIAssistantModal;
