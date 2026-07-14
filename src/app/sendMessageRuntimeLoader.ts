export const loadSendMessageRuntime = async () => {
  const { runSendMessageFlow } = await import('./sendMessage');
  return { runSendMessageFlow };
};
