export type DisciplineType =
  | 'Singing'
  | 'Dance'
  | 'Acting'
  | 'Theater'
  | 'Musical Theater'
  | 'Auditions'
  | 'Rehearsals'
  | 'Music'
  | 'Choreography'
  | 'Stage Performance'
  | 'General';

export type ProficiencyLevel =
  | 'All'
  | 'Beginner'
  | 'Intermediate'
  | 'Advanced'
  | 'Advanced / Audition'
  | 'Professional';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'model';
  content: string;
  timestamp: string;
  userRoleTitle?: string;
  userAvatarUrl?: string | null;
  disciplineTag?: string;
  isInitialMock?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  discipline: DisciplineType;
  level?: ProficiencyLevel;
  contextTag?: string;
  createdAt?: number;
  updatedAt: number | string;
  messages: ChatMessage[];
}

export interface RepertoireItem {
  id: string;
  title: string;
  discipline: DisciplineType;
  excerpt: string;
  fullNotes: string;
  targetBpm?: number;
  tactileCue?: string;
  actionVerb?: string;
  savedAt: number | string;
}

export interface ArtistProfile {
  userId?: string | null;
  name: string;
  avatarUrl?: string | null;
  roleTitle: string;
  primaryDiscipline: DisciplineType;
  vocalRange?: string;
  movementStyle?: string;
  actingApproach?: string;
  upcomingAudition?: string;
  bio?: string | null;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  primaryProvider: 'gemini' | 'groq' | 'openrouter' | 'mock';
  activeModel: string;
  availableFallbacks: string[];
  latencyMs?: number;
  error?: string;
}

export interface ChatStreamChunk {
  text?: string;
  done?: boolean;
  modelUsed?: string;
  error?: string;
}

export interface ChatRequestPayload {
  message: string;
  conversationHistory: { role: 'user' | 'assistant' | 'model'; content: string }[];
  discipline?: DisciplineType;
  level?: ProficiencyLevel;
  artistProfile?: ArtistProfile;
  modelPreset?: string;
}
