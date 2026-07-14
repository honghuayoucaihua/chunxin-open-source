import type { Dispatch, SetStateAction } from 'react';
import type { AISettings, Contact, MailLetter, SubView, UserProfile } from '../types';
import type { MailboxThemeSettings } from '../mailbox/MailboxSubPages';
import { buildContactPersonaSummary, buildUserPersonaSummary } from '../services/personaSummary.ts';
import { buildInboxReplyLetter, buildSentMailboxLetter } from './mailboxLetterUtils.ts';
import { loadMailboxReplyRuntime } from './mailboxReplyRuntimeLoader.ts';

type MailboxType = 'inbox' | 'sent';

type BuildMailboxActionHandlersOptions = {
  contacts: Contact[];
  user: UserProfile;
  mailboxTheme: MailboxThemeSettings;
  aiSettings: AISettings;
  buildRuntimePromptWithMemory: (contact: Contact | undefined, limit?: number) => string;
  setSelectedMailboxType: Dispatch<SetStateAction<MailboxType>>;
  setSelectedMailboxLetter: Dispatch<SetStateAction<MailLetter | null>>;
  pushSubView: (next: SubView) => void;
  setSentLetters: Dispatch<SetStateAction<MailLetter[]>>;
  setInboxLetters: Dispatch<SetStateAction<MailLetter[]>>;
  showToast: (message: string, duration?: number) => void;
  getChatReply: (
    messages: Array<{ role: 'user' | 'model'; text: string }>,
    systemInstruction: string,
    settings: AISettings,
    runtimeUserPrompt?: string
  ) => Promise<string>;
};

type SendMailboxLetterArgs = {
  toContactId: string;
  subject: string;
  content: string;
  blessing: string;
};

const pendingMailboxSendKeys = new Set<string>();

const buildDateString = (now: number): string => new Date(now).toLocaleDateString('zh-CN');

const buildMailboxSendKey = (payload: SendMailboxLetterArgs): string => [
  payload.toContactId,
  payload.subject.trim(),
  payload.content.trim(),
  payload.blessing.trim()
].join('|');

const createHandleSelectMailboxLetter = (options: BuildMailboxActionHandlersOptions) => (
  type: MailboxType,
  letter: MailLetter
) => {
  options.setSelectedMailboxType(type);
  options.setSelectedMailboxLetter(letter);
  options.pushSubView('mailboxLetterDetail');
};

const sendAiReply = async (
  options: BuildMailboxActionHandlersOptions,
  to: Contact,
  toName: string,
  payload: SendMailboxLetterArgs,
  date: string
) => {
  const { generateMailboxReplyText } = await loadMailboxReplyRuntime();
  const aiReply = await generateMailboxReplyText({
    to,
    user: options.user,
    subject: payload.subject,
    content: payload.content,
    date,
    aiSettings: options.aiSettings,
    runtimeUserPromptBase: options.buildRuntimePromptWithMemory(to, 10),
    getChatReply: options.getChatReply,
    buildUserPersonaSummary,
    buildContactPersonaSummary
  });
  const reply = buildInboxReplyLetter({
    toContactId: payload.toContactId,
    toName: options.user.name || '我',
    fromName: toName,
    subject: payload.subject,
    content: aiReply.content,
    blessing: aiReply.blessing,
    signatureImage: to.signatureImage || '',
    stampImage: to.stampImage || ''
  });
  options.setInboxLetters(prev => [...prev, reply]);
  options.showToast(`${toName} 已回信`);
};

const createHandleSendMailboxLetter = (options: BuildMailboxActionHandlersOptions) => (payload: SendMailboxLetterArgs) => {
  const to = options.contacts.find(contact => contact.id === payload.toContactId);
  if (!to) return options.showToast('未找到收件人');
  const sendKey = buildMailboxSendKey(payload);
  if (pendingMailboxSendKeys.has(sendKey)) {
    options.showToast('这封信正在发送，请稍候');
    return;
  }
  pendingMailboxSendKeys.add(sendKey);
  const toName = to.remark?.trim() || to.name;
  const now = Date.now();
  const date = buildDateString(now);
  const sent = buildSentMailboxLetter({
    ...payload,
    toName,
    fromName: options.user.name || '我',
    date,
    signatureImage: options.mailboxTheme.signatureImage || '',
    stampImage: options.mailboxTheme.stampImage || '',
    now
  });

  options.setSentLetters(prev => [...prev, sent]);
  options.showToast(`已发送给 ${toName}`);
  options.pushSubView('mailbox');

  void sendAiReply(options, to, toName, payload, date).catch((error: any) => {
    console.error('[MailboxReply] AI reply failed:', error);
    options.showToast(error?.message || 'AI 回信失败');
  }).finally(() => {
    pendingMailboxSendKeys.delete(sendKey);
  });
};

export const buildMailboxActionHandlers = (options: BuildMailboxActionHandlersOptions) => ({
  handleSelectMailboxLetter: createHandleSelectMailboxLetter(options),
  handleSendMailboxLetter: createHandleSendMailboxLetter(options)
});
