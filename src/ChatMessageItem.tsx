import React from 'react';
import { Contact, Message, UserProfile, AppearanceSettings } from './types';
import RedPacketBubble from './chatroom/bubbles/RedPacketBubble';
import TransferBubble from './chatroom/bubbles/TransferBubble';
import LocationBubble from './chatroom/bubbles/LocationBubble';
import VoiceBubble from './chatroom/bubbles/VoiceBubble';
import TruthOrDareBubble from './chatroom/bubbles/TruthOrDareBubble';
import StoryActions from './chatroom/bubbles/StoryActions';
import { synthesizeMiniMaxAudio } from './services/minimaxTtsService';
import { voiceMessageAudioManager } from './services/voiceMessageAudio';
import { buildHtmlPreviewSrcDoc, isLikelyHtmlContent } from './utils/chat/htmlMessageRender';
import { resolveChatMessageBottomMetaPadding, shouldRenderChatMessageBubble } from './utils/chat/messageBubbleLayout';
import { buildEmojiMessageLayoutClasses } from './utils/chat/emojiMessageLayout';
import { getQuotePreviewText } from './utils/chat/messageQuote';
import { collectResolvedEmojiTokens, stripResolvedEmojiTokens } from './chatroom/emojiTokenResolver';
import { showWechatAlert } from './utils/wechatDialog';
import { resolvePaymentStatus } from './app/walletFlowUtils';

const buildNoticeAlphaColor = (color: string, opacityPercent: number): string => {
  const safeColor = String(color || '').trim();
  const safeOpacity = Math.max(0, Math.min(100, opacityPercent));
  if (!safeColor) return '';
  if (safeOpacity >= 100) return safeColor;
  return `color-mix(in srgb, ${safeColor} ${safeOpacity}%, transparent)`;
};

type MiniMaxSettingsInput = {
  minimaxTTS?: {
    enabled: boolean;
    region: 'official' | 'international' | 'china';
    apiKey: string;
    groupId: string;
    model: string;
  };
};

interface ChatMessageItemProps {
  msg: Message;
  contact: Contact;
  messageContact?: Contact | null;
  resolveSenderName?: (senderId: string) => string;
  me: UserProfile;
  settings: AppearanceSettings & { chatBg?: string };
  isMe: boolean;
  isSpecial: boolean;
  isSelected: boolean;
  isSystem: boolean;
  showMeta: boolean;
  showTime: boolean;
  isMultiSelecting: boolean;
  hideAvatar?: boolean;
  reserveAvatarSpace?: boolean;
  hideBubbleTail?: boolean;
  hideSenderName?: boolean;
  onToggleSelect: (msgId: string, isSelected: boolean) => void;
  onMenuClick: (msgId: string, e: React.MouseEvent | React.TouchEvent, sourceField?: 'content' | 'innerVoice' | 'actionDesc' | 'narrationDesc') => void;
  onPaymentClick?: (msgId: string, type: 'redpacket' | 'transfer') => void;
  onAvatarTap: (id: string) => void;
  getBubbleStyle: (isMe: boolean, type: string) => any;
  getEmojiOnly: (content: string) => { id: string; url: string; desc: string } | null;
  renderTextWithEmoji: (content: string) => React.ReactNode;
  formatMessageTime: (timestamp?: number) => string;
  onStoryAdvance?: (msgId: string) => void;
  onStoryInsight?: (msgId: string) => void;
  aiSettings?: MiniMaxSettingsInput;
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  msg,
  contact,
  messageContact,
  resolveSenderName,
  me,
  settings,
  isMe,
  isSpecial,
  isSelected,
  isSystem,
  showMeta,
  showTime,
  isMultiSelecting,
  hideAvatar = false,
  reserveAvatarSpace = false,
  hideBubbleTail = false,
  hideSenderName = false,
  onToggleSelect,
  onMenuClick,
  onPaymentClick,
  onAvatarTap,
  getBubbleStyle,
  getEmojiOnly,
  renderTextWithEmoji,
  formatMessageTime,
  onStoryAdvance,
  onStoryInsight,
  aiSettings
}) => {
  const bubbleText = msg.content;
  const normalizedInnerFromMsg = String(msg.innerVoice || '').trim();
  const normalizedActionFromMsg = String(msg.actionDesc || '').trim();
  const normalizedNarrationFromMsg = String(msg.narrationDesc || '').trim();
  const effectiveInnerVoice = normalizedInnerFromMsg || undefined;
  const effectiveActionDesc = normalizedActionFromMsg || undefined;
  const effectiveNarrationDesc = normalizedNarrationFromMsg || undefined;
  const resolveEmojiFromToken = React.useCallback((desc: string) => (
    getEmojiOnly(`[emoji:${String(desc || '').trim()}]`)
  ), [getEmojiOnly]);

  const emojiOnly = msg.type === 'text' ? getEmojiOnly(bubbleText) : null;
  const detachedEmojiItems = msg.type === 'text'
    ? collectResolvedEmojiTokens(bubbleText, resolveEmojiFromToken)
    : [];
  const textWithoutEmoji = msg.type === 'text'
    ? stripResolvedEmojiTokens(bubbleText, resolveEmojiFromToken).replace(/\s{2,}/g, ' ').trim()
    : bubbleText;
  const translatedTextZhCN = msg.type === 'text'
    ? String(msg.translatedContentZhCN || '').trim()
    : '';
  const hasHtmlTag = msg.type === 'text' && isLikelyHtmlContent(bubbleText || '');
  const isHtmlMessage = msg.type === 'text' && hasHtmlTag;
  const rawHtml = isHtmlMessage ? String(bubbleText || '') : '';
  const allowHtmlScripts = settings.enableHtmlBubbleScripts === true;
  const htmlPreviewSrcDoc = React.useMemo(() => (
    isHtmlMessage
      ? buildHtmlPreviewSrcDoc(rawHtml, String(msg.id || ''), { allowScripts: allowHtmlScripts })
      : ''
  ), [isHtmlMessage, rawHtml, msg.id, allowHtmlScripts]);
  const [htmlFrameHeight, setHtmlFrameHeight] = React.useState<number>(0);
  const HTML_PREVIEW_MIN_HEIGHT = 0;
  const HTML_PREVIEW_MAX_HEIGHT_OFFSET = 120;

  const resolveHtmlPreviewMaxHeight = (frame: HTMLIFrameElement): number => {
    if (typeof window === 'undefined') return 720;
    let node = frame.parentElement;
    while (node) {
      const style = window.getComputedStyle(node);
      const overflowY = String(style.overflowY || '').toLowerCase();
      const isScrollable = overflowY === 'auto' || overflowY === 'scroll';
      if (isScrollable && node.clientHeight > 0) {
        return Math.max(220, node.clientHeight - HTML_PREVIEW_MAX_HEIGHT_OFFSET);
      }
      node = node.parentElement;
    }
    return Math.max(220, window.innerHeight - 96);
  };
  const locationAddress = msg.locationAddress || (msg.type === 'location' ? (msg.content.split(/\r?\n/)[1] || '').trim() : '');
  const hasChatBg = !!settings.chatBg;
  const [isVoicePlaying, setIsVoicePlaying] = React.useState(false);
  const [voiceProgress, setVoiceProgress] = React.useState(0);
  const currentVoiceUrlRef = React.useRef<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = React.useState<string | null>(null);
  const rootClassList = typeof document !== 'undefined' ? document.documentElement.classList : null;
  const rootSkinId = (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-render-skin') : null) || 'wechat';
  const forceShowTime = !!rootClassList?.contains('render-chat-time-always');
  const forceHideTime = !!rootClassList?.contains('render-chat-time-hidden');
  const showReadStatus = !!rootClassList?.contains('render-chat-show-read-status') && contact.chatMode !== 'story';
  const showTimeInBubble = !!rootClassList?.contains('render-chat-time-in-bubble');
  const shouldShowTimestamp = !forceHideTime && (showTime || forceShowTime) && contact.chatMode !== 'story';
  const readBadgeTextMap: Record<string, string> = {
    wechat: '已读',
    qq: '已读',
    telegram: '✓✓',
    kakao: '읽음',
    imessage: '已读'
  };
  const customReadStatusText = String(settings.readStatusTextOverride || '').trim();
  const readBadgeText = customReadStatusText || readBadgeTextMap[rootSkinId] || '已读';
  const isIMessageSkin = rootSkinId === 'imessage';
  const isKakaoSkin = rootSkinId === 'kakao';
  const isQQSkin = rootSkinId === 'qq';
  const isY2KSkin = rootSkinId === 'y2k';
  const isRetroSkin = rootSkinId === 'retro' || rootSkinId === 'polkadot' || rootSkinId === 'pixel';
  const isTelegramSkin = rootSkinId === 'telegram';
  const shouldShowMetaNoticeInList = contact.chatMode !== 'story' || !!effectiveNarrationDesc;
  const npcName = String(msg.npcName || '').trim();
  const isNpcMessage = contact.chatMode === 'story' && !isMe && (!!msg.isNpc || !!npcName);
  const npcDisplayName = npcName || 'NPC';
  const canShowStoryOps = contact.chatMode === 'story' && !isMe && msg.type === 'text' && !isSystem && !isSpecial && !emojiOnly;
  const showStoryAdvanceOp = canShowStoryOps;
  const showStoryInsightOp = canShowStoryOps && !isNpcMessage;
  const showStoryOps = showStoryAdvanceOp || showStoryInsightOp;
  const showStoryOpsOutsideBubble = isY2KSkin && showStoryOps;
  const npcDefaultAvatar = '/assets/image/user.png';
  const incomingAvatarSrc = isNpcMessage ? npcDefaultAvatar : (messageContact?.avatar || contact.avatar);
  const emojiMessageLayout = buildEmojiMessageLayoutClasses({ isMe });

  const showBottomMetaRow = (isIMessageSkin || isRetroSkin || isTelegramSkin) && !showMeta && (showReadStatus || shouldShowTimestamp);
  const showOutsideReadBadge = showReadStatus && !showMeta && isMe && rootSkinId !== 'wechat' && !isQQSkin && !isIMessageSkin && !isY2KSkin && !isRetroSkin && !isTelegramSkin;
  const showKakaoReadBelowTime = isKakaoSkin && shouldShowTimestamp && !showMeta && showOutsideReadBadge;
  const needsOutsideReadPadding = showOutsideReadBadge && !isKakaoSkin;
  const shouldRenderMessageBubble = shouldRenderChatMessageBubble({
    msgType: msg.type,
    emojiOnly: !!emojiOnly,
    textWithoutEmoji,
    hasHtmlTag
  });
  const bottomMetaPadding = resolveChatMessageBottomMetaPadding({
    msgType: msg.type,
    emojiOnly: !!emojiOnly,
    textWithoutEmoji,
    hasHtmlTag,
    needsOutsideReadPadding,
    showBottomMetaRow,
    isRetroSkin
  });
  const shouldRenderInnerActionNotice = true;
  const innerPrefix = String(settings.innerVoicePrefix || '');
  const actionPrefix = String(settings.actionDescPrefix || '');
  const narrationPrefix = String(settings.narrationPrefix || '');
  const innerNoticeText = effectiveInnerVoice ? `${innerPrefix}${effectiveInnerVoice}` : '';
  const actionNoticeText = effectiveActionDesc ? `${actionPrefix}${effectiveActionDesc}` : '';
  const narrationNoticeText = effectiveNarrationDesc ? `${narrationPrefix}${effectiveNarrationDesc}` : '';
  const hasAnyMetaNotice = !!(innerNoticeText || actionNoticeText || narrationNoticeText);
  const shouldShowAvatar = !isY2KSkin && !hideAvatar;
  const hasAvatarSlot = !isY2KSkin && (shouldShowAvatar || reserveAvatarSpace);
  const isAvatarHidden = !hasAvatarSlot;
  const safeSystemNoticeBackgroundStyle = settings.systemNoticeBackgroundStyle || 'auto';
  const safeSystemNoticeOpacity = Math.max(0, Math.min(100, Number(settings.systemNoticeBackgroundOpacity ?? 36)));
  const safeSystemNoticeBlur = Math.max(0, Math.min(20, Number(settings.systemNoticeBlur ?? 10)));
  const safeSystemNoticeBorderOpacity = Math.max(0, Math.min(100, Number(settings.systemNoticeBorderOpacity ?? 30)));
  const safeNotificationTextSize = Number.isFinite(Number(settings.notificationTextSize)) ? Math.max(10, Math.min(24, Number(settings.notificationTextSize))) : 12;
  const systemNoticeTextColor = String(settings.systemNoticeTextColor || '').trim();
  const systemNoticeBorderColor = String(settings.systemNoticeBorderColor || '').trim();

  const bubbleMaxWidth = (() => {
    if (isKakaoSkin) return 'min(72%, calc(100% - 76px))';
    if (isIMessageSkin) return 'min(80%, calc(100% - 68px))';
    if (isRetroSkin) return 'min(78%, calc(100% - 68px))';
    if (isTelegramSkin) return 'min(80%, calc(100% - 68px))';
    return 'var(--app-message-max-width)';
  })();
  const useStandardBubbleShell = !isSpecial && !(isY2KSkin && msg.type === 'text') && !isHtmlMessage;

  const estimatedVoiceSec = Math.max(1, Math.ceil((msg.content || '').length / 6));
  const callDuration = Math.max(0, Math.floor(Number(msg.callDurationSec || 0)));
  const callDurationText = `${Math.floor(callDuration / 60).toString().padStart(2, '0')}:${(callDuration % 60).toString().padStart(2, '0')}`;

  const showVoiceError = (message: string) => {
    const text = String(message || '').trim() || '语音播放失败';
    showWechatAlert(text);
  };

  const playVoiceBubble = async () => {
    const minimaxGlobal = aiSettings?.minimaxTTS;
    const hasGlobalConfig = !!(
      minimaxGlobal?.enabled
      && String(minimaxGlobal.apiKey || '').trim()
      && String(minimaxGlobal.groupId || '').trim()
      && String(minimaxGlobal.model || '').trim()
    );
    const currentAudioUrl = voiceMessageAudioManager.currentUrl;
    const hasOwnAudioPlaying = isVoicePlaying
      && !!currentVoiceUrlRef.current
      && !!currentAudioUrl
      && currentVoiceUrlRef.current === currentAudioUrl;
    if (hasOwnAudioPlaying) return;
    const text = String(msg.content || '').trim();
    const voiceId = String(msg.voiceId || contact.minimaxTTS?.voiceId || '').trim();
    if (!text) {
      showVoiceError('语音文本为空，无法播放');
      return;
    }
    if (!voiceId) {
      showVoiceError('voice_id 为空，请先在角色设置中配置');
      return;
    }
    if (!hasGlobalConfig) {
      showVoiceError(
        `MiniMax 全局配置不完整：enabled=${Boolean(minimaxGlobal?.enabled)}，apiKey=${String(minimaxGlobal?.apiKey || '').trim() ? '已填' : '未填'}，groupId=${String(minimaxGlobal?.groupId || '').trim() ? '已填' : '未填'}，model=${String(minimaxGlobal?.model || '').trim() ? '已填' : '未填'}`
      );
      return;
    }

    setIsVoicePlaying(true);
    setVoiceProgress(0);
    try {
      const audioUrl = await synthesizeMiniMaxAudio({
        aiSettings,
        text,
        voiceId,
        speed: msg.voiceSpeed ?? contact.minimaxTTS?.speed ?? 1,
        language: msg.voiceLanguage || contact.minimaxTTS?.language || 'Chinese'
      });
      currentVoiceUrlRef.current = audioUrl;
      await voiceMessageAudioManager.playUrl(audioUrl);
    } catch (error) {
      setVoiceProgress(0);
      setIsVoicePlaying(false);
      const reason = String(error instanceof Error ? error.message : '未知错误').trim();
      showVoiceError(`MiniMax 语音播放失败：${reason}`);
    }
  };

  React.useEffect(() => {
    if (!isHtmlMessage) return;
    setHtmlFrameHeight(0);
  }, [isHtmlMessage, htmlPreviewSrcDoc]);

  const measureHtmlFrameHeight = (frame: HTMLIFrameElement): number => {
    const frameDoc = frame.contentDocument;
    const frameWin = frame.contentWindow;
    if (!frameDoc || !frameWin) return 0;
    const body = frameDoc.body;
    if (!body) return 0;
    const bodyRect = body.getBoundingClientRect();
    const nodes = Array.from(body.querySelectorAll<HTMLElement>('*'));
    let minTop = Number.POSITIVE_INFINITY;
    let maxBottom = 0;
    for (const node of nodes) {
      const style = frameWin.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.position === 'fixed') continue;
      const isLeafLike = node.childElementCount === 0 || /^(table|ul|ol|pre|blockquote)$/i.test(node.tagName);
      if (!isLeafLike) continue;
      const rect = node.getBoundingClientRect();
      if (rect.height <= 0 || rect.width <= 0) continue;
      const relativeTop = rect.top - bodyRect.top;
      const relativeBottom = rect.bottom - bodyRect.top;
      if (relativeTop < minTop) minTop = relativeTop;
      if (relativeBottom > maxBottom) maxBottom = relativeBottom;
    }
    const leafHeight = Number.isFinite(minTop) ? Math.ceil(Math.max(0, maxBottom - minTop)) : 0;
    const scrollHeight = Math.ceil(Math.max(
      frameDoc.body?.scrollHeight || 0,
      frameDoc.documentElement?.scrollHeight || 0
    ));
    const shouldPreferLeafHeight = leafHeight > 0 && scrollHeight > leafHeight * 1.35;
    let contentHeight = shouldPreferLeafHeight ? leafHeight : Math.max(leafHeight, scrollHeight);
    if (contentHeight <= 0) {
      const range = frameDoc.createRange();
      range.selectNodeContents(body);
      const cap = Math.max(1, frame.clientHeight || frame.offsetHeight || 0);
      const rangeRects = Array.from(range.getClientRects()).filter((rect) => {
        if (rect.height <= 0 || rect.width <= 0) return false;
        if (cap <= 0) return true;
        const looksLikeViewportShell = rect.top <= 1 && rect.height >= cap * 0.95;
        return !looksLikeViewportShell;
      });
      if (rangeRects.length > 0) {
        const top = Math.min(...rangeRects.map((rect) => rect.top));
        const bottom = Math.max(...rangeRects.map((rect) => rect.bottom));
        contentHeight = Math.ceil(Math.max(0, bottom - top));
      }
    }
    if (contentHeight <= 0) return 0;
    const viewportMax = resolveHtmlPreviewMaxHeight(frame);
    return Math.min(Math.max(contentHeight, HTML_PREVIEW_MIN_HEIGHT), viewportMax);
  };

  const handleHtmlFrameLoad = (event: React.SyntheticEvent<HTMLIFrameElement>) => {
    const frame = event.currentTarget;
    const applyHeight = () => {
      const nextHeight = measureHtmlFrameHeight(frame);
      if (nextHeight > 0) {
        setHtmlFrameHeight(nextHeight);
        return;
      }
      setHtmlFrameHeight(0);
    };
    applyHeight();
    window.setTimeout(applyHeight, 120);
    window.setTimeout(applyHeight, 420);
  };
  const htmlPreviewHeightStyle = htmlFrameHeight > 0 ? { height: `${htmlFrameHeight}px` } : undefined;

  React.useEffect(() => {
    const unsubscribe = voiceMessageAudioManager.subscribe((event) => {
      const currentAudioUrl = voiceMessageAudioManager.currentUrl;
      const isCurrentVoice = !!currentVoiceUrlRef.current
        && !!currentAudioUrl
        && currentVoiceUrlRef.current === currentAudioUrl;

      if (event === 'timeupdate' && isCurrentVoice) {
        const duration = voiceMessageAudioManager.duration;
        const currentTime = voiceMessageAudioManager.currentTime;
        if (duration > 0) {
          const progress = Math.min(100, Math.round((currentTime / duration) * 100));
          setVoiceProgress(progress);
        }
      }

      if (event === 'play' && isCurrentVoice) {
        setIsVoicePlaying(true);
        return;
      }

      if ((event === 'ended' || event === 'pause' || event === 'error') && isCurrentVoice) {
        setIsVoicePlaying(false);
        if (event === 'ended') setVoiceProgress(100);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const isHtmlInteractiveTarget = (eventTarget: EventTarget | null): boolean => {
    if (!isHtmlMessage) return false;
    if (!(eventTarget instanceof Element)) return false;
    return !!eventTarget.closest('.chat-html-embed,[data-switch-panel],a[href],button,iframe');
  };

  const getSystemNoticeStyle = (textColorOverride?: string): React.CSSProperties | undefined => {
    const resolvedTextColor = String(textColorOverride || '').trim() || systemNoticeTextColor;
    const fallbackGlassBackground = hasChatBg ? 'rgba(0,0,0,0.34)' : 'rgba(255,255,255,0.38)';
    const fallbackSolidBackground = hasChatBg ? 'rgba(0,0,0,0.56)' : 'rgba(0,0,0,0.06)';
    const baseStyle: React.CSSProperties = {
      fontSize: `${safeNotificationTextSize}px`
    };

    if (resolvedTextColor) {
      baseStyle.color = resolvedTextColor;
    } else if (hasChatBg) {
      baseStyle.color = 'rgba(255,255,255,0.96)';
    }

    if (safeSystemNoticeBackgroundStyle === 'auto') {
      if (hasChatBg) {
        baseStyle.backgroundColor = 'rgba(0,0,0,0.34)';
        baseStyle.border = '1px solid rgba(255,255,255,0.2)';
        baseStyle.backdropFilter = 'blur(4px)';
        baseStyle.WebkitBackdropFilter = 'blur(4px)';
        baseStyle.textShadow = '0 1px 2px rgba(0,0,0,0.45)';
        return baseStyle;
      }
      return Object.keys(baseStyle).length > 0 ? baseStyle : undefined;
    }

    if (safeSystemNoticeBackgroundStyle === 'glass') {
      baseStyle.backgroundColor = buildNoticeAlphaColor(hasChatBg ? '#000000' : '#ffffff', safeSystemNoticeOpacity) || fallbackGlassBackground;
      baseStyle.backdropFilter = `blur(${safeSystemNoticeBlur}px)`;
      baseStyle.WebkitBackdropFilter = `blur(${safeSystemNoticeBlur}px)`;
      if (hasChatBg && !resolvedTextColor) {
        baseStyle.textShadow = '0 1px 2px rgba(0,0,0,0.45)';
      }
    } else if (safeSystemNoticeBackgroundStyle === 'solid') {
      baseStyle.backgroundColor = buildNoticeAlphaColor(hasChatBg ? '#000000' : '#000000', safeSystemNoticeOpacity) || fallbackSolidBackground;
      if (hasChatBg && !resolvedTextColor) {
        baseStyle.textShadow = '0 1px 2px rgba(0,0,0,0.45)';
      }
    }

    if (settings.systemNoticeBorderEnabled) {
      const borderColor = buildNoticeAlphaColor(systemNoticeBorderColor || (hasChatBg ? '#ffffff' : '#000000'), safeSystemNoticeBorderOpacity);
      baseStyle.border = `1px solid ${borderColor}`;
    }

    return baseStyle;
  };

  // Inner voice/action notice helper
  const renderNotice = (text: string, colorSetting: string | undefined, field: 'innerVoice' | 'actionDesc' | 'narrationDesc') => (
    <div
      className={`chat-system-notice px-3 py-1 rounded-full text-[12px] text-center cursor-pointer active:opacity-70 ${hasChatBg ? '' : 'bg-black/5 dark:bg-white/10'}`}
      style={getSystemNoticeStyle(colorSetting)}
      onClick={(e) => onMenuClick(msg.id, e, field)}
      onContextMenu={(e) => onMenuClick(msg.id, e, field)}
    >
      {text}
    </div>
  );

  // 纯心声/动作消息（没有内容，只有通知）
  if (shouldRenderInnerActionNotice && shouldShowMetaNoticeInList && hasAnyMetaNotice && !msg.content?.trim()) {
    return (
      <div className="flex flex-col items-center" style={{ marginBottom: 'var(--app-message-spacing)' }}>
        <div className="w-full flex flex-col items-center gap-1">
          {innerNoticeText && renderNotice(innerNoticeText, settings.innerNoticeTextColor, 'innerVoice')}
          {actionNoticeText && renderNotice(actionNoticeText, settings.actionNoticeTextColor, 'actionDesc')}
          {narrationNoticeText && renderNotice(narrationNoticeText, settings.narrationNoticeTextColor, 'narrationDesc')}
        </div>
      </div>
    );
  }

  if (isSystem) {
    if (msg.truthDareCommand) return null;
    const systemText = msg.content || (msg.pat ? `${msg.pat.fromName} 拍了拍 ${msg.pat.targetName}` : '');
    return (
      <div className="flex flex-col items-center" style={{ marginBottom: 'var(--app-message-spacing)' }}>
        <div
          className={`chat-system-notice px-3 py-1 rounded-full text-[12px] text-center cursor-pointer active:opacity-70 ${hasChatBg ? '' : 'render-text-tertiary bg-black/5 dark:bg-white/10'}`}
          style={getSystemNoticeStyle()}
          onClick={(e) => onMenuClick(msg.id, e)}
        >
          {systemText}
        </div>
      </div>
    );
  }

  if (msg.type === 'call') {
    return (
      <div className="flex flex-col items-center" style={{ marginBottom: 'var(--app-message-spacing)' }}>
        <div
          className={`chat-system-notice px-3 py-1 rounded-full text-[12px] text-center cursor-pointer active:opacity-70 ${hasChatBg ? '' : 'render-text-tertiary bg-black/5 dark:bg-white/10'}`}
          style={getSystemNoticeStyle()}
          onClick={(e) => onMenuClick(msg.id, e)}
        >
          {msg.callStatus === 'missed' ? '语音通话未接通' : msg.callStatus === 'ongoing' ? '语音通话进行中…' : `语音通话 ${callDurationText}`}
          {msg.content ? ` · ${msg.content}` : ''}
        </div>
      </div>
    );
  }

  // Render the content bubble based on message type
  const renderBubbleContent = () => {
    if (msg.type === 'redpacket') {
      return <RedPacketBubble content={msg.content} isOpened={resolvePaymentStatus(msg) === 'received'} isMe={isMe} paymentStatus={msg.paymentStatus} />;
    }
    if (msg.type === 'transfer') {
      return <TransferBubble amount={Number(msg.amount)} isOpened={resolvePaymentStatus(msg) === 'received'} isMe={isMe} paymentStatus={msg.paymentStatus} />;
    }
    if (msg.type === 'location') {
      return <LocationBubble locationName={msg.locationName} locationAddress={locationAddress} />;
    }
    if (msg.type === 'truthdare') {
      return <TruthOrDareBubble kind={msg.truthDareKind} themeName={msg.truthDareThemeName} isMe={isMe} />;
    }
    if (msg.type === 'miniprogram') {
      return (
        <div className="flex flex-col w-[260px] render-bg-secondary overflow-hidden shadow-md border render-border-subtle cursor-pointer active:bg-[var(--bg-hover)]" style={{ borderRadius: 'var(--app-card-radius)' }}>
          <div className="p-3 border-b render-border-subtle flex items-center">
            <img src={msg.thumb || 'https://picsum.photos/seed/mp/100'} loading="lazy" decoding="async" className="w-4 h-4 rounded-full mr-2" />
            <span className="text-[11px] text-gray-500 truncate flex-1">{msg.title}</span>
            <i className="fa-solid fa-ellipsis text-[10px] text-gray-400"></i>
          </div>
          <div className="p-4">
            <div className="text-[16px] font-medium dark:text-white mb-2 leading-snug line-clamp-2">{msg.desc}</div>
            <img src={msg.thumb || 'https://picsum.photos/seed/mp2/400/200'} loading="lazy" decoding="async" className="w-full h-32 object-cover rounded-sm bg-gray-50" />
          </div>
          <div className="px-4 py-2 text-[11px] render-text-tertiary flex items-center border-t render-border-subtle">
            <i className="fa-solid fa-link mr-1"></i> 小程序
          </div>
        </div>
      );
    }
    if (msg.type === 'image') {
      return (
        <div className="w-[140px] overflow-hidden relative" onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(msg.content); }}>
          <div className="w-[140px] h-[140px] overflow-hidden rounded-md relative">
            <img src={msg.content} loading="lazy" decoding="async" className="w-full h-full object-cover cursor-zoom-in chat-message-image" />
          </div>
        </div>
      );
    }
    if (msg.type === 'voice') {
      return (
        <VoiceBubble
          content={msg.content}
          estimatedVoiceSec={estimatedVoiceSec}
          isVoicePlaying={isVoicePlaying}
          isMe={isMe}
          onPlay={playVoiceBubble}
        />
      );
    }
    if (msg.type === 'text') {
      const textWrapClass = settings.allowBubbleLineBreak
        ? 'whitespace-pre-wrap break-all [overflow-wrap:anywhere]'
        : 'whitespace-normal break-all [overflow-wrap:anywhere]';
      if (isHtmlMessage) {
        return (
          <div className="chat-html-embed" style={htmlPreviewHeightStyle}>
            <iframe
              className="chat-html-frame"
              title={`html-preview-${msg.id}`}
              srcDoc={htmlPreviewSrcDoc}
              loading="lazy"
              onLoad={handleHtmlFrameLoad}
              style={htmlPreviewHeightStyle}
              sandbox={allowHtmlScripts ? 'allow-same-origin allow-scripts' : 'allow-same-origin'}
              referrerPolicy="no-referrer"
            />
          </div>
        );
      }
      if (translatedTextZhCN) {
        return (
          <div className="flex flex-col gap-2">
            <div className={textWrapClass}>{renderTextWithEmoji(textWithoutEmoji)}</div>
            <div className={`border-t border-dashed render-border-subtle pt-2 text-[13px] opacity-90 ${textWrapClass}`}>
              {renderTextWithEmoji(translatedTextZhCN)}
            </div>
          </div>
        );
      }
      return <div className={textWrapClass}>{renderTextWithEmoji(textWithoutEmoji)}</div>;
    }
    return msg.content;
  };

  return (
    <div className="flex flex-col" style={{ marginBottom: 'var(--app-message-spacing)' }}>
      {shouldShowTimestamp && !showTimeInBubble && !isKakaoSkin && !isY2KSkin && !isIMessageSkin && !isRetroSkin && <div className="flex justify-center mb-2"><span className="text-[11px] render-text-tertiary render-timestamp">{formatMessageTime(msg.timestamp)}</span></div>}
      <div
        className={`relative flex ${isY2KSkin ? 'flex-row' : (isMe ? 'flex-row-reverse' : 'flex-row')} items-start flex-nowrap ${isMultiSelecting ? 'pl-8' : ''}`}
        onClick={() => isMultiSelecting && onToggleSelect(msg.id, isSelected)}
      >
        {isMultiSelecting && (
          <div
            className={`absolute left-0 top-2.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${isSelected ? '' : 'border-gray-300 dark:border-gray-700'}`}
            style={isSelected ? { backgroundColor: 'var(--app-accent-color)', borderColor: 'var(--app-accent-color)' } : {}}
          >
            {isSelected && <i className="fa-solid fa-check text-white text-[10px]"></i>}
          </div>
        )}
        {shouldShowAvatar && (
          <img
            src={isMe ? me.avatar : incomingAvatarSrc}
            className="chat-avatar w-10 h-10 object-cover cursor-pointer bg-white dark:bg-[#222] shadow-sm flex-shrink-0 app-avatar-radius"
            style={{ minWidth: '2.5rem', minHeight: '2.5rem', flexShrink: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              onAvatarTap(isMe ? 'me' : (messageContact?.id || contact.id));
            }}
          />
        )}
        {!shouldShowAvatar && reserveAvatarSpace && (
          <div
            className="chat-avatar w-10 h-10 flex-shrink-0"
            style={{ minWidth: '2.5rem', minHeight: '2.5rem', flexShrink: 0 }}
            aria-hidden="true"
          />
        )}
        <div
          className={`relative ${(isY2KSkin || isAvatarHidden) ? 'ml-0' : (isMe ? 'mr-3' : 'ml-3')} flex flex-col ${isY2KSkin ? 'items-start' : (isMe ? 'items-end' : 'items-start')}`}
          style={{
            maxWidth: isHtmlMessage ? 'calc(100vw - 72px)' : bubbleMaxWidth,
            width: isHtmlMessage ? 'calc(100vw - 72px)' : undefined,
            minWidth: 0,
            paddingBottom: (!isY2KSkin && bottomMetaPadding > 0) ? `${bottomMetaPadding}px` : undefined
          }}
        >
          {!isY2KSkin && !isQQSkin && !isMe && contact.isGroup && !hideSenderName && contact.chatMode !== 'story' && (
            <div className="chat-sender-name text-[12px] text-gray-500 dark:text-gray-300 mb-1 px-1">
              {resolveSenderName ? resolveSenderName(msg.senderId) : (messageContact?.remark?.trim() || messageContact?.name || contact.remark?.trim() || contact.name)}
            </div>
          )}
          {isIMessageSkin && !isMe && contact.isGroup && !hideSenderName && contact.chatMode !== 'story' && (
            <div className="chat-sender-name text-[11px] text-gray-500 dark:text-gray-300 mb-1 px-1">
              {resolveSenderName ? resolveSenderName(msg.senderId) : (messageContact?.remark?.trim() || messageContact?.name || contact.remark?.trim() || contact.name)}
            </div>
          )}
          {isY2KSkin && msg.type === 'text' && (
            <div className="render-y2k-qq-meta mb-0.5">
              {!hideSenderName && (
                <span className={isMe ? 'render-y2k-qq-name-me' : 'render-y2k-qq-name-other'}>
                  {isNpcMessage
                    ? npcDisplayName
                    : (isMe
                      ? (me.name || '我')
                      : (resolveSenderName
                        ? resolveSenderName(msg.senderId)
                        : (messageContact?.remark?.trim() || messageContact?.name || contact.remark?.trim() || contact.name)))}
                </span>
              )}
              <span className="render-y2k-qq-time"> {formatMessageTime(msg.timestamp)}</span>
            </div>
          )}
          {emojiOnly && (
            <div className={emojiMessageLayout.containerClass} onClick={(e) => onMenuClick(msg.id, e)}>
              <img src={emojiOnly.url} alt={emojiOnly.desc} loading="lazy" decoding="async" className={emojiMessageLayout.imageClass} />
            </div>
          )}
          {shouldRenderMessageBubble && (
            <div
              className={`${isSpecial ? '' : (isY2KSkin && msg.type === 'text' ? 'inline-block break-words relative z-10 render-y2k-plain-text' : (isHtmlMessage ? 'block w-full break-words relative z-10' : 'inline-block p-2.5 px-3 shadow-sm break-words relative z-10'))} ${isMe && !isSpecial ? 'render-text-primary' : !isSpecial ? 'render-text-primary' : ''} ${useStandardBubbleShell ? (isMe ? 'message-bubble-me' : 'message-bubble-other') : ''} ${hideBubbleTail ? 'message-bubble-no-tail' : ''} relative`}
              style={useStandardBubbleShell ? getBubbleStyle(isMe, msg.type) : undefined}
              onClick={(e) => {
                if (isHtmlMessage) {
                  e.stopPropagation();
                  return;
                }
                if (isHtmlInteractiveTarget(e.target)) return;
                if (!isMultiSelecting && (msg.type === 'redpacket' || msg.type === 'transfer') && onPaymentClick) {
                  e.stopPropagation();
                  onPaymentClick(msg.id, msg.type);
                  return;
                }
                onMenuClick(msg.id, e, 'content');
              }}
              onContextMenu={(e) => {
                if (isHtmlMessage) {
                  e.stopPropagation();
                  return;
                }
                if (isHtmlInteractiveTarget(e.target)) return;
                onMenuClick(msg.id, e, 'content');
              }}
            >
          {isNpcMessage && !isY2KSkin && (
            <div
              className="absolute left-2 -top-2.5 px-2 py-0.5 text-[10px] leading-none rounded-md z-20 pointer-events-none"
              style={{
                color: '#fff',
                backgroundColor: 'rgba(31,41,55,0.9)',
                border: '1px solid rgba(255,255,255,0.18)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.18)'
              }}
            >
              {npcDisplayName}
            </div>
          )}
              {renderBubbleContent()}

              {showTimeInBubble && shouldShowTimestamp && !isIMessageSkin && !isKakaoSkin && !isY2KSkin && !isRetroSkin && !isTelegramSkin && (
                <div className={`chat-bubble-time chat-bubble-time--${rootSkinId} mt-1 text-[10px] opacity-70 ${isMe ? 'text-right' : 'text-left'}`}>
                  {formatMessageTime(msg.timestamp)}
                </div>
              )}
              {isKakaoSkin && shouldShowTimestamp && !showMeta && !showKakaoReadBelowTime && (
                <div
                  className="chat-meta-kakao-time absolute text-[10px] leading-none whitespace-nowrap"
                  style={isMe ? { right: 'calc(100% + 8px)', bottom: 0 } : { left: 'calc(100% + 8px)', bottom: 0 }}
                >
                  {formatMessageTime(msg.timestamp)}
                </div>
              )}
              {showKakaoReadBelowTime && (
                <div
                  className="chat-meta-kakao-stack absolute text-[10px] leading-none whitespace-nowrap"
                  style={isMe ? { right: 'calc(100% + 8px)', bottom: 0 } : { left: 'calc(100% + 8px)', bottom: 0 }}
                >
                  <div className="chat-meta-kakao-time">{formatMessageTime(msg.timestamp)}</div>
                  <div className="chat-meta-kakao-read">{readBadgeText}</div>
                </div>
              )}
              {showOutsideReadBadge && !showKakaoReadBelowTime && (
                isKakaoSkin ? (
                  <div
                    className="chat-meta-kakao-read absolute text-[10px] leading-none whitespace-nowrap"
                    style={isMe ? { right: 'calc(100% + 8px)', bottom: 0 } : { left: 'calc(100% + 8px)', bottom: 0 }}
                  >
                    {readBadgeText}
                  </div>
                ) : (
                <div
                  className={`chat-read-status-badge chat-read-status-badge--${rootSkinId} absolute -bottom-4 ${isMe ? 'right-0' : 'left-0'} px-1.5 py-[1px] rounded-full text-[10px] leading-none`}
                  style={{
                    color: 'var(--text-tertiary)',
                    backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 88%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--border-color) 60%, transparent)'
                  }}
                >
                  {readBadgeText}
                </div>
                )
              )}
              {showBottomMetaRow && (
                <div className={`chat-meta-row-imessage absolute -bottom-4 text-[10px] leading-none ${isMe ? 'right-0 justify-end' : 'left-0 justify-start'}`}>
                  {shouldShowTimestamp && <span className="chat-meta-row-imessage-time">{formatMessageTime(msg.timestamp)}</span>}
                  {showReadStatus && isMe && <span className="chat-meta-row-imessage-read">{readBadgeText}</span>}
                </div>
              )}
              {!showStoryOpsOutsideBubble && (
                <StoryActions
                  msgId={msg.id}
                  showAdvance={showStoryAdvanceOp}
                  showInsight={showStoryInsightOp}
                  onStoryAdvance={onStoryAdvance}
                  onStoryInsight={onStoryInsight}
                />
              )}
            </div>
          )}
          {!emojiOnly && msg.type === 'text' && detachedEmojiItems.length > 0 && (
            <div className={`mt-2 space-y-2 ${isMe ? 'self-end' : 'self-start'}`}>
              {detachedEmojiItems.map(item => (
                <div
                  key={item.key}
                  className={emojiMessageLayout.containerClass}
                  onClick={(e) => onMenuClick(msg.id, e)}
                >
                  <img
                    src={item.url}
                    alt={item.desc}
                    loading="lazy"
                    decoding="async"
                    className={emojiMessageLayout.imageClass}
                  />
                </div>
              ))}
            </div>
          )}
          {msg.quotedMsg && (
            <div
              className={`mt-2 text-[12px] ${hasChatBg ? '' : 'text-gray-500 dark:text-gray-300'} ${isMe ? 'self-end text-right' : 'self-start text-left'}`}
              style={hasChatBg ? { color: 'rgba(255,255,255,0.92)', textShadow: '0 1px 2px rgba(0,0,0,0.45)' } : undefined}
            >
              <div
                className={`inline-flex max-w-[240px] px-2 py-1 rounded-md ${hasChatBg ? '' : 'bg-black/5 dark:bg-white/10'}`}
                style={hasChatBg ? {
                  backgroundColor: 'rgba(0,0,0,0.28)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)'
                } : undefined}
              >
                <span className="truncate">{resolveSenderName ? resolveSenderName(msg.quotedMsg.senderId) : (msg.quotedMsg.senderId === 'me' ? (me.name || '我') : (contact.remark?.trim() || contact.name))}：{getQuotePreviewText(msg.quotedMsg)}</span>
              </div>
            </div>
          )}
          {showStoryOpsOutsideBubble && (
            <div className="mt-1 self-end">
              <StoryActions
                msgId={msg.id}
                showAdvance={showStoryAdvanceOp}
                showInsight={showStoryInsightOp}
                onStoryAdvance={onStoryAdvance}
                onStoryInsight={onStoryInsight}
              />
            </div>
          )}
        </div>
      </div>
      {shouldRenderInnerActionNotice && shouldShowMetaNoticeInList && (showMeta || hasAnyMetaNotice) && (
        <div className="w-full flex flex-col items-center mt-2 gap-1">
          {innerNoticeText && renderNotice(innerNoticeText, settings.innerNoticeTextColor, 'innerVoice')}
          {actionNoticeText && renderNotice(actionNoticeText, settings.actionNoticeTextColor, 'actionDesc')}
          {narrationNoticeText && renderNotice(narrationNoticeText, settings.narrationNoticeTextColor, 'narrationDesc')}
        </div>
      )}
      {previewImageUrl && (
        <div className="fixed inset-0 z-[560] bg-black/90 flex items-center justify-center" onClick={() => setPreviewImageUrl(null)}>
          <img
            src={previewImageUrl}
            className="max-w-[96vw] max-h-[96vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white text-xl w-9 h-9 rounded-full bg-black/40"
            onClick={() => setPreviewImageUrl(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatMessageItem;
