type ProfileSceneRuntimeModule = typeof import('./profileSceneRuntime');

let profileSceneRuntimePromise: Promise<ProfileSceneRuntimeModule> | null = null;

export const loadProfileSceneRuntime = (): Promise<ProfileSceneRuntimeModule> => {
  if (!profileSceneRuntimePromise) {
    profileSceneRuntimePromise = import('./profileSceneRuntime');
  }
  return profileSceneRuntimePromise;
};
