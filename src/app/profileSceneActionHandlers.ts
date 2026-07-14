import type { AppearanceSettings, Contact, ContactMemories, Message, SubView, UserProfile, WorldBook, Mask } from '../types';
import type { AnonymousChatHistoryItem, AnonymousChatPartner } from './anonymousChatUtils';
import { loadProfileSceneRuntime } from './profileSceneRuntimeLoader';
import type { ProfileSceneRuntimeOptions } from './profileSceneRuntime';
import { withLoadedRuntime } from './runtimeLoaderUtils';

const createHandleSetContactChatBg = (options: ProfileSceneRuntimeOptions) => (chatBg: string) => {
  withLoadedRuntime(loadProfileSceneRuntime, (runtime) => {
    runtime.handleSetContactChatBgRuntime(options, chatBg);
  });
};

const createHandleEditWorldBook = (options: ProfileSceneRuntimeOptions) => (id: string) => {
  withLoadedRuntime(loadProfileSceneRuntime, (runtime) => {
    runtime.handleEditWorldBookRuntime(options, id);
  });
};

const createHandleSaveWorldBook = (options: ProfileSceneRuntimeOptions) => (nextBook: WorldBook) => {
  withLoadedRuntime(loadProfileSceneRuntime, (runtime) => {
    runtime.handleSaveWorldBookRuntime(options, nextBook);
  });
};

const createHandleEditMask = (options: ProfileSceneRuntimeOptions) => (id: string) => {
  withLoadedRuntime(loadProfileSceneRuntime, (runtime) => {
    runtime.handleEditMaskRuntime(options, id);
  });
};

const createHandleSaveMask = (options: ProfileSceneRuntimeOptions) => (nextMask: Mask) => {
  withLoadedRuntime(loadProfileSceneRuntime, (runtime) => {
    runtime.handleSaveMaskRuntime(options, nextMask);
  });
};

const createHandleOpenProfileChat = (options: ProfileSceneRuntimeOptions) => (contactId: string | null) => {
  withLoadedRuntime(loadProfileSceneRuntime, (runtime) => {
    runtime.handleOpenProfileChatRuntime(options, contactId);
  });
};

const createHandleSetProfileRemark = (options: ProfileSceneRuntimeOptions) => (contactId: string, remark: string) => {
  withLoadedRuntime(loadProfileSceneRuntime, (runtime) => {
    runtime.handleSetProfileRemarkRuntime(options, contactId, remark);
  });
};

const createHandleOpenProfileMoments = (options: ProfileSceneRuntimeOptions) => (nextProfileId: string) => {
  withLoadedRuntime(loadProfileSceneRuntime, (runtime) => {
    runtime.handleOpenProfileMomentsRuntime(options, nextProfileId);
  });
};

const createHandleContactPersonaUpdate = (options: ProfileSceneRuntimeOptions) => (updated: Contact, current: Contact) => {
  withLoadedRuntime(loadProfileSceneRuntime, (runtime) => {
    runtime.handleContactPersonaUpdateRuntime(options, updated, current);
  });
};

const createHandleContactMemoriesChange = (options: ProfileSceneRuntimeOptions) => (
  contactId: string,
  memories: ContactMemories[string]
) => {
  withLoadedRuntime(loadProfileSceneRuntime, (runtime) => {
    runtime.handleContactMemoriesChangeRuntime(options, contactId, memories);
  });
};

const createHandleNavigateEditProfileField = (options: ProfileSceneRuntimeOptions) => (
  key: keyof UserProfile,
  label: string,
  value: string
) => {
  withLoadedRuntime(loadProfileSceneRuntime, (runtime) => {
    runtime.handleNavigateEditProfileFieldRuntime(options, key, label, value);
  });
};

const createHandleSearchSelectContact = (options: ProfileSceneRuntimeOptions) => (contactId: string) => {
  withLoadedRuntime(loadProfileSceneRuntime, (runtime) => {
    runtime.handleSearchSelectContactRuntime(options, contactId);
  });
};

const createHandleSelectAnonymousHistory = (options: ProfileSceneRuntimeOptions) => (
  item: AnonymousChatHistoryItem
) => {
  withLoadedRuntime(loadProfileSceneRuntime, (runtime) => {
    runtime.handleSelectAnonymousHistoryRuntime(options, item);
  });
};

const createHandleMomentsAvatarClick = (options: ProfileSceneRuntimeOptions) => (id: string) => {
  withLoadedRuntime(loadProfileSceneRuntime, (runtime) => {
    runtime.handleMomentsAvatarClickRuntime(options, id);
  });
};

export const buildProfileSceneActionHandlers = (options: ProfileSceneRuntimeOptions) => ({
  handleSetContactChatBg: createHandleSetContactChatBg(options),
  handleEditWorldBook: createHandleEditWorldBook(options),
  handleSaveWorldBook: createHandleSaveWorldBook(options),
  handleEditMask: createHandleEditMask(options),
  handleSaveMask: createHandleSaveMask(options),
  handleOpenProfileChat: createHandleOpenProfileChat(options),
  handleSetProfileRemark: createHandleSetProfileRemark(options),
  handleOpenProfileMoments: createHandleOpenProfileMoments(options),
  handleContactPersonaUpdate: createHandleContactPersonaUpdate(options),
  handleContactMemoriesChange: createHandleContactMemoriesChange(options),
  handleNavigateEditProfileField: createHandleNavigateEditProfileField(options),
  handleSearchSelectContact: createHandleSearchSelectContact(options),
  handleSelectAnonymousHistory: createHandleSelectAnonymousHistory(options),
  handleMomentsAvatarClick: createHandleMomentsAvatarClick(options)
});
