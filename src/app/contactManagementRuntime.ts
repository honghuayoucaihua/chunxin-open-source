import type { Dispatch, SetStateAction } from 'react';
import type { Contact, FriendRequest, Message, SubView } from '../types';
import type { ContactFormData } from '../utils/UtilsSubPages';
import { runAcceptFriendRequest, runCreateFriendContact, runCreateGroupConfirm, runFriendRequestIncoming, runOpenGroupChat, runScanRequestCreated, runShakeCreateContact } from './contactActionFlow';
import { buildIncomingFriendRequest, shouldInsertAcceptedContact, buildAcceptedFriendMessages } from './friendFlowUtils';
import { buildGroupContact, buildGroupWelcomeMessage } from './groupFlowUtils';
import { buildOpeningLineMessage, patchContactByLastMessage } from './contactViewUtils';
import { loadContactCardRuntime } from './contactCardRuntimeLoader';
import { generateContactFormPatch } from './contactFormAiRuntimeLoader';
import { captureRuntimeResetEpoch, isRuntimeResetEpochStale } from '../services/runtimeResetGuard.ts';
import type { AISettings, UserProfile } from '../types';

export type ContactManagementRuntimeOptions = {
  setFriendRequests: Dispatch<SetStateAction<FriendRequest[]>>;
  pushSubView: (next: SubView) => void;
  showToast: (message: string, duration?: number) => void;
  user: UserProfile;
  setSelectedContactId: Dispatch<SetStateAction<string | null>>;
  setContacts: Dispatch<SetStateAction<Contact[]>>;
  setMessages: Dispatch<SetStateAction<Record<string, Message[]>>>;
  contacts: Contact[];
  setAddFriendDraft: Dispatch<SetStateAction<Partial<ContactFormData>>>;
  setAddFriendGreetingDraft: Dispatch<SetStateAction<string>>;
  defaultAddFriendGreeting: string;
  goBackSubView: () => void;
  aiSettings: AISettings;
  runtimeUserPromptBase: string;
  getChatReply: (
    messages: Array<{ role: 'user' | 'model'; text: string }>,
    systemInstruction: string,
    settings: AISettings,
    runtimeUserPrompt?: string
  ) => Promise<string>;
  setContactCardPreview: Dispatch<SetStateAction<Contact | null>>;
  setContactCardImage: Dispatch<SetStateAction<string>>;
  friendRequests: FriendRequest[];
};

export const handleScanRequestCreatedRuntime = (options: ContactManagementRuntimeOptions, request: FriendRequest) => {
  runScanRequestCreated({ setFriendRequests: options.setFriendRequests, pushSubView: options.pushSubView, showToast: options.showToast }, request);
};

export const handleShakeCreateContactRuntime = (options: ContactManagementRuntimeOptions, contact: Contact) => {
  runShakeCreateContact({
    setContacts: options.setContacts,
    setSelectedContactId: options.setSelectedContactId,
    pushSubView: options.pushSubView,
    showToast: options.showToast
  }, contact);
};

export const handleOpenGroupChatRuntime = (options: ContactManagementRuntimeOptions, groupId: string) => {
  runOpenGroupChat({ setSelectedContactId: options.setSelectedContactId, setContacts: options.setContacts, pushSubView: options.pushSubView }, groupId);
};

export const handleCreateGroupConfirmRuntime = (options: ContactManagementRuntimeOptions, ids: string[], groupName: string) => {
  runCreateGroupConfirm({
    user: options.user,
    buildGroupContact,
    buildGroupWelcomeMessage,
    setContacts: options.setContacts,
    setMessages: options.setMessages,
    setSelectedContactId: options.setSelectedContactId,
    pushSubView: options.pushSubView
  }, ids, groupName);
};

export const handleAIGenerateContactFormRuntime = async (
  options: ContactManagementRuntimeOptions,
  description: string
): Promise<Partial<ContactFormData>> => {
  const runtimeResetEpoch = captureRuntimeResetEpoch();
  const patch = await generateContactFormPatch(
    description,
    options.aiSettings,
    options.runtimeUserPromptBase,
    options.user,
    options.getChatReply
  );
  if (isRuntimeResetEpochStale(runtimeResetEpoch)) return {};
  if (!patch.name) {
    options.showToast('AI 未生成有效姓名，请补充描述后重试');
  }
  return patch;
};

export const handleCreateFriendContactRuntime = (options: ContactManagementRuntimeOptions, contact: Contact) => {
  runCreateFriendContact({
    contacts: options.contacts,
    setContacts: options.setContacts,
    setMessages: options.setMessages,
    buildOpeningLineMessage,
    patchContactByLastMessage,
    setAddFriendDraft: options.setAddFriendDraft,
    setAddFriendGreetingDraft: options.setAddFriendGreetingDraft,
    DEFAULT_ADD_FRIEND_GREETING: options.defaultAddFriendGreeting,
    goBackSubView: options.goBackSubView
  }, contact);
};

export const handleFriendRequestIncomingRuntime = (
  options: ContactManagementRuntimeOptions,
  form: ContactFormData,
  greeting: string,
  openingLine: string
) => {
  runFriendRequestIncoming({
    contacts: options.contacts,
    buildIncomingFriendRequest,
    setFriendRequests: options.setFriendRequests,
    setAddFriendDraft: options.setAddFriendDraft,
    setAddFriendGreetingDraft: options.setAddFriendGreetingDraft,
    DEFAULT_ADD_FRIEND_GREETING: options.defaultAddFriendGreeting,
    showToast: options.showToast,
    goBackSubView: options.goBackSubView
  }, form, greeting, openingLine);
};

export const handleExportContactQrRuntime = async (options: ContactManagementRuntimeOptions, contact: Contact) => {
  const runtime = await loadContactCardRuntime();
  const payload = runtime.buildContactCardPayload(contact);
  if (!payload) {
    options.showToast('联系人名片生成失败');
    return;
  }
  const cardImage = await runtime.buildContactCardImage(contact, payload);
  options.setContactCardPreview(contact);
  options.setContactCardImage(cardImage);
  options.pushSubView('contactCard');
};

export const handleAcceptFriendRequestRuntime = (options: ContactManagementRuntimeOptions, requestId: string) => {
  runAcceptFriendRequest({
    friendRequests: options.friendRequests,
    contacts: options.contacts,
    shouldInsertAcceptedContact,
    setContacts: options.setContacts,
    setFriendRequests: options.setFriendRequests,
    buildAcceptedFriendMessages,
    setMessages: options.setMessages,
    patchContactByLastMessage,
    showToast: options.showToast
  }, requestId);
};
