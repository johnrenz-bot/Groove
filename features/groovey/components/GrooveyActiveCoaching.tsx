'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  Music,
  Info,
  Mic,
  Drama,
  Activity,
  Clock,
  ArrowRight,
  Copy,
  Bookmark,
  Download,
  Repeat,
  Paperclip,
  ArrowUp,
  Square,
  X,
  Sparkles,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { MarkdownRenderer } from './MarkdownRenderer';
import { DisciplineType } from '../types';

export const GrooveyActiveCoaching: React.FC = () => {
  const {
    currentConversation,
    sendMessage,
    isGenerating,
    streamingText,
    stopGeneration,
    saveToRepertoire,
    showToast,
    error,
    clearError,
    artistProfile,
    selectedDiscipline,
    setSelectedDiscipline,
  } = useChat();

  const [inputVal, setInputVal] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [activeCategory, setActiveCategory] = useState<
    'All' | DisciplineType | 'Musical Theater' | 'Auditions' | 'Rehearsals'
  >('All');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message or stream update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages, streamingText, isGenerating]);

  // Adjust textarea height dynamically
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputVal(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || isGenerating) return;
    const text = inputVal.trim();
    setInputVal('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    void sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStarterClick = (promptText: string, discipline?: DisciplineType) => {
    if (discipline) {
      setSelectedDiscipline(discipline);
    }
    setInputVal(promptText);
    void sendMessage(promptText);
  };

  const handleCopy = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      showToast('Copied rehearsal breakdown to clipboard 📋');
    }
  };

  const handleSaveRepertoire = (title: string, notes: string) => {
    saveToRepertoire({
      title: title || currentConversation?.title || 'Rehearsal Notes',
      discipline: currentConversation?.discipline || selectedDiscipline || 'General',
      excerpt: notes.slice(0, 120) + '...',
      fullNotes: notes,
      targetBpm: 108,
    });
  };

  const handleExport = (text: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Grooveyy-${(currentConversation?.title || 'Rehearsal').replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported rehearsal notes 📄');
  };

  // Web Speech API Voice Rehearsal Dictation
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

    const SpeechRec = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

    if (!SpeechRec) {
      showToast('Voice dictation is not supported in this browser');
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputVal((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
        showToast('Voice recognition ended or had an issue');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      setIsListening(true);
      recognition.start();
      showToast('Listening... Speak your rehearsal question 🎙️');
    } catch {
      setIsListening(false);
      showToast('Could not access microphone');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setInputVal((prev) => (prev ? `${prev}\n\n[Attached Notes]:\n${text}` : `[Attached Notes]:\n${text}`));
          showToast(`Attached ${file.name} 📎`);
        }
      };
      reader.readAsText(file);
    } else {
      showToast(`Selected file: ${file.name}. (Text & script files supported)`);
    }
  };

  // Clickable Starter Prompts across core performing arts areas
  const starterPrompts = [
    {
      category: 'Singing' as DisciplineType,
      discipline: 'Singing' as DisciplineType,
      icon: Mic,
      title: 'Vocal Warm-up & SOVT',
      tagline: 'Breath support & vocal fold resonance',
      prompt: 'Give me a safe 10-minute vocal warm-up routine with SOVT lip trills, straw phonation, and appoggio breath support exercises.',
    },
    {
      category: 'Acting' as DisciplineType,
      discipline: 'Acting' as DisciplineType,
      icon: Drama,
      title: 'Monologue & Beat Analysis',
      tagline: 'Objective, obstacles & active tactics',
      prompt: 'Help me break down a dramatic monologue: how do I identify objective, obstacle, tactics, and transition beats using Stanislavski technique?',
    },
    {
      category: 'Dance' as DisciplineType,
      discipline: 'Dance' as DisciplineType,
      icon: Activity,
      title: 'Pirouette Spotting & Balance',
      tagline: 'Spotting, core & landing drills',
      prompt: 'What kinetic drills improve balance and spotting during double pirouettes without falling off relevé or sickling the ankle?',
    },
    {
      category: 'Musical Theater' as DisciplineType,
      discipline: 'Singing' as DisciplineType,
      icon: Music,
      title: 'Patter Articulation & Speed',
      tagline: 'Rapid consonants & breath suspension',
      prompt: 'How do I steady my breathing and articulate rapid musical theater patter lines (like Sondheim or Gilbert & Sullivan) without vocal fatigue?',
    },
    {
      category: 'Auditions' as DisciplineType,
      discipline: 'Stage Performance' as DisciplineType,
      icon: Sparkles,
      title: 'Callback & Slate Confidence',
      tagline: 'Cold reading & director adjustment notes',
      prompt: 'How do I deliver a confident audition slate and quickly adapt when a casting director gives sudden adjustment notes during a callback?',
    },
    {
      category: 'Rehearsals' as DisciplineType,
      discipline: 'Music' as DisciplineType,
      icon: Clock,
      title: 'Structured 30-Min Practice',
      tagline: 'Metronome pacing & muscle memory',
      prompt: 'Build me a structured 30-minute practice plan with incremental metronome BPM targets to lock in muscle memory without burnout.',
    },
  ];

  const filteredStarters =
    activeCategory === 'All'
      ? starterPrompts
      : starterPrompts.filter((s) => s.category === activeCategory || s.discipline === activeCategory);

  const messages = currentConversation?.messages || [];
  const firstName = artistProfile.name ? artistProfile.name.split(' ')[0] : 'there';

  return (
    <div className="flex-1 min-h-0 flex flex-col relative w-full bg-card">
      {/* Session Header Pill: subtle, centered, muted background */}
      <div className="shrink-0 px-4 py-2 flex justify-center z-10">
        <div className="flex items-center gap-2 bg-muted/80 text-foreground px-3.5 py-1 rounded-full border border-border max-w-full text-xs shadow-xs">
          <Music className="w-3.5 h-3.5 text-accent-text shrink-0" />
          <span className="font-semibold text-accent-text tracking-tight truncate">
            {currentConversation?.discipline || selectedDiscipline}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground font-medium truncate">
            {currentConversation?.title || `${selectedDiscipline} Live Coaching`}
          </span>
        </div>
      </div>

      {/* Error Notification */}
      {error && (
        <div className="shrink-0 max-w-2xl mx-auto w-full px-4 pt-1 pb-2">
          <div className="p-3 bg-danger-soft border border-danger/30 rounded-xl flex items-center justify-between text-xs text-danger shadow-xs">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={clearError}
              className="text-danger hover:opacity-80 font-bold p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Conversation Stream: Centered, Claude-inspired line length, invisible scrollbar */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-6 w-full max-w-3xl mx-auto no-scrollbar">
        {/* Welcome Screen / Empty State */}
        {messages.length === 0 && !isGenerating && (
          <div className="py-6 sm:py-8 px-2 sm:px-4 text-center space-y-6 animate-groovey-in">
            {/* Mascot Avatar */}
            <div className="relative inline-flex items-center justify-center">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted shadow-xs flex items-center justify-center p-1 border border-border overflow-hidden">
                <Image
                  src="/groovey/grooveyy-mascot.png"
                  alt="Grooveyy Mascot"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover rounded-full select-none"
                  unoptimized
                />
              </div>
              <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-accent-soft shadow-xs border border-accent-border flex items-center justify-center text-accent-text">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Welcome Headings */}
            <div className="space-y-1.5 max-w-md mx-auto">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                What are we rehearsing today, {firstName}?
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Grooveyy is your performing arts coach for vocal technique, choreography counts, monologue tactics, and audition prep.
              </p>
            </div>

            {/* Discipline Category Filter Pills */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {(['All', 'Singing', 'Acting', 'Dance', 'Musical Theater', 'Auditions', 'Rehearsals'] as const).map((cat) => {
                const isSelected = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-accent text-accent-foreground shadow-xs font-semibold'
                        : 'bg-muted text-muted-foreground hover:text-foreground border border-border'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Clickable Starter Prompts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
              {filteredStarters.map((starter, i) => {
                const StarterIcon = starter.icon;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleStarterClick(starter.prompt, starter.discipline)}
                    className="group p-3.5 rounded-2xl bg-muted/60 border border-border hover:border-accent-border hover:bg-muted/90 transition-all active:scale-[0.99] flex flex-col justify-between cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-accent-soft text-accent-text border border-accent-border/50">
                        <StarterIcon className="w-4 h-4" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-accent-text group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-foreground group-hover:text-accent-text transition-colors">
                        {starter.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        {starter.tagline}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Message Turns */}
        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex flex-col items-end pl-6 sm:pl-16 animate-groovey-in">
                {/* User Header Info */}
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium mb-1 mr-1">
                  <span className="text-foreground font-semibold">
                    {artistProfile.name || 'You'}
                  </span>
                  <span>•</span>
                  <span>{msg.userRoleTitle || artistProfile.roleTitle || 'Artist'}</span>
                </div>

                {/* User Bubble */}
                <div className="bg-muted text-foreground rounded-2xl rounded-tr-sm px-4 py-3 shadow-xs border border-border/60 max-w-[90%] sm:max-w-[80%] text-sm leading-relaxed">
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                <div className="text-[10px] text-muted-foreground mt-1 mr-1">
                  Delivered • {msg.timestamp}
                </div>
              </div>
            );
          }

          // AI Model Message (Claude-inspired open canvas layout)
          return (
            <div key={msg.id} className="flex gap-3 sm:gap-4 pr-2 sm:pr-8 animate-groovey-in">
              {/* Avatar on Left */}
              <div className="shrink-0 pt-0.5">
                <div className="w-8 h-8 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center">
                  <Image
                    src="/groovey/grooveyy-mascot.png"
                    alt="Grooveyy AI"
                    width={32}
                    height={32}
                    className="w-full h-full object-cover rounded-full"
                    unoptimized
                  />
                </div>
              </div>

              {/* Response Content & Toolbar */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs text-foreground tracking-tight">
                    Grooveyy AI
                  </span>
                  {msg.disciplineTag && (
                    <span className="px-2 py-0.5 rounded-full bg-accent-soft text-accent-text text-[10px] font-medium border border-accent-border/50">
                      {msg.disciplineTag}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {msg.timestamp}
                  </span>
                </div>

                {/* Rendered Markdown */}
                <div className="text-foreground text-sm leading-relaxed">
                  <MarkdownRenderer content={msg.content} />
                </div>

                {/* AI Action Toolbar */}
                <div className="flex items-center gap-1.5 pt-1 text-muted-foreground flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleCopy(msg.content)}
                    className="p-1.5 rounded-lg hover:bg-muted hover:text-foreground text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title="Copy breakdown"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Copy</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSaveRepertoire(currentConversation?.title || 'Rehearsal Notes', msg.content)
                    }
                    className="p-1.5 rounded-lg hover:bg-muted hover:text-accent-text text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title="Save to Repertoire"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Save</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExport(msg.content)}
                    className="p-1.5 rounded-lg hover:bg-muted hover:text-foreground text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title="Export notes"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Export</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const lastUserMsg = messages
                        .slice(0, messages.indexOf(msg))
                        .reverse()
                        .find((m) => m.role === 'user');
                      if (lastUserMsg) {
                        void sendMessage(lastUserMsg.content);
                      }
                    }}
                    className="p-1.5 rounded-lg hover:bg-muted hover:text-foreground text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title="Retry / Regenerate response"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Retry</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Live Streaming Response Chunk */}
        {isGenerating && (
          <div className="flex gap-3 sm:gap-4 pr-2 sm:pr-8 animate-groovey-in">
            <div className="shrink-0 pt-0.5">
              <div className="w-8 h-8 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center animate-groovey-glow">
                <Image
                  src="/groovey/grooveyy-mascot.png"
                  alt="Grooveyy AI"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover rounded-full"
                  unoptimized
                />
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-foreground tracking-tight">
                  Grooveyy AI
                </span>
                <span className="px-2 py-0.5 rounded-full bg-accent-soft text-accent-text text-[10px] font-medium border border-accent-border/50">
                  {selectedDiscipline} Coaching
                </span>
                <span className="w-2 h-2 rounded-full bg-accent animate-ping ml-1" />
              </div>

              <div className="text-foreground text-sm leading-relaxed">
                {streamingText ? (
                  <>
                    <MarkdownRenderer content={streamingText} />
                    <span className="inline-block w-1.5 h-4 ml-0.5 bg-accent align-middle animate-groovey-blink" />
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground text-xs py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span>Analyzing performance mechanics and drafting drills...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Claude-inspired Floating / Anchored Composer */}
      <div className="shrink-0 max-w-3xl mx-auto w-full px-3 sm:px-4 pb-3 sm:pb-4 pt-1 z-20">
        <form
          onSubmit={handleSend}
          className="rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-sm focus-within:border-accent-border focus-within:ring-1 focus-within:ring-accent-border transition-all flex flex-col p-2.5 sm:p-3"
        >
          {/* Multi-line Auto-expanding Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputVal}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder={`Ask Grooveyy about ${selectedDiscipline.toLowerCase()} technique, choreography, monologue beats...`}
            className="w-full bg-transparent border-0 text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-0 text-sm resize-none min-h-[38px] max-h-[160px] py-1 px-1 leading-relaxed no-scrollbar"
          />

          {/* Bottom Action Row inside Composer */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 mt-1">
            {/* Left Controls: Discipline pill + Attach + Mic */}
            <div className="flex items-center gap-1.5">
              {/* Discipline Quick Selector Pill */}
              <select
                aria-label="Select performing arts discipline"
                value={selectedDiscipline}
                onChange={(e) => setSelectedDiscipline(e.target.value as DisciplineType)}
                className="bg-muted text-foreground text-[11px] font-semibold rounded-lg px-2 py-1 border border-border/80 focus:outline-hidden cursor-pointer"
              >
                <option value="Singing">Singing</option>
                <option value="Dance">Dance</option>
                <option value="Acting">Acting</option>
                <option value="Musical Theater">Musical Theater</option>
                <option value="Music">Music</option>
                <option value="Choreography">Choreography</option>
                <option value="Stage Performance">Stage Performance</option>
                <option value="General">General</option>
              </select>

              {/* Attach Notes / Script */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Attach script or rehearsal notes (.txt, .md)"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Voice Dictation */}
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isListening
                    ? 'bg-danger text-white animate-pulse'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                title={isListening ? 'Listening...' : 'Voice dictation'}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>

            {/* Middle Keyboard Hint */}
            <div className="hidden sm:inline-block text-[11px] text-muted-foreground select-none">
              Press <kbd className="font-sans px-1 py-0.5 bg-muted rounded border border-border text-[10px]">Enter ↵</kbd> to send
            </div>

            {/* Right: Send / Stop Button */}
            <div>
              {isGenerating ? (
                <button
                  type="button"
                  onClick={stopGeneration}
                  className="w-8 h-8 rounded-xl bg-danger text-white hover:opacity-90 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Stop generating"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputVal.trim()}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 ${
                    inputVal.trim()
                      ? 'bg-accent text-accent-foreground hover:bg-accent-hover'
                      : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                  }`}
                  title="Send message"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
