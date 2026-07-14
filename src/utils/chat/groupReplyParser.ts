import type { Message } from '../../types/message.ts';
import { formatWalletAmount, parseWalletAmount } from '../../app/walletFlowUtils.ts';
import {
  normalizeGeneratedActionText,
  normalizeGeneratedInnerVoiceText,
  normalizeGeneratedStrictNonSystemEventText,
  normalizeGeneratedTranslationText,
  normalizeGeneratedVisibleText
} from '../generatedVisibleText.ts';
import { containsJsonObjectFragment, extractStrictJsonObject, parseAIReply } from './aiReplyParser.ts';

type GroupReplyParserOptions = {
  memberIds: string[];
  memberBalances?: Record<string, number | string | null | undefined>;
  memberVoiceEnabled?: Record<string, boolean | null | undefined>;
  memberVoiceIds?: Record<string, string | null | undefined>;
  allowSystemAbilities?: boolean;
  maxMessages?: number;
  now?: number;
  idPrefix?: string;
  allowInner?: boolean;
  allowAction?: boolean;
};

const GROUP_SUPPORTED_TYPE_LIST = [
  'text',
  'image',
  'redpacket',
  'transfer',
  'location',
  'pat',
  'voice',
  'call'
] as const;

type GroupSupportedType = typeof GROUP_SUPPORTED_TYPE_LIST[number];

const GROUP_SUPPORTED_TYPES = new Set<string>(GROUP_SUPPORTED_TYPE_LIST);
const GROUP_IMAGE_DATA_URL_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/i;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const GROUP_MESSAGE_FIELDS_BY_TYPE: Record<GroupSupportedType, Set<string>> = {
  text: new Set(['speakerId', 'type', 'content', 'translationZh', 'pairs', 'innerVoice', 'actionDesc']),
  image: new Set(['speakerId', 'type', 'imageUrl']),
  redpacket: new Set(['speakerId', 'type', 'amount', 'message']),
  transfer: new Set(['speakerId', 'type', 'amount', 'message']),
  location: new Set(['speakerId', 'type', 'locationName', 'locationAddress']),
  pat: new Set(['speakerId', 'type', 'targetName', 'fromName', 'patDesc']),
  voice: new Set(['speakerId', 'type', 'content', 'voiceId', 'speed', 'language']),
  call: new Set(['speakerId', 'type', 'status', 'durationSec', 'content'])
};

const resolveGroupMessageType = (item: Record<string, unknown>): GroupSupportedType | null => {
  if (typeof item.type !== 'string') return null;
  const rawType = item.type.trim();
  return GROUP_SUPPORTED_TYPES.has(rawType) ? rawType as GroupSupportedType : null;
};

const hasOnlyAllowedGroupMessageFields = (item: Record<string, unknown>, type: GroupSupportedType): boolean => {
  const allowedFields = GROUP_MESSAGE_FIELDS_BY_TYPE[type];
  return Object.keys(item).every((key) => allowedFields.has(key));
};

const hasOwnField = (item: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(item, key);

const hasForbiddenGroupTextMetaFields = (
  item: Record<string, unknown>,
  allowInner: boolean,
  allowAction: boolean
): boolean => (
  (!allowInner && hasOwnField(item, 'innerVoice'))
  || (!allowAction && hasOwnField(item, 'actionDesc'))
);

const normalizeGroupImageUrl = (raw: unknown): string | null => {
  const value = String(raw || '').trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const matchedDataUrl = value.match(GROUP_IMAGE_DATA_URL_PATTERN);
  if (!matchedDataUrl) return null;
  const mimeType = matchedDataUrl[1];
  const base64Data = String(matchedDataUrl[2] || '').replace(/\s+/g, '');
  return base64Data ? `data:${mimeType};base64,${base64Data}` : null;
};

const isValidGroupTextMessageShape = (item: Record<string, unknown>): boolean => {
  const hasContent = hasOwnField(item, 'content');
  const hasPairs = hasOwnField(item, 'pairs');
  const hasTranslation = hasOwnField(item, 'translationZh');
  if (hasContent === hasPairs) return false;
  if (hasPairs && hasTranslation) return false;
  if (hasPairs) return Array.isArray(item.pairs) && item.pairs.length > 0;
  if (typeof item.content !== 'string') return false;
  const directStringContent = item.content.trim();
  return Boolean(directStringContent)
    && !extractStrictJsonObject(directStringContent)
    && !containsJsonObjectFragment(directStringContent);
};

const normalizeMemberBalanceMap = (
  balances: GroupReplyParserOptions['memberBalances']
): Map<string, number> => {
  const map = new Map<string, number>();
  if (!balances || typeof balances !== 'object') return map;
  Object.entries(balances).forEach(([id, value]) => {
    const parsed = Number(value);
    if (!id || !Number.isFinite(parsed)) return;
    map.set(id, Math.max(0, Number(parsed.toFixed(2))));
  });
  return map;
};

const normalizeBooleanMap = (
  value: GroupReplyParserOptions['memberVoiceEnabled']
): Map<string, boolean> => {
  const map = new Map<string, boolean>();
  if (!value || typeof value !== 'object') return map;
  Object.entries(value).forEach(([id, enabled]) => {
    if (!id) return;
    map.set(id, enabled === true);
  });
  return map;
};

const normalizeStringMap = (
  value: GroupReplyParserOptions['memberVoiceIds']
): Map<string, string> => {
  const map = new Map<string, string>();
  if (!value || typeof value !== 'object') return map;
  Object.entries(value).forEach(([id, raw]) => {
    const normalized = String(raw || '').trim();
    if (!id || !normalized) return;
    map.set(id, normalized);
  });
  return map;
};

const isAllowedGroupVoiceMessage = (
  item: Record<string, unknown>,
  speakerId: string,
  memberVoiceEnabled: Map<string, boolean>,
  memberVoiceIds: Map<string, string>
): boolean => {
  if (memberVoiceEnabled.size > 0 && memberVoiceEnabled.get(speakerId) !== true) return false;
  const expectedVoiceId = memberVoiceIds.get(speakerId);
  if (memberVoiceIds.size > 0) {
    const actualVoiceId = String(item.voiceId || '').trim();
    if (!expectedVoiceId || actualVoiceId !== expectedVoiceId) return false;
  }
  return !!normalizeGroupVoiceMessage(item);
};

const collectBlockedSystemAbilitySpeakerIds = (
  rawItems: unknown[],
  memberIds: Set<string>,
  memberBalances: GroupReplyParserOptions['memberBalances'],
  memberVoiceEnabled: Map<string, boolean>,
  memberVoiceIds: Map<string, string>,
  allowSystemAbilities: boolean
): Set<string> => {
  const blocked = new Set<string>();
  const remainingBalances = normalizeMemberBalanceMap(memberBalances);

  rawItems.forEach((item) => {
    if (!isRecord(item)) return;
    const speakerId = String(item.speakerId || '').trim();
    if (!speakerId || !memberIds.has(speakerId) || blocked.has(speakerId)) return;
    const msgType = resolveGroupMessageType(item);
    if (!msgType) {
      blocked.add(speakerId);
      return;
    }
    if (msgType === 'text') return;
    if (!hasOnlyAllowedGroupMessageFields(item, msgType)) {
      blocked.add(speakerId);
      return;
    }
    if (msgType !== 'redpacket' && msgType !== 'transfer') {
      if (!allowSystemAbilities) {
        blocked.add(speakerId);
        return;
      }
      if (msgType === 'image') {
        const imageUrl = normalizeGroupImageUrl(item.imageUrl);
        if (!imageUrl) blocked.add(speakerId);
        return;
      }
      if (msgType === 'location') {
        if (!normalizeGroupLocationMessage(item)) blocked.add(speakerId);
        return;
      }
      if (msgType === 'pat') {
        if (!normalizeGroupPatMessage(item, speakerId)) blocked.add(speakerId);
        return;
      }
      if (msgType === 'voice') {
        if (!isAllowedGroupVoiceMessage(item, speakerId, memberVoiceEnabled, memberVoiceIds)) blocked.add(speakerId);
        return;
      }
      if (msgType === 'call') {
        if (!normalizeGroupCallMessage(item)) blocked.add(speakerId);
        return;
      }
      return;
    }

    if (!allowSystemAbilities) {
      blocked.add(speakerId);
      return;
    }

    const amount = parseWalletAmount(String(item.amount ?? ''));
    const remainingBalance = remainingBalances.get(speakerId);
    if (amount === null || (remainingBalance !== undefined && amount > remainingBalance)) {
      blocked.add(speakerId);
      return;
    }
    if (remainingBalance !== undefined) {
      remainingBalances.set(speakerId, Number((remainingBalance - amount).toFixed(2)));
    }
  });

  return blocked;
};

const normalizeGroupReplyText = (
  rawContent: unknown,
  rawPairs: unknown,
  rawTranslation: unknown,
  allowInner: boolean,
  allowAction: boolean
): Pick<Message, 'content' | 'translatedContentZhCN' | 'innerVoice' | 'actionDesc'> | null => {
  const directStringContent = typeof rawContent === 'string' ? rawContent.trim() : '';
  if (directStringContent && !extractStrictJsonObject(directStringContent) && !containsJsonObjectFragment(directStringContent)) {
    const content = normalizeGeneratedStrictNonSystemEventText(directStringContent, { collapseWhitespace: true });
    if (!content) return null;
    const translatedContentZhCN = normalizeGeneratedTranslationText(rawTranslation, { collapseWhitespace: true }) || undefined;
    return {
      content,
      ...(translatedContentZhCN ? { translatedContentZhCN } : {})
    };
  }

  const input = Array.isArray(rawPairs) ? JSON.stringify({ pairs: rawPairs }) : '';
  if (!input) return null;
  const parsed = parseAIReply(input, allowInner, allowAction, { allowSocial: false, requireStructured: true }) as {
    text?: string;
    translatedContentZhCN?: string;
    innerVoice?: string;
    actionDesc?: string;
  };
  const content = normalizeGeneratedStrictNonSystemEventText(parsed.text, { collapseWhitespace: true });
  if (!content) return null;
  const translatedContentZhCN = (
    normalizeGeneratedTranslationText(parsed.translatedContentZhCN, { collapseWhitespace: true })
    || normalizeGeneratedTranslationText(rawTranslation, { collapseWhitespace: true })
    || undefined
  );
  const innerVoice = allowInner ? normalizeGeneratedInnerVoiceText(parsed.innerVoice, { collapseWhitespace: true }) || undefined : undefined;
  const actionDesc = allowAction ? normalizeGeneratedActionText(parsed.actionDesc, { collapseWhitespace: true }) || undefined : undefined;
  return {
    content,
    ...(translatedContentZhCN ? { translatedContentZhCN } : {}),
    ...(innerVoice ? { innerVoice } : {}),
    ...(actionDesc ? { actionDesc } : {})
  };
};

const normalizeGroupPaymentMessage = (
  item: Record<string, unknown>,
  type: 'redpacket' | 'transfer'
): Pick<Message, 'content' | 'amount' | 'type' | 'isOpened' | 'paymentStatus'> | null => {
  const amount = parseWalletAmount(String(item.amount ?? ''));
  if (amount === null) return null;
  const normalizedAmount = formatWalletAmount(amount);
  const rawContent = normalizeGeneratedStrictNonSystemEventText(item.message, { collapseWhitespace: true });
  return {
    content: rawContent,
    amount: normalizedAmount,
    type,
    isOpened: false,
    paymentStatus: 'pending'
  };
};

const normalizeGroupLocationMessage = (
  item: Record<string, unknown>
): Pick<Message, 'content' | 'type' | 'locationName' | 'locationAddress'> | null => {
  const locationName = normalizeGeneratedStrictNonSystemEventText(item.locationName, { collapseWhitespace: true });
  const locationAddress = normalizeGeneratedStrictNonSystemEventText(item.locationAddress, { collapseWhitespace: true });
  if (!locationName && !locationAddress) return null;
  return {
    type: 'location',
    content: locationName || locationAddress,
    locationName,
    locationAddress
  };
};

const normalizeGroupPatMessage = (
  item: Record<string, unknown>,
  speakerId: string
): Pick<Message, 'content' | 'type' | 'pat'> | null => {
  const targetName = normalizeGeneratedStrictNonSystemEventText(item.targetName, { collapseWhitespace: true });
  if (!targetName) return null;
  const fromName = normalizeGeneratedStrictNonSystemEventText(item.fromName || speakerId, { collapseWhitespace: true }) || speakerId;
  if (fromName === targetName) return null;
  const patDesc = normalizeGeneratedStrictNonSystemEventText(item.patDesc, { collapseWhitespace: true });
  const patText = patDesc ? `「${patDesc}」` : '';
  return {
    type: 'system',
    content: `${fromName} 拍了拍 ${targetName}${patText ? ` ${patText}` : ''}`,
    pat: {
      fromId: speakerId,
      fromName,
      targetName
    }
  };
};

const normalizeGroupVoiceMessage = (
  item: Record<string, unknown>
): Pick<Message, 'content' | 'type' | 'voiceId' | 'voiceSpeed' | 'voiceLanguage'> | null => {
  const content = normalizeGeneratedStrictNonSystemEventText(item.content, { collapseWhitespace: true });
  if (!content) return null;
  const voiceId = String(item.voiceId || '').trim();
  const voiceSpeed = Number.isFinite(Number(item.speed))
    ? Number(item.speed)
    : undefined;
  const voiceLanguage = String(item.language || '').trim() || undefined;
  return {
    type: 'voice',
    content,
    ...(voiceId ? { voiceId } : {}),
    ...(voiceSpeed ? { voiceSpeed } : {}),
    ...(voiceLanguage ? { voiceLanguage } : {})
  };
};

const normalizeGroupCallMessage = (
  item: Record<string, unknown>
): Pick<Message, 'content' | 'type' | 'callStatus' | 'callDurationSec'> | null => {
  const rawStatus = String(item.status || '').trim();
  const callStatus = rawStatus === 'missed' || rawStatus === 'ongoing' || rawStatus === 'ended'
    ? rawStatus
    : undefined;
  const duration = Number(item.durationSec);
  const callDurationSec = Number.isFinite(duration) ? Math.max(0, Math.floor(duration)) : undefined;
  if (!callStatus && callDurationSec === undefined) return null;
  return {
    type: 'call',
    content: normalizeGeneratedStrictNonSystemEventText(item.content, { collapseWhitespace: true }),
    ...(callStatus ? { callStatus } : {}),
    ...(callDurationSec !== undefined ? { callDurationSec } : {})
  };
};

export const parseGroupReplyMessages = (
  rawReply: string,
  options: GroupReplyParserOptions
): Message[] => {
  const parsedJson = extractStrictJsonObject(rawReply || '');
  const rawItems = Array.isArray(parsedJson?.messages) ? parsedJson.messages : [];
  const memberIds = new Set((options.memberIds || []).filter(Boolean));
  const maxMessages = Number.isFinite(Number(options.maxMessages))
    ? Math.max(1, Number(options.maxMessages))
    : 4;
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const idPrefix = String(options.idPrefix || 'group').trim() || 'group';
  const allowInner = options.allowInner === true;
  const allowAction = options.allowAction === true;
  const allowSystemAbilities = options.allowSystemAbilities !== false;
  const remainingBalances = normalizeMemberBalanceMap(options.memberBalances);
  const memberVoiceEnabled = normalizeBooleanMap(options.memberVoiceEnabled);
  const memberVoiceIds = normalizeStringMap(options.memberVoiceIds);
  const blockedSystemAbilitySpeakerIds = collectBlockedSystemAbilitySpeakerIds(
    rawItems,
    memberIds,
    options.memberBalances,
    memberVoiceEnabled,
    memberVoiceIds,
    allowSystemAbilities
  );

  return rawItems
    .map((item, idx): Message | null => {
      if (!isRecord(item)) return null;
      const speakerId = String(item.speakerId || '').trim();
      if (!speakerId || !memberIds.has(speakerId)) return null;
      if (blockedSystemAbilitySpeakerIds.has(speakerId)) return null;

      const msgType = resolveGroupMessageType(item);
      if (!msgType) return null;
      if (!hasOnlyAllowedGroupMessageFields(item, msgType)) return null;
      if (msgType === 'text' && hasForbiddenGroupTextMetaFields(item, allowInner, allowAction)) return null;
      if (msgType === 'text' && !isValidGroupTextMessageShape(item)) return null;
      if (!allowSystemAbilities && msgType !== 'text') return null;
      if (msgType === 'image') {
        const imageUrl = normalizeGroupImageUrl(item.imageUrl);
        if (!imageUrl) return null;
        return {
          id: `${now}-${idPrefix}-${idx}`,
          senderId: speakerId,
          content: imageUrl,
          timestamp: now + idx,
          type: 'image'
        };
      }
      if (msgType === 'redpacket' || msgType === 'transfer') {
        const payment = normalizeGroupPaymentMessage(item, msgType);
        if (!payment) return null;
        const amount = parseWalletAmount(String(payment.amount ?? ''));
        const remainingBalance = remainingBalances.get(speakerId);
        if (amount === null) return null;
        if (remainingBalance !== undefined) {
          if (amount > remainingBalance) return null;
          remainingBalances.set(speakerId, Number((remainingBalance - amount).toFixed(2)));
        }
        return {
          id: `${now}-${idPrefix}-${idx}`,
          senderId: speakerId,
          content: payment.content,
          amount: payment.amount,
          timestamp: now + idx,
          type: payment.type,
          isOpened: payment.isOpened,
          paymentStatus: payment.paymentStatus
        };
      }
      if (msgType === 'location') {
        const location = normalizeGroupLocationMessage(item);
        if (!location) return null;
        return {
          id: `${now}-${idPrefix}-${idx}`,
          senderId: speakerId,
          content: location.content,
          timestamp: now + idx,
          type: 'location',
          locationName: location.locationName,
          locationAddress: location.locationAddress
        };
      }
      if (msgType === 'pat') {
        const pat = normalizeGroupPatMessage(item, speakerId);
        if (!pat) return null;
        return {
          id: `${now}-${idPrefix}-${idx}`,
          senderId: speakerId,
          content: pat.content,
          timestamp: now + idx,
          type: 'system',
          pat: pat.pat
        };
      }
      if (msgType === 'voice') {
        if (!isAllowedGroupVoiceMessage(item, speakerId, memberVoiceEnabled, memberVoiceIds)) return null;
        const voice = normalizeGroupVoiceMessage(item);
        if (!voice) return null;
        return {
          id: `${now}-${idPrefix}-${idx}`,
          senderId: speakerId,
          content: voice.content,
          timestamp: now + idx,
          type: 'voice',
          voiceId: voice.voiceId,
          voiceSpeed: voice.voiceSpeed,
          voiceLanguage: voice.voiceLanguage
        };
      }
      if (msgType === 'call') {
        const call = normalizeGroupCallMessage(item);
        if (!call) return null;
        return {
          id: `${now}-${idPrefix}-${idx}`,
          senderId: speakerId,
          content: call.content,
          timestamp: now + idx,
          type: 'call',
          callStatus: call.callStatus,
          callDurationSec: call.callDurationSec
        };
      }

      const normalizedText = normalizeGroupReplyText(
        item.content,
        item.pairs,
        item.translationZh,
        allowInner,
        allowAction
      );
      if (!normalizedText) return null;
      const topLevelInnerVoice = allowInner ? normalizeGeneratedInnerVoiceText(item.innerVoice, { collapseWhitespace: true }) || undefined : undefined;
      const topLevelActionDesc = allowAction ? normalizeGeneratedActionText(item.actionDesc, { collapseWhitespace: true }) || undefined : undefined;
      return {
        id: `${now}-${idPrefix}-${idx}`,
        senderId: speakerId,
        content: normalizedText.content,
        timestamp: now + idx,
        type: 'text',
        ...(normalizedText.translatedContentZhCN ? { translatedContentZhCN: normalizedText.translatedContentZhCN } : {}),
        ...(normalizedText.innerVoice || topLevelInnerVoice ? { innerVoice: normalizedText.innerVoice || topLevelInnerVoice } : {}),
        ...(normalizedText.actionDesc || topLevelActionDesc ? { actionDesc: normalizedText.actionDesc || topLevelActionDesc } : {})
      };
    })
    .filter((item): item is Message => Boolean(item))
    .slice(0, maxMessages);
};
