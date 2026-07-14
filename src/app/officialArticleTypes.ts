export type OfficialArticleCommentReply = {
  id: string;
  user: string;
  avatar?: string;
  text: string;
  time: number;
  likes?: number;
};

export type OfficialArticleComment = OfficialArticleCommentReply & {
  replies?: OfficialArticleCommentReply[];
};

export type OfficialArticle = {
  id: string;
  title: string;
  desc: string;
  thumb: string;
  author: string;
  avatar?: string;
  time: string | number;
  comments?: OfficialArticleComment[];
};

export type OfficialCommentContact = {
  id: string;
  name: string;
  remark?: string;
  avatar?: string;
  isGroup?: boolean;
};

export type StickerImportItem = {
  id?: string;
  url?: string;
  desc?: string;
  [key: string]: unknown;
};
