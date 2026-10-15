'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import {
  Activity,
  Mic,
  Drama,
  Music,
  Sparkles,
  ArrowUpRight,
  Paperclip,
  ArrowUp,
  ChevronDown,
  Check,
  LucideIcon,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { DisciplineType } from '../types';

export const GrooveyStudioLobby: React.FC = () => {
  const {
    selectedDiscipline,
    setSelectedDiscipline,
    isGenerating,
    createNewConversation,
    showToast,
  } = useChat();

  const [inputVal, setInputVal] = useState('');
  const [modelPreset, setModelPreset] = useState('Grooveyy Maestro 3.5');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filterTabs: { name: DisciplineType; label: string; icon: LucideIcon }[] = [
    { name: 'Dance', label: 'Dance', icon: Activity },
    { name: 'Singing', label: 'Singing', icon: Mic },
    { name: 'Acting', label: 'Acting', icon: Drama },
    { name: 'Music', label: 'Music', icon: Music },
    { name: 'Choreography', label: 'Choreography', icon: Activity },
    { name: 'Stage Performance', label: 'Stage Prep', icon: Sparkles },
  ];

  const suggestionCards = [
    {
      title: 'Help me improve my dance technique',
      subtitle: 'Balance, pirouettes & alignment tips',
      icon: Activity,
      discipline: 'Dance' as DisciplineType,
      prompt: 'Help me improve my dance technique. What are the key drills for balance, pirouette spotting, and core alignment?',
    },
    {
      title: 'Teach me vocal warm-up exercises',
      subtitle: 'Resonance, scale patterns & breath',
      icon: Mic,
      discipline: 'Singing' as DisciplineType,
      prompt: 'Teach me a safe 10-minute vocal warm-up routine with SOVT lip trills, breath support exercises, and resonance drills.',
    },
    {
      title: 'Help me prepare for an audition',
      subtitle: 'Monologue pacing & cold reading',
      icon: Drama,
      discipline: 'Acting' as DisciplineType,
      prompt: 'Help me prepare for an upcoming audition. Give me a strategy for monologue pacing, finding beats, and cold reading confidence.',
    },
    {
      title: 'Explain stage acting techniques',
      subtitle: 'Stanislavski, projection & cues',
      icon: Sparkles,
      discipline: 'Theater' as DisciplineType,
      prompt: 'Explain Stanislavski and Uta Hagen stage acting techniques: how do I apply objective, obstacle, and tactic to a live scene?',
    },
  ];

  const handleCardClick = (prompt: string, discipline: DisciplineType) => {
    setSelectedDiscipline(discipline);
    createNewConversation(discipline, prompt);
  };

  const handleSend = () => {
    if (!inputVal.trim() || isGenerating) return;
    const text = inputVal.trim();
    setInputVal('');
    createNewConversation(selectedDiscipline, text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputVal(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleToggleVoice = () => {
    const windowWithSpeech = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onresult: (event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onresult: (event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
      };
    };

    const SpeechRecognition =
      windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      setIsListening(true);
      showToast('Listening... Speak your prompt 🎙️');

      recognition.onresult = (event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setInputVal((prev) => (prev ? `${prev} ${transcript}` : transcript));
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    showToast(`Attached reference: ${file.name}`);
    setInputVal((prev) =>
      prev ? `${prev} [Attached Repertoire Reference: ${file.name}]` : `[Reference: ${file.name}] `
    );
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto flex flex-col justify-between items-center text-center">
      {/* Hero Presentation */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative mb-3 flex items-center justify-center">
          <div className="relative w-24 h-24 rounded-full bg-card shadow-md flex items-center justify-center p-1.5 overflow-hidden border border-border">
            <Image
              src="/groovey/grooveyy-mascot.png"
              alt="Grooveyy Performing Arts Companion"
              width={96}
              height={96}
              className="w-full h-full object-cover rounded-full select-none"
              unoptimized
            />
          </div>
          <span className="absolute bottom-0 right-1 w-6 h-6 rounded-full bg-accent-soft shadow-xs flex items-center justify-center text-accent-text border border-accent-border">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Meet Grooveyy Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted mb-3 shadow-xs border border-border">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs text-foreground tracking-wide font-medium">
            Meet Grooveyy, your Performing Arts AI
          </span>
        </div>

        <h1 className="text-2xl leading-tight text-foreground tracking-tight max-w-sm mb-2 font-bold">
          Hey, what would you like to explore in performing arts?
        </h1>
        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
          Your creative space for movement, music, and dramatic stage performance.
        </p>
      </div>

      {/* Discipline Horizontal Pill Carousel */}
      <div className="w-full mb-4 overflow-x-auto no-scrollbar flex items-center gap-2 select-none justify-center flex-wrap">
        {filterTabs.map((tab) => {
          const isSelected = selectedDiscipline === tab.name;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.name}
              type="button"
              onClick={() => setSelectedDiscipline(tab.name)}
              className={`px-3.5 py-1.5 rounded-full text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                isSelected
                  ? 'bg-accent text-accent-foreground font-semibold'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border'
              }`}
            >
              <TabIcon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Suggestion Cards 2x2 Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full mb-5">
        {suggestionCards.map((card, i) => {
          const CardIcon = card.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleCardClick(card.prompt, card.discipline)}
              className="group text-left p-3.5 rounded-2xl bg-card hover:bg-muted/60 transition-all flex flex-col justify-between active:scale-[0.98] border border-border cursor-pointer shadow-xs"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-accent-soft text-accent-text flex items-center justify-center border border-accent-border/50">
                  <CardIcon className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-accent-text transition-colors" />
              </div>
              <div>
                <p className="text-xs text-foreground font-semibold mb-1 line-clamp-2">
                  {card.title}
                </p>
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {card.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Prompt Composer */}
      <div className="w-full relative">
        {/* Model Selector Bar */}
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowModelMenu(!showModelMenu)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card hover:bg-muted border border-border text-[11px] text-foreground font-medium transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-accent" />
              <span>{modelPreset}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>

            {showModelMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowModelMenu(false)}
                />
                <div className="absolute left-0 bottom-full mb-1.5 w-56 rounded-xl bg-card border border-border shadow-lg p-1.5 z-20 text-left text-xs">
                  {[
                    { name: 'Grooveyy Maestro 3.5', tag: 'Fast • Creative drills' },
                    { name: 'Grooveyy Virtuoso Pro', tag: 'Deep harmonic analysis' },
                  ].map((m) => (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => {
                        setModelPreset(m.name);
                        setShowModelMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted text-foreground transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold">{m.name}</div>
                        <div className="text-[10px] text-muted-foreground">{m.tag}</div>
                      </div>
                      {modelPreset === m.name && <Check className="w-3.5 h-3.5 text-accent" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Input Textarea Container */}
        <div className="relative bg-muted/50 rounded-2xl border border-border focus-within:border-accent p-2 shadow-sm transition-all flex flex-col gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputVal}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask Grooveyy for vocal mechanics, choreography cues, or scene beats..."
            className="w-full bg-transparent resize-none outline-none text-xs text-foreground placeholder:text-muted-foreground px-2 pt-1 max-h-32"
          />

          <div className="flex items-center justify-between px-1 pt-1 border-t border-border/50">
            <div className="flex items-center gap-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileAttach}
                className="hidden"
                accept=".pdf,.txt,.doc,.docx"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Attach sheet music or script"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleToggleVoice}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isListening
                    ? 'bg-accent text-accent-foreground animate-pulse'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                title="Voice dictation"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleSend}
              disabled={!inputVal.trim()}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer bg-accent text-accent-foreground hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              title="Send prompt"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
