import { useCallback, useMemo } from 'react';
import type { AppState } from './useAppState';
import type { Contact } from '../types';
import {
  getContactMemoryPrompt
} from '../services/contactMemoryService';
import { buildRuntimeUserPersonaPrompt } from '../services/personaSummary';
import { buildProfilePlaceholder } from '../app/contactViewUtils';
import {
  DEFAULT_CONTACT_CONTEXT_MESSAGES,
  DEFAULT_MEMORY_SUMMARY_THRESHOLD
} from '../appBootstrapUtils';
import { buildRuntimeUserPrompt } from '../app/anonymousChatUtils';
import { clampContextMessageLimit } from '../services/aiRequestBudget';
import { appendMemoryEntryWithAutoSummary } from '../utils/chat/replyMemory';
import type { ContactMemories, Mask, UserProfile } from '../types';

export const buildRuntimePromptWithUserContext = (options: {
  runtimeUserPromptBase: string;
  contact: Contact | undefined;
  contactMemories: ContactMemories;
  user: UserProfile;
  masks: Mask[];
  limit?: number;
}): string => {
  const {
    runtimeUserPromptBase,
    contact,
    contactMemories,
    user,
    masks,
    limit = 12
  } = options;
  const selectedMask = contact?.selectedMaskId
    ? (masks || []).find((mask) => mask.id === contact.selectedMaskId) || null
    : null;
  const userInfoPrompt = buildRuntimeUserPersonaPrompt(user, {
    selectedMask,
    contactUserPersona: contact?.userPersona
  });
  if (!contact?.id) {
    return [runtimeUserPromptBase, userInfoPrompt].filter(Boolean).join('\n\n');
  }
  const contactName = contact.remark?.trim() || contact.name;
  const memoryPrompt = getContactMemoryPrompt(contactMemories, contact.id, limit, contactName);
  return [runtimeUserPromptBase, userInfoPrompt, memoryPrompt].filter(Boolean).join('\n\n');
};

export const useChatRuntimeContext = (state: AppState) => {
  const s = state;

  const currentChat = useMemo(() => {
    return s.contacts.find((contact) => contact.id === s.selectedContactId);
  }, [s.contacts, s.selectedContactId]);

  const currentProfile = useMemo(() => {
    if (s.profileId === 'me') {
      return {
        id: 'me',
        name: s.user.name,
        avatar: s.user.avatar,
        wechatId: s.user.wechatId,
        signature: s.user.signature,
        region: s.user.region
      } as Contact;
    }
    return s.contacts.find((contact) => contact.id === s.profileId) || s.profileSnapshot;
  }, [s.contacts, s.profileId, s.user, s.profileSnapshot]);

  const runtimeUserPromptBase = buildRuntimeUserPrompt(s.aiSettings.enableTimeAwareness);

  const buildRuntimePromptWithMemory = useCallback((contact: Contact | undefined, limit = 12) => {
    return buildRuntimePromptWithUserContext({
      runtimeUserPromptBase,
      contact,
      contactMemories: s.contactMemories,
      user: s.user,
      masks: s.masks,
      limit
    });
  }, [s.contactMemories, s.masks, s.user, runtimeUserPromptBase]);

  const resolveContextLimit = useCallback((contact?: Contact | null): number => {
    return clampContextMessageLimit(contact?.maxContextMessages || DEFAULT_CONTACT_CONTEXT_MESSAGES);
  }, []);

  const resolveMemorySummaryThreshold = useCallback((contact?: Contact | null): number => {
    return Math.max(1, Number(contact?.memorySummaryThreshold || DEFAULT_MEMORY_SUMMARY_THRESHOLD));
  }, []);

  const updateMemoryWithAutoSummary = useCallback((
    contactId: string,
    text: string,
    source: 'user' | 'model' | 'system',
    contactName: string,
    summaryThreshold: number = DEFAULT_MEMORY_SUMMARY_THRESHOLD
  ) => {
    appendMemoryEntryWithAutoSummary({
      contactId,
      text,
      source,
      contactName,
      threshold: summaryThreshold || DEFAULT_MEMORY_SUMMARY_THRESHOLD,
      contactMemories: s.contactMemories,
      aiSettings: s.aiSettings,
      setContactMemories: s.setContactMemories,
      errorLogScope: '[useChatRuntimeContext]'
    });
  }, [s.aiSettings, s.contactMemories, s.setContactMemories]);

  const getProfilePlaceholder = useCallback((id?: string | null): Contact => {
    return buildProfilePlaceholder(id, s.user.avatar);
  }, [s.user.avatar]);

  return {
    currentChat,
    currentProfile,
    runtimeUserPromptBase,
    buildRuntimePromptWithMemory,
    resolveContextLimit,
    resolveMemorySummaryThreshold,
    updateMemoryWithAutoSummary,
    getProfilePlaceholder
  };
};
