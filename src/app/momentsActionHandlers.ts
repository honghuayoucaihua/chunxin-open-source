import { loadMomentActionRuntime } from './momentActionRuntimeLoader';
import type { MomentActionRuntimeOptions } from './momentActionRuntime';
import { withLoadedRuntime } from './runtimeLoaderUtils';

let manualGenerateMomentPromise: Promise<void> | null = null;
let remindWhoPostPromise: Promise<void> | null = null;

const createHandleManualGenerateMoment = (options: MomentActionRuntimeOptions) => async () => {
  if (manualGenerateMomentPromise) return manualGenerateMomentPromise;
  manualGenerateMomentPromise = (async () => {
    const runtime = await loadMomentActionRuntime();
    await runtime.runManualGenerateMomentRuntime(options);
  })();
  try {
    return await manualGenerateMomentPromise;
  } finally {
    manualGenerateMomentPromise = null;
  }
};

const createHandleMomentCommentCreate = (options: MomentActionRuntimeOptions) => (
  momentId: string,
  commentText: string,
  replyTo?: { user?: string }
) => {
  withLoadedRuntime(loadMomentActionRuntime, (runtime) => {
    runtime.runMomentCommentCreateRuntime(options, momentId, commentText, replyTo);
  });
};

const createHandlePublishMoment = (options: MomentActionRuntimeOptions) => (
  text: string,
  imgs: string[],
  loc: string,
  visibility: string,
  imageDescriptions: string[] = [],
  identityContactId?: string
) => {
  withLoadedRuntime(loadMomentActionRuntime, (runtime) => {
    runtime.runPublishMomentRuntime(options, text, imgs, loc, visibility, imageDescriptions, identityContactId);
  });
};

const createHandleRemindWhoPost = (options: MomentActionRuntimeOptions) => async (contactIds: string[]) => {
  if (!contactIds?.length) return;
  if (remindWhoPostPromise) return remindWhoPostPromise;
  remindWhoPostPromise = (async () => {
    const runtime = await loadMomentActionRuntime();
    await runtime.runRemindWhoPostRuntime(options, contactIds);
  })();
  try {
    return await remindWhoPostPromise;
  } finally {
    remindWhoPostPromise = null;
  }
};

export const buildMomentsActionHandlers = (options: MomentActionRuntimeOptions) => ({
  handleManualGenerateMoment: createHandleManualGenerateMoment(options),
  handleMomentCommentCreate: createHandleMomentCommentCreate(options),
  handlePublishMoment: createHandlePublishMoment(options),
  handleRemindWhoPost: createHandleRemindWhoPost(options)
});
