import assert from 'node:assert/strict';
import {
  buildHtmlPreviewSrcDoc,
  isLikelyHtmlContent,
  normalizeHtmlMessageContent
} from '../src/utils/chat/htmlMessageRender.ts';

assert.equal(isLikelyHtmlContent({ html: '<div>不应识别</div>' }), false, '对象型消息内容不应被强转后参与 HTML 识别');
assert.equal(isLikelyHtmlContent(['<div>不应识别</div>']), false, '数组型消息内容不应被强转后参与 HTML 识别');
assert.equal(isLikelyHtmlContent('<div>正常 HTML</div>'), true, '字符串 HTML 仍应被识别');

assert.equal(normalizeHtmlMessageContent({ html: '<div>不应渲染</div>' }, 'msg-object'), '', '对象型 HTML 内容不应进入渲染');
assert.equal(buildHtmlPreviewSrcDoc(['<div>不应预览</div>'], 'msg-array'), '', '数组型 HTML 内容不应进入预览 iframe');

console.log('测试通过：HTML 消息展示入口只接受标量文本，结构对象不会被强转渲染。');
