const FORMAT_RETRY_PROMPT = [
  '【格式修复】上一轮 AI 回复格式无效，系统没有展示给用户。',
  '请重新生成本轮回复，只输出一个合法 JSON 对象。',
  '普通聊天正文使用 {"text":"自然回复"}；不要输出 Markdown、代码块、解释性前后缀，也不要把 JSON 放进 content 字符串。',
  '只使用当前聊天模式和当前提示词允许的字段；历史里出现过的旧格式不能模仿或补回。'
].join('\n');

export const buildReplyFormatRetryRuntimePrompt = (runtimeUserPrompt?: string): string => [
  String(runtimeUserPrompt || '').trim(),
  FORMAT_RETRY_PROMPT
].filter(Boolean).join('\n\n');

