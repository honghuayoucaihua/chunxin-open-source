import { Dispatch, SetStateAction } from 'react';
import { AISettings, Contact, ContactMemories, Message, WorldBook, Mask, UserProfile, SubView, QuotedMessageSnapshot } from '../../types';
import type { HtmlTemplate } from '../../types/htmlTemplate';
import type { ReplyTaskVersionRef } from '../../utils/chat/replyTaskVersion';

export interface UseMessageActionsParams {
  selectedContactId: string | null;
  messages: Record<string, Message[]>;
  favorites: Message[];
  contacts: Contact[];
  aiSettings: AISettings;
  worldBooks: WorldBook[];
  masks: Mask[];
  htmlTemplates?: HtmlTemplate[];
  contactMemories: ContactMemories;
  user: UserProfile;
  setMessages: Dispatch<SetStateAction<Record<string, Message[]>>>;
  setFavorites: Dispatch<SetStateAction<Message[]>>;
  setContacts: Dispatch<SetStateAction<Contact[]>>;
  setSelectedContactId: Dispatch<SetStateAction<string | null>>;
  pushSubView: (subView: SubView) => void;
  setTypingContactIds: Dispatch<SetStateAction<string[]>>;
  replyTaskVersionRef?: ReplyTaskVersionRef;
  setQuotedMessage: Dispatch<SetStateAction<QuotedMessageSnapshot | null>>;
  setMoments: Dispatch<SetStateAction<any[]>>;
  setOfficialArticles: Dispatch<SetStateAction<any[]>>;
  setContactMemories: Dispatch<SetStateAction<ContactMemories>>;
  setWalletBalance?: Dispatch<SetStateAction<number>>;
  setUser?: Dispatch<SetStateAction<UserProfile>>;
  applyContactBalanceDelta?: (contactId: string | null | undefined, delta?: string | number) => void;
  playReceiveSignal?: () => void;
  warnAiContextRiskIfNeeded?: (args: {
    personality: string;
    runtimeUserPrompt?: string;
    history: Array<{ role: 'user' | 'model'; text: string; imageUrl?: string }>;
  }) => Promise<void> | void;
  openPrompt: (message: string, defaultValue: string, onConfirm: (value?: string) => boolean | void, title?: string) => void;
  showToast: (message: string, duration?: number) => void;
  extraSystemPrompt?: string;
}
