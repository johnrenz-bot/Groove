'use client';

import React, { useState } from 'react';
import { Bot, Send, X, Sparkles, Loader2 } from 'lucide-react';
import { CoachContext } from '@/lib/openrouter';

interface CoachAIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  coachContext?: CoachContext;
}

interface MessageItem {
  sender: 'user' | 'assistant';
  text: string;
}

export function CoachAIAssistantModal({
  isOpen,
  onClose,
  coachContext,
}: CoachAIAssistantModalProps) {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      sender: 'assistant',
      text: `Hello! I am ${coachContext?.fullName ? `Coach ${coachContext.fullName}'s` : 'the Groove'} AI assistant. Ask me anything about coaching specialties, rates, session guidelines, or performing arts preparation!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/coach-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsg,
          coach: coachContext,
        }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: data.answer || 'I could not generate an answer right now.' },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: 'Network connection issue. Please try asking again shortly.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg h-[540px] flex flex-col bg-card border border-border rounded-3xl shadow-2xl overflow-hidden text-foreground"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/80">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                <span>{coachContext?.fullName ? `Coach ${coachContext.fullName} Assistant` : 'Groove AI Coach Assistant'}</span>
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </h3>
              <p className="text-[11px] text-muted-foreground">24/7 Smart Performing Arts Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[82%] rounded-2xl p-3.5 leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-primary text-primary-foreground font-semibold rounded-br-none shadow-sm'
                    : 'bg-muted border border-border text-foreground rounded-bl-none'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted border border-border rounded-2xl rounded-bl-none p-3 flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Assistant is thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Prompt Input */}
        <form
          onSubmit={handleSend}
          className="p-3 border-t border-border bg-muted/50 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask about rate, genres, audition prep, availability..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 h-10 px-3.5 rounded-xl bg-card border border-border focus:border-primary focus:outline-none text-xs text-foreground placeholder:text-muted-foreground transition"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="h-10 w-10 rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default CoachAIAssistantModal;
