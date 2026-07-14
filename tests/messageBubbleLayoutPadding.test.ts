import assert from 'node:assert/strict';
import { resolveChatMessageBottomMetaPadding, shouldRenderChatMessageBubble } from '../src/utils/chat/messageBubbleLayout.ts';

// 复现：纯表情消息或“仅有表情 token、文本为空”的消息不渲染气泡壳，但旧版仍会为底部时间/已读预留 padding，导致表情下方出现大空白。
// 期望：只有当气泡壳确实会渲染时，才需要预留底部 meta 空间。

{
  const shouldRender = shouldRenderChatMessageBubble({
    msgType: 'text',
    emojiOnly: true,
    textWithoutEmoji: '',
    hasHtmlTag: false
  });
  assert.equal(shouldRender, false);
}

{
  const padding = resolveChatMessageBottomMetaPadding({
    msgType: 'text',
    emojiOnly: true,
    textWithoutEmoji: '',
    hasHtmlTag: false,
    needsOutsideReadPadding: false,
    showBottomMetaRow: true,
    isRetroSkin: false
  });
  assert.equal(padding, 0, '纯表情消息不应预留底部 meta 空白');
}

{
  const shouldRender = shouldRenderChatMessageBubble({
    msgType: 'text',
    emojiOnly: false,
    textWithoutEmoji: '',
    hasHtmlTag: false
  });
  assert.equal(shouldRender, false);
}

{
  const padding = resolveChatMessageBottomMetaPadding({
    msgType: 'text',
    emojiOnly: false,
    textWithoutEmoji: '',
    hasHtmlTag: false,
    needsOutsideReadPadding: false,
    showBottomMetaRow: true,
    isRetroSkin: false
  });
  assert.equal(padding, 0, '仅表情 token（不渲染气泡壳）不应预留底部 meta 空白');
}

{
  const shouldRender = shouldRenderChatMessageBubble({
    msgType: 'text',
    emojiOnly: false,
    textWithoutEmoji: '你好',
    hasHtmlTag: false
  });
  assert.equal(shouldRender, true);
}

{
  const padding = resolveChatMessageBottomMetaPadding({
    msgType: 'text',
    emojiOnly: false,
    textWithoutEmoji: '你好',
    hasHtmlTag: false,
    needsOutsideReadPadding: false,
    showBottomMetaRow: true,
    isRetroSkin: false
  });
  assert.equal(padding, 22, '有气泡壳 + 底部 meta 时应预留默认高度');
}

console.log('测试通过：消息气泡渲染与底部 meta 预留规则符合预期。');

