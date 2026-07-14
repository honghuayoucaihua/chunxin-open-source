import type { Dispatch, SetStateAction } from 'react';
import type { AISettings, Contact, UserProfile } from '../types';
import {
  buildManualMoment,
  buildMomentInteractionEvents,
  createContactPublishedMoment,
  createUserPublishedMoment,
  normalizeAiComments,
  normalizeAiLikeNames,
  pickRandomMomentAuthor,
  resolveMomentResponderContact,
  selectVisibleAudience
} from './socialFlowUtils';
import {
  runManualGenerateMoment,
  runMomentCommentCreate,
  runPublishMoment,
  runRemindWhoPost
} from './momentActionFlow';

export type MomentActionRuntimeOptions = {
  contacts: Contact[];
  aiSettings: AISettings;
  setMoments: Dispatch<SetStateAction<any[]>>;
  getChatReply: (
    messages: Array<{ role: 'user' | 'model'; text: string }>,
    systemInstruction: string,
    settings: AISettings,
    runtimeUserPrompt?: string
  ) => Promise<string>;
  buildRuntimePromptWithMemory: (contact: Contact, limit?: number) => string;
  moments: any[];
  user: UserProfile;
  goBackSubView: () => void;
};

export const runManualGenerateMomentRuntime = async (options: MomentActionRuntimeOptions): Promise<void> => {
  await runManualGenerateMoment({
    contacts: options.contacts,
    user: options.user,
    pickRandomMomentAuthor,
    buildRuntimePromptWithMemory: options.buildRuntimePromptWithMemory,
    getChatReply: options.getChatReply,
    aiSettings: options.aiSettings,
    normalizeAiLikeNames,
    normalizeAiComments,
    buildManualMoment,
    setMoments: options.setMoments
  });
};

export const runMomentCommentCreateRuntime = (
  options: MomentActionRuntimeOptions,
  momentId: string,
  commentText: string,
  replyTo?: { user?: string }
) => {
  runMomentCommentCreate({
    moments: options.moments,
    contacts: options.contacts,
    user: options.user,
    resolveMomentResponderContact,
    buildRuntimePromptWithMemory: options.buildRuntimePromptWithMemory,
    getChatReply: options.getChatReply,
    aiSettings: options.aiSettings,
    setMoments: options.setMoments
  }, momentId, commentText, replyTo);
};

export const runPublishMomentRuntime = (
  options: MomentActionRuntimeOptions,
  text: string,
  imgs: string[],
  loc: string,
  visibility: string,
  imageDescriptions: string[] = [],
  identityContactId?: string
) => {
  runPublishMoment({
    user: options.user,
    moments: options.moments,
    contacts: options.contacts,
    aiSettings: options.aiSettings,
    createUserPublishedMoment,
    createContactPublishedMoment,
    setMoments: options.setMoments,
    selectVisibleAudience,
    buildRuntimePromptWithMemory: options.buildRuntimePromptWithMemory,
    getChatReply: options.getChatReply,
    normalizeAiLikeNames,
    normalizeAiComments,
    buildMomentInteractionEvents,
    goBackSubView: options.goBackSubView
  }, text, imgs, loc, visibility, imageDescriptions, identityContactId);
};

export const runRemindWhoPostRuntime = async (
  options: MomentActionRuntimeOptions,
  contactIds: string[]
): Promise<void> => {
  await runRemindWhoPost({
    contacts: options.contacts,
    user: options.user,
    buildRuntimePromptWithMemory: options.buildRuntimePromptWithMemory,
    getChatReply: options.getChatReply,
    aiSettings: options.aiSettings,
    normalizeAiLikeNames,
    normalizeAiComments,
    buildManualMoment,
    setMoments: options.setMoments
  }, contactIds);
};
