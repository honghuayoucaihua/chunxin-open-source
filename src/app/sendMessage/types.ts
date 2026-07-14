import type { Dispatch, SetStateAction } from 'react';
import type { AISettings, Contact, Message, Mask, UserProfile, ContactMemories, WorldBook, SubView, QuotedMessageSnapshot } from '../../types';
import type { SendOverridePayload } from './messageValidation';
import type { ReplyTaskVersionRef } from '../../utils/chat/replyTaskVersion';

export type SendMessageFlowParams = {
  selectedContactId: string | null;
  overrideText?: SendOverridePayload;
  inputValue: string;
  setInputValue: Dispatch<SetStateAction<string>>;
  contacts: Contact[];
  messages: Record<string, Message[]>;
  quotedMessage: QuotedMessageSnapshot | null;
  aiSettings: AISettings;
  worldBooks: WorldBook[];
  masks: Mask[];
  contactMemories: ContactMemories;
  user: UserProfile;
  setMessages: Dispatch<SetStateAction<Record<string, Message[]>>>;
  setContacts: Dispatch<SetStateAction<Contact[]>>;
  setTypingContactIds: Dispatch<SetStateAction<string[]>>;
  replyTaskVersionRef: ReplyTaskVersionRef;
  setQuotedMessage: Dispatch<SetStateAction<QuotedMessageSnapshot | null>>;
  playSendSignal: () => void;
  playReceiveSignal: () => void;
  resolveContextLimit: (contact: Contact) => number;
  resolveMemorySummaryThreshold: (contact: Contact) => number;
  updateMemoryWithAutoSummary: (
    contactId: string,
    text: string,
    source: 'user' | 'model' | 'system',
    contactName: string,
    threshold: number
  ) => void;
  warnAiContextRiskIfNeeded: (args: {
    personality: string;
    runtimeUserPrompt?: string;
    history: Array<{ role: 'user' | 'model'; text: string; imageUrl?: string }>;
  }) => Promise<void> | void;
  extraSystemPrompt?: string;
  openPrompt?: (message: string, defaultValue: string, onConfirm: (value?: string) => boolean | void, title?: string) => void;
  showToast?: (message: string, duration?: number) => void;
  pushSubView?: (subView: SubView) => void;
  applyContactBalanceDelta?: (contactId: string | null | undefined, delta?: string | number) => void;
} & Record<string, unknown>;
