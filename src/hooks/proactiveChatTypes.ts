import type { MutableRefObject } from 'react';
import type {
  AISettings,
  Contact,
  ContactMemories,
  Mask,
  Message,
  UserProfile,
  WorldBook
} from '../types';

export interface UseProactiveChatParams {
  isStateLoaded: boolean;
  contacts: Contact[];
  messages: Record<string, Message[]>;
  worldBooks: WorldBook[];
  masks: Mask[];
  user: UserProfile;
  aiSettings: AISettings;
  extraSystemPrompt: string;
  contactMemories: ContactMemories;
  resolveContextLimit: (contact?: Contact | null) => number;
  resolveMemorySummaryThreshold: (contact?: Contact | null) => number;
  updateMemoryWithAutoSummary: (
    contactId: string,
    text: string,
    source: 'user' | 'model',
    contactName: string,
    threshold?: number
  ) => void;
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  setMessages: React.Dispatch<React.SetStateAction<Record<string, Message[]>>>;
  setTypingContactIds: React.Dispatch<React.SetStateAction<string[]>>;
  playReceiveSignal: () => void;
  showToast: (message: string) => void;
  activeSubView: string;
  selectedContactId: string | null;
}

export interface ProactiveChatRuntimeRefs {
  proactiveRunningRef: MutableRefObject<Set<string>>;
  draftRunningRef: MutableRefObject<Set<string>>;
  draftWarmupAtRef: MutableRefObject<Record<string, number>>;
}

export type ProactiveChatRuntimeArgs = UseProactiveChatParams & ProactiveChatRuntimeRefs;
