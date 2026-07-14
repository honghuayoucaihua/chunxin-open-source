import type { Contact } from '../../types';

export const DEFAULT_INNER_VOICE_LIMIT = 60;
export const DEFAULT_ACTION_DESC_LIMIT = 60;

const normalizePositiveLimit = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.round(parsed);
};

export const resolveInnerVoiceLimit = (contact?: Pick<Contact, 'innerVoiceLimit'> | null): number =>
  normalizePositiveLimit(contact?.innerVoiceLimit, DEFAULT_INNER_VOICE_LIMIT);

export const resolveActionDescLimit = (contact?: Pick<Contact, 'actionDescLimit'> | null): number =>
  normalizePositiveLimit(contact?.actionDescLimit, DEFAULT_ACTION_DESC_LIMIT);

export const clipInnerVoiceForContact = (contact: Pick<Contact, 'innerVoiceLimit'> | null | undefined, value?: string): string | undefined => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, resolveInnerVoiceLimit(contact));
};

export const clipActionDescForContact = (contact: Pick<Contact, 'actionDescLimit'> | null | undefined, value?: string): string | undefined => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, resolveActionDescLimit(contact));
};

export const clipContactMetaByLimits = (
  contact: Pick<Contact, 'innerVoiceLimit' | 'actionDescLimit'> | null | undefined,
  meta: { innerVoice?: string; actionDesc?: string }
) => ({
  innerVoice: clipInnerVoiceForContact(contact, meta.innerVoice),
  actionDesc: clipActionDescForContact(contact, meta.actionDesc)
});
