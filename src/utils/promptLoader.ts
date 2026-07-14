import type { Contact, Mask, UserProfile } from '../types';
import type { ChatPromptOptions } from './promptBuilders';

type UserInfoSectionInput = {
  contact: Contact;
  masks: Mask[];
  user: UserProfile;
};

export const loadPromptBuilders = () => import('./promptBuilders');

export const loadPersonaPromptSections = () => import('./prompt/personaPromptSections');

export const buildChatSystemPromptLazy = async (options: ChatPromptOptions) => {
  const { buildChatSystemPrompt } = await loadPromptBuilders();
  return buildChatSystemPrompt(options);
};

export const buildRoleProfileSectionLazy = async (contact: Contact) => {
  const { buildRoleProfileSection } = await loadPersonaPromptSections();
  return buildRoleProfileSection(contact);
};

export const buildUserInfoSectionLazy = async (input: UserInfoSectionInput) => {
  const { buildUserInfoSection } = await loadPersonaPromptSections();
  return buildUserInfoSection(input);
};
