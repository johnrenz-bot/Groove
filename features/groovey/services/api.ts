import { ChatMessage, DisciplineType, ProficiencyLevel } from '../types';

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onError: (error: string) => void;
  onFinish: () => void;
}

export async function streamChatCompletion(
  messages: ChatMessage[],
  discipline: DisciplineType,
  level: ProficiencyLevel,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  try {
    const response = await fetch('/api/groovey/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        discipline,
        level,
      }),
      signal,
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const errorText = errorJson.error || `Server responded with status ${response.status}`;
      callbacks.onError(errorText);
      return;
    }

    if (!response.body) {
      callbacks.onError('ReadableStream not supported on this response');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const dataStr = trimmed.replace(/^data:\s*/, '');
        if (dataStr === '[DONE]') {
          callbacks.onFinish();
          return;
        }

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.error) {
            callbacks.onError(parsed.error);
            return;
          }
          if (parsed.text) {
            callbacks.onChunk(parsed.text);
          }
        } catch {
          // ignore malformed line
        }
      }
    }

    callbacks.onFinish();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      callbacks.onFinish();
      return;
    }
    const msg = err instanceof Error ? err.message : 'Failed to connect to Grooveyy AI server';
    callbacks.onError(msg);
  }
}

export async function generateSessionTitle(prompt: string): Promise<string> {
  try {
    const res = await fetch('/api/groovey/chat/title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) return prompt.slice(0, 32);
    const data = await res.json();
    return data.title || prompt.slice(0, 32);
  } catch {
    return prompt.slice(0, 32);
  }
}

export type HealthStatusType = 'ready' | 'connecting' | 'unavailable' | 'configuration-error';

export interface ServerHealth {
  status: HealthStatusType;
  provider: string;
  model: string;
  activeProvider: 'gemini' | 'groq' | 'openrouter' | 'none';
  message: string;
  hasKey: boolean;
  fallbackModels: string[];
  secondaryFallbackAvailable: boolean;
  freeTierNote: string;
  checkedAt: number;
}

export async function checkServerHealth(fresh = false): Promise<ServerHealth> {
  try {
    const res = await fetch(`/api/groovey/health${fresh ? '?fresh=true' : ''}`);
    if (!res.ok) {
      return {
        status: 'unavailable',
        provider: 'Google Gemini',
        model: 'gemini-3.8-flash',
        activeProvider: 'none',
        message: `Health check failed with status ${res.status}`,
        hasKey: false,
        fallbackModels: [],
        secondaryFallbackAvailable: false,
        freeTierNote: 'Error checking backend status',
        checkedAt: Date.now(),
      };
    }
    return await res.json();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Cannot connect to backend server';
    return {
      status: 'unavailable',
      provider: 'Google Gemini',
      model: 'gemini-3.8-flash',
      activeProvider: 'none',
      message,
      hasKey: false,
      fallbackModels: [],
      secondaryFallbackAvailable: false,
      freeTierNote: 'Offline or connection interrupted',
      checkedAt: Date.now(),
    };
  }
}
