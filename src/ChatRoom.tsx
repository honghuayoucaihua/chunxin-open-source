
import React, { useRef, useEffect, useLayoutEffect, useState, useMemo, useCallback } from 'react';
import { Contact, Message, UserProfile, AppearanceSettings, SubView, AISettings, QuotedMessageSnapshot } from './types';
import { hapticLight, showToast, isNative } from './services/nativeService';
import {
  MESSAGE_INITIAL_RENDER_COUNT,
  MESSAGE_PAGE_SIZE,
  normalizeCustomEmojis as normalizeCustomEmojisBase
} from './chatroom/emojiState';
import {
  MESSAGE_LIST_EDGE_THRESHOLD,
  captureMessageHistoryScrollSnapshot,
  getNextMessageRenderCount,
  restoreMessageHistoryScrollSnapshot,
  type MessageHistoryScrollSnapshot
} from './chatroom/messagePagination';
import {
  adjustComposerTextareaHeight,
  scheduleComposerTextareaHeightAdjust,
  resolveAnchorRectWithinContainer,
  type MessageMenuAnchorRect
} from './chatroom/chatRoomUiUtils';
import { useVoiceCallFlow } from './chatroom/voiceCallFlow';
import { useStoryComposerFlow } from './chatroom/storyComposerFlow';
import { useMessageRenderHelpers } from './chatroom/messageRenderHelpers';
import { useEmojiSystem } from './chatroom/hooks/useEmojiSystem';
import { useMultiSelect } from './chatroom/hooks/useMultiSelect';
import { resolveDescriptionComposerAvailability } from './utils/chat/descriptionComposerCapabilities';
import EmojiUrlImportPanel from './chatroom/EmojiUrlImportPanel';
import VoiceCallOverlays from './chatroom/VoiceCallOverlays';
import ChatRoomAuxPanels from './chatroom/ChatRoomAuxPanels';
import ChatRoomEmojiPanel from './chatroom/ChatRoomEmojiPanel';
import ChatRoomFooterPanels from './chatroom/ChatRoomFooterPanels';
import ChatRoomMessageList from './chatroom/ChatRoomMessageList';
import ChatRoomComposer from './chatroom/ChatRoomComposer';
import ChatRoomHeaderBar from './chatroom/ChatRoomHeaderBar';
import ChatRoomImageDraftPanel, { type PendingImageDraft } from './chatroom/ChatRoomImageDraftPanel';
import TruthOrDareModal from './chatroom/TruthOrDareModal';
import type { TruthOrDareTheme } from './chatroom/TruthOrDareModal';
import {
  clearTruthOrDareRuntime,
  loadTruthOrDareRuntime,
  saveTruthOrDareRuntime
} from './chatroom/truthOrDarePersistence';
import { compressImage } from './services/imageService';
import { getGeminiChatReply } from './services/geminiServiceLoader';
import { captureRuntimeResetEpoch, isRuntimeResetEpochStale } from './services/runtimeResetGuard.ts';
import { parseAIReply } from './utils/chatHelpers';
import { normalizeGeneratedStrictNonSystemEventText } from './utils/generatedVisibleText.ts';
import { applyChatModePolicy, formatMessageForPolicyHistory, getChatModePolicy } from './utils/chat/chatModePolicy';
import { buildTruthOrDareRuntimePrompt, buildTruthOrDareSystemPrompt, hasUnsupportedTruthOrDareReplyShape, hasUnsupportedTruthOrDareSpecial } from './app/sendMessage/truthOrDareRuntimePrompt';

const randomPick = <T,>(items: T[], fallback: T): T => {
  if (!items.length) return fallback;
  return items[Math.floor(Math.random() * items.length)] || fallback;
};

const buildTruthOrDareMessage = (input: {
  senderId: string;
  kind: 'invite' | 'accepted';
  themeName: string;
  content: string;
}): Message => ({
  id: `truth-dare-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  senderId: input.senderId,
  content: input.content,
  timestamp: Date.now(),
  type: 'truthdare',
  truthDareKind: input.kind,
  truthDareThemeName: input.themeName
});

const buildTruthOrDareSystemMessage = (content: string): Message => ({
  id: `truth-dare-system-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  senderId: 'system',
  content,
  timestamp: Date.now(),
  type: 'system'
});

interface ChatRoomProps {
  contact: Contact;
  me: UserProfile;
  messages: Message[];
  settings: AppearanceSettings & { chatBg?: string; headerImage?: string; footerImage?: string };
  inputValue: string;
  setInputValue: (v: string) => void;
  inputMode: 'text' | 'voice';
  setInputMode: (m: 'text' | 'voice') => void;
  showPanel: 'emoji' | 'more' | 'none';
  setShowPanel: (p: 'emoji' | 'more' | 'none') => void;
  onSend: () => void;
  onSendWithOptions?: (payload: { text?: string; append?: boolean; source?: 'manual' | 'generated' | 'storyAdvance' | 'storyInsight'; inputKind?: 'chat' | 'story'; descriptionInputKind?: 'say' | 'do'; messageType?: 'text' | 'image'; imageUrl?: string; imageCaption?: string }) => Promise<void> | void;
  onGenerateReplies?: (payload: { inputKind?: 'chat' | 'story' }) => Promise<string[]>;
  onTempSend: () => void;
  enableSentenceSend: boolean;
  onBack: () => void;
  onMore: () => void;
  onAvatarClick: (id: string) => void;
  onSub: (s: SubView) => void;
  allContacts: Contact[];
  onAction?: (action: string, msgId: string, data?: any) => void;
  onPat: (fromId: string, targetId: string) => void;
  vibrationEnabled?: boolean;
  isTyping?: boolean;
  quotedMessage?: QuotedMessageSnapshot | null;
  onCancelQuote?: () => void;
  onAppendMessage?: (message: Message) => void;
  onVoiceCallStateChange?: (active: boolean) => void;
  hideHeaderAvatar?: boolean;
  hideMessageAvatar?: boolean;
  hideMessageSenderName?: boolean;
  titleOverride?: string;
  subtitleOverride?: string;
  showMoreAction?: boolean;
  topInfoBar?: React.ReactNode;
  leftActions?: React.ReactNode;
  composerReplacement?: React.ReactNode;
  headerActions?: React.ReactNode;
  onPaymentClick?: (msgId: string, type: 'redpacket' | 'transfer') => void;
  onInputFocusChange?: (focused: boolean) => void;
  useVisionModelForImages?: boolean;
  aiSettings?: AISettings;
  buildRuntimePromptWithMemory?: (contact: Contact | undefined, limit?: number) => string;
}

const ChatRoom: React.FC<ChatRoomProps> = ({
  contact, me, messages, settings, inputValue, setInputValue,
  inputMode, setInputMode, showPanel, setShowPanel, onSend, onSendWithOptions, onGenerateReplies, onTempSend, enableSentenceSend, onBack, onMore, onAvatarClick, onSub,
  allContacts,
  onAction,
  onPat,
  vibrationEnabled = true,
  isTyping,
  quotedMessage,
  onCancelQuote,
  onAppendMessage,
  onVoiceCallStateChange,
  hideHeaderAvatar = false,
  hideMessageAvatar = false,
  hideMessageSenderName = false,
  titleOverride,
  subtitleOverride,
  showMoreAction = true,
  topInfoBar,
  leftActions,
  composerReplacement,
  headerActions,
  onPaymentClick,
  onInputFocusChange,
  useVisionModelForImages = false,
  aiSettings,
  buildRuntimePromptWithMemory
}) => {
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const lastAvatarTapRef = useRef<number>(0);
  const avatarTapTimerRef = useRef<number | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const historyScrollSnapshotRef = useRef<MessageHistoryScrollSnapshot | null>(null);
  const isHistoryPagePendingRef = useRef(false);
  const wasNearHistoryTopRef = useRef(false);

  const emoji = useEmojiSystem({ showPanel, onAction, setShowPanel });
  const {
    multiSelectIds, setMultiSelectIds,
    isMultiSelecting, setIsMultiSelecting,
    selectedMessageIdSet
  } = useMultiSelect();

  // 心声/动作面板状态
  const [showInnerActionPanel, setShowInnerActionPanel] = useState(false);
  const [innerActionType, setInnerActionType] = useState<'innerVoice' | 'action'>('innerVoice');
  const [innerActionInput, setInnerActionInput] = useState('');

  const [menuMsgId, setMenuMsgId] = React.useState<string | null>(null);
  const [menuAnchorRect, setMenuAnchorRect] = React.useState<MessageMenuAnchorRect | null>(null);
  const [menuSourceField, setMenuSourceField] = React.useState<'content' | 'innerVoice' | 'actionDesc' | 'narrationDesc' | null>(null);

  const longPressTimer = useRef<any>(null);

  const [messageRenderCount, setMessageRenderCount] = useState(MESSAGE_INITIAL_RENDER_COUNT);
  const [pendingImageDrafts, setPendingImageDrafts] = useState<PendingImageDraft[]>([]);
  const [showImageDescPanel, setShowImageDescPanel] = useState(false);
  const [isSendingImages, setIsSendingImages] = useState(false);
  const [showTruthOrDareModal, setShowTruthOrDareModal] = useState(false);
  const [truthOrDarePhase, setTruthOrDarePhase] = useState<'invite' | 'drawing' | 'choose' | 'god'>('invite');
  const [truthOrDareTheme, setTruthOrDareTheme] = useState<TruthOrDareTheme | null>(null);
  const [truthOrDareActive, setTruthOrDareActive] = useState(false);
  const [truthOrDareRound, setTruthOrDareRound] = useState(0);
  const [truthOrDareDrawingName, setTruthOrDareDrawingName] = useState('抽取中...');
  const [truthOrDarePendingPlayer, setTruthOrDarePendingPlayer] = useState('');
  const truthOrDareDrawTimerRef = useRef<number | null>(null);
  const truthOrDareDrawEndTimerRef = useRef<number | null>(null);
  const truthOrDareAutoNextHandledMsgIdRef = useRef<string>('');
  const truthOrDareHydratedContactIdRef = useRef<string>('');
  const truthOrDareStateReadyRef = useRef(false);
  const truthOrDareSessionEpochRef = useRef<number>(captureRuntimeResetEpoch());

  const renderedMessages = useMemo(() => {
    return messages.slice(-Math.max(messageRenderCount, MESSAGE_INITIAL_RENDER_COUNT));
  }, [messages, messageRenderCount]);

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const {
    isIncomingCallOpen,
    isInVoiceCall,
    callDurationSec,
    handleStartVoiceCall,
    handleRejectVoiceCall,
    handleAcceptVoiceCall,
    handleEndVoiceCall
  } = useVoiceCallFlow({
    contact,
    onAppendMessage,
    onVoiceCallStateChange,
    setShowPanel
  });
  const contactById = useMemo(() => {
    const map: Record<string, Contact> = {};
    for (const item of allContacts) map[item.id] = item;
    return map;
  }, [allContacts]);

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = 'auto') => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  }, []);

  const loadOlderMessages = useCallback(() => {
    if (isHistoryPagePendingRef.current || renderedMessages.length >= messages.length) {
      return;
    }

    isHistoryPagePendingRef.current = true;
    historyScrollSnapshotRef.current = captureMessageHistoryScrollSnapshot(scrollRef.current);
    setMessageRenderCount((prev) => getNextMessageRenderCount({
      current: prev,
      total: messages.length,
      pageSize: MESSAGE_PAGE_SIZE
    }));
  }, [messages.length, renderedMessages.length]);

  useLayoutEffect(() => {
    if (!isHistoryPagePendingRef.current) {
      return;
    }

    const nextScrollTop = restoreMessageHistoryScrollSnapshot(
      scrollRef.current,
      historyScrollSnapshotRef.current
    );

    historyScrollSnapshotRef.current = null;
    isHistoryPagePendingRef.current = false;
    wasNearHistoryTopRef.current = (nextScrollTop ?? Number.POSITIVE_INFINITY) <= MESSAGE_LIST_EDGE_THRESHOLD;
  }, [renderedMessages.length]);

  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      scrollToBottom('auto');
    }
  }, [renderedMessages, isInitialLoad, scrollToBottom]);

  useEffect(() => {
    if (!isInitialLoad && shouldAutoScrollRef.current) {
      scrollToBottom('auto');
    }
  }, [renderedMessages, showPanel, isInitialLoad, scrollToBottom]);

  useEffect(() => {
    historyScrollSnapshotRef.current = null;
    isHistoryPagePendingRef.current = false;
    wasNearHistoryTopRef.current = false;
  }, [contact.id]);

  useEffect(() => {
    let cancelled = false;
    const applyNewStickers = async () => {
      const newStickers = (window as any).newStickers;
      if (!newStickers) return;

      const formatted = emoji.emojiData.normalizeCustomEmojis(newStickers.map((s: any) => ({ id: Date.now().toString() + Math.random(), ...s })));
      const compactedFormatted = await emoji.emojiData.compactEmojiList(formatted);
      if (cancelled) return;

      emoji.emojiActions.prependCustomEmojis(compactedFormatted);
      (window as any).newStickers = null;
    };

    applyNewStickers();
    return () => {
      cancelled = true;
    };
  }, [showPanel, emoji.emojiData.compactEmojiList, emoji.emojiData.normalizeCustomEmojis, emoji.emojiActions]);

  useEffect(() => {
    setMessageRenderCount(prev => Math.max(prev, MESSAGE_INITIAL_RENDER_COUNT));
  }, [messages.length]);

  useEffect(() => {
    if (inputMode === 'text') {
      adjustComposerTextareaHeight(textInputRef.current);
    }
  }, [inputMode, inputValue]);

  const currentSkinId = (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-render-skin') : null) || 'wechat';
  const isWechatSkin = currentSkinId === 'wechat' || currentSkinId === 'qq' || currentSkinId === 'rose';
  const isQQSkin = currentSkinId === 'qq';
  const isIMessageSkin = currentSkinId === 'imessage';
  const isKakaoSkin = currentSkinId === 'kakao';
  const isAvatarCollapseSkin = currentSkinId === 'kakao' || currentSkinId === 'liquidglass' || currentSkinId === 'rose';
  const isTelegramSkin = currentSkinId === 'telegram';
  const isY2KSkin = currentSkinId === 'y2k';
  const isRetroSkin = currentSkinId === 'retro' || currentSkinId === 'polkadot' || currentSkinId === 'pixel';
  const isStoryMode = contact.chatMode === 'story';
  const currentModePolicy = useMemo(() => getChatModePolicy(contact), [contact]);
  const canOpenInnerActionPanel = currentModePolicy.innerEnabled || currentModePolicy.actionEnabled;
  const descriptionAvailability = resolveDescriptionComposerAvailability(contact);
  const isDescriptionComposerEnabled = descriptionAvailability.featureEnabled;
  const [descriptionInputKind, setDescriptionInputKind] = useState<'say' | 'do'>('say');

  const handleOpenInnerActionPanel = useCallback(() => {
    if (!canOpenInnerActionPanel) {
      setShowPanel('none');
      return;
    }
    if (innerActionType === 'action' && !currentModePolicy.actionEnabled && currentModePolicy.innerEnabled) {
      setInnerActionType('innerVoice');
    }
    if (innerActionType === 'innerVoice' && !currentModePolicy.innerEnabled && currentModePolicy.actionEnabled) {
      setInnerActionType('action');
    }
    setShowPanel('none');
    setShowInnerActionPanel(true);
  }, [
    canOpenInnerActionPanel,
    currentModePolicy.actionEnabled,
    currentModePolicy.innerEnabled,
    innerActionType,
    setShowPanel
  ]);

  useEffect(() => {
    if (!isDescriptionComposerEnabled) {
      if (descriptionInputKind !== 'say') {
        setDescriptionInputKind('say');
      }
      return;
    }
    if (!descriptionAvailability.sayEnabled && descriptionInputKind !== 'do') {
      setDescriptionInputKind('do');
      return;
    }
    if (!descriptionAvailability.doEnabled && descriptionInputKind !== 'say') {
      setDescriptionInputKind('say');
    }
  }, [
    descriptionInputKind,
    descriptionAvailability.sayEnabled,
    descriptionAvailability.doEnabled,
    isDescriptionComposerEnabled
  ]);

  useEffect(() => {
    if (!showInnerActionPanel) return;
    if (!canOpenInnerActionPanel) {
      setShowInnerActionPanel(false);
      return;
    }
    if (innerActionType === 'action' && !currentModePolicy.actionEnabled && currentModePolicy.innerEnabled) {
      setInnerActionType('innerVoice');
      return;
    }
    if (innerActionType === 'innerVoice' && !currentModePolicy.innerEnabled && currentModePolicy.actionEnabled) {
      setInnerActionType('action');
    }
  }, [
    canOpenInnerActionPanel,
    currentModePolicy.actionEnabled,
    currentModePolicy.innerEnabled,
    innerActionType,
    showInnerActionPanel
  ]);

  const handleDescriptionComposerSend = useCallback(() => {
    const trimmed = String(inputValue || '').trim();
    if (!trimmed) return;
    if (!isDescriptionComposerEnabled || !onSendWithOptions) {
      onSend();
      return;
    }
    void Promise.resolve(onSendWithOptions({
      text: trimmed,
      append: true,
      source: 'manual',
      inputKind: 'chat',
      descriptionInputKind
    })).catch((error) => {
      console.error('[ChatRoom] onSendWithOptions 失败:', error);
    });
  }, [inputValue, isDescriptionComposerEnabled, descriptionInputKind, onSendWithOptions, onSend]);

  const {
    storyInputKind,
    setStoryInputKind,
    generatedReplies,
    isGeneratingReplies,
    storyInsightModal,
    setStoryInsightModal,
    handleGenerateReplies,
    handleStoryAdvance,
    handleStoryInsight,
    handleUseGeneratedReply
  } = useStoryComposerFlow({
    isStoryMode,
    inputValue,
    isTyping,
    messages,
    onGenerateReplies,
    onSendWithOptions
  });

  const appendTruthOrDareMessage = useCallback((message: Message) => {
    onAppendMessage?.(message);
  }, [onAppendMessage]);

  const appendTruthOrDareSystemNotice = useCallback((content: string) => {
    appendTruthOrDareMessage(buildTruthOrDareSystemMessage(content));
  }, [appendTruthOrDareMessage]);

  const resetTruthOrDareSessionEpoch = useCallback(() => {
    truthOrDareSessionEpochRef.current = captureRuntimeResetEpoch();
  }, []);

  const isTruthOrDareSessionStale = useCallback((epoch: number): boolean => {
    if (isRuntimeResetEpochStale(epoch)) return true;
    return truthOrDareSessionEpochRef.current !== epoch;
  }, []);

  const getLatestTruthOrDareNextRoundCommandId = useCallback((): string => {
    const latestCommand = [...messages].reverse().find((item) => item.type === 'system' && item.truthDareCommand === 'nextRound');
    return latestCommand?.id ? String(latestCommand.id) : '';
  }, [messages]);

  const getTruthOrDareCandidates = useCallback((): string[] => {
    const names = [String(me.name || '我').trim() || '我'];
    if (contact.isGroup) {
      (contact.memberIds || []).forEach((id) => {
        const member = allContacts.find((item) => item.id === id);
        const name = String(member?.remark || member?.name || '').trim();
        if (name && !names.includes(name)) names.push(name);
      });
      return names;
    }
    const peer = String(contact.remark || contact.name || '对方').trim() || '对方';
    if (!names.includes(peer)) names.push(peer);
    return names;
  }, [contact, allContacts, me.name]);

  const resolveTruthOrDareOpponentName = useCallback((): string => {
    const meName = String(me.name || '我').trim() || '我';
    const candidates = getTruthOrDareCandidates().filter((name) => name !== meName);
    if (candidates.length > 0) return candidates[0];
    return String(contact.remark || contact.name || '对方').trim() || '对方';
  }, [contact, getTruthOrDareCandidates, me.name]);

  const resolveTruthOrDareSpeakerId = useCallback((playerName: string): string => {
    const meName = String(me.name || '我').trim() || '我';
    if (playerName === meName) return 'me';
    if (!contact.isGroup) return contact.id;
    const matched = allContacts.find((item) => {
      const name = String(item.remark || item.name || '').trim();
      return !!name && name === playerName;
    });
    return matched?.id || contact.id;
  }, [allContacts, contact, me.name]);

  const publishTruthOrDareStatePrompt = useCallback((theme: TruthOrDareTheme, round: number) => {
    appendTruthOrDareSystemNotice(`【真心话大冒险状态】主题：${theme.name}；第${round}轮；规则：抽中者在“真心话/大冒险”中二选一，其他人围绕结果互动推进。`);
  }, [appendTruthOrDareSystemNotice]);

  const triggerTruthOrDareAiResponse = useCallback(async (
    mode: 'truth' | 'dare',
    player: string,
    itemText: string,
    theme: TruthOrDareTheme
  ) => {
    const sessionEpoch = truthOrDareSessionEpochRef.current;
    const speakerId = resolveTruthOrDareSpeakerId(player);
    if (speakerId === 'me') return;
    if (!aiSettings) {
      showToast('AI 未配置，无法自动生成对方响应');
      return;
    }
    const actor = allContacts.find((item) => item.id === speakerId) || contact;
    const actorName = String(actor.remark || actor.name || player || '对方').trim() || '对方';
    const meName = String(me.name || '我').trim() || '我';
    const chatMode = String(actor.chatMode || contact.chatMode || 'online');
    const persona = String(actor.persona || actor.personality || actor.description || '').trim();
    const modePolicy = getChatModePolicy(actor);
    const truthOrDareRuntimePrompt = buildTruthOrDareRuntimePrompt(messages);
    const actorRuntimePrompt = buildRuntimePromptWithMemory?.(actor, 8) || '';
    const runtimePrompt = [actorRuntimePrompt, truthOrDareRuntimePrompt].filter(Boolean).join('\n\n');
    const systemPrompt = buildTruthOrDareSystemPrompt({
      baseSystemPrompt: '',
      contactName: actorName,
      userName: meName,
      chatMode,
      persona,
      descriptionFeatureEnabled: modePolicy.descriptionFeatureEnabled,
      descriptionSayEnabled: modePolicy.descriptionSayEnabled,
      descriptionDoEnabled: modePolicy.descriptionDoEnabled
    });
    const history = messages.slice(-14).map((msg) => {
      const mapped = formatMessageForPolicyHistory(msg, modePolicy);
      if (!mapped) return null;
      return {
        role: msg.senderId === 'me' ? 'user' as const : 'model' as const,
        text: mapped.text
      };
    }).filter(Boolean) as Array<{ role: 'user' | 'model'; text: string }>;
    try {
      const reply = await getGeminiChatReply(
        history.concat({ role: 'user', text: `你是${actorName}。当前真心话大冒险主题是“${theme.name}”。本轮${player}选择了${mode === 'truth' ? '真心话' : '大冒险'}，内容是：${itemText}。请以${actorName}口吻回复一句自然短句，承接刚才的内容或关系情绪，并带一个真实聊天意图（回应、试探、安抚、调侃、追问或轻轻推进关系）。语气贴合你和对方的关系，关系变化只能小步发生，不要空泛评论，也不要解释规则。` }),
        systemPrompt,
        aiSettings,
        runtimePrompt
      );
      if (isTruthOrDareSessionStale(sessionEpoch)) return;
      const normalized = String(reply || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      if (hasUnsupportedTruthOrDareReplyShape(normalized, {
        chatMode,
        descriptionFeatureEnabled: modePolicy.descriptionFeatureEnabled,
        descriptionSayEnabled: modePolicy.descriptionSayEnabled,
        descriptionDoEnabled: modePolicy.descriptionDoEnabled
      })) return;
      const parsed = parseAIReply(normalized, modePolicy.innerEnabled, modePolicy.actionEnabled, { allowSocial: !contact.isGroup, requireStructured: true, allowStoryTags: modePolicy.isStory });
      if (hasUnsupportedTruthOrDareSpecial(parsed.specials)) return;
      const parsedPrimaryText = normalizeGeneratedStrictNonSystemEventText(parsed.text, { collapseWhitespace: true })
        || (Array.isArray(parsed.sentences)
          ? normalizeGeneratedStrictNonSystemEventText(parsed.sentences.join(' '), { collapseWhitespace: true })
          : '');
      const modeResult = applyChatModePolicy(parsedPrimaryText, actor, modePolicy, {
        innerVoice: parsed.innerVoice,
        actionDesc: parsed.actionDesc
      });
      const content = modeResult.content.slice(0, 200);
      const hasNextRoundCommand = Array.isArray(parsed.specials) && parsed.specials.some((item: any) => item?.type === 'system' && item?.truthDareCommand === 'nextRound');
      if (hasNextRoundCommand) {
        appendTruthOrDareMessage({
          id: `truth-dare-cmd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          senderId: 'system',
          content: '',
          timestamp: Date.now(),
          type: 'system',
          truthDareCommand: 'nextRound'
        });
      }
      if (!content) return;
      appendTruthOrDareMessage({
        id: `truth-dare-ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        senderId: speakerId,
        content,
        timestamp: Date.now(),
        type: 'text',
        innerVoice: modeResult.innerVoice,
        actionDesc: modeResult.actionDesc
      });
    } catch (error) {
      console.error('[TruthOrDare] AI response failed:', error);
      showToast('对方响应生成失败');
    }
  }, [resolveTruthOrDareSpeakerId, aiSettings, allContacts, contact, me.name, messages, buildRuntimePromptWithMemory, appendTruthOrDareMessage, isTruthOrDareSessionStale]);

  const resolveTruthOrDareResult = useCallback((mode: 'truth' | 'dare', player: string, theme: TruthOrDareTheme) => {
    const questions = Array.isArray(theme.questions) ? theme.questions.filter(Boolean) : [];
    const challenges = Array.isArray(theme.challenges) ? theme.challenges.filter(Boolean) : [];
    if (mode === 'truth') {
      const question = randomPick(questions, '说说你今天最真实的心情。');
      appendTruthOrDareSystemNotice(`【真心话大冒险】${player} 选择了真心话。`);
      appendTruthOrDareSystemNotice(`【真心话】${question}`);
      void triggerTruthOrDareAiResponse(mode, player, question, theme);
      return;
    }
    const challenge = randomPick(challenges, '请做一个搞怪表情并坚持5秒。');
    appendTruthOrDareSystemNotice(`【真心话大冒险】${player} 选择了大冒险。`);
    appendTruthOrDareSystemNotice(`【大冒险】${challenge}`);
    void triggerTruthOrDareAiResponse(mode, player, challenge, theme);
  }, [appendTruthOrDareSystemNotice, triggerTruthOrDareAiResponse]);

  const clearTruthOrDareDrawTimers = useCallback(() => {
    if (truthOrDareDrawTimerRef.current) {
      window.clearInterval(truthOrDareDrawTimerRef.current);
      truthOrDareDrawTimerRef.current = null;
    }
    if (truthOrDareDrawEndTimerRef.current) {
      window.clearTimeout(truthOrDareDrawEndTimerRef.current);
      truthOrDareDrawEndTimerRef.current = null;
    }
  }, []);

  const startTruthOrDareDraw = useCallback((theme: TruthOrDareTheme) => {
    const sessionEpoch = truthOrDareSessionEpochRef.current;
    const candidates = getTruthOrDareCandidates();
    if (!candidates.length) return;
    clearTruthOrDareDrawTimers();
    setTruthOrDarePhase('drawing');
    setShowTruthOrDareModal(true);
    truthOrDareDrawTimerRef.current = window.setInterval(() => {
      setTruthOrDareDrawingName(randomPick(candidates, candidates[0]));
    }, 120);
    truthOrDareDrawEndTimerRef.current = window.setTimeout(() => {
      if (isTruthOrDareSessionStale(sessionEpoch)) return;
      clearTruthOrDareDrawTimers();
      const player = randomPick(candidates, candidates[0]);
      setTruthOrDareDrawingName(player);
      appendTruthOrDareSystemNotice(`【真心话大冒险】本轮抽中：${player}。`);
      const meName = String(me.name || '我').trim() || '我';
      if (player === meName) {
        setTruthOrDarePendingPlayer(player);
        setTruthOrDarePhase('choose');
        return;
      }
      window.setTimeout(() => {
        if (isTruthOrDareSessionStale(sessionEpoch)) return;
        resolveTruthOrDareResult(Math.random() > 0.5 ? 'truth' : 'dare', player, theme);
        setShowTruthOrDareModal(false);
      }, 900);
    }, 2600);
  }, [appendTruthOrDareSystemNotice, clearTruthOrDareDrawTimers, getTruthOrDareCandidates, isTruthOrDareSessionStale, me.name, resolveTruthOrDareResult]);

  const beginNextTruthOrDareRound = useCallback((theme: TruthOrDareTheme, reason: 'skip' | 'next') => {
    const nextRound = Math.max(1, truthOrDareRound + 1);
    setTruthOrDareRound(nextRound);
    if (reason === 'skip') appendTruthOrDareSystemNotice('【真心话大冒险】本轮已跳过，重新抽取。');
    if (reason === 'next') appendTruthOrDareSystemNotice('【真心话大冒险】进入下一轮。');
    publishTruthOrDareStatePrompt(theme, nextRound);
    startTruthOrDareDraw(theme);
  }, [appendTruthOrDareSystemNotice, publishTruthOrDareStatePrompt, startTruthOrDareDraw, truthOrDareRound]);

  const exitTruthOrDareManually = useCallback(() => {
    clearTruthOrDareDrawTimers();
    resetTruthOrDareSessionEpoch();
    setTruthOrDareActive(false);
    setTruthOrDareTheme(null);
    setTruthOrDareRound(0);
    setTruthOrDarePendingPlayer('');
    setShowTruthOrDareModal(false);
    setTruthOrDarePhase('invite');
    truthOrDareAutoNextHandledMsgIdRef.current = '';
    clearTruthOrDareRuntime(contact.id);
    appendTruthOrDareSystemNotice('【真心话大冒险】本局已结束。');
  }, [appendTruthOrDareSystemNotice, clearTruthOrDareDrawTimers, contact.id, resetTruthOrDareSessionEpoch]);

  useEffect(() => () => clearTruthOrDareDrawTimers(), [clearTruthOrDareDrawTimers]);

  useEffect(() => {
    if (truthOrDareHydratedContactIdRef.current === contact.id) return;
    truthOrDareHydratedContactIdRef.current = contact.id;
    resetTruthOrDareSessionEpoch();
    truthOrDareStateReadyRef.current = true;
    truthOrDareAutoNextHandledMsgIdRef.current = getLatestTruthOrDareNextRoundCommandId();
    const runtime = loadTruthOrDareRuntime(contact.id);
    if (runtime?.active && runtime.theme) {
      setTruthOrDareTheme(runtime.theme);
      setTruthOrDareRound(Math.max(1, runtime.round || 1));
      setTruthOrDareActive(true);
      setTruthOrDarePhase('invite');
      return;
    }
    setTruthOrDareTheme(null);
    setTruthOrDareRound(0);
    setTruthOrDarePendingPlayer('');
    setTruthOrDareActive(false);
    setTruthOrDarePhase('invite');
  }, [contact.id, getLatestTruthOrDareNextRoundCommandId, resetTruthOrDareSessionEpoch]);

  useEffect(() => {
    if (!truthOrDareStateReadyRef.current) return;
    if (!truthOrDareActive || !truthOrDareTheme) return;
    saveTruthOrDareRuntime(contact.id, {
      active: true,
      round: Math.max(1, truthOrDareRound || 1),
      theme: truthOrDareTheme,
      updatedAt: Date.now()
    });
  }, [contact.id, truthOrDareActive, truthOrDareRound, truthOrDareTheme]);

  useEffect(() => {
    if (!truthOrDareActive || !truthOrDareTheme || showTruthOrDareModal || truthOrDarePhase !== 'invite') return;
    const latestCommand = [...messages].reverse().find((item) => item.type === 'system' && item.truthDareCommand === 'nextRound');
    if (!latestCommand) return;
    if (truthOrDareAutoNextHandledMsgIdRef.current === latestCommand.id) return;
    truthOrDareAutoNextHandledMsgIdRef.current = latestCommand.id;
    beginNextTruthOrDareRound(truthOrDareTheme, 'next');
  }, [truthOrDareActive, truthOrDareTheme, showTruthOrDareModal, truthOrDarePhase, messages, beginNextTruthOrDareRound]);

  useEffect(() => {
    if (inputMode !== 'voice') return;
    if (isStoryMode || isDescriptionComposerEnabled || !isWechatSkin) {
      setInputMode('text');
    }
  }, [isStoryMode, isDescriptionComposerEnabled, isWechatSkin, inputMode, setInputMode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      (window as any).pendingStickers = files;
      onSub('stickerImport');
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length || !onSendWithOptions) return;
    try {
      if (useVisionModelForImages) {
        setPendingImageDrafts([]);
        setShowImageDescPanel(false);
        for (const file of files) {
          const imageUrl = await compressImage(file);
          await Promise.resolve(onSendWithOptions({
            append: true,
            source: 'manual',
            inputKind: 'chat',
            messageType: 'image',
            imageUrl,
            imageCaption: ''
          }));
        }
        setShowPanel('none');
        return;
      }
      const drafts: PendingImageDraft[] = [];
      for (const file of files) {
        const imageUrl = await compressImage(file);
        drafts.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          imageUrl,
          imageCaption: file.name.replace(/\.[^/.]+$/, '').trim()
        });
      }
      setPendingImageDrafts(drafts);
      setShowImageDescPanel(true);
      setShowPanel('none');
    } catch (error) {
      console.error('Chat image compress failed:', error);
      showToast('图片处理失败，请重试');
    }
  };

  const handleDraftCaptionChange = (id: string, value: string) => {
    setPendingImageDrafts(prev => prev.map(item => (item.id === id ? { ...item, imageCaption: value } : item)));
  };

  const handleDraftRemove = (id: string) => {
    setPendingImageDrafts(prev => prev.filter(item => item.id !== id));
  };

  const handleSendImageDrafts = async () => {
    if (!onSendWithOptions || !pendingImageDrafts.length || isSendingImages) return;
    setIsSendingImages(true);
    try {
      for (const draft of pendingImageDrafts) {
        await Promise.resolve(onSendWithOptions({
          append: true,
          source: 'manual',
          inputKind: 'chat',
          messageType: 'image',
          imageUrl: draft.imageUrl,
          imageCaption: draft.imageCaption.trim()
        }));
      }
      setPendingImageDrafts([]);
      setShowImageDescPanel(false);
    } catch (error) {
      console.error('Chat image send failed:', error);
      showToast('发送图片失败，请重试');
    } finally {
      setIsSendingImages(false);
    }
  };

  const handleMenuClick = (id: string, e: React.MouseEvent | React.TouchEvent, sourceField?: 'content' | 'innerVoice' | 'actionDesc' | 'narrationDesc') => {
    if (isMultiSelecting) return;
    e.stopPropagation();
    if ('preventDefault' in e) e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const container = scrollRef.current;
    const anchorRect = resolveAnchorRectWithinContainer(target, container);
    setMenuMsgId(id);
    setMenuSourceField(sourceField || null);
    setMenuAnchorRect(anchorRect || {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    });
    if (vibrationEnabled) {
      if (isNative) {
        hapticLight();
      } else if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }
    }
  };

  const handleAvatarTap = (id: string) => {
    if (isMultiSelecting) return;
    const now = Date.now();
    const last = lastAvatarTapRef.current;

    if (now - last < 280) {
      if (avatarTapTimerRef.current) window.clearTimeout(avatarTapTimerRef.current);
      lastAvatarTapRef.current = 0;
      if (id === 'me') {
        onPat('me', 'me');
      } else {
        onPat('me', id);
      }
      return;
    }

    lastAvatarTapRef.current = now;
    avatarTapTimerRef.current = window.setTimeout(() => {
      onAvatarClick(id);
    }, 280);
  };

  const {
    renderTextWithEmoji,
    getEmojiOnly,
    getBubbleStyle,
    resolveSenderName,
    formatMessageTime
  } = useMessageRenderHelpers({
    customEmojis: emoji.emojiData.customEmojis,
    emojiGroups: emoji.emojiData.emojiGroups,
    groupEmojis: emoji.emojiData.groupEmojis,
    imageFallbackSrc: '/assets/image/user.png',
    settings,
    meName: me.name,
    contactById,
    contact
  });

  const iMessageHeaderOverlayOffset = (!isMultiSelecting && (!contact.status || contact.chatMode === 'story'))
    ? 'calc(var(--safe-top) + 92px)'
    : 'calc(var(--safe-top) + 104px)';

  return (
    <div
      className={`flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200 ${settings.chatBg ? 'render-chatroom-has-bg' : ''}`}
      style={settings.chatBg ? {
        backgroundImage: `url(${settings.chatBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      } : undefined}
      onClick={() => { setMenuMsgId(null); setMenuSourceField(null); setMenuAnchorRect(null); setShowPanel('none'); }}
    >
      <input type="file" ref={emoji.emojiUi.emojiFileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />
      <input type="file" ref={imageFileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageFileChange} />
      <ChatRoomHeaderBar
        isMultiSelecting={isMultiSelecting}
        multiSelectCount={multiSelectIds.length}
        titleOverride={titleOverride}
        subtitleOverride={subtitleOverride}
        contact={contact}
        isTyping={isTyping}
        currentSkinId={currentSkinId}
        onBack={() => isMultiSelecting ? setIsMultiSelecting(false) : onBack()}
        onMore={onMore}
        setIsMultiSelecting={setIsMultiSelecting}
        setMultiSelectIds={setMultiSelectIds}
        headerActions={headerActions}
        isIMessageSkin={isIMessageSkin}
        showMoreAction={showMoreAction}
        hideHeaderAvatar={hideHeaderAvatar || isQQSkin}
        contactById={contactById}
        headerImage={settings.headerImage}
      />
      {topInfoBar}

      <ChatRoomMessageList
        scrollRef={scrollRef}
        endRef={endRef}
        renderedMessages={renderedMessages}
        messages={messages}
        selectedMessageIdSet={selectedMessageIdSet}
        contact={contact}
        contactById={contactById}
        resolveSenderName={resolveSenderName}
        me={me}
        settings={settings}
        isIMessageSkin={isIMessageSkin}
        isAvatarCollapseSkin={isAvatarCollapseSkin}
        headerOverlayOffset={iMessageHeaderOverlayOffset}
        isMultiSelecting={isMultiSelecting}
        setMultiSelectIds={setMultiSelectIds}
        hideMessageAvatar={hideMessageAvatar}
        hideMessageSenderName={hideMessageSenderName}
        onMenuClick={handleMenuClick}
        onPaymentClick={onPaymentClick}
        onAvatarTap={handleAvatarTap}
        getBubbleStyle={getBubbleStyle}
        getEmojiOnly={getEmojiOnly}
        renderTextWithEmoji={renderTextWithEmoji}
        formatMessageTime={formatMessageTime}
        aiSettings={aiSettings}
        onStoryAdvance={handleStoryAdvance}
        onStoryInsight={handleStoryInsight}
        menuMsgId={menuMsgId}
        menuAnchorRect={menuAnchorRect}
        menuSourceField={menuSourceField}
        onAction={onAction}
        setMenuMsgId={(value: string | null) => {
          setMenuMsgId(value);
          if (!value) setMenuAnchorRect(null);
        }}
        setMenuSourceField={setMenuSourceField}
        setIsMultiSelecting={setIsMultiSelecting}
        onScroll={(e: React.UIEvent<HTMLDivElement>) => {
          const el = e.currentTarget;
          const distanceToBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
          shouldAutoScrollRef.current = distanceToBottom <= MESSAGE_LIST_EDGE_THRESHOLD;

          const nearTop = el.scrollTop <= MESSAGE_LIST_EDGE_THRESHOLD;
          if (nearTop && !wasNearHistoryTopRef.current) {
            loadOlderMessages();
          }

          wasNearHistoryTopRef.current = nearTop;
        }}
        onLoadMore={loadOlderMessages}
      />

      <div
        className="render-bg-tertiary border-t render-border render-chat-footer"
        style={{
          paddingBottom: 'var(--app-chat-footer-bottom-inset, max(var(--chat-footer-safe-bottom, var(--safe-padding-bottom, 0px)), var(--chat-safe-bottom-fallback, 0px)))',
          ...(settings.footerImage ? {
            backgroundImage: `url(${settings.footerImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : {})
        }}
      >
        {isMultiSelecting ? (
          <ChatRoomFooterPanels
            renderMorePanel={false}
            isMultiSelecting={isMultiSelecting}
            multiSelectIds={multiSelectIds}
            setIsMultiSelecting={setIsMultiSelecting}
            setMultiSelectIds={setMultiSelectIds}
            onAction={onAction}
            showPanel={showPanel}
            isStoryMode={isStoryMode}
            canOpenInnerActionPanel={canOpenInnerActionPanel}
            onSub={onSub}
            onStartVoiceCall={handleStartVoiceCall}
            onOpenInnerActionPanel={handleOpenInnerActionPanel}
            onPickAlbum={() => imageFileInputRef.current?.click()}
            onOpenTruthOrDare={() => { setShowPanel('none'); setTruthOrDarePhase('invite'); setShowTruthOrDareModal(true); }}
          />
        ) : (
          <>
            {truthOrDareActive && !isStoryMode && (
              <div className="px-2.5 pt-2">
                <div className="rounded-xl border render-border-subtle render-bg-secondary px-2 py-2 flex items-center gap-2 overflow-x-auto">
                  <button
                    className="h-8 px-3 rounded-lg border render-border-subtle text-[12px] whitespace-nowrap"
                    onClick={exitTruthOrDareManually}
                  >
                    退出游戏
                  </button>
                  <button className="h-8 px-3 rounded-lg border render-border-subtle text-[12px] whitespace-nowrap" onClick={() => { if (!truthOrDareTheme) return; beginNextTruthOrDareRound(truthOrDareTheme, 'next'); }}>下一轮</button>
                  <button className="h-8 px-3 rounded-lg border render-border-subtle text-[12px] whitespace-nowrap" onClick={() => { setTruthOrDarePhase('god'); setShowTruthOrDareModal(true); }}>上帝模式</button>
                  <span className="ml-auto text-[11px] text-gray-500 whitespace-nowrap">{truthOrDareTheme ? `${truthOrDareTheme.name} · 第${truthOrDareRound}轮` : '游戏未开始'}</span>
                </div>
              </div>
            )}
          <ChatRoomComposer
            composerReplacement={composerReplacement}
            leftActions={leftActions}
            isWechatSkin={isWechatSkin}
            isStoryMode={isStoryMode}
            showDescriptionToggle={isDescriptionComposerEnabled}
            descriptionInputKind={descriptionInputKind}
            descriptionSayEnabled={descriptionAvailability.sayEnabled}
            descriptionDoEnabled={descriptionAvailability.doEnabled}
            setDescriptionInputKind={setDescriptionInputKind}
            setInputMode={setInputMode}
            inputMode={inputMode}
            storyInputKind={storyInputKind}
            setStoryInputKind={setStoryInputKind}
            isIMessageSkin={isIMessageSkin}
            inputValue={inputValue}
            setInputValue={setInputValue}
            setShowPanel={setShowPanel}
            showPanel={showPanel}
            textInputRef={textInputRef}
            onInputAdjust={() => scheduleComposerTextareaHeightAdjust(textInputRef.current)}
            onInputFocus={() => {
              setShowPanel('none');
              onInputFocusChange?.(true);
              setTimeout(() => {
                scrollToBottom('auto');
              }, 300);
            }}
            onInputBlur={() => {
              onInputFocusChange?.(false);
            }}
            onSendWithOptions={onSendWithOptions}
            onSend={onSend}
            onDescriptionComposerSend={handleDescriptionComposerSend}
            enableSentenceSend={enableSentenceSend}
            onTempSend={onTempSend}
            handleGenerateReplies={handleGenerateReplies}
            isGeneratingReplies={isGeneratingReplies}
            generatedReplies={generatedReplies}
            isKakaoSkin={isKakaoSkin}
            isTelegramSkin={isTelegramSkin}
            isY2KSkin={isY2KSkin}
            isRetroSkin={isRetroSkin}
            handleUseGeneratedReply={handleUseGeneratedReply}
            quotedMessage={quotedMessage}
            resolveSenderName={resolveSenderName}
            onCancelQuote={onCancelQuote}
          />
          </>
        )}

      <ChatRoomEmojiPanel
        visible={showPanel === 'emoji' && !isMultiSelecting && !isStoryMode}
        panel={emoji.emojiPanel}
        onSub={onSub}
      />

        <ChatRoomFooterPanels
          renderMultiSelectBar={false}
          isMultiSelecting={isMultiSelecting}
          multiSelectIds={multiSelectIds}
          setIsMultiSelecting={setIsMultiSelecting}
          setMultiSelectIds={setMultiSelectIds}
          onAction={onAction}
          showPanel={showPanel}
          isStoryMode={isStoryMode}
          canOpenInnerActionPanel={canOpenInnerActionPanel}
          onSub={onSub}
          onStartVoiceCall={handleStartVoiceCall}
          onOpenInnerActionPanel={handleOpenInnerActionPanel}
          onPickAlbum={() => imageFileInputRef.current?.click()}
          onOpenTruthOrDare={() => { setShowPanel('none'); setTruthOrDarePhase('invite'); setShowTruthOrDareModal(true); }}
        />
      </div>

      <TruthOrDareModal
        visible={showTruthOrDareModal}
        phase={truthOrDarePhase}
        drawingName={truthOrDareDrawingName}
        pendingPlayer={truthOrDarePendingPlayer}
        contact={contact}
        aiSettings={aiSettings}
        onClose={() => { clearTruthOrDareDrawTimers(); resetTruthOrDareSessionEpoch(); setTruthOrDarePhase('invite'); setShowTruthOrDareModal(false); }}
        onToast={(message) => showToast(message)}
        onRequestInvite={(theme) => {
          resetTruthOrDareSessionEpoch();
          const targetName = String(contact.remark || contact.name || '对方').trim() || '对方';
          setShowPanel('none');
          setShowTruthOrDareModal(false);
          truthOrDareAutoNextHandledMsgIdRef.current = getLatestTruthOrDareNextRoundCommandId();
          setTruthOrDareTheme(theme);
          setTruthOrDareActive(true);
          setTruthOrDareRound(1);
          appendTruthOrDareMessage(buildTruthOrDareMessage({
            senderId: 'me',
            kind: 'invite',
            themeName: theme.name,
            content: `我向你发起了「${theme.name}」真心话大冒险邀请`
          }));
          appendTruthOrDareSystemNotice(`【真心话大冒险】你向${targetName}发起了邀请。`);
          const waitMs = 1800 + Math.floor(Math.random() * 2600);
          const sessionEpoch = truthOrDareSessionEpochRef.current;
          window.setTimeout(() => {
            if (isTruthOrDareSessionStale(sessionEpoch)) return;
            appendTruthOrDareMessage(buildTruthOrDareMessage({
              senderId: contact.id,
              kind: 'accepted',
              themeName: theme.name,
              content: `${targetName} 已接受真心话大冒险邀请`
            }));
            appendTruthOrDareSystemNotice(`【真心话大冒险】${targetName} 接受了邀请。`);
            publishTruthOrDareStatePrompt(theme, 1);
            startTruthOrDareDraw(theme);
          }, waitMs);
        }}
        onChooseResult={(mode) => {
          if (!truthOrDareTheme || !truthOrDarePendingPlayer) return;
          resolveTruthOrDareResult(mode, truthOrDarePendingPlayer, truthOrDareTheme);
          setTruthOrDarePendingPlayer('');
          setTruthOrDarePhase('invite');
          setShowTruthOrDareModal(false);
        }}
        onGodAction={(action) => {
          if (!truthOrDareTheme) return;
          if (action === 'skip') {
            beginNextTruthOrDareRound(truthOrDareTheme, 'skip');
            return;
          }
          const opponent = resolveTruthOrDareOpponentName();
          appendTruthOrDareSystemNotice(`【真心话大冒险】上帝模式生效：指定${opponent}${action === 'forceTruth' ? '真心话' : '大冒险'}。`);
          resolveTruthOrDareResult(action === 'forceTruth' ? 'truth' : 'dare', opponent, truthOrDareTheme);
          setTruthOrDarePhase('invite');
          setShowTruthOrDareModal(false);
        }}
      />

        <ChatRoomAuxPanels
        isStoryMode={isStoryMode}
        showInnerActionPanel={showInnerActionPanel}
        setShowInnerActionPanel={setShowInnerActionPanel}
        innerActionType={innerActionType}
        setInnerActionType={setInnerActionType}
        allowInnerVoice={currentModePolicy.innerEnabled}
        allowActionDesc={currentModePolicy.actionEnabled}
        innerActionInput={innerActionInput}
        setInnerActionInput={setInnerActionInput}
        onAppendMessage={onAppendMessage}
        storyInsightModal={storyInsightModal}
        setStoryInsightModal={setStoryInsightModal}
        isGeneratingReplies={isGeneratingReplies}
        inputValue={inputValue}
        generatedReplies={generatedReplies}
          showAddEmojiMenu={emoji.emojiUi.showAddEmojiMenu}
          setShowAddEmojiMenu={emoji.emojiActions.closeAddMenu}
          onPickAlbum={emoji.emojiActions.openAlbumPicker}
          onPickUrlImport={emoji.emojiActions.openUrlImport}
        />

      <EmojiUrlImportPanel
        visible={emoji.emojiUi.showUrlImportPanel}
        onClose={emoji.emojiActions.closeUrlImport}
        customEmojis={emoji.emojiData.customEmojis}
        normalizeCustomEmojis={emoji.emojiData.normalizeCustomEmojis}
        compactEmojiList={emoji.emojiData.compactEmojiList}
        setCustomEmojis={emoji.emojiActions.setCustomEmojis}
        showToast={showToast}
      />

      <VoiceCallOverlays
        isInVoiceCall={isInVoiceCall}
        isIncomingCallOpen={isIncomingCallOpen}
        contact={contact}
        callDurationSec={callDurationSec}
        messages={messages}
        inputValue={inputValue}
        setInputValue={setInputValue}
        onSend={onSend}
        onEndVoiceCall={handleEndVoiceCall}
        onRejectVoiceCall={handleRejectVoiceCall}
        onAcceptVoiceCall={handleAcceptVoiceCall}
      />

      {showImageDescPanel && (
        <ChatRoomImageDraftPanel
          drafts={pendingImageDrafts}
          isSending={isSendingImages}
          onClose={() => setShowImageDescPanel(false)}
          onCaptionChange={handleDraftCaptionChange}
          onRemove={handleDraftRemove}
          onSend={() => void handleSendImageDrafts()}
        />
      )}
    </div>
  );
};

export default ChatRoom;
