import assert from 'node:assert/strict';
import {
  buildImagePromptText,
  extractImageCaptionText,
  extractInputText,
  getDescriptionInputKind,
  getShouldAppend,
  isImageOverridePayload,
  isInternalStoryAdvancePayload
} from '../src/app/sendMessage/messageValidation.ts';

const builtinParams = {
  inputValue: '输入框正文',
  aiSettings: { provider: 'builtin' }
} as any;

assert.equal(
  extractInputText(builtinParams, { text: { value: '对象正文不应落地' } } as any),
  null,
  '对象型 override text 不应被强转成用户正文'
);

assert.equal(
  extractInputText(builtinParams, { imageUrl: { url: 'https://example.com/a.png' }, text: '图片说明' } as any),
  '图片说明',
  '对象型 imageUrl 不应被识别为图片覆盖消息'
);

const imagePayload = {
  imageUrl: ' https://example.com/a.png ',
  imageCaption: { text: '对象图片说明不应落地' },
  text: { text: '对象备用说明不应落地' }
} as any;

assert.equal(isImageOverridePayload(imagePayload), true);
assert.equal(
  extractInputText(builtinParams, imagePayload),
  '用户发送了一张图片（未提供描述）',
  '对象型图片说明不应进入图片提示文本'
);
assert.equal(extractImageCaptionText(imagePayload), '', '对象型图片说明不应写入图片消息说明');

assert.equal(buildImagePromptText({ text: '对象图片说明不应落地' }), '用户发送了一张图片（未提供描述）');
assert.equal(getShouldAppend(null as any), true, 'null 覆盖参数不应让发送入口崩溃');
assert.equal(getDescriptionInputKind(null as any), 'say');
assert.equal(isInternalStoryAdvancePayload(null as any), false);

console.log('测试通过：发送入口覆盖参数只接受标量文本，结构对象不会污染用户消息。');
