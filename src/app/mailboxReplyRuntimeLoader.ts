type MailboxReplyRuntimeModule = typeof import('./mailboxReplyRuntime.ts');

let mailboxReplyRuntimePromise: Promise<MailboxReplyRuntimeModule> | null = null;

export const loadMailboxReplyRuntime = (): Promise<MailboxReplyRuntimeModule> => {
  if (!mailboxReplyRuntimePromise) {
    mailboxReplyRuntimePromise = import('./mailboxReplyRuntime.ts');
  }
  return mailboxReplyRuntimePromise;
};
