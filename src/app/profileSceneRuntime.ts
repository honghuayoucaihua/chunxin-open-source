import type { Dispatch, SetStateAction } from 'react';
import type { AppearanceSettings, Contact, ContactMemories, Message, SubView, UserProfile, WorldBook, Mask } from '../types';
import type { AnonymousChatHistoryItem, AnonymousChatPartner } from './anonymousChatUtils';
import { buildAnonymousHistoryRestorePayload } from './anonymousFlowUtils';
import { buildOpeningLineMessage, patchContactByLastMessage } from './contactViewUtils';
import {
  runContactPersonaUpdate,
  runMomentsAvatarClick,
  runNavigateEditProfileField,
  runOpenProfileChat,
  runOpenProfileMoments,
  runSearchSelectContact,
  runSetContactChatBg,
  runSetProfileRemark
} from './profileActionFlow';

export type ProfileSceneRuntimeOptions = {
  selectedContactId: string | null;
  setContacts: Dispatch<SetStateAction<Contact[]>>;
  setSettings: Dispatch<SetStateAction<AppearanceSettings>>;
  setEditingWorldBook: Dispatch<SetStateAction<string | null>>;
  pushSubView: (next: SubView) => void;
  setWorldBooks: Dispatch<SetStateAction<WorldBook[]>>;
  goBackSubView: () => void;
  setEditingMaskId: Dispatch<SetStateAction<string | null>>;
  setMasks: Dispatch<SetStateAction<Mask[]>>;
  setSelectedContactId: Dispatch<SetStateAction<string | null>>;
  setProfileId: Dispatch<SetStateAction<string | null>>;
  setMessages: Dispatch<SetStateAction<Record<string, Message[]>>>;
  setContactMemories: Dispatch<SetStateAction<ContactMemories>>;
  setEditingProfileField: Dispatch<SetStateAction<{ key: keyof UserProfile; label: string; value: string } | null>>;
  setAnonymousViewingHistoryId: Dispatch<SetStateAction<string | null>>;
  setAnonymousPartner: Dispatch<SetStateAction<AnonymousChatPartner | null>>;
  setAnonymousSessionStartedAt: Dispatch<SetStateAction<number | null>>;
  setAnonymousSessionActive: Dispatch<SetStateAction<boolean>>;
  setAnonymousPeerLeft: Dispatch<SetStateAction<boolean>>;
  setAnonymousInputValue: Dispatch<SetStateAction<string>>;
  anonymousChatId: string;
};

export const handleSetContactChatBgRuntime = (options: ProfileSceneRuntimeOptions, chatBg: string) => {
  runSetContactChatBg({ selectedContactId: options.selectedContactId, setContacts: options.setContacts, setSettings: options.setSettings }, chatBg);
};

export const handleEditWorldBookRuntime = (options: ProfileSceneRuntimeOptions, id: string) => {
  options.setEditingWorldBook(id);
  options.pushSubView('worldBookEdit');
};

export const handleSaveWorldBookRuntime = (options: ProfileSceneRuntimeOptions, nextBook: WorldBook) => {
  options.setWorldBooks(prev => prev.map(book => {
    if (book.id !== nextBook.id) return book;
    if (book.encryptedReadOnly) return book;
    return nextBook;
  }));
  options.goBackSubView();
};

export const handleEditMaskRuntime = (options: ProfileSceneRuntimeOptions, id: string) => {
  options.setEditingMaskId(id);
  options.pushSubView('maskEdit');
};

export const handleSaveMaskRuntime = (options: ProfileSceneRuntimeOptions, nextMask: Mask) => {
  options.setMasks(prev => prev.map(mask => (mask.id === nextMask.id ? nextMask : mask)));
  options.goBackSubView();
};

export const handleOpenProfileChatRuntime = (options: ProfileSceneRuntimeOptions, contactId: string | null) => {
  runOpenProfileChat({ setSelectedContactId: options.setSelectedContactId, setContacts: options.setContacts, pushSubView: options.pushSubView }, contactId);
};

export const handleSetProfileRemarkRuntime = (options: ProfileSceneRuntimeOptions, contactId: string, remark: string) => {
  runSetProfileRemark(options.setContacts, contactId, remark);
};

export const handleOpenProfileMomentsRuntime = (options: ProfileSceneRuntimeOptions, nextProfileId: string) => {
  runOpenProfileMoments(options.setProfileId, options.pushSubView, nextProfileId);
};

export const handleContactPersonaUpdateRuntime = (options: ProfileSceneRuntimeOptions, updated: Contact, current: Contact) => {
  runContactPersonaUpdate({
    setContacts: options.setContacts,
    buildOpeningLineMessage,
    setMessages: options.setMessages,
    patchContactByLastMessage,
    goBackSubView: options.goBackSubView
  }, updated, current);
};

export const handleContactMemoriesChangeRuntime = (
  options: ProfileSceneRuntimeOptions,
  contactId: string,
  memories: ContactMemories[string]
) => {
  options.setContactMemories(prev => ({ ...prev, [contactId]: memories }));
};

export const handleNavigateEditProfileFieldRuntime = (
  options: ProfileSceneRuntimeOptions,
  key: keyof UserProfile,
  label: string,
  value: string
) => {
  runNavigateEditProfileField(options.setEditingProfileField, options.pushSubView, key, label, value);
};

export const handleSearchSelectContactRuntime = (options: ProfileSceneRuntimeOptions, contactId: string) => {
  runSearchSelectContact({
    setSelectedContactId: options.setSelectedContactId,
    setContacts: options.setContacts,
    pushSubView: options.pushSubView
  }, contactId);
};

export const handleSelectAnonymousHistoryRuntime = (options: ProfileSceneRuntimeOptions, item: AnonymousChatHistoryItem) => {
  const payload = buildAnonymousHistoryRestorePayload(item, options.anonymousChatId);
  options.setAnonymousViewingHistoryId(payload.viewingHistoryId);
  options.setAnonymousPartner(payload.partner);
  options.setAnonymousSessionStartedAt(payload.startedAt);
  options.setAnonymousSessionActive(payload.sessionActive);
  options.setAnonymousPeerLeft(payload.peerLeft);
  options.setAnonymousInputValue(payload.inputValue);
  options.setMessages(prev => ({ ...prev, ...payload.messagesPatch }));
  options.goBackSubView();
};

export const handleMomentsAvatarClickRuntime = (options: ProfileSceneRuntimeOptions, id: string) => {
  runMomentsAvatarClick(options.setProfileId, options.pushSubView, id);
};
