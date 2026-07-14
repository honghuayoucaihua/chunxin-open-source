type OfficialArticleAiUtilsModule = typeof import('./officialArticleAiUtils');

let officialArticleAiUtilsPromise: Promise<OfficialArticleAiUtilsModule> | null = null;

const loadOfficialArticleAiUtils = (): Promise<OfficialArticleAiUtilsModule> => {
  if (!officialArticleAiUtilsPromise) {
    officialArticleAiUtilsPromise = import('./officialArticleAiUtils');
  }
  return officialArticleAiUtilsPromise;
};

export const generateOfficialArticleInitialComments = async (
  ...args: Parameters<OfficialArticleAiUtilsModule['generateOfficialArticleInitialComments']>
) => {
  const runtime = await loadOfficialArticleAiUtils();
  return runtime.generateOfficialArticleInitialComments(...args);
};

export const generateOfficialArticleCommentReply = async (
  ...args: Parameters<OfficialArticleAiUtilsModule['generateOfficialArticleCommentReply']>
) => {
  const runtime = await loadOfficialArticleAiUtils();
  return runtime.generateOfficialArticleCommentReply(...args);
};

export const generateOfficialArticleDraft = async (
  ...args: Parameters<OfficialArticleAiUtilsModule['generateOfficialArticleDraft']>
) => {
  const runtime = await loadOfficialArticleAiUtils();
  return runtime.generateOfficialArticleDraft(...args);
};
