type ContactFormAiRuntimeModule = typeof import('./contactFormAiRuntime');

let contactFormAiRuntimePromise: Promise<ContactFormAiRuntimeModule> | null = null;

const loadContactFormAiRuntime = (): Promise<ContactFormAiRuntimeModule> => {
  if (!contactFormAiRuntimePromise) {
    contactFormAiRuntimePromise = import('./contactFormAiRuntime');
  }
  return contactFormAiRuntimePromise;
};

export const generateContactFormPatch = async (
  ...args: Parameters<ContactFormAiRuntimeModule['generateContactFormPatch']>
) => {
  const runtime = await loadContactFormAiRuntime();
  return runtime.generateContactFormPatch(...args);
};
