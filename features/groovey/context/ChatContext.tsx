'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  ChatMessage,
  Conversation,
  DisciplineType,
  ProficiencyLevel,
  RepertoireItem,
  ArtistProfile,
} from '../types';
import {
  streamChatCompletion,
  generateSessionTitle,
  checkServerHealth,
  ServerHealth,
} from '../services/api';
import { createClient } from '@/lib/supabase/client';

const DEFAULT_PROFILE: ArtistProfile = {
  name: 'Performer',
  roleTitle: 'Performing Artist',
  primaryDiscipline: 'Singing',
  vocalRange: '',
  movementStyle: '',
  actingApproach: '',
  upcomingAudition: '',
};

interface ChatContextType {
  conversations: Conversation[];
  currentConversationId: string;
  currentConversation: Conversation | undefined;
  activeTab: 'studio' | 'coach' | 'repertoire' | 'artist';
  setActiveTab: (tab: 'studio' | 'coach' | 'repertoire' | 'artist') => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  isGenerating: boolean;
  streamingText: string;
  selectedDiscipline: DisciplineType;
  setSelectedDiscipline: (d: DisciplineType) => void;
  selectedLevel: ProficiencyLevel;
  setSelectedLevel: (l: ProficiencyLevel) => void;
  repertoire: RepertoireItem[];
  saveToRepertoire: (item: Omit<RepertoireItem, 'id' | 'savedAt'>) => void;
  deleteRepertoireItem: (id: string) => void;
  artistProfile: ArtistProfile;
  updateArtistProfile: (profile: Partial<ArtistProfile>) => void;
  createNewConversation: (discipline?: DisciplineType, initialPrompt?: string) => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  clearAllConversations: () => void;
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
  error: string | null;
  clearError: () => void;
  hasApiKey: boolean;
  serverHealth: ServerHealth;
  refreshHealth: (fresh?: boolean) => Promise<void>;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

function generateUniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getNowTimestamp(): number {
  return Date.now();
}

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'studio' | 'coach' | 'repertoire' | 'artist'>('coach');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState<DisciplineType>('Singing');
  const [selectedLevel, setSelectedLevel] = useState<ProficiencyLevel>('All');
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [serverHealth, setServerHealth] = useState<ServerHealth>({
    status: 'connecting',
    provider: 'Google Gemini',
    model: 'gemini-3.8-flash',
    activeProvider: 'gemini',
    message: 'Connecting to AI Coach...',
    hasKey: true,
    fallbackModels: ['gemini-3.7-flash', 'gemini-3.5-flash'],
    secondaryFallbackAvailable: false,
    freeTierNote: 'Gemini Developer API Free Tier',
    checkedAt: 0,
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [repertoire, setRepertoire] = useState<RepertoireItem[]>([]);
  const [artistProfile, setArtistProfile] = useState<ArtistProfile>(DEFAULT_PROFILE);
  const [currentUserId, setCurrentUserId] = useState<string>('guest');
  const [isHydrated, setIsHydrated] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const refreshHealth = useCallback(async (fresh = false) => {
    try {
      const h = await checkServerHealth(fresh);
      setServerHealth(h);
      setHasApiKey(h.hasKey);
    } catch {
      setServerHealth((prev) => ({
        ...prev,
        status: 'unavailable',
        message: 'Unable to reach backend health endpoint',
      }));
    }
  }, []);

  // Health check on mount and periodic refresh
  useEffect(() => {
    let active = true;
    checkServerHealth(false).then((h) => {
      if (active) {
        setServerHealth(h);
        setHasApiKey(h.hasKey);
      }
    });
    const interval = setInterval(() => {
      checkServerHealth(false).then((h) => {
        if (active) {
          setServerHealth(h);
          setHasApiKey(h.hasKey);
        }
      });
    }, 45000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch real authenticated user profile from Supabase
  useEffect(() => {
    let active = true;

    async function loadUserData() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!active) return;

        const userId = user?.id || 'guest';
        setCurrentUserId(userId);

        let initialProfile: ArtistProfile = { ...DEFAULT_PROFILE, userId };

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, firstname, middlename, lastname, suffix, photo_url, role, bio')
            .eq('id', user.id)
            .maybeSingle();

          if (profile && active) {
            const fullName = [profile.firstname, profile.lastname, profile.suffix]
              .filter(Boolean)
              .join(' ')
              .trim();

            let discipline: DisciplineType = 'Singing';
            let movementStyle = '';

            if (profile.role === 'client') {
              const { data: clientSpec } = await supabase
                .from('client_profiles')
                .select('talent, genres, skill_level, goals')
                .eq('id', user.id)
                .maybeSingle();

              if (clientSpec) {
                if (clientSpec.talent) {
                  const t = clientSpec.talent.toLowerCase();
                  if (t.includes('dance')) discipline = 'Dance';
                  else if (t.includes('sing')) discipline = 'Singing';
                  else if (t.includes('act')) discipline = 'Acting';
                  else if (t.includes('theater')) discipline = 'Musical Theater';
                }

                if (clientSpec.genres) {
                  try {
                    const parsed = JSON.parse(clientSpec.genres);
                    if (Array.isArray(parsed?.genres)) {
                      movementStyle = parsed.genres.join(', ');
                    } else if (Array.isArray(parsed)) {
                      movementStyle = parsed.join(', ');
                    }
                  } catch {
                    movementStyle = String(clientSpec.genres);
                  }
                }
              }
            } else if (profile.role === 'coach') {
              const { data: coachSpec } = await supabase
                .from('coach_profiles')
                .select('talents, genres')
                .eq('id', user.id)
                .maybeSingle();

              if (coachSpec?.talents) {
                const t = coachSpec.talents.toLowerCase();
                if (t.includes('dance')) discipline = 'Dance';
                else if (t.includes('sing')) discipline = 'Singing';
                else if (t.includes('act')) discipline = 'Acting';
              }
            }

            initialProfile = {
              userId: user.id,
              name: fullName || user.email?.split('@')[0] || 'Performer',
              avatarUrl: profile.photo_url || null,
              roleTitle:
                profile.role === 'coach'
                  ? 'Coach & Artist'
                  : discipline === 'Dance'
                  ? 'Dancer & Choreographer'
                  : discipline === 'Acting'
                  ? 'Actor & Performer'
                  : 'Vocalist & Performer',
              primaryDiscipline: discipline,
              vocalRange: '',
              movementStyle: movementStyle || '',
              actingApproach: '',
              upcomingAudition: '',
              bio: profile.bio || null,
            };

            setSelectedDiscipline(discipline);
          }
        }

        // Merge any user-specific preferences stored in localStorage
        const profileKey = `grooveyy_artist_profile_${userId}`;
        const storedProfile = localStorage.getItem(profileKey);
        if (storedProfile) {
          try {
            const parsed = JSON.parse(storedProfile);
            if (parsed && typeof parsed === 'object') {
              initialProfile = { ...initialProfile, ...parsed };
            }
          } catch (e) {
            console.warn('Failed to parse user artist profile', e);
          }
        }
        setArtistProfile(initialProfile);

        // Load user-specific conversations
        const convKey = `grooveyy_conversations_${userId}`;
        const storedConv = localStorage.getItem(convKey);
        let loadedConvs: Conversation[] = [];
        if (storedConv) {
          try {
            const parsed = JSON.parse(storedConv);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedConvs = parsed;
            }
          } catch (e) {
            console.warn('Failed to parse user conversations', e);
          }
        }

        // If no past conversations exist, create a clean initial session
        if (loadedConvs.length === 0) {
          const now = getNowTimestamp();
          const initId = generateUniqueId('conv');
          const defaultConv: Conversation = {
            id: initId,
            title: `New ${initialProfile.primaryDiscipline} Rehearsal`,
            discipline: initialProfile.primaryDiscipline,
            level: 'All',
            contextTag: `${initialProfile.primaryDiscipline} • Live Coaching Session`,
            createdAt: now,
            updatedAt: now,
            messages: [],
          };
          loadedConvs = [defaultConv];
        }

        setConversations(loadedConvs);
        setCurrentConversationId(loadedConvs[0]?.id || '');

        // Load user-specific saved repertoire
        const repKey = `grooveyy_repertoire_${userId}`;
        const storedRep = localStorage.getItem(repKey);
        if (storedRep) {
          try {
            const parsed = JSON.parse(storedRep);
            if (Array.isArray(parsed)) {
              setRepertoire(parsed);
            }
          } catch (e) {
            console.warn('Failed to parse user repertoire', e);
          }
        } else {
          setRepertoire([]);
        }

        setIsHydrated(true);
      } catch (err) {
        console.error('Error hydrating user in Grooveyy:', err);
        setIsHydrated(true);
      }
    }

    void loadUserData();

    return () => {
      active = false;
    };
  }, []);

  // Save conversations to user-scoped localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      const convKey = `grooveyy_conversations_${currentUserId}`;
      localStorage.setItem(convKey, JSON.stringify(conversations));
    } catch (err) {
      console.warn('Could not persist conversations to storage', err);
    }
  }, [conversations, isHydrated, currentUserId]);

  // Save repertoire to user-scoped localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      const repKey = `grooveyy_repertoire_${currentUserId}`;
      localStorage.setItem(repKey, JSON.stringify(repertoire));
    } catch (err) {
      console.warn('Could not persist repertoire to storage', err);
    }
  }, [repertoire, isHydrated, currentUserId]);

  // Save artist profile to user-scoped localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      const profileKey = `grooveyy_artist_profile_${currentUserId}`;
      localStorage.setItem(profileKey, JSON.stringify(artistProfile));
    } catch (err) {
      console.warn('Could not persist artist profile to storage', err);
    }
  }, [artistProfile, isHydrated, currentUserId]);

  const currentConversation = conversations.find((c) => c.id === currentConversationId);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const createNewConversation = (discipline?: DisciplineType, initialPrompt?: string) => {
    const disc = discipline || selectedDiscipline || 'General';
    const now = getNowTimestamp();
    const newId = generateUniqueId('conv');
    const newTitle = initialPrompt ? initialPrompt.slice(0, 32) : `New ${disc} Rehearsal`;

    const newConv: Conversation = {
      id: newId,
      title: newTitle,
      discipline: disc,
      level: selectedLevel,
      contextTag: `${disc} • Live Coaching Session`,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };

    setConversations((prev) => [newConv, ...prev]);
    setCurrentConversationId(newId);
    setActiveTab('coach');
    setIsDrawerOpen(false);

    if (initialPrompt) {
      void sendMessageToConv(newId, initialPrompt, disc, selectedLevel);
    }
  };

  const selectConversation = (id: string) => {
    setCurrentConversationId(id);
    setActiveTab('coach');
    setIsDrawerOpen(false);
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        const now = getNowTimestamp();
        const fresh: Conversation = {
          id: generateUniqueId('conv'),
          title: `New ${selectedDiscipline} Rehearsal`,
          discipline: selectedDiscipline,
          level: 'All',
          contextTag: `${selectedDiscipline} • Live Coaching Session`,
          createdAt: now,
          updatedAt: now,
          messages: [],
        };
        setCurrentConversationId(fresh.id);
        return [fresh];
      }
      if (currentConversationId === id) {
        setCurrentConversationId(filtered[0].id);
      }
      return filtered;
    });
    showToast('Rehearsal session removed');
  };

  const clearAllConversations = () => {
    const now = getNowTimestamp();
    const fresh: Conversation = {
      id: generateUniqueId('conv'),
      title: `New ${selectedDiscipline} Rehearsal`,
      discipline: selectedDiscipline,
      level: 'All',
      contextTag: `${selectedDiscipline} • Live Coaching Session`,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    setConversations([fresh]);
    setCurrentConversationId(fresh.id);
    showToast('All conversation history cleared');
  };

  const saveToRepertoire = (item: Omit<RepertoireItem, 'id' | 'savedAt'>) => {
    const now = getNowTimestamp();
    const newItem: RepertoireItem = {
      ...item,
      id: generateUniqueId('rep'),
      savedAt: now,
    };
    setRepertoire((prev) => [newItem, ...prev]);
    showToast('Saved to your Repertoire Library! 🎭');
  };

  const deleteRepertoireItem = (id: string) => {
    setRepertoire((prev) => prev.filter((r) => r.id !== id));
    showToast('Removed from Repertoire');
  };

  const updateArtistProfile = (profile: Partial<ArtistProfile>) => {
    setArtistProfile((prev) => ({ ...prev, ...profile }));
    showToast('Artist profile updated ✨');
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setStreamingText('');
  };

  const sendMessageToConv = async (
    targetConvId: string,
    content: string,
    discipline: DisciplineType,
    level: ProficiencyLevel
  ) => {
    if (!content.trim() || isGenerating) return;

    setError(null);
    setIsGenerating(true);
    setStreamingText('');

    const now = new Date();
    const timeStr = `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const userMsg: ChatMessage = {
      id: generateUniqueId('msg'),
      role: 'user',
      content: content.trim(),
      timestamp: timeStr,
      userRoleTitle: artistProfile.roleTitle || 'Performing Artist',
      userAvatarUrl: artistProfile.avatarUrl || null,
    };

    // Append user message immediately
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === targetConvId) {
          return {
            ...c,
            updatedAt: getNowTimestamp(),
            messages: [...c.messages, userMsg],
          };
        }
        return c;
      })
    );

    // If first message in this conversation, generate concise title asynchronously
    const targetConv = conversations.find((c) => c.id === targetConvId);
    if (!targetConv || targetConv.messages.length === 0) {
      void generateSessionTitle(content).then((autoTitle) => {
        if (autoTitle) {
          setConversations((prev) =>
            prev.map((c) => (c.id === targetConvId ? { ...c, title: autoTitle } : c))
          );
        }
      });
    }

    const currentMessages = targetConv ? [...targetConv.messages, userMsg] : [userMsg];

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulatedText = '';

    await streamChatCompletion(
      currentMessages,
      discipline,
      level,
      {
        onChunk: (chunk: string) => {
          accumulatedText += chunk;
          setStreamingText(accumulatedText);
        },
        onError: (err: string) => {
          setIsGenerating(false);
          setStreamingText('');
          setError(err);
          if (accumulatedText.trim()) {
            const modelMsg: ChatMessage = {
              id: generateUniqueId('msg-ai'),
              role: 'model',
              content: accumulatedText + `\n\n*(Note: Generation ended with error: ${err})*`,
              timestamp: timeStr,
              disciplineTag: discipline !== 'General' ? discipline : 'Coaching Note',
            };
            setConversations((prev) =>
              prev.map((c) =>
                c.id === targetConvId ? { ...c, messages: [...c.messages, modelMsg] } : c
              )
            );
          }
        },
        onFinish: () => {
          setIsGenerating(false);
          const finalContent = accumulatedText.trim();
          setStreamingText('');
          abortControllerRef.current = null;

          if (finalContent) {
            const modelMsg: ChatMessage = {
              id: generateUniqueId('msg-ai'),
              role: 'model',
              content: finalContent,
              timestamp: timeStr,
              disciplineTag: discipline !== 'General' ? discipline : 'Studio Coach',
            };

            setConversations((prev) =>
              prev.map((c) => {
                if (c.id === targetConvId) {
                  return {
                    ...c,
                    updatedAt: getNowTimestamp(),
                    messages: [...c.messages, modelMsg],
                  };
                }
                return c;
              })
            );
          }
        },
      },
      controller.signal
    );
  };

  const sendMessage = async (content: string) => {
    setActiveTab('coach');

    let targetId = currentConversationId;
    if (!targetId || !conversations.some((c) => c.id === targetId)) {
      const now = getNowTimestamp();
      const freshId = generateUniqueId('conv');
      const freshConv: Conversation = {
        id: freshId,
        title: content.slice(0, 30),
        discipline: selectedDiscipline,
        level: selectedLevel,
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      setConversations((prev) => [freshConv, ...prev]);
      setCurrentConversationId(freshId);
      targetId = freshId;
    }

    const current = conversations.find((c) => c.id === targetId);
    const disc = current?.discipline || selectedDiscipline;
    const lvl = current?.level || selectedLevel;

    await sendMessageToConv(targetId, content, disc, lvl);
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        currentConversationId,
        currentConversation,
        activeTab,
        setActiveTab,
        isDrawerOpen,
        setIsDrawerOpen,
        isGenerating,
        streamingText,
        selectedDiscipline,
        setSelectedDiscipline,
        selectedLevel,
        setSelectedLevel,
        repertoire,
        saveToRepertoire,
        deleteRepertoireItem,
        artistProfile,
        updateArtistProfile,
        createNewConversation,
        selectConversation,
        deleteConversation,
        clearAllConversations,
        sendMessage,
        stopGeneration,
        error,
        clearError: () => setError(null),
        hasApiKey,
        serverHealth,
        refreshHealth,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};

export const useOptionalChat = () => {
  return useContext(ChatContext);
};
