export const loadResendFlow = async () => {
  const { handleResendFrom } = await import('./resendFlow');
  return { handleResendFrom };
};
