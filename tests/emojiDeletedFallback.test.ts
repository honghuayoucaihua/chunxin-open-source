import assert from 'node:assert/strict';
import { collectResolvedEmojiTokens, stripResolvedEmojiTokens } from '../src/chatroom/emojiTokenResolver.ts';

const resolveEmoji = (desc: string) => {
  const normalized = String(desc || '').trim();
  if (normalized === '微笑') {
    return { id: 'emoji-1', url: 'https://example.com/emoji-1.png', desc: '微笑' };
  }
  return null;
};

// 复现：表情已被删除后，消息里的旧 token 仍会到达渲染层。旧逻辑会直接删掉 token，
// 纯 token 消息因此变成空文本，混合消息也会把失效表情吞掉，最终显示空白。
{
  const content = '[emoji:已删除表情]';
  assert.equal(
    stripResolvedEmojiTokens(content, resolveEmoji),
    '[emoji:已删除表情]',
    '失效表情 token 应保留原文，避免纯表情消息渲染为空白'
  );
  assert.deepEqual(
    collectResolvedEmojiTokens(content, resolveEmoji),
    [],
    '失效表情 token 不应继续按已解析表情抽离渲染'
  );
}

{
  const content = '你好[emoji:微笑][emoji:已删除表情]再见';
  assert.equal(
    stripResolvedEmojiTokens(content, resolveEmoji),
    '你好[emoji:已删除表情]再见',
    '仅应移除已成功解析的表情 token，失效 token 需要保留'
  );
  assert.deepEqual(
    collectResolvedEmojiTokens(content, resolveEmoji).map((item) => ({ key: item.key, desc: item.desc, url: item.url })),
    [
      { key: 'emoji-1-0', desc: '微笑', url: 'https://example.com/emoji-1.png' }
    ],
    '仅已成功解析的表情 token 应被抽离为独立表情项'
  );
}

console.log('测试通过：已删除表情会保留原始 token 文本，避免消息显示空白。');
