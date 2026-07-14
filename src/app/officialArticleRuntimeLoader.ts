type OfficialArticleRuntimeModule = typeof import('./officialArticleRuntime');

let officialArticleRuntimePromise: Promise<OfficialArticleRuntimeModule> | null = null;

export const loadOfficialArticleRuntime = (): Promise<OfficialArticleRuntimeModule> => {
  if (!officialArticleRuntimePromise) {
    officialArticleRuntimePromise = import('./officialArticleRuntime');
  }
  return officialArticleRuntimePromise;
};
