import type { Comment, Contact, Moment } from '../types';
import { normalizeGeneratedStrictNonSystemEventText } from '../utils/generatedVisibleText.ts';

type UnknownRecord = Record<string, unknown>;
type InteractionNormalizeOptions = { minCount?: number };
type MomentInteractionEvent =
  | { delay: number; type: 'like'; payload: { momentId: string; name: string } }
  | { delay: number; type: 'comment'; payload: { momentId: string; comment: Comment } };

const isRecord = (value: unknown): value is UnknownRecord => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

export const pickRandomMomentAuthor = (contacts: Contact[]) => {
  const sourceContacts = contacts.filter(contact => contact.allowRichActions && !contact.isGroup);
  if (sourceContacts.length === 0) return null;
  return sourceContacts[Math.floor(Math.random() * sourceContacts.length)];
};

const buildAllowedNameSet = (allowedNames?: string[]): Set<string> | null => {
  if (!allowedNames || allowedNames.length === 0) return null;
  const names = allowedNames
    .map((name) => normalizeGeneratedStrictNonSystemEventText(name, { collapseWhitespace: true }))
    .filter(Boolean);
  return names.length > 0 ? new Set(names) : null;
};

export const normalizeAiLikeNames = (
  input: unknown,
  allowedNames?: string[],
  options: InteractionNormalizeOptions = {}
): string[] => {
  if (!Array.isArray(input)) return [];
  const allowedNameSet = buildAllowedNameSet(allowedNames);
  const likes = input
    .map((item) => normalizeGeneratedStrictNonSystemEventText(item, { collapseWhitespace: true }))
    .filter((name) => !allowedNameSet || allowedNameSet.has(name))
    .filter(Boolean)
    .slice(0, 5);
  const minCount = Number(options.minCount);
  if (Number.isFinite(minCount) && likes.length < minCount) return [];
  return likes;
};

export const normalizeAiComments = (
  input: unknown,
  idPrefix: string,
  allowedNames?: string[],
  options: InteractionNormalizeOptions = {}
): Comment[] => {
  if (!Array.isArray(input)) return [];
  const allowedNameSet = buildAllowedNameSet(allowedNames);
  const comments = input
    .filter(isRecord)
    .map((item, idx): Comment => {
      const user = normalizeGeneratedStrictNonSystemEventText(item.user, { collapseWhitespace: true });
      const replyTo = normalizeGeneratedStrictNonSystemEventText(
        item.replyTo,
        { collapseWhitespace: true }
      );
      const text = normalizeGeneratedStrictNonSystemEventText(item.text, { collapseWhitespace: true });
      return {
        id: `${Date.now()}-${idPrefix}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
        user,
        text,
        replyTo: replyTo || undefined
      };
    })
    .filter((item) => item.user && item.text && (!allowedNameSet || allowedNameSet.has(item.user)))
    .slice(0, 5);
  const minCount = Number(options.minCount);
  if (Number.isFinite(minCount) && comments.length < minCount) return [];
  return comments;
};

export const buildManualMoment = (author: Contact, content: string, location: string, likes: string[], comments: Array<{ id: string; user: string; text: string }>): Moment => {
  return {
    id: `${Date.now()}-manual-moment`,
    authorId: author.id,
    author: author.remark?.trim() || author.name,
    avatar: author.avatar,
    content,
    images: [],
    likes,
    comments,
    timestamp: Date.now(),
    location
  };
};

export const createUserPublishedMoment = (
  user: { name: string; avatar: string },
  content: string,
  images: string[],
  location: string,
  imageDescriptions: string[] = []
): Moment => {
  return {
    id: Date.now().toString(),
    authorId: 'me',
    author: user.name,
    avatar: user.avatar,
    content,
    images,
    imageDescriptions,
    likes: [],
    comments: [],
    timestamp: Date.now(),
    location
  };
};

export const createContactPublishedMoment = (
  contact: Contact,
  content: string,
  images: string[],
  location: string,
  imageDescriptions: string[] = []
): Moment => ({
  id: Date.now().toString(),
  authorId: contact.id,
  author: contact.remark?.trim() || contact.name,
  avatar: contact.avatar,
  content,
  images,
  imageDescriptions,
  likes: [],
  comments: [],
  timestamp: Date.now(),
  location
});

export const selectVisibleAudience = (contacts: Contact[], visibility: string, selectedContactIds: string[]) => {
  const selectedSet = new Set(selectedContactIds);
  return contacts.filter((contact) => {
    if (!contact.isAi || contact.isGroup) return false;
    if (visibility === '私密') return false;
    if (visibility === '部分可见') return selectedSet.has(contact.id);
    if (visibility === '不给谁看') return !selectedSet.has(contact.id);
    return true;
  });
};

export const resolveMomentResponderContact = (moments: Moment[], contacts: Contact[], momentId: string, replyToUser?: string) => {
  const targetMoment = moments.find(moment => moment.id === momentId);
  if (!targetMoment) return null;
  const authorContact = contacts.find(contact => contact.id === targetMoment.authorId);
  const replyTargetName = String(replyToUser || '').trim();
  const replyTargetContact = replyTargetName
    ? contacts.find(contact => contact.isAi && !contact.isGroup && ((contact.remark?.trim() || contact.name) === replyTargetName))
    : undefined;
  const responderContact = targetMoment.authorId === 'me' ? replyTargetContact : authorContact;
  if (!responderContact || !responderContact.isAi) return null;
  return { targetMoment, responderContact };
};

export const buildMomentInteractionEvents = (
  momentId: string,
  aiLikes: string[],
  aiComments: Array<{ id: string; user: string; text: string }>
) => {
  const events: MomentInteractionEvent[] = [];
  let totalDelay = 0;
  aiLikes.forEach((name) => {
    totalDelay += 300 + Math.floor(Math.random() * 600);
    events.push({ delay: totalDelay, type: 'like', payload: { momentId, name } });
  });
  aiComments.forEach((comment) => {
    totalDelay += 500 + Math.floor(Math.random() * 800);
    events.push({ delay: totalDelay, type: 'comment', payload: { momentId, comment } });
  });
  return events;
};
