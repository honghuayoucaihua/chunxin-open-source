import assert from 'node:assert/strict';
import { buildEmojiToken, resolveEmojiTokenValue } from '../src/chatroom/emojiToken.ts';
import { buildEnabledEmojiPromptText } from '../src/chatroom/emojiStore.ts';

const emojiGroups = [
  { id: 'group-b', name: 'B组', folder: 'group-b', enabled: true, isBuiltIn: false, order: 0 },
  { id: 'group-a', name: 'A组', folder: 'group-a', enabled: true, isBuiltIn: false, order: 1 }
];

const groupEmojis = {
  'group-a': [{ id: 'group-a-1', url: 'https://example.com/a.gif', desc: '你好', groupId: 'group-a' }],
  'group-b': [{ id: 'group-b-1', url: 'https://example.com/b.gif', desc: '你好', groupId: 'group-b' }]
};

const customEmojis: any[] = [];

const extractTokenBody = (token: string): string => token.replace(/^\[emoji:/, '').replace(/\]$/, '');

// 复现：A/B 两个分组存在同名表情时，旧逻辑只按 desc 解析，发送或渲染都可能串到错误分组。
{
  const groupAToken = buildEmojiToken({ id: 'group-a-1', groupId: 'group-a', desc: '你好' });
  const resolved = resolveEmojiTokenValue(extractTokenBody(groupAToken), customEmojis, emojiGroups as any, groupEmojis as any);
  assert.equal(resolved?.id, 'group-a-1', '结构化 token 应优先命中自身 id，避免同名跨组串用');
}

{
  const legacyResolved = resolveEmojiTokenValue('你好', customEmojis, emojiGroups as any, groupEmojis as any);
  assert.equal(legacyResolved?.id, 'group-b-1', '旧版仅描述 token 需要按稳定顺序回退，避免结果随对象遍历顺序漂移');
}

{
  const prompt = buildEnabledEmojiPromptText({
    customEmojis,
    emojiGroups: emojiGroups as any,
    groupEmojis: groupEmojis as any,
    hiddenEmojiIds: []
  });
  assert.match(prompt, /不要自行编造 token，也不要只写 \[emoji:描述\]/, '提示词应明确禁止只输出旧的描述型 token');
  assert.match(prompt, /A组：你好（同名，必须复制本行 token） -> \[emoji:id=group-a-1;group=group-a;desc=你好\]/, '提示词应按分组列出 A 组稳定 token');
  assert.match(prompt, /B组：你好（同名，必须复制本行 token） -> \[emoji:id=group-b-1;group=group-b;desc=你好\]/, '提示词应按分组列出 B 组稳定 token');
}

console.log('测试通过：跨分组同名表情会使用稳定 token，并在提示词中按分组去歧义。');
