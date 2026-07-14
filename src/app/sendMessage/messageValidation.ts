import type { Dispatch, SetStateAction } from 'react';
import type { AISettings, Contact, Message, QuotedMessageSnapshot } from '../../types';
import { appendChatMessagesAndRefreshPreview } from '../chatMessageFlowUtils.ts';

export type SendOverridePayload =
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

const DEFAULT_IMAGE_PROMPT = '用户发送了一张图片（未提供描述）';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const normalizeDisplayText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'bigint') return String(value);
  return '';
};

export const isImageOverridePayload = (
  overrideText: SendOverridePayload | undefined
): overrideText is Exclude<SendOverridePayload, string> & { imageUrl: string } =>
  isRecord(overrideText) && typeof overrideText.imageUrl === 'string' && !!overrideText.imageUrl.trim();

export const buildImagePromptText = (raw: unknown): string => {
  const trimmed = normalizeDisplayText(raw).trim();
  return trimmed ? `用户发送图片描述：${trimmed}` : DEFAULT_IMAGE_PROMPT;
};

type SendMessageValidationParams = {
  inputValue: string;
  aiSettings?: AISettings;
};

type VoiceCallContact = Pick<Contact, 'id' | 'isGroup' | 'memberIds' | 'minimaxTTS' | 'name' | 'remark'>;

type VoiceCallParams = {
  aiSettings: AISettings;
  activeVoiceCallContactId?: string | null;
  contacts: Contact[];
};

type QuoteSenderParams = {
  contacts: Contact[];
};

type AppendUserMessageParams = {
  setMessages: Dispatch<SetStateAction<Record<string, Message[]>>>;
  setContacts: Dispatch<SetStateAction<Contact[]>>;
  setQuotedMessage: Dispatch<SetStateAction<QuotedMessageSnapshot | null>>;
};

export function extractInputText(params: SendMessageValidationParams, overrideText: SendOverridePayload | undefined): string | null {
  if (isImageOverridePayload(overrideText)) {
    const useVisionInput = params?.aiSettings?.provider !== 'builtin' && !!params?.aiSettings?.customModelSupportsImageRecognition;
    if (useVisionInput) return '[图片]';
    return buildImagePromptText(overrideText.imageCaption || overrideText.text);
  }
  const raw = typeof overrideText === 'string'
    ? overrideText
    : isRecord(overrideText)
      ? overrideText.text
      : params.inputValue;
  const trimmed = normalizeDisplayText(raw).trim();
  return trimmed ? trimmed : null;
}

export function extractImageCaptionText(overrideText: SendOverridePayload | undefined): string {
  if (!isImageOverridePayload(overrideText)) return '';
  return normalizeDisplayText(overrideText.imageCaption || overrideText.text).trim();
}

export function getShouldAppend(overrideText: SendOverridePayload | undefined): boolean {
  return isRecord(overrideText) ? overrideText.append !== false : true;
}

export function getDescriptionInputKind(overrideText: SendOverridePayload | undefined): 'say' | 'do' {
  return isRecord(overrideText) && overrideText.descriptionInputKind === 'do' ? 'do' : 'say';
}

export function isInternalStoryAdvancePayload(
  overrideText: SendOverridePayload | undefined
): overrideText is Exclude<SendOverridePayload, string> & { source: 'storyAdvance' } {
  return isRecord(overrideText) && overrideText.source === 'storyAdvance';
}

export function buildInternalRuntimePrompt(overrideText: SendOverridePayload | undefined): string {
  if (!isInternalStoryAdvancePayload(overrideText)) return '';
  const inputKind = overrideText.inputKind === 'story' ? 'story' : 'chat';
  const lines = inputKind === 'story'
    ? [
        '【本轮内部操作】用户点击了剧情推进按钮；这不是用户台词，也不是用户在剧情中的行动。',
        '请基于最近真实聊天记录、角色资料、世界书和规则树继续推进剧情。',
        '优先推进场景、关系、情绪或信息中的一项；不要替用户说话或行动，不要跳过用户关键选择。'
      ]
    : [
        '【本轮内部操作】用户点击了继续回应按钮；这不是用户台词，也不是用户在聊天中发送的正文。',
        '请基于最近真实聊天记录和双方关系自然接话，延续当前话题或情绪。',
        '不要复述本段内部操作，也不要把它当成用户说过的话。'
      ];
  return lines.join('\n');
}

export function buildStoryInputModeRuntimePrompt(
  overrideText: SendOverridePayload | undefined,
  contact?: Pick<Contact, 'chatMode'> | null
): string {
  if (contact?.chatMode !== 'story' || isInternalStoryAdvancePayload(overrideText)) return '';
  const inputKind = isRecord(overrideText) && overrideText.inputKind === 'story' ? 'story' : 'chat';
  const lines = inputKind === 'story'
    ? [
        '【本轮剧情输入语义】用户本轮选择了“剧情”输入；最后真实用户消息是用户写入的场景、动作、叙述或剧情片段。',
        '请把这条内容作为用户确认加入当前剧情的事实来承接，推进角色、环境、NPC 或外部变化。',
        '这不是用户台词，不要逐字当作对话回应；也不要重写、否定或替用户补完未写出的行动和内心。'
      ]
    : [
        '【本轮剧情输入语义】用户本轮选择了“聊天”输入；最后真实用户消息优先视为用户角色的台词、询问、态度或即时互动意图。',
        '请让角色直接承接这句话的语气、关系和情绪，再自然推进当前剧情。',
        '不要把聊天输入扩写成用户已经完成的新动作，也不要替用户决定下一步。'
      ];
  return lines.join('\n');
}

export function buildTextUserMessage(input: {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  quotedMsg?: QuotedMessageSnapshot;
  descriptionInputKind?: 'say' | 'do';
}): Message {
  const base = {
    id: input.id,
    senderId: input.senderId,
    timestamp: input.timestamp,
    type: 'text' as const,
    quotedMsg: input.quotedMsg
  };
  if (input.descriptionInputKind === 'do') {
    return {
      ...base,
      content: '',
      actionDesc: input.text
    };
  }
  return {
    ...base,
    content: input.text
  };
}

export function checkMinimaxReadiness(params: VoiceCallParams, contact: VoiceCallContact | null | undefined): {
  minimaxGlobalReady: boolean;
  minimaxContactReady: boolean;
  isVoiceCallWithMiniMax: boolean;
} {
  const minimaxGlobalReady = !!(
    params.aiSettings.minimaxTTS?.enabled
    && String(params.aiSettings.minimaxTTS?.apiKey || '').trim()
    && String(params.aiSettings.minimaxTTS?.groupId || '').trim()
    && String(params.aiSettings.minimaxTTS?.model || '').trim()
  );
  const minimaxContactReady = !!(
    contact?.minimaxTTS?.enabled
    && String(contact?.minimaxTTS?.voiceId || '').trim()
  );
  const isVoiceCallWithMiniMax = !!(
    contact
    && params.activeVoiceCallContactId === contact.id
    && minimaxGlobalReady
    && minimaxContactReady
    && !contact.isGroup
  );
  return { minimaxGlobalReady, minimaxContactReady, isVoiceCallWithMiniMax };
}

export function createToVoiceCallMessage(isVoiceCallWithMiniMax: boolean, contact: VoiceCallContact | null | undefined) {
  return (msg: Message): Message => {
    if (!isVoiceCallWithMiniMax) return msg;
    if (msg.senderId === 'me' || msg.type !== 'text') return msg;
    const speedRaw = Number(contact?.minimaxTTS?.speed);
    const safeSpeed = Number.isFinite(speedRaw) ? speedRaw : 1;
    return {
      ...msg,
      type: 'voice',
      voiceId: contact?.minimaxTTS?.voiceId || '',
      voiceSpeed: safeSpeed,
      voiceLanguage: contact?.minimaxTTS?.language || 'Chinese'
    };
  };
}

export function createResolveQuoteSenderId(contact: VoiceCallContact | null | undefined, params: QuoteSenderParams, selectedContactId: string) {
  return (target?: string) => {
    const normalized = (target || '').trim().toLowerCase();
    if (['我', '你', '用户', 'user', 'me'].includes(normalized)) return 'me';
    if (contact?.isGroup) {
      const targetName = (target || '').trim();
      const hit = params.contacts.find((item) =>
        (contact.memberIds || []).includes(item.id)
        && [item.name, item.remark?.trim() || ''].includes(targetName)
      );
      if (hit) return hit.id;
    }
    return selectedContactId;
  };
}

export function appendUserMessage(
  params: AppendUserMessageParams,
  selectedContactId: string,
  tempMsg: Message,
  appliedQuote: Message | null | undefined
): void {
  appendChatMessagesAndRefreshPreview(params, selectedContactId, [tempMsg]);
  if (appliedQuote) params.setQuotedMessage(null);
}
