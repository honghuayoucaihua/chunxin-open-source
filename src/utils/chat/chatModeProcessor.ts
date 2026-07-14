import type { ChatMode } from '../../types/message';
import { getChatModePolicy } from './chatModePolicy.ts';

export const applyChatMode = (text: string, mode: ChatMode, meta: { innerVoice?: string; actionDesc?: string }) => {
  const policy = getChatModePolicy({ chatMode: mode });
  return {
    content: text,
    innerVoice: policy.innerEnabled ? meta.innerVoice : undefined,
    actionDesc: policy.actionEnabled ? meta.actionDesc : undefined
  };
};
