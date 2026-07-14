import type { MailLetter } from '../types';

export const buildSentMailboxLetter = (input: {
  toContactId: string;
  toName: string;
  fromName: string;
  subject: string;
  content: string;
  blessing: string;
  date: string;
  signatureImage: string;
  stampImage: string;
  now: number;
}): MailLetter => {
  return {
    id: `sent-${input.now}`,
    toContactId: input.toContactId,
    toName: input.toName,
    fromName: input.fromName,
    subject: input.subject || '',
    content: input.content,
    blessing: input.blessing,
    date: input.date,
    signatureImage: input.signatureImage,
    stampImage: input.stampImage,
    createdAt: input.now
  };
};

export const buildInboxReplyLetter = (input: {
  toContactId: string;
  toName: string;
  fromName: string;
  subject: string;
  content: string;
  blessing: string;
  signatureImage: string;
  stampImage: string;
}): MailLetter => {
  return {
    id: `inbox-${Date.now()}-${input.toContactId}`,
    toContactId: 'me',
    toName: input.toName,
    fromName: input.fromName,
    subject: input.subject ? `Re: ${input.subject}` : '回信',
    content: input.content,
    blessing: input.blessing,
    date: new Date().toLocaleDateString('zh-CN'),
    signatureImage: input.signatureImage,
    stampImage: input.stampImage,
    createdAt: Date.now()
  };
};
