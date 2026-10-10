'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  MessageSquare,
  BookOpen,
  User,
  Plus,
  PanelLeft,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';

export const GrooveyHeader: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isDrawerOpen,
    setIsDrawerOpen,
    createNewConversation,
    serverHealth,
    refreshHealth,
    repertoire,
    selectedDiscipline,
  } = useChat();

  const [showStatusPopover, setShowStatusPopover] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshHealth(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getStatusBadge = () => {
    switch (serverHealth.status) {
      case 'ready':
        return {
          dotClass: 'bg-success',
          badgeText: serverHealth.model || 'Gemini 3.8 Flash',
          label: 'Ready',
          colorClass: 'text-success bg-success-soft border-success/30',
          icon: CheckCircle2,
        };
      case 'connecting':
        return {
          dotClass: 'bg-warning animate-pulse',
          badgeText: 'Connecting...',
          label: 'Connecting',
          colorClass: 'text-warning bg-warning-soft border-warning/30',
          icon: Clock,
        };
      case 'unavailable':
        return {
          dotClass: 'bg-warning animate-pulse',
          badgeText: 'High Demand',
          label: 'Retrying',
          colorClass: 'text-warning bg-warning-soft border-warning/30',
          icon: AlertCircle,
        };
      case 'configuration-error':
      default:
        return {
          dotClass: 'bg-danger',
          badgeText: 'Setup Required',
          label: 'Config Error',
          colorClass: 'text-danger bg-danger-soft border-danger/30',
          icon: AlertCircle,
        };
    }
  };

  const statusInfo = getStatusBadge();
  const StatusIcon = statusInfo.icon;

  return (
    <header className="border-b border-border bg-card/95 backdrop-blur-md px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2.5 sm:gap-4 shrink-0 transition-colors z-20">
      <div className="flex items-center justify-between gap-3 w-full flex-wrap sm:flex-nowrap">
        {/* Left: History Toggle + Mascot Branding */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            aria-label="Toggle rehearsal history drawer"
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer border ${
              isDrawerOpen
                ? 'bg-accent-soft text-accent-text border-accent-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted border-transparent'
            }`}
            title={isDrawerOpen ? 'Close Rehearsal Sessions' : 'Open Rehearsal Sessions'}
          >
            <PanelLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div
            className="flex items-center gap-2 cursor-pointer group select-none min-w-0"
            onClick={() => setActiveTab('coach')}
          >
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full border border-border bg-muted overflow-hidden flex items-center justify-center">
                <Image
                  src="/groovey/grooveyy-mascot.png"
                  alt="Grooveyy Mascot"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover rounded-full"
                  unoptimized
                />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success ring-2 ring-card" />
            </div>

            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-sm tracking-tight text-foreground group-hover:text-accent-text transition-colors truncate">
                Grooveyy AI
              </span>
              <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-accent-soft text-accent-text text-[10px] font-semibold tracking-wide uppercase border border-accent-border">
                <Sparkles className="w-2.5 h-2.5 inline" /> Studio
              </span>
            </div>
          </div>
        </div>

        {/* Center: Segmented Navigation Tabs */}
        <div className="order-3 sm:order-2 w-full sm:w-auto flex items-center justify-center pt-1.5 sm:pt-0">
          <div className="inline-flex items-center p-1 rounded-xl bg-muted border border-border shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab('coach')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'coach' || activeTab === 'studio'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-accent-text" />
              <span>Coach</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('repertoire')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'repertoire'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-accent-text" />
              <span>Repertoire</span>
              {repertoire.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-accent-soft text-accent-text border border-accent-border/50">
                  {repertoire.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('artist')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'artist'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="w-3.5 h-3.5 text-accent-text" />
              <span>Artist</span>
            </button>
          </div>
        </div>

        {/* Right: Health Badge & New Rehearsal Action */}
        <div className="order-2 sm:order-3 flex items-center gap-2">
          {/* Health Diagnostics Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowStatusPopover(!showStatusPopover)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${statusInfo.colorClass}`}
              title="Click to view AI engine status"
            >
              <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`} />
              <span className="hidden md:inline font-medium">{statusInfo.badgeText}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* Diagnostic Popover */}
            {showStatusPopover && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowStatusPopover(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-card border border-border shadow-xl p-3.5 z-50 animate-groovey-in text-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <StatusIcon className="w-4 h-4 text-accent" /> Engine Diagnostics
                    </span>
                    <button
                      type="button"
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Refresh status"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  <div className="space-y-1.5 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Provider:</span>
                      <span className="font-medium text-foreground">{serverHealth.provider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Model:</span>
                      <span className="font-medium text-foreground">{serverHealth.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>API Key:</span>
                      <span className={serverHealth.hasKey ? 'text-success font-semibold' : 'text-danger font-semibold'}>
                        {serverHealth.hasKey ? 'Configured' : 'Missing'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fallback Engine:</span>
                      <span className="text-foreground">
                        {serverHealth.secondaryFallbackAvailable ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  {serverHealth.freeTierNote && (
                    <div className="p-2 rounded-lg bg-accent-soft border border-accent-border text-[11px] text-accent-text">
                      {serverHealth.freeTierNote}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* New Rehearsal Session Button */}
          <button
            type="button"
            onClick={() => {
              createNewConversation(selectedDiscipline);
              setActiveTab('coach');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-accent-foreground hover:bg-accent-hover active:scale-95 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title="Start new rehearsal session"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Rehearsal</span>
          </button>
        </div>
      </div>
    </header>
  );
};
