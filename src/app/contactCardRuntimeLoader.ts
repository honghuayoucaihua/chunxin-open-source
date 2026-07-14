export const loadContactCardRuntime = async () => {
  const runtime = await import('./contactCardFlowUtils');
  return {
    buildContactCardImage: runtime.buildContactCardImage,
    buildContactCardPayload: runtime.buildContactCardPayload,
    parseContactFromCardImage: runtime.parseContactFromCardImage
  };
};
