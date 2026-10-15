'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Bookmark,
  Trash2,
  Lightbulb,
  Drama,
  Copy,
  ArrowRight,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';

export const GrooveyRepertoireView: React.FC = () => {
  const { repertoire, deleteRepertoireItem, createNewConversation, showToast } = useChat();
  const [filterDiscipline, setFilterDiscipline] = useState<string>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered =
    filterDiscipline === 'All'
      ? repertoire
      : repertoire.filter((r) => r.discipline === filterDiscipline);

  const handleDrillNow = (item: (typeof repertoire)[0]) => {
    createNewConversation(
      item.discipline,
      `Let's drill this saved repertoire piece: "${item.title}". Here are my saved notes: ${item.excerpt}. What is our next progression drill?`
    );
  };

  const handleCopyNotes = (notes: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(notes);
      showToast('Repertoire notes copied to clipboard 📋');
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 max-w-3xl mx-auto w-full space-y-4">
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-accent-text" />
          <h1 className="text-xl font-bold text-foreground">
            Repertoire & Audition Library
          </h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Saved vocal cuts, choreography sequences, acting tactics, and rehearsal routines.
        </p>
      </div>

      {/* Discipline filter chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-2 select-none">
        {['All', 'Singing', 'Dance', 'Acting', 'Theater', 'Music'].map((disc) => (
          <button
            key={disc}
            type="button"
            onClick={() => setFilterDiscipline(disc)}
            className={`px-3 py-1 rounded-full text-xs transition-all cursor-pointer ${
              filterDiscipline === disc
                ? 'bg-accent text-accent-foreground font-semibold shadow-xs'
                : 'bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground'
            }`}
          >
            {disc}
          </button>
        ))}
      </div>

      {/* Repertoire Cards */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 text-center space-y-3 border border-border my-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Bookmark className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            No Repertoire Saved in this Category
          </h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Click the bookmark icon on any coaching breakdown in the chat to save your audition pieces here.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className="bg-card rounded-2xl p-4 border border-border shadow-xs hover:border-border-strong transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-accent-soft text-accent-text border border-accent-border/50 text-[10px] font-bold">
                        {item.discipline}
                      </span>
                      {item.targetBpm && (
                        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">
                          ♩ {item.targetBpm} BPM
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-foreground">
                      {item.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteRepertoireItem(item.id)}
                    className="text-muted-foreground hover:text-danger p-1 transition-colors cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.excerpt}
                </p>

                {item.tactileCue && (
                  <div className="bg-accent-soft border-l-[3px] border-accent rounded-r-xl p-2.5 flex items-start gap-2 text-xs text-foreground">
                    <Lightbulb className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground">Tactile Cue: </strong>
                      {item.tactileCue}
                    </div>
                  </div>
                )}

                {item.actionVerb && (
                  <div className="bg-accent-soft border border-accent-border/50 rounded-xl p-2 flex items-center gap-2 text-xs text-accent-text">
                    <Drama className="w-4 h-4 text-accent shrink-0" />
                    <span>
                      <strong className="text-accent-text">Action Verb: </strong>
                      {item.actionVerb}
                    </span>
                  </div>
                )}

                {isExpanded && (
                  <div className="pt-2 border-t border-border text-xs font-mono bg-muted/50 p-3 rounded-xl whitespace-pre-wrap text-foreground">
                    {item.fullNotes}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                  >
                    {isExpanded ? 'Hide full notes' : 'View full notes'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyNotes(item.fullNotes)}
                      className="px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-foreground text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDrillNow(item)}
                      className="px-3 py-1 rounded-full bg-accent hover:bg-accent-hover text-accent-foreground text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>Drill on Stage</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
