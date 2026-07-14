import type { Contact } from '../../types';
import { getChatModePolicy } from '../chat/chatModePolicy.ts';

export type ModeCapabilityKey = 'text' | 'inner' | 'action' | 'storyInner' | 'storyState' | 'narration';

export const getModeCapabilityKeys = (mode: Contact['chatMode'] | undefined): ModeCapabilityKey[] => {
  const resolved = mode || 'online';
  if (resolved === 'online-inner') return ['text', 'inner'];
  if (resolved === 'offline') return ['text', 'action'];
  if (resolved === 'offline-inner') return ['text', 'inner', 'action'];
  if (resolved === 'story') return ['text', 'storyInner', 'storyState', 'narration'];
  return ['text'];
};

export const MODE_CAPABILITY_LABELS: Record<ModeCapabilityKey, string> = {
  text: '正文文本',
  inner: '心声',
  action: '动作',
  storyInner: 'storyInner',
  storyState: 'storyState',
  narration: '旁白'
};

export const MODE_CAPABILITY_TAG_TEMPLATES: Partial<Record<ModeCapabilityKey, string>> = {
  inner: `{ "type": "inner", "value": "你的心声或思考" }`,
  action: `{ "type": "action", "value": "你的动作、神态等" }`,
  storyInner: `{ "type": "storyInner", "value": "你的内心想法" }`,
  storyState: `{ "type": "storyState", "value": "你正在做的事与当下状态" }`,
  narration: `{ "type": "narration", "value": "旁白内容" }`
};

export const getModeCapabilitySummary = (mode: Contact['chatMode'] | undefined) => {
  const keys = getModeCapabilityKeys(mode);
  const labels = keys.map((key) => MODE_CAPABILITY_LABELS[key]);
  const tagTemplates = keys
    .map((key) => MODE_CAPABILITY_TAG_TEMPLATES[key])
    .filter(Boolean) as string[];
  return { keys, labels, tagTemplates };
};

export const getContactMetaCapabilities = (contact: Contact) => {
  const policy = getChatModePolicy(contact);
  return {
    isStory: policy.isStory,
    mode: policy.mode,
    descriptionFeatureEnabled: policy.descriptionFeatureEnabled,
    descriptionSayEnabled: policy.descriptionSayEnabled,
    descriptionDoEnabled: policy.descriptionDoEnabled,
    innerEnabled: policy.innerEnabled,
    actionEnabled: policy.actionEnabled
  };
};

export const getContactModeCapabilitySummary = (contact: Contact) => {
  const capabilities = getContactMetaCapabilities(contact);
  if (capabilities.isStory) {
    return getModeCapabilitySummary('story');
  }
  const keys: ModeCapabilityKey[] = ['text'];
  if (capabilities.innerEnabled) keys.push('inner');
  if (capabilities.actionEnabled) keys.push('action');
  const labels = keys.map((key) => MODE_CAPABILITY_LABELS[key]);
  const tagTemplates = keys
    .map((key) => MODE_CAPABILITY_TAG_TEMPLATES[key])
    .filter(Boolean) as string[];
  return { keys, labels, tagTemplates };
};
