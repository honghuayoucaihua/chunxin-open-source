import type { AISettings, Contact, HtmlTemplate, Mask, UserProfile, WorldBook } from '../../types';
import { resolveContactForAI, resolveWorldBookForAI } from '../encryptedReadModel';
import {
  buildBehaviorSection,
  buildHtmlTemplateSection,
  buildOpeningPrompt,
  buildRoleProfileSection,
  buildUserInfoSection,
  buildWorldBookSection
} from './personaPromptSections';
import {
  buildAbilitySection,
  buildModeSection,
  buildOutputFormatSection,
  buildRichActionCreationSection
} from './personaPromptOutput';
import { buildSection, joinPromptSections } from './promptSectionUtils';
import { resolveActionDescLimit, resolveInnerVoiceLimit } from '../chat/contactReplyLimits';
import { getContactMetaCapabilities } from './modeCapabilities';
import { buildPromptRuleTreeSection } from './promptRuleTree';
import { buildContextHierarchySection } from './contextHierarchyPrompt';

type BuildPersonaPromptOptions = {
  extraSystemPrompt?: string;
  imageGenerationEnabled?: boolean;
  enableRichActionPrompt?: boolean;
  enableImagePrompt?: boolean;
  promptRuleTree?: AISettings['promptRuleTree'];
};

type BuildPersonaPromptInput = {
  contact: Contact;
  emojiList: string;
  worldBooks: WorldBook[];
  masks: Mask[];
  user: UserProfile;
  htmlTemplates?: HtmlTemplate[];
  options?: BuildPersonaPromptOptions;
};

const buildEmojiSection = (emojiList: string) => {
  const trimmed = emojiList.trim();
  if (!trimmed) return '';
  return buildSection('表情包使用', [trimmed]);
};

const buildExtraSystemSection = (extraSystemPrompt?: string) => {
  const trimmed = String(extraSystemPrompt || '').trim();
  if (!trimmed) return '';
  return buildSection('系统覆盖指令', [trimmed]);
};

const buildReplyLimitSection = (contact: Contact) => {
  const capabilities = getContactMetaCapabilities(contact);
  const lines: string[] = [];
  if (contact.replyLimit) {
    lines.push(`- text + tags.value 合计尽量不超过 ${contact.replyLimit} 字。`);
  }
  if (!capabilities.isStory && capabilities.innerEnabled) {
    lines.push(`- inner 标签的 value 尽量不超过 ${resolveInnerVoiceLimit(contact)} 字。`);
  }
  if (!capabilities.isStory && capabilities.actionEnabled) {
    lines.push(`- action 标签的 value 尽量不超过 ${resolveActionDescLimit(contact)} 字。`);
  }
  if (lines.length === 0) return '';
  return buildSection('字数要求', lines);
};

export const buildPersonaPrompt = (input: BuildPersonaPromptInput) => {
  const aiContact = resolveContactForAI(input.contact);
  const aiWorldBooks = input.worldBooks.map((book) => resolveWorldBookForAI(book));
  const contactName = aiContact.remark?.trim() || aiContact.name;
  const richActionsPromptEnabled = Boolean(aiContact.allowRichActions && input.options?.enableRichActionPrompt);
  const imagePromptEnabled = Boolean(input.options?.enableImagePrompt);
  return joinPromptSections([
    buildOpeningPrompt(aiContact, contactName),
    buildRoleProfileSection(aiContact),
    buildUserInfoSection({ contact: aiContact, masks: input.masks, user: input.user }),
    buildWorldBookSection({ contact: aiContact, worldBooks: aiWorldBooks }),
    buildHtmlTemplateSection({ contact: aiContact, htmlTemplates: input.htmlTemplates || [] }),
    buildExtraSystemSection(input.options?.extraSystemPrompt),
    buildPromptRuleTreeSection(input.options?.promptRuleTree, aiContact.chatMode),
    buildContextHierarchySection({ scene: 'single', mode: aiContact.chatMode }),
    buildBehaviorSection(aiContact),
    buildAbilitySection({
      contact: aiContact,
      imageGenerationEnabled: Boolean(input.options?.imageGenerationEnabled),
      richActionsPromptEnabled,
      imagePromptEnabled
    }),
    buildModeSection(aiContact),
    buildEmojiSection(input.emojiList),
    buildOutputFormatSection({
      contact: aiContact,
      imageGenerationEnabled: Boolean(input.options?.imageGenerationEnabled),
      richActionsPromptEnabled,
      imagePromptEnabled
    }),
    buildReplyLimitSection(aiContact),
    buildRichActionCreationSection(richActionsPromptEnabled)
  ]);
};
