import type { Message } from '../../types';
import {
  type SendOverridePayload,
  extractInputText,
  getShouldAppend,
  getDescriptionInputKind,
  buildInternalRuntimePrompt,
  buildStoryInputModeRuntimePrompt,
  isInternalStoryAdvancePayload,
  isImageOverridePayload,
  extractImageCaptionText,
  checkMinimaxReadiness,
  createToVoiceCallMessage,
  createResolveQuoteSenderId,
  appendUserMessage,
  buildTextUserMessage
} from './messageValidation';
import { handleGroupChatFlow } from './groupChatFlow';
import { handleSingleChatFlow } from './singleChatFlow';
import type { SendMessageFlowParams } from './types';

export { type SendOverridePayload } from './messageValidation';

export const runSendMessageFlow = async (params: SendMessageFlowParams): Promise<void> => {
  const selectedContactId = params.selectedContactId;
  if (!selectedContactId) return;
  const overrideText = params.overrideText;
  const shouldAppend = getShouldAppend(overrideText);
  const descriptionInputKind = getDescriptionInputKind(overrideText);
  const isInternalStoryAdvance = isInternalStoryAdvancePayload(overrideText);
  const text = extractInputText(params, overrideText);
  if (!text) return;
  if (!overrideText || shouldAppend) params.setInputValue('');

  const contact = params.contacts.find((item) => item.id === selectedContactId);
  const internalRuntimePrompt = [
    buildInternalRuntimePrompt(overrideText),
    buildStoryInputModeRuntimePrompt(overrideText, contact)
  ].filter(Boolean).join('\n\n');
  const { isVoiceCallWithMiniMax } = checkMinimaxReadiness(params, contact);
  const toVoiceCallMessage = createToVoiceCallMessage(isVoiceCallWithMiniMax, contact);
  const resolveQuoteSenderId = createResolveQuoteSenderId(contact, params, selectedContactId);

  const appliedQuote = shouldAppend ? params.quotedMessage : null;
  const tempMsg: Message = isImageOverridePayload(overrideText)
    ? {
        id: Date.now().toString(),
        senderId: 'me',
        content: overrideText.imageUrl.trim(),
        imageCaption: extractImageCaptionText(overrideText),
        timestamp: Date.now(),
        type: 'image',
        quotedMsg: appliedQuote || undefined
      }
    : buildTextUserMessage({
        id: Date.now().toString(),
        senderId: 'me',
        text,
        timestamp: Date.now(),
        quotedMsg: appliedQuote || undefined,
        descriptionInputKind
      });
  if (shouldAppend) {
    appendUserMessage(params, selectedContactId, tempMsg, appliedQuote);
  }
  params.playSendSignal();
  if (!contact?.isAi) return;

  const contextLimit = params.resolveContextLimit(contact);
  const memorySummaryThreshold = params.resolveMemorySummaryThreshold(contact);
  const historySeed = isInternalStoryAdvance
    ? null
    : (shouldAppend ? tempMsg : ({ ...tempMsg, id: `tmp-${Date.now()}` } as Message));

  if (contact.isGroup) {
    await handleGroupChatFlow(
      params, contact, selectedContactId, text,
      historySeed, contextLimit, memorySummaryThreshold, internalRuntimePrompt
    );
    return;
  }

  await handleSingleChatFlow(
    params, contact, selectedContactId, text,
    historySeed, contextLimit, memorySummaryThreshold,
    shouldAppend, toVoiceCallMessage, resolveQuoteSenderId, internalRuntimePrompt
  );
};
