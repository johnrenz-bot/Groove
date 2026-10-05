'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Send, Sparkles, User, AlertCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { parseGenres } from '@/lib/utils';
import type { FullCoach } from '@/lib/types';

/**
 * The talent page's coach assistant.
 *
 * Deliberately an inline card rather than a modal: the directory is the page's
 * job, and the assistant sits beneath it as a section a client can scroll to and
 * come back to. Opening it must not navigate away or cover the coaches.
 *
 * DATA: this component sends only `prompt`, `history` and an optional `coachId`.
 * It never sends coach facts. `/api/ai/coach-assistant` re-reads them from the
 * database under the caller's own session, so a tampered client payload cannot
 * put invented rates or specialties in front of the model.
 *
 * PERSISTENCE: none, deliberately. This is a stateless Q&A helper, not a
 * conversation between people, so it writes nothing to the `messages` table and
 * cannot interfere with the Human Messenger. Conversation context lives in
 * component state and is sent with each request; a reload starts fresh.
 */

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_PROMPT = 1000;

export function TalentCoachAssistant({ coach }: { coach: FullCoach }) {
  const coachName = `${coach.firstname} ${coach.lastname}`.trim();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  // The greeting is derived from the real coach row rather than hard-coded, so
  // it can never name a coach who is not the one whose facts are sent.
  const greeting = `Hello! I am Coach ${coachName}'s AI assistant. Ask me anything about coaching specialties, rates, session guidelines, or performing arts preparation!`;

  // Switching coaches resets the transcript. Done as a render-time state
  // adjustment rather than an effect: React's documented pattern for "reset
  // state when a prop changes". An effect here would be a cascading render, and
  // would briefly show the previous coach's messages under the new coach's name.
  const coachKey = coach.id;
  const [resetFor, setResetFor] = useState(coachKey);
  if (resetFor !== coachKey) {
    setResetFor(coachKey);
    setMessages([]);
    setError(null);
    setInput('');
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const send = async () => {
    const prompt = input.trim();
    if (!prompt || loading) return;

    // Empty-message validation: nothing is sent and nothing is added.
    if (prompt.length > MAX_PROMPT) {
      setError(`Please keep your question under ${MAX_PROMPT} characters.`);
      return;
    }

    setError(null);
    setInput('');

    // History for context, excluding the message being added now.
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: 'user', content: prompt }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/coach-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, history, coachId: coach.id }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        answer?: string;
        error?: string;
      };

      if (!res.ok) {
        // 401 / 403 land here too, with the server's own explanation.
        setError(data.error ?? 'The assistant could not respond. Please try again.');
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer ?? 'I could not generate an answer.' },
      ]);
    } catch {
      setError('Network problem. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Enter sends, Shift+Enter inserts a newline.
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const genres = parseGenres(coach.coach_profile?.genres);

  return (
    <Card padding="md" className="overflow-hidden">
      {/* Header doubles as the open/close control. */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setError(null);
          if (!open) setTimeout(() => inputRef.current?.focus(), 60);
        }}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3.5 text-left"
      >
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-accent-border bg-accent-soft text-accent-text"
        >
          <Bot className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-foreground">
              Coach {coachName} Assistant
            </span>
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
          </span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">
            24/7 Smart Performing Arts Assistant
          </span>
        </span>
        <span className="shrink-0 rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground">
          {open ? 'Hide' : 'Ask'}
        </span>
      </button>

      {/* Verified facts. Rendered from the same columns the server sends to the
          model, so the card cannot advertise something the AI does not know. */}
      <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
        <span className="g-pill">{coach.coach_profile?.talents || 'Performing Arts'}</span>
        {genres.slice(0, 5).map((g) => (
          <span key={g} className="g-pill">
            {g}
          </span>
        ))}
        {coach.coach_profile?.service_fee ? (
          <span className="g-pill-accent text-xs font-bold">
            ₱{coach.coach_profile.service_fee}
            {coach.coach_profile.duration ? ` / ${coach.coach_profile.duration}` : ''}
          </span>
        ) : null}
      </div>

      {open && (
        <div className="mt-4 border-t border-divider pt-4">
          {/* Transcript */}
          <div
            ref={scrollRef}
            className="g-scroll max-h-80 min-h-40 space-y-3 overflow-y-auto pr-1"
            aria-live="polite"
            aria-label="Assistant conversation"
          >
            {messages.length === 0 && !loading ? (
              <div className="rounded-2xl border border-border bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
                {greeting}
              </div>
            ) : (
              <>
                {/* Greeting always heads the transcript. */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-card p-3.5 text-xs leading-relaxed text-foreground">
                    {greeting}
                  </div>
                </div>
                {messages.map((m, i) => (
                  <div
                    key={`${m.role}-${i}`}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] whitespace-pre-line rounded-2xl p-3.5 text-xs leading-relaxed ${
                        m.role === 'user'
                          ? 'rounded-br-md bg-accent font-medium text-accent-foreground shadow-[var(--shadow-sm)]'
                          : 'rounded-bl-md border border-border bg-card text-foreground'
                      }`}
                    >
                      {m.role === 'assistant' && (
                        <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-accent-text">
                          <Bot className="h-3 w-3" aria-hidden="true" />
                          Assistant
                        </span>
                      )}
                      {m.content}
                    </div>
                  </div>
                ))}
              </>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-3 text-xs text-muted-foreground">
                  <Loader2 className="g-spin h-3.5 w-3.5 text-accent" aria-hidden="true" />
                  Coach {coachName.split(' ')[0]}&apos;s assistant is typing…
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* Composer */}
          <div className="mt-3 flex items-end gap-2">
            <label htmlFor="talent-assistant-input" className="sr-only">
              Ask the coach assistant a question
            </label>
            <textarea
              ref={inputRef}
              id="talent-assistant-input"
              rows={1}
              value={input}
              maxLength={MAX_PROMPT}
              placeholder="Ask about specialties, rates, session length…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading}
              className="g-input max-h-28 min-h-11 flex-1 resize-y py-3 text-sm"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              aria-label="Send question"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[var(--shadow-sm)] transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="g-spin h-4 w-4" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-subtle-foreground">
            <User className="h-3 w-3" aria-hidden="true" />
            Enter to send · Shift+Enter for a new line · Answers use only this
            coach&apos;s listed details
          </p>
        </div>
      )}
    </Card>
  );
}

export default TalentCoachAssistant;