export const isDevelopmentEnvironment = (): boolean => {
  const metaEnv = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env;
  return metaEnv?.DEV === true;
};
