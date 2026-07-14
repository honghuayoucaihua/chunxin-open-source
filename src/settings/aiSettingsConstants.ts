export const AI_PROVIDER_OPTIONS = [
  { key: 'builtin', label: '叙说AI', baseUrl: '' },
  { key: 'gemini', label: 'Gemini', baseUrl: '' },
  { key: 'siliconflow', label: '硅基流动', baseUrl: '' },
  { key: 'deepseek', label: 'Deepseek', baseUrl: '' },
  { key: 'zhipu', label: '智谱', baseUrl: '' },
  { key: 'iflow', label: '心流', baseUrl: '' },
  { key: 'doubao', label: '豆包（火山引擎）', baseUrl: '' },
  { key: 'custom_response', label: 'Response', baseUrl: '' },
  { key: 'custom_anthropic', label: 'Anthropic', baseUrl: '' },
  { key: 'custom', label: '自定义', baseUrl: '' }
] as const;

export const MINIMAX_MODEL_LIST = [
  'speech-2.8-hd',
  'speech-2.8-turbo',
  'speech-2.6-hd',
  'speech-2.6-turbo',
  'speech-02-hd',
  'speech-02-turbo',
  'speech-01-hd',
  'speech-01-turbo'
] as const;

export const IMAGE_GENERATION_DEFAULT_BASE_URLS = {
  openai: '',
  google: '',
  volcengine: ''
} as const;
