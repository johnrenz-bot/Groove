'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Drama,
  X,
  Plus,
  Trash2,
  Settings2,
  Mic,
  Activity,
  Music,
  Sparkles,
  LucideIcon,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { DisciplineType } from '../types';

export const GrooveySideDrawer: React.FC = () => {
  const {
    isDrawerOpen,
    setIsDrawerOpen,
    conversations,
    currentConversationId,
    selectConversation,
    deleteConversation,
    clearAllConversations,
    setSelectedDiscipline,
    createNewConversation,
    setActiveTab,
  } = useChat();

  const [confirmClear, setConfirmClear] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const disciplines: { name: DisciplineType; icon: LucideIcon }[] = [
    { name: 'Singing', icon: Mic },
    { name: 'Acting', icon: Drama },
    { name: 'Dance', icon: Activity },
    { name: 'Music', icon: Music },
    { name: 'Theater', icon: Drama },
    { name: 'Choreography', icon: Activity },
    { name: 'Stage Performance', icon: Sparkles },
  ];

  const handleDisciplineClick = (disc: DisciplineType) => {
    setSelectedDiscipline(disc);
    createNewConversation(disc);
    setIsDrawerOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-stone-900/40 dark:bg-black/60 backdrop-blur-xs z-50 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-80 max-w-[85vw] bg-card text-foreground z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out border-r border-border ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-soft flex items-center justify-center border border-accent-border/50 text-accent-text">
              <Drama className="w-4 h-4" />
            </div>
            <span className="text-base font-bold text-foreground tracking-tight">
              Grooveyy Coach
            </span>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setIsDrawerOpen(false)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 no-scrollbar">
          {/* New Chat Button */}
          <button
            type="button"
            onClick={() => {
              createNewConversation();
              setIsDrawerOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-accent-foreground hover:bg-accent-hover transition-all text-xs font-semibold shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Rehearsal Session</span>
          </button>

          {/* Disciplines Section */}
          <div className="space-y-1">
            <p className="px-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              Coaching Disciplines
            </p>
            {disciplines.map((d) => {
              const IconComp = d.icon;
              return (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => handleDisciplineClick(d.name)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted text-foreground transition-colors text-left cursor-pointer group"
                >
                  <IconComp className="w-4 h-4 text-accent-text group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium flex-1">{d.name}</span>
                  <Plus className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>

          {/* Recent Rehearsals */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 mb-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Recent Rehearsals
              </p>
              {conversations.length > 1 && !confirmClear && (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="text-[10px] text-muted-foreground hover:text-danger transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {confirmClear && (
              <div className="p-3 mb-2 bg-danger-soft border border-danger/40 rounded-xl text-xs space-y-2">
                <p className="text-danger font-semibold">Clear all rehearsal history?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearAllConversations();
                      setConfirmClear(false);
                    }}
                    className="px-2.5 py-1 bg-danger text-white rounded-lg text-[11px] font-semibold cursor-pointer hover:opacity-90"
                  >
                    Yes, Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-2.5 py-1 bg-card border border-border text-foreground rounded-lg text-[11px] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {conversations.map((c) => {
                const isActive = c.id === currentConversationId;
                const isDeleting = deleteConfirmId === c.id;

                if (isDeleting) {
                  return (
                    <div
                      key={c.id}
                      className="p-2.5 bg-danger-soft border border-danger/40 rounded-xl flex items-center justify-between text-xs"
                    >
                      <span className="text-danger truncate pr-1">Delete session?</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            deleteConversation(c.id);
                            setDeleteConfirmId(null);
                          }}
                          className="px-2 py-0.5 bg-danger text-white rounded font-medium cursor-pointer"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-1.5 py-0.5 bg-card text-muted-foreground rounded cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={c.id}
                    className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-accent-soft text-accent-text font-semibold shadow-xs border border-accent-border/50'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectConversation(c.id)}
                      className="flex-1 text-left truncate pr-2 cursor-pointer"
                      title={c.title}
                    >
                      <span className="truncate block">{c.title}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(c.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-danger p-1 rounded transition-opacity cursor-pointer text-muted-foreground"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-3.5 bg-muted/50 border-t border-border flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setActiveTab('artist');
              setIsDrawerOpen(false);
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-xs font-medium"
          >
            <Settings2 className="w-4 h-4" />
            <span>Artist Profile & Settings</span>
          </button>
          <Image
            src="/groovey/grooveyy-mascot.png"
            alt="Profile Avatar"
            width={32}
            height={32}
            className="w-8 h-8 rounded-full object-cover select-none border border-border"
            unoptimized
          />
        </div>
      </aside>
    </>
  );
};
