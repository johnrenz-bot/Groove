'use client';

import React from 'react';
import '../styles/groovey.css';
import { ChatProvider, useChat, useOptionalChat } from '../context/ChatContext';
import { GrooveyHeader } from './GrooveyHeader';
import { GrooveySideDrawer } from './GrooveySideDrawer';
import { GrooveyActiveCoaching } from './GrooveyActiveCoaching';
import { GrooveyRepertoireView } from './GrooveyRepertoireView';
import { GrooveyArtistProfileView } from './GrooveyArtistProfileView';

const MainContent: React.FC = () => {
  const { activeTab, toastMessage } = useChat();

  return (
    <div className="groovey-root w-full flex flex-col h-[calc(100dvh-8rem)] sm:h-[calc(100dvh-9rem)] min-h-[520px] bg-card text-foreground border border-border rounded-2xl shadow-sm font-sans relative overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300">
          <div className="px-4 py-2 bg-elevated text-foreground text-xs font-medium rounded-full shadow-lg border border-border flex items-center gap-2">
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Slim Toolbar (Tabs, Title + Badge, High Demand status, New Rehearsal) */}
      <GrooveyHeader />

      {/* Slide-out Sidebar Drawer for Session History */}
      <GrooveySideDrawer />

      {/* Main View Port (Coach / Repertoire / Artist) */}
      <div className="flex-1 min-h-0 flex flex-col relative w-full">
        {(activeTab === 'coach' || activeTab === 'studio') && <GrooveyActiveCoaching />}
        {activeTab === 'repertoire' && <GrooveyRepertoireView />}
        {activeTab === 'artist' && <GrooveyArtistProfileView />}
      </div>
    </div>
  );
};

export const GrooveyMain: React.FC = () => {
  const existing = useOptionalChat();
  if (existing) {
    return <MainContent />;
  }

  return (
    <ChatProvider>
      <MainContent />
    </ChatProvider>
  );
};

export default GrooveyMain;