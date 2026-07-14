import { ForumPostComment, ForumSpace, MailLetter, Message } from '../types';

type TextUsageInput = {
  inboxLetters?: MailLetter[];
  sentLetters?: MailLetter[];
  forums?: ForumSpace[];
};

const countForumCommentChars = (comments: ForumPostComment[] = []): number => {
  return comments.reduce((sum, comment) => {
    const current = (comment.author?.length || 0) + (comment.content?.length || 0);
    return sum + current + countForumCommentChars(comment.replies || []);
  }, 0);
};

const countForumCommentItems = (comments: ForumPostComment[] = []): number => {
  return comments.reduce((sum, comment) => sum + 1 + countForumCommentItems(comment.replies || []), 0);
};

export const estimateTextUsage = (
  messages: Record<string, Message[]>,
  input?: TextUsageInput
) => {
  const allMessages = Object.values(messages || {}).flat() as Message[];
  const chatChars = allMessages.reduce(
    (sum, m) =>
      sum +
      (m.content?.length || 0) +
      (m.innerVoice?.length || 0) +
      (m.actionDesc?.length || 0),
    0
  );

  const inboxLetters = input?.inboxLetters || [];
  const sentLetters = input?.sentLetters || [];
  const allLetters = [...inboxLetters, ...sentLetters];
  const mailboxChars = allLetters.reduce(
    (sum, letter) =>
      sum +
      (letter.toName?.length || 0) +
      (letter.fromName?.length || 0) +
      (letter.subject?.length || 0) +
      (letter.content?.length || 0) +
      (letter.blessing?.length || 0) +
      (letter.date?.length || 0),
    0
  );

  const forums = input?.forums || [];
  const forumPosts = forums.reduce((sum, forum) => sum + (forum.posts?.length || 0), 0);
  const forumComments = forums.reduce(
    (sum, forum) => sum + forum.posts.reduce((postSum, post) => postSum + countForumCommentItems(post.comments || []), 0),
    0
  );
  const forumChars = forums.reduce((sum, forum) => {
    const postChars = forum.posts.reduce((postSum, post) => {
      return (
        postSum +
        (post.title?.length || 0) +
        (post.content?.length || 0) +
        (post.author?.length || 0) +
        countForumCommentChars(post.comments || [])
      );
    }, 0);
    return sum + postChars;
  }, 0);

  const totalChars = chatChars + mailboxChars + forumChars;
  const totalItems = allMessages.length + allLetters.length + forumPosts + forumComments;
  const avgCharsPerItem = totalItems > 0 ? Number((totalChars / totalItems).toFixed(1)) : 0;

  return {
    totalChars,
    totalItems,
    avgCharsPerItem,
    chatChars,
    chatMessages: allMessages.length,
    mailboxChars,
    mailboxLetters: allLetters.length,
    forumChars,
    forumPosts,
    forumComments
  };
};

export const estimateTokenUsage = estimateTextUsage;
