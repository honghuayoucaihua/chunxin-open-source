import assert from 'node:assert/strict';
import { buildEmojiMessageLayoutClasses } from '../src/utils/chat/emojiMessageLayout.ts';

// 复现：纯表情渲染使用固定 120x120，但旧版容器带 max-w-[70%]，会导致 img 实际宽度被压缩（例如 84x120）。
// 期望：容器不应限制最大宽度；图片应显式解除 max-width:100% 的约束，避免被父容器误伤。

{
  const result = buildEmojiMessageLayoutClasses({ isMe: true });
  assert.ok(!result.containerClass.includes('max-w-[70%]'), '表情容器不应包含 max-w-[70%]，否则会触发宽度压缩');
  assert.ok(result.containerClass.includes('inline-flex'), '表情容器建议使用 inline-flex，避免占用过大布局空间');
  assert.ok(result.imageClass.includes('w-[120px]') && result.imageClass.includes('h-[120px]'), '表情图片应为 120x120');
  assert.ok(result.imageClass.includes('max-w-none'), '表情图片应包含 max-w-none，避免被默认 max-width:100% 压缩');
  assert.ok(result.imageClass.includes('shrink-0'), '表情图片应包含 shrink-0，避免在 flex 下被压缩');
}

{
  const result = buildEmojiMessageLayoutClasses({ isMe: false });
  assert.ok(!result.containerClass.includes('max-w-[70%]'), '对方表情容器同样不应包含 max-w-[70%]');
  assert.ok(result.containerClass.includes('inline-flex'), '对方表情容器建议使用 inline-flex');
}

console.log('测试通过：表情消息布局 class 计算符合预期。');
