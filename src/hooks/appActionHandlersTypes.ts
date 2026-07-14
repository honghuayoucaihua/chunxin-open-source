import type { AppState } from './useAppState';
import type { Contact } from '../types';

export type SendMessageOverride =
  | string
  | {
      text?: string;
      append?: boolean;
      source?: 'manual' | 'generated' | 'storyAdvance' | 'storyInsight';
      inputKind?: 'chat' | 'story';
      descriptionInputKind?: 'say' | 'do';
      messageType?: 'text' | 'image';
      imageUrl?: string;
      imageCaption?: string;
    };

export type UseAppActionHandlersParams = {
  state: AppState;
  currentChat: Contact | undefined;
  runtimeUserPromptBase: string;
  buildRuntimePromptWithMemory: (contact: Contact | undefined, limit?: number) => string;
  resolveContextLimit: (contact?: Contact | null) => number;
  resolveMemorySummaryThreshold: (contact?: Contact | null) => number;
  updateMemoryWithAutoSummary: (
    contactId: string,
    text: string,
    source: 'system' | 'user' | 'model',
    contactName: string,
    summaryThreshold?: number
  ) => void;
  playSendSignal: () => void;
  playReceiveSignal: () => void;
  warnAiContextRiskIfNeeded: (input: {
    personality: string;
    runtimeUserPrompt?: string;
    history: Array<{ role: 'user' | 'model'; text: string; imageUrl?: string }>;
  }) => Promise<void>;
};
