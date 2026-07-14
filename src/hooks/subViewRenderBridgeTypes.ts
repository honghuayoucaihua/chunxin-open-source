import type { AppState } from './useAppState';
import type { AppActionHandlers } from './useAppActionHandlers';
import type { Contact } from '../types';

export type ContactRenderHandlers = {
  handleDeleteContact: (id: string, options?: {
    confirmMessage?: string;
    confirmTitle?: string;
    successToast?: string;
  }) => void;
  handleConfirmDeleteCurrentContact: () => void;
  handleConfirmExitCurrentGroup: () => void;
  handleIfLineSelect: (id: string) => void;
  handleIfLineAction: (action: 'pin' | 'clear' | 'delete', id: string) => void;
};

export type UseSubViewRenderBridgeParams = {
  state: AppState;
  currentChat: Contact | undefined;
  currentProfile: Contact | null | undefined;
  ifLineContacts: Contact[];
  getProfilePlaceholder: (id?: string | null) => Contact;
  handleHighContextLimitWarning: (contextLimit: number) => void;
  runtimeUserPromptBase: string;
  buildRuntimePromptWithMemory: (contact: Contact | undefined, limit?: number) => string;
  setIsChatInputFocused: (focused: boolean) => void;
  contactHandlers: ContactRenderHandlers;
  actionHandlers: AppActionHandlers & {
    handleStartAnonymousMatch: () => void;
    handleResumeAnonymousSession: () => void;
    handleAnonymousSend: () => void;
    handleAnonymousLeave: (reason: 'leftByMe' | 'leftByPeer') => void;
  };
};
