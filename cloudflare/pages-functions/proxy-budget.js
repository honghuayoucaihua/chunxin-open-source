export const MAX_PROXY_CONTEXT_CHARS = 50000;

const collectContentChars = (value) => {
  if (typeof value === 'string') return value.length;
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + collectContentChars(item), 0);
  }
  if (!value || typeof value !== 'object') return 0;

  return Object.entries(value).reduce((sum, [key, itemValue]) => {
    if (key === 'type') return sum;
    return sum + collectContentChars(itemValue);
  }, 0);
};

export const estimateProxyMessageChars = (messages) => {
  if (!Array.isArray(messages)) return 0;
  return messages.reduce((sum, message) => {
    if (!message || typeof message !== 'object') return sum;
    return sum + collectContentChars(message.content);
  }, 0);
};

export const isProxyContextWithinBudget = (messages, maxChars = MAX_PROXY_CONTEXT_CHARS) =>
  estimateProxyMessageChars(messages) <= Math.max(1, Number(maxChars || MAX_PROXY_CONTEXT_CHARS));
