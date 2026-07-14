import type { Dispatch, SetStateAction } from 'react';
import type { AISettings, Contact, ContactMemories, GroupRelation, Mask, Message, SubView, UserProfile } from '../types';
import { refreshConversationPreviewFromMessages } from './chatMessageFlowUtils';
import { sanitizeGroupRelations } from './chatDetailsFlowUtils';
import { loadChatRoomActionFlow } from './chatRoomActionFlowLoader';

type BuildChatSceneActionHandlersOptions = {
  currentChat: Contact | undefined;
  setContacts: Dispatch<SetStateAction<Contact[]>>;
  setProfileId: Dispatch<SetStateAction<string | null>>;
  pushSubView: (next: SubView) => void;
  setProfileSnapshot: Dispatch<SetStateAction<Contact | null>>;
  openConfirm: (message: string, onConfirm: () => void, title?: string) => void;
  setMessages: Dispatch<SetStateAction<Record<string, Message[]>>>;
  messages: Record<string, Message[]>;
  showToast: (message: string, duration?: number) => void;
  selectedContactId: string | null;
  resolveContextLimit: (contact?: Contact | null) => number;
  user: UserProfile;
  masks: Mask[];
  getContactMemoryPrompt: (
    allMemories: ContactMemories,
    contactId: string,
    limit?: number,
    contactName?: string
  ) => string;
  contactMemories: ContactMemories;
  runtimeUserPromptBase: string;
  aiSettings: AISettings;
};

const createHandleUpdateCurrentChat = (options: BuildChatSceneActionHandlersOptions) => (patch: Partial<Contact>) => {
  if (!options.currentChat) return;
  options.setContacts(prev => prev.map(contact => (
    contact.id === options.currentChat!.id ? { ...contact, ...patch } : contact
  )));
};

const createHandleUpdateCurrentChatGroupRelations = (
  options: BuildChatSceneActionHandlersOptions,
  handleUpdateCurrentChat: (patch: Partial<Contact>) => void
) => (relations: GroupRelation[]) => {
  const cleaned = sanitizeGroupRelations(relations);
  handleUpdateCurrentChat({ groupRelations: cleaned });
};

const createHandleOpenGroupMemberProfile = (options: BuildChatSceneActionHandlersOptions) => (memberId: string) => {
  options.setProfileId(memberId);
  options.pushSubView('profile');
};

const createHandleOpenCurrentChatProfile = (options: BuildChatSceneActionHandlersOptions) => () => {
  if (!options.currentChat) return;
  options.setProfileSnapshot(options.currentChat);
  options.setProfileId(options.currentChat.id);
  options.pushSubView('profile');
};

const createClearChatConfirm = (options: BuildChatSceneActionHandlersOptions, isGroup: boolean) => {
  if (!options.currentChat) return;
  const message = isGroup ? '确定清空群聊记录？' : '确定清空聊天记录？';
  const toastMessage = isGroup ? '群聊记录已清空' : '聊天记录已清空';
  options.openConfirm(message, () => {
    options.setMessages({ ...options.messages, [options.currentChat!.id]: [] });
    refreshConversationPreviewFromMessages(options, options.currentChat!.id, []);
    options.showToast(toastMessage);
  }, '清空聊天记录');
};

const createHandleConfirmClearCurrentChatMessages = (options: BuildChatSceneActionHandlersOptions) => (isGroup: boolean) => {
  createClearChatConfirm(options, isGroup);
};

const createHandleGenerateChatReplies = (options: BuildChatSceneActionHandlersOptions) => async (
  { inputKind }: { inputKind?: 'chat' | 'story' }
) => {
  const runtime = await loadChatRoomActionFlow();
  return runtime.runGenerateChatReplies({
    inputKind,
    selectedContactId: options.selectedContactId,
    currentChat: options.currentChat,
    resolveContextLimit: options.resolveContextLimit,
    messages: options.messages,
    user: options.user,
    masks: options.masks,
    getContactMemoryPrompt: options.getContactMemoryPrompt,
    contactMemories: options.contactMemories,
    runtimeUserPromptBase: options.runtimeUserPromptBase,
    aiSettings: options.aiSettings
  });
};

export const buildChatSceneActionHandlers = (options: BuildChatSceneActionHandlersOptions) => {
  const handleUpdateCurrentChat = createHandleUpdateCurrentChat(options);
  return {
    handleUpdateCurrentChat,
    handleUpdateCurrentChatGroupRelations: createHandleUpdateCurrentChatGroupRelations(options, handleUpdateCurrentChat),
    handleOpenGroupMemberProfile: createHandleOpenGroupMemberProfile(options),
    handleOpenCurrentChatProfile: createHandleOpenCurrentChatProfile(options),
    handleConfirmClearCurrentChatMessages: createHandleConfirmClearCurrentChatMessages(options),
    handleGenerateChatReplies: createHandleGenerateChatReplies(options)
  };
};
