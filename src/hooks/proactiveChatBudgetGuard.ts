import type { Contact, Message } from '../types/index.ts';
import {
  MAX_PROACTIVE_TRIGGERS_PER_CHECK,
  PROACTIVE_DRAFT_WARMUP_INTERVAL_MS,
  getLastUserMessageAt,
  getWindowMs
} from './proactiveChatConfig.ts';

type ProactiveContactState = {
  contacts: Contact[];
  messages: Record<string, Message[]>;
};

export const canWarmupProactiveDraft = (
  draftWarmupAt: Record<string, number>,
  contactId: string,
  now: number
): boolean => {
  const lastWarmupAt = Number(draftWarmupAt[contactId] || 0);
  return now - lastWarmupAt >= PROACTIVE_DRAFT_WARMUP_INTERVAL_MS;
};

export const selectDueProactiveContacts = (
  state: ProactiveContactState,
  now: number,
  limit: number = MAX_PROACTIVE_TRIGGERS_PER_CHECK
): Contact[] => {
  const maxCount = Math.max(0, Math.floor(Number(limit || 0)));
  if (maxCount <= 0) return [];
  return state.contacts
    .filter((contact) => {
      if (!contact.isAi || contact.isGroup || !contact.proactiveChatEnabled) return false;
      const windowMs = getWindowMs(contact);
      const lastUserMessageAt = getLastUserMessageAt(state.messages[contact.id] || []);
      const lastProactiveAt = Number(contact.lastProactiveChatAt || 0);
      return now - lastUserMessageAt >= windowMs && now - lastProactiveAt >= windowMs;
    })
    .sort((a, b) => {
      const aDueAt = Math.max(
        getLastUserMessageAt(state.messages[a.id] || []),
        Number(a.lastProactiveChatAt || 0)
      ) + getWindowMs(a);
      const bDueAt = Math.max(
        getLastUserMessageAt(state.messages[b.id] || []),
        Number(b.lastProactiveChatAt || 0)
      ) + getWindowMs(b);
      return aDueAt - bDueAt;
    })
    .slice(0, maxCount);
};
