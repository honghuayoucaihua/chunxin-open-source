import type { Contact, FriendRequest } from '../types';
import type { ContactFormData } from '../utils/UtilsSubPages';
import { loadContactManagementRuntime } from './contactManagementRuntimeLoader';
import type { ContactManagementRuntimeOptions } from './contactManagementRuntime';
import { withLoadedRuntime } from './runtimeLoaderUtils';

const contactFormGenerationPromises = new Map<string, Promise<Partial<ContactFormData>>>();

const buildContactFormGenerationKey = (description: string): string => String(description || '').replace(/\s+/g, ' ').trim();

const createResetAddFriendDraft = (options: ContactManagementRuntimeOptions) => () => {
  options.setAddFriendDraft({});
  options.setAddFriendGreetingDraft(options.defaultAddFriendGreeting);
};

const createHandleScanRequestCreated = (options: ContactManagementRuntimeOptions) => (request: FriendRequest) => {
  withLoadedRuntime(loadContactManagementRuntime, (runtime) => {
    runtime.handleScanRequestCreatedRuntime(options, request);
  });
};

const createHandleShakeCreateContact = (options: ContactManagementRuntimeOptions) => (contact: Contact) => {
  withLoadedRuntime(loadContactManagementRuntime, (runtime) => {
    runtime.handleShakeCreateContactRuntime(options, contact);
  });
};

const createHandleOpenGroupChat = (options: ContactManagementRuntimeOptions) => (groupId: string) => {
  withLoadedRuntime(loadContactManagementRuntime, (runtime) => {
    runtime.handleOpenGroupChatRuntime(options, groupId);
  });
};

const createHandleCreateGroupConfirm = (options: ContactManagementRuntimeOptions) => (ids: string[], groupName: string) => {
  withLoadedRuntime(loadContactManagementRuntime, (runtime) => {
    runtime.handleCreateGroupConfirmRuntime(options, ids, groupName);
  });
};

const createHandleAIGenerateContactForm = (options: ContactManagementRuntimeOptions) => async (
  description: string
): Promise<Partial<ContactFormData>> => {
  const key = buildContactFormGenerationKey(description);
  if (!key) return {};
  const existing = contactFormGenerationPromises.get(key);
  if (existing) return existing;
  const promise = (async () => {
    try {
      const runtime = await loadContactManagementRuntime();
      return await runtime.handleAIGenerateContactFormRuntime(options, description);
    } finally {
      contactFormGenerationPromises.delete(key);
    }
  })();
  contactFormGenerationPromises.set(key, promise);
  return promise;
};

const createHandleCreateFriendContact = (options: ContactManagementRuntimeOptions) => (contact: Contact) => {
  withLoadedRuntime(loadContactManagementRuntime, (runtime) => {
    runtime.handleCreateFriendContactRuntime(options, contact);
  });
};

const createHandleFriendRequestIncoming = (options: ContactManagementRuntimeOptions) => (
  form: ContactFormData,
  greeting: string,
  openingLine: string
) => {
  withLoadedRuntime(loadContactManagementRuntime, (runtime) => {
    runtime.handleFriendRequestIncomingRuntime(options, form, greeting, openingLine);
  });
};

const createHandleExportContactQr = (options: ContactManagementRuntimeOptions) => async (contact: Contact) => {
  const runtime = await loadContactManagementRuntime();
  return runtime.handleExportContactQrRuntime(options, contact);
};

const createHandleAcceptFriendRequest = (options: ContactManagementRuntimeOptions) => (requestId: string) => {
  withLoadedRuntime(loadContactManagementRuntime, (runtime) => {
    runtime.handleAcceptFriendRequestRuntime(options, requestId);
  });
};

export const buildContactManagementActionHandlers = (options: ContactManagementRuntimeOptions) => ({
  handleScanRequestCreated: createHandleScanRequestCreated(options),
  handleShakeCreateContact: createHandleShakeCreateContact(options),
  handleOpenGroupChat: createHandleOpenGroupChat(options),
  handleCreateGroupConfirm: createHandleCreateGroupConfirm(options),
  resetAddFriendDraft: createResetAddFriendDraft(options),
  handleAIGenerateContactForm: createHandleAIGenerateContactForm(options),
  handleCreateFriendContact: createHandleCreateFriendContact(options),
  handleFriendRequestIncoming: createHandleFriendRequestIncoming(options),
  handleExportContactQr: createHandleExportContactQr(options),
  handleAcceptFriendRequest: createHandleAcceptFriendRequest(options)
});
