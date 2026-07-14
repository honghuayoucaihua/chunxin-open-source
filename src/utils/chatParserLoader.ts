type ChatParserModule = typeof import('./chat/aiReplyParser.ts');

let chatParserPromise: Promise<ChatParserModule> | null = null;

export const loadChatParser = (): Promise<ChatParserModule> => {
  if (!chatParserPromise) {
    chatParserPromise = import('./chat/aiReplyParser.ts');
  }
  return chatParserPromise;
};

export const extractFirstJsonObjectLazy = async (
  ...args: Parameters<ChatParserModule['extractFirstJsonObject']>
) => {
  const runtime = await loadChatParser();
  return runtime.extractFirstJsonObject(...args);
};

export const extractStrictJsonObjectLazy = async (
  ...args: Parameters<ChatParserModule['extractStrictJsonObject']>
) => {
  const runtime = await loadChatParser();
  return runtime.extractStrictJsonObject(...args);
};

export const parseAIReplyLazy = async (
  ...args: Parameters<ChatParserModule['parseAIReply']>
) => {
  const runtime = await loadChatParser();
  return runtime.parseAIReply(...args);
};
