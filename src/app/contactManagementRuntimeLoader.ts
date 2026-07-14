type ContactManagementRuntimeModule = typeof import('./contactManagementRuntime');

let contactManagementRuntimePromise: Promise<ContactManagementRuntimeModule> | null = null;

export const loadContactManagementRuntime = (): Promise<ContactManagementRuntimeModule> => {
  if (!contactManagementRuntimePromise) {
    contactManagementRuntimePromise = import('./contactManagementRuntime');
  }
  return contactManagementRuntimePromise;
};
