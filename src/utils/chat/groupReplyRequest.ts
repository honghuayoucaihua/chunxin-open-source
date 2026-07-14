import { buildRuntimeUserPersonaPrompt, buildUserPersonaSummary } from '../../services/personaSummary.ts';
import { getContactMemoryPrompt } from '../../services/contactMemoryService.ts';
import { buildChatSystemPromptLazy } from '../../utils/promptLoader.ts';
import { resolveContactForAI, resolveWorldBookForAI } from '../../utils/encryptedReadModel.ts';
import {
  formatDetailedContactProfile,
  formatGroupRelationText,
  formatMemberMemoryLines
} from '../../appStateMigrationUtils.ts';
import {
  formatMessageForPolicyHistory,
  getChatModePolicy,
  shouldIncludeTranslationForContact
} from './chatModePolicy.ts';
import {
  buildBeijingTimeAwarenessPrompt,
  formatMessageForModelHistory
} from './modelHistoryFormat.ts';
import {
  buildTruthOrDareRuntimePrompt,
  buildTruthOrDareSystemPrompt,
  getTruthOrDareState
} from '../../app/sendMessage/truthOrDareRuntimePrompt.ts';
import { buildStoryRuntimeContextPrompt } from './storyRuntimeContext.ts';
import type {
  AISettings,
  ChatMode,
  Contact,
  ContactMemories,
  Mask,
  Message,
  UserProfile,
  WorldBook
} from '../../types/index.ts';

type GroupReplyHistoryItem = { role: 'user' | 'model'; text: string; imageUrl?: string };

type BuildGroupReplyHistoryOptions = {
  contact: Contact;
  historyMessages: Message[];
  contacts: Contact[];
  aiSettings: AISettings;
  includeTimestamp?: boolean;
  usePolicyHistory?: boolean;
};

type BuildGroupReplyRequestOptions = BuildGroupReplyHistoryOptions & {
  contactMemories: ContactMemories;
  worldBooks: WorldBook[];
  masks: Mask[];
  user: UserProfile;
  extraSystemPrompt?: string;
  internalRuntimePrompt?: string;
  includeRuntimeTimeAwareness?: boolean;
  includeTruthOrDareRuntime?: boolean;
  maxMessages?: number;
};

export type GroupReplyRequestContext = {
  history: GroupReplyHistoryItem[];
  systemPrompt: string;
  runtimeUserPrompt: string;
  effectiveChatMode: ChatMode;
  modePolicy: ReturnType<typeof getChatModePolicy>;
  truthOrDareState: ReturnType<typeof getTruthOrDareState>;
  aiGroupContact: ReturnType<typeof resolveContactForAI>;
  memberIds: string[];
  members: Contact[];
  memberBalances: Record<string, number>;
  memberVoiceEnabled: Record<string, boolean>;
  memberVoiceIds: Record<string, string>;
};

const buildGroupMemberBlock = (
  members: Contact[],
  contactMemories: ContactMemories,
): string => members.map((member, index) => {
  const name = member.remark?.trim() || member.name;
  const profile = formatDetailedContactProfile(member);
  const memberMemories = formatMemberMemoryLines(contactMemories, member.id, 6);
  return [
    `${index + 1}. id=${member.id}；昵称=${name}`,
    profile ? `完整资料：${profile}` : '',
    memberMemories ? `关键记忆：\n${memberMemories}` : ''
  ].filter(Boolean).join('\n');
}).join('\n');

export const buildGroupReplyHistory = (
  options: BuildGroupReplyHistoryOptions
): GroupReplyHistoryItem[] => {
  const includeTimestamp = options.includeTimestamp ?? (options.aiSettings?.enableTimeAwareness === true);
  const usePolicyHistory = options.usePolicyHistory !== false;
  const modePolicy = usePolicyHistory ? getChatModePolicy(options.contact) : null;

  return options.historyMessages
    .map((message) => {
      const role = message.senderId === 'me' ? 'user' as const : 'model' as const;
      const sender = role === 'model'
        ? options.contacts.find((item) => item.id === message.senderId)
        : null;
      const senderName = sender?.remark?.trim() || sender?.name || options.contact.name;
      const speakerLabel = (message.type === 'system' || message.senderId === 'system') ? '' : senderName;
      const includeTranslation = role === 'model'
        ? shouldIncludeTranslationForContact(sender)
        : false;
      const mapped = usePolicyHistory && modePolicy
        ? formatMessageForPolicyHistory(message, modePolicy, {
            includeTimestamp,
            includeTranslation,
            ...(role === 'model' ? { speakerLabel } : {})
          })
        : formatMessageForModelHistory(message, {
            includeTimestamp,
            includeTranslation,
            ...(role === 'model' ? { speakerLabel } : {})
          });
      if (!mapped) return null;
      const useVisionImage = role === 'user'
        && options.aiSettings?.provider !== 'builtin'
        && !!options.aiSettings?.customModelSupportsImageRecognition
        && !!mapped.imageUrl;
      return {
        role,
        text: mapped.text,
        imageUrl: useVisionImage ? mapped.imageUrl : undefined
      };
    })
    .filter(Boolean) as GroupReplyHistoryItem[];
};

export const buildGroupReplyRequestContext = async (
  options: BuildGroupReplyRequestOptions
): Promise<GroupReplyRequestContext> => {
  const modePolicy = getChatModePolicy(options.contact);
  const memberIds = (options.contact.memberIds || []).filter(Boolean);
  const members = options.contacts
    .filter((item) => memberIds.includes(item.id))
    .map((item) => resolveContactForAI(item));
  const memberBalances = Object.fromEntries(
    members
      .map((member) => [member.id, Number(member.balance)] as const)
      .filter(([, balance]) => Number.isFinite(balance))
      .map(([id, balance]) => [id, Math.max(0, Number(balance.toFixed(2)))])
  );
  const memberVoiceEnabled = Object.fromEntries(
    members.map((member) => [
      member.id,
      member.minimaxTTS?.enabled === true && !!String(member.minimaxTTS?.voiceId || '').trim()
    ] as const)
  );
  const memberVoiceIds = Object.fromEntries(
    members
      .map((member) => [member.id, String(member.minimaxTTS?.voiceId || '').trim()] as const)
      .filter(([, voiceId]) => voiceId)
  );
  const aiGroupContact = resolveContactForAI(options.contact);
  const effectiveChatMode = modePolicy.mode;
  const includeTimestamp = options.includeTimestamp ?? (options.aiSettings?.enableTimeAwareness === true);
  const includeRuntimeTimeAwareness = options.includeRuntimeTimeAwareness ?? includeTimestamp;
  const history = buildGroupReplyHistory({
    contact: options.contact,
    historyMessages: options.historyMessages,
    contacts: options.contacts,
    aiSettings: options.aiSettings,
    includeTimestamp,
    usePolicyHistory: options.usePolicyHistory
  });
  const userPersona = buildUserPersonaSummary(options.user);
  const memberBlock = buildGroupMemberBlock(members, options.contactMemories);
  const selectedGroupBooks = (options.worldBooks || [])
    .map((book) => resolveWorldBookForAI(book))
    .filter((book) => book.enabled && (aiGroupContact.worldBookIds || []).includes(book.id));
  const groupWorldBookText = selectedGroupBooks.length > 0
    ? selectedGroupBooks.map((book) => `【${book.name}】${(book.entries || []).map((entry) => entry.text).join('；')}`).join('\n')
    : '';
  const selectedGroupMask = aiGroupContact.selectedMaskId
    ? options.masks.find((mask) => mask.id === aiGroupContact.selectedMaskId)
    : null;
  const userInfoPrompt = buildRuntimeUserPersonaPrompt(options.user, {
    selectedMask: selectedGroupMask,
    contactUserPersona: aiGroupContact.userPersona
  });
  const groupMaskText = selectedGroupMask
    ? `当前用户面具：${selectedGroupMask.name}${selectedGroupMask.description ? `；描述：${selectedGroupMask.description}` : ''}`
    : '';
  const groupPresetText = aiGroupContact.groupPreset?.trim() || '';
  const groupRelationText = formatGroupRelationText(aiGroupContact, members, options.user.name);
  const maxMessages = Number.isFinite(Number(options.maxMessages))
    ? Math.max(1, Number(options.maxMessages))
    : 4;
  const defaultSystemPrompt = await buildChatSystemPromptLazy({
    scene: 'group',
    groupName: aiGroupContact.name,
    mode: effectiveChatMode,
    descriptionFeatureEnabled: modePolicy.descriptionFeatureEnabled,
    descriptionSayEnabled: modePolicy.descriptionSayEnabled,
    descriptionDoEnabled: modePolicy.descriptionDoEnabled,
    userPersona,
    groupMaskText,
    groupWorldBookText,
    groupPresetText,
    groupRelationText,
    extraSystemPrompt: options.extraSystemPrompt,
    promptRuleTree: options.aiSettings?.promptRuleTree,
    maxMessages
  });
  const truthOrDareState = getTruthOrDareState(options.historyMessages);
  const systemPrompt = truthOrDareState.active
    ? buildTruthOrDareSystemPrompt({
        baseSystemPrompt: defaultSystemPrompt,
        contactName: aiGroupContact.remark?.trim() || aiGroupContact.name,
        userName: options.user.name?.trim() || '',
        chatMode: effectiveChatMode,
        persona: aiGroupContact.persona || aiGroupContact.personality || aiGroupContact.description || '',
        descriptionFeatureEnabled: modePolicy.descriptionFeatureEnabled,
        descriptionSayEnabled: modePolicy.descriptionSayEnabled,
        descriptionDoEnabled: modePolicy.descriptionDoEnabled,
        extraSystemPrompt: options.extraSystemPrompt
      })
    : defaultSystemPrompt;
  const memoryPrompt = getContactMemoryPrompt(
    options.contactMemories,
    options.contact.id,
    12,
    aiGroupContact.remark?.trim() || aiGroupContact.name
  );
  const timeAwarenessPrompt = buildBeijingTimeAwarenessPrompt(includeRuntimeTimeAwareness);
  const truthOrDareRuntimePrompt = options.includeTruthOrDareRuntime === false
    ? ''
    : buildTruthOrDareRuntimePrompt(options.historyMessages);
  const contactNameById = Object.fromEntries(
    members.map((member) => [member.id, member.remark?.trim() || member.name])
  );
  const storyRuntimeContextPrompt = modePolicy.isStory
    ? buildStoryRuntimeContextPrompt(options.historyMessages, {
        userLabel: options.user.name?.trim() || '',
        contactNameById
      })
    : '';
  const runtimeUserPrompt = [
    timeAwarenessPrompt,
    userInfoPrompt,
    memoryPrompt,
    truthOrDareRuntimePrompt,
    String(options.internalRuntimePrompt || '').trim(),
    storyRuntimeContextPrompt
  ].filter(Boolean).join('\n\n');
  const finalHistory = [
    ...history,
    { role: 'user' as const, text: `【群成员列表】\n${memberBlock}` }
  ];

  return {
    history: finalHistory,
    systemPrompt,
    runtimeUserPrompt,
    effectiveChatMode,
    modePolicy,
    truthOrDareState,
    aiGroupContact,
    memberIds,
    members,
    memberBalances,
    memberVoiceEnabled,
    memberVoiceIds
  };
};
