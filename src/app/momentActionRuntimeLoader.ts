export const loadMomentActionRuntime = async () => {
  const runtime = await import('./momentActionRuntime');
  return runtime;
};
