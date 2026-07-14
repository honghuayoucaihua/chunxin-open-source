import type { AISettings } from '../types';

type ChatHistoryItem = {
  role: 'user' | 'model';
  text: string;
  imageUrl?: string;
};

export const getGeminiChatReply = async (
  history: ChatHistoryItem[],
  personality: string,
  settings: AISettings,
  runtimeUserPrompt?: string
): Promise<string> => {
  const { geminiService } = await import('./geminiService');
  return geminiService.getChatReply(history, personality, settings, runtimeUserPrompt);
};

export const loadGeminiService = async () => import('./geminiService');
