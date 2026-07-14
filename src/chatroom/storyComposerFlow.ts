import { useCallback, useEffect, useState } from 'react';
import type { Message } from '../types';
import { parseAIReply } from '../utils/chatHelpers';

type StoryComposerParams = {
  isStoryMode: boolean;
  inputValue: string;
  isTyping?: boolean;
  messages: Message[];
  onGenerateReplies?: (payload: { inputKind?: 'chat' | 'story' }) => Promise<string[]>;
  onSendWithOptions?: (payload: { text?: string; append?: boolean; source?: 'manual' | 'generated' | 'storyAdvance' | 'storyInsight'; inputKind?: 'chat' | 'story'; messageType?: 'text' | 'image'; imageUrl?: string; imageCaption?: string }) => Promise<void> | void;
};

const resolveStoryMeta = (item?: Message | null): { inner: string; status: string } => {
  if (!item) return { inner: '', status: '' };
  const directInner = String(item.innerVoice || '').trim();
  const directStatus = String(item.actionDesc || '').trim();
  if (directInner || directStatus) return { inner: directInner, status: directStatus };
  const parsed = parseAIReply(String(item.content || '').trim(), true, true, { requireStructured: true, allowStoryTags: true });
  if (String(parsed.innerVoice || '').trim() || String(parsed.actionDesc || '').trim()) {
    return {
      inner: String(parsed.innerVoice || '').trim(),
      status: String(parsed.actionDesc || '').trim()
    };
  }
  return { inner: '', status: '' };
};

const hasStoryMeta = (item?: Message | null): boolean => {
  const meta = resolveStoryMeta(item);
  return !!(meta.inner || meta.status);
};

const pickStoryInsightTarget = (messages: Message[], msgId?: string): Message | undefined => {
  const reversedList = [...(messages || [])].reverse();
  const latestWithMeta = reversedList.find((item) => item.senderId !== 'me' && item.type === 'text' && hasStoryMeta(item));
  if (!msgId) return latestWithMeta;
  const clickedIncoming = messages.find((item) => item.id === msgId && item.senderId !== 'me' && item.type === 'text');
  return hasStoryMeta(clickedIncoming) ? clickedIncoming : latestWithMeta;
};

export const useStoryComposerFlow = (params: StoryComposerParams) => {
  const [storyInputKind, setStoryInputKind] = useState<'chat' | 'story'>('chat');
  const [generatedReplies, setGeneratedReplies] = useState<string[]>([]);
  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false);
  const [pendingAutoGenerate, setPendingAutoGenerate] = useState(false);
  const [storyInsightModal, setStoryInsightModal] = useState<{ open: boolean; inner: string; status: string }>({ open: false, inner: '', status: '' });

  const handleGenerateReplies = useCallback(async (force = false) => {
    if (!params.isStoryMode || !params.onGenerateReplies || isGeneratingReplies) return;
    if (!force && params.inputValue.trim()) return;
    setIsGeneratingReplies(true);
    try {
      const list = await params.onGenerateReplies({ inputKind: storyInputKind });
      const next = Array.isArray(list)
        ? list.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 3)
        : [];
      setGeneratedReplies(next);
    } finally {
      setIsGeneratingReplies(false);
    }
  }, [params, isGeneratingReplies, storyInputKind]);

  useEffect(() => {
    if (!params.isStoryMode) return;
    if (pendingAutoGenerate && !params.isTyping) {
      setPendingAutoGenerate(false);
      void handleGenerateReplies(true);
    }
  }, [params.isStoryMode, pendingAutoGenerate, params.isTyping, handleGenerateReplies]);

  const handleStoryAdvance = useCallback(async () => {
    if (!params.onSendWithOptions) return;
    setGeneratedReplies([]);
    await params.onSendWithOptions({
      text: storyInputKind === 'story' ? '请继续推进剧情' : '请继续回应并自然推进当前话题',
      append: false,
      source: 'storyAdvance',
      inputKind: storyInputKind
    });
  }, [params.onSendWithOptions, storyInputKind]);

  const handleStoryInsight = useCallback((msgId?: string) => {
    const targetMessage = pickStoryInsightTarget(params.messages, msgId);
    const meta = resolveStoryMeta(targetMessage);
    setStoryInsightModal({
      open: true,
      inner: meta.inner,
      status: meta.status
    });
  }, [params.messages]);

  const handleUseGeneratedReply = useCallback((text: string) => {
    void params.onSendWithOptions?.({ text, append: true, source: 'generated', inputKind: storyInputKind });
    setPendingAutoGenerate(true);
  }, [params.onSendWithOptions, storyInputKind]);

  return {
    storyInputKind,
    setStoryInputKind,
    generatedReplies,
    setGeneratedReplies,
    isGeneratingReplies,
    storyInsightModal,
    setStoryInsightModal,
    handleGenerateReplies,
    handleStoryAdvance,
    handleStoryInsight,
    handleUseGeneratedReply
  };
};
