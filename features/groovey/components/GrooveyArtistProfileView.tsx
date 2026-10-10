'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { User, Database, Download, Trash2, Check } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { DisciplineType } from '../types';

export const GrooveyArtistProfileView: React.FC = () => {
  const {
    artistProfile,
    updateArtistProfile,
    conversations,
    repertoire,
    clearAllConversations,
    showToast,
  } = useChat();

  const [formData, setFormData] = useState(artistProfile);
  const [prevProfile, setPrevProfile] = useState(artistProfile);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Synchronize state with incoming context/prop updates
  if (artistProfile !== prevProfile) {
    setPrevProfile(artistProfile);
    setFormData(artistProfile);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateArtistProfile(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleExportData = () => {
    const exportData = {
      profile: artistProfile,
      conversations,
      repertoire,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Grooveyy-Studio-Backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Studio data exported successfully 💾');
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 max-w-3xl mx-auto w-full space-y-5 no-scrollbar">
      {/* Header Profile Card */}
      <div className="bg-card rounded-2xl p-5 border border-border shadow-xs flex items-center gap-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-accent-soft p-1 shadow-xs shrink-0 border border-accent-border relative overflow-hidden flex items-center justify-center">
          {artistProfile.avatarUrl ? (
            <Image
              src={artistProfile.avatarUrl}
              alt={artistProfile.name}
              width={64}
              height={64}
              className="w-full h-full object-cover rounded-full"
              unoptimized
            />
          ) : (
            <div className="w-full h-full rounded-full bg-accent/20 flex items-center justify-center text-accent-text font-bold text-lg">
              {artistProfile.name ? artistProfile.name.charAt(0).toUpperCase() : 'P'}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground truncate">
            {artistProfile.name || 'Performer'}
          </h1>
          <p className="text-xs text-accent-text font-medium truncate">
            {artistProfile.roleTitle || 'Performing Artist'}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-muted text-foreground text-[10px] font-medium border border-border">
              {artistProfile.primaryDiscipline || 'Performing Arts'}
            </span>
            {artistProfile.movementStyle && (
              <span className="px-2.5 py-0.5 rounded-full bg-accent-soft text-accent-text text-[10px] font-medium border border-accent-border/50 truncate max-w-[200px]">
                {artistProfile.movementStyle}
              </span>
            )}
            {artistProfile.vocalRange && (
              <span className="px-2.5 py-0.5 rounded-full bg-accent-soft text-accent-text text-[10px] font-medium border border-accent-border/50">
                {artistProfile.vocalRange}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Rehearsal Metrics & Studio Status */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-card rounded-xl p-3 border border-border text-center">
          <div className="text-lg font-bold text-accent-text">
            {conversations.length}
          </div>
          <div className="text-[10px] text-muted-foreground">Active Rehearsals</div>
        </div>
        <div className="bg-card rounded-xl p-3 border border-border text-center">
          <div className="text-lg font-bold text-accent-text">
            {repertoire.length}
          </div>
          <div className="text-[10px] text-muted-foreground">Saved Routines</div>
        </div>
        <div className="bg-card rounded-xl p-3 border border-border text-center">
          <div className="flex items-center justify-center gap-1.5 text-foreground">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span className="text-xs font-bold">Online</span>
          </div>
          <div className="text-[10px] text-muted-foreground">Gemini 3.8 Flash</div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-card rounded-2xl p-5 border border-border shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <User className="w-4 h-4 text-accent-text" />
          <h2 className="text-sm font-bold text-foreground">
            Artist Rehearsal Preferences
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-muted-foreground font-medium mb-1">
              Performer Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-xl text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </div>

          <div>
            <label className="block text-muted-foreground font-medium mb-1">
              Active Role / Audition Tag
            </label>
            <input
              type="text"
              value={formData.roleTitle}
              onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
              placeholder="e.g. Lead Vocalist / Contemporary Dancer / Audition Candidate"
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-xl text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-muted-foreground font-medium mb-1">
                Primary Discipline
              </label>
              <select
                aria-label="Primary Discipline"
                value={formData.primaryDiscipline}
                onChange={(e) =>
                  setFormData({ ...formData, primaryDiscipline: e.target.value as DisciplineType })
                }
                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-xl text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all cursor-pointer"
              >
                {['Singing', 'Dance', 'Acting', 'Theater', 'Musical Theater', 'Music', 'Choreography', 'Stage Performance', 'General'].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-muted-foreground font-medium mb-1">
                Vocal Range / Skill Level
              </label>
              <input
                type="text"
                value={formData.vocalRange || ''}
                onChange={(e) => setFormData({ ...formData, vocalRange: e.target.value })}
                placeholder="e.g. Baritone (A2 - F4) / Intermediate / Soprano"
                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-xl text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-muted-foreground font-medium mb-1">
              Movement & Dance Styles
            </label>
            <input
              type="text"
              value={formData.movementStyle || ''}
              onChange={(e) => setFormData({ ...formData, movementStyle: e.target.value })}
              placeholder="e.g. Hip-hop, Contemporary, Jazz, Ballet"
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-xl text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </div>

          <div>
            <label className="block text-muted-foreground font-medium mb-1">
              Upcoming Target / Performance Goal
            </label>
            <input
              type="text"
              value={formData.upcomingAudition || ''}
              onChange={(e) => setFormData({ ...formData, upcomingAudition: e.target.value })}
              placeholder="e.g. Upcoming Showcase / Recital / Callback"
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-xl text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </div>

          <div className="pt-2 flex justify-end items-center gap-2">
            {savedSuccess && (
              <span className="text-xs text-success flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-accent text-accent-foreground hover:bg-accent-hover text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>

      {/* Studio Data Management */}
      <div className="bg-card rounded-2xl p-5 border border-border shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Database className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-bold text-foreground">
            Storage & Studio Backups
          </h2>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Your rehearsal sessions and saved repertoire are stored securely in your browser workspace.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={handleExportData}
            className="px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-border"
          >
            <Download className="w-4 h-4" />
            <span>Export Backup (JSON)</span>
          </button>

          {!showClearConfirm ? (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="px-3.5 py-2 rounded-xl bg-card border border-danger/40 text-danger hover:bg-danger/10 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Rehearsals</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-danger-soft p-1.5 rounded-xl border border-danger/40">
              <span className="text-[11px] text-danger font-medium px-1">Confirm clear?</span>
              <button
                type="button"
                onClick={() => {
                  clearAllConversations();
                  setShowClearConfirm(false);
                }}
                className="px-2.5 py-1 bg-danger text-white rounded text-[11px] font-semibold cursor-pointer"
              >
                Yes, Clear
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-2 py-1 bg-card text-muted-foreground rounded text-[11px] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
