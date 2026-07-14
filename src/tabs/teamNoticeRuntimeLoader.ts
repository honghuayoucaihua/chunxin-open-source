let teamNoticeRuntimePromise: Promise<typeof import('./teamNoticeRuntime')> | null = null;

export const loadTeamNoticeRuntime = () => {
  if (!teamNoticeRuntimePromise) {
    teamNoticeRuntimePromise = import('./teamNoticeRuntime');
  }
  return teamNoticeRuntimePromise;
};
