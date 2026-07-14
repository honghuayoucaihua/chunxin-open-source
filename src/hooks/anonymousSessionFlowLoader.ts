type AnonymousSessionFlowModule = typeof import('../app/anonymousSessionFlow');

let anonymousSessionFlowPromise: Promise<AnonymousSessionFlowModule> | null = null;

const loadAnonymousSessionFlow = (): Promise<AnonymousSessionFlowModule> => {
  if (!anonymousSessionFlowPromise) {
    anonymousSessionFlowPromise = import('../app/anonymousSessionFlow');
  }
  return anonymousSessionFlowPromise;
};

export const runStartAnonymousMatch = async (...args: Parameters<AnonymousSessionFlowModule['runStartAnonymousMatch']>) => {
  const runtime = await loadAnonymousSessionFlow();
  return runtime.runStartAnonymousMatch(...args);
};

export const runPushAnonymousHistory = async (...args: Parameters<AnonymousSessionFlowModule['runPushAnonymousHistory']>) => {
  const runtime = await loadAnonymousSessionFlow();
  return runtime.runPushAnonymousHistory(...args);
};

export const runAnonymousLeave = async (...args: Parameters<AnonymousSessionFlowModule['runAnonymousLeave']>) => {
  const runtime = await loadAnonymousSessionFlow();
  return runtime.runAnonymousLeave(...args);
};

export const runResumeAnonymousSession = async (...args: Parameters<AnonymousSessionFlowModule['runResumeAnonymousSession']>) => {
  const runtime = await loadAnonymousSessionFlow();
  return runtime.runResumeAnonymousSession(...args);
};

export const runAnonymousSend = async (...args: Parameters<AnonymousSessionFlowModule['runAnonymousSend']>) => {
  const runtime = await loadAnonymousSessionFlow();
  return runtime.runAnonymousSend(...args);
};
