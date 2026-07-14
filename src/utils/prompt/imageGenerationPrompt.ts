import type { AISettings } from '../../types';
import { buildSection } from './promptSectionUtils';

type ImageResponseFormat = 'openai' | 'google' | 'volcengine';

const resolveImageResponseFormat = (aiSettings?: AISettings): ImageResponseFormat => {
  if (aiSettings?.imageResponseFormat === 'google') return 'google';
  if (aiSettings?.imageResponseFormat === 'volcengine') return 'volcengine';
  return 'openai';
};

const getFormatLabel = (format: ImageResponseFormat) => {
  if (format === 'google') return 'Google 格式';
  if (format === 'volcengine') return '火山引擎兼容格式';
  return 'OpenAI 格式';
};

const getSizeRuleLine = (format: ImageResponseFormat) => {
  if (format === 'volcengine') {
    return '- size 规则：至少 3686400 像素，建议直接使用 1920x1920 或更大。';
  }
  return '- size 规则：可选，例如 1024x1024、1024x1536。';
};

const getOptionLine = (format: ImageResponseFormat) => {
  if (format === 'google') {
    return '- options 可用字段：negativePrompt、numberOfImages、aspectRatio、safetyFilterLevel、seed。';
  }
  if (format === 'volcengine') {
    return '- options 可用字段：seed、guidance_scale（以及兼容参数）。';
  }
  return '- options 可用字段：quality、style、background、response_format、n、user。';
};

const getOptionExample = (format: ImageResponseFormat) => {
  if (format === 'google') {
    return '{ "negativePrompt": "low quality", "numberOfImages": 1, "aspectRatio": "1:1" }';
  }
  if (format === 'volcengine') {
    return '{ "seed": 12345, "guidance_scale": 7 }';
  }
  return '{ "quality": "high", "style": "vivid", "response_format": "b64_json" }';
};

export const buildImageGenerationPromptSection = (aiSettings?: AISettings) => {
  if (!aiSettings?.enableImageGeneration) return '';
  const format = resolveImageResponseFormat(aiSettings);
  const sizeExample = format === 'volcengine' ? '1920x1920' : '1024x1024';
  const model = String(aiSettings.imageModel || '').trim();
  const baseUrl = String(aiSettings.imageBaseUrl || '').trim();
  return buildSection('图像生成补充', [
    `- 当确需生图时，使用 tags 中的 imageGen。当前通道：${getFormatLabel(format)}。`,
    '- imageGen.prompt 要写清主体、场景、风格、镜头与光线等关键信息。',
    getSizeRuleLine(format),
    getOptionLine(format),
    '- imageGen.caption 可选，用于附带说明文案。',
    model ? `- 当前模型：${model}` : '',
    baseUrl ? `- 当前地址：${baseUrl}` : '',
    `- 标签示例：{ "type": "imageGen", "prompt": "雨夜霓虹街头，赛博朋克风格，电影感广角镜头", "size": "${sizeExample}", "options": ${getOptionExample(format)}, "caption": "给你画好了" }`
  ]);
};
