import assert from 'node:assert/strict';
import { splitReplyToMessages } from '../src/utils/chat/messageSegmentation.ts';

// 复现：旧逻辑会把联系人消息中的 [emoji:描述] 转成 image 消息，导致在 UI 中按“图片”样式显示。
// 期望：表情应保持为 text 消息（内容为 token），交给渲染层按表情规则展示。
(globalThis as any).window = {
  allEnabledEmojis: [
    { id: 'emoji-1', url: 'https://example.com/emoji-1.png', desc: '微笑' }
  ]
};

const pick = (msgs: any[]) => msgs.map((m) => ({ type: m.type, content: m.content }));

{
  const msgs = splitReplyToMessages('u1', '[emoji:微笑]');
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].type, 'text');
  assert.equal(msgs[0].content, '[emoji:微笑]');
}

{
  const msgs = splitReplyToMessages('u1', '你好[emoji:微笑]再见');
  assert.deepEqual(
    pick(msgs),
    [
      { type: 'text', content: '你好' },
      { type: 'text', content: '[emoji:微笑]' },
      { type: 'text', content: '再见' }
    ]
  );
}

{
  const token = '[emoji:id=group-a-1;group=group-a;desc=你好]';
  const msgs = splitReplyToMessages('u1', `前缀${token}后缀`);
  assert.deepEqual(
    pick(msgs),
    [
      { type: 'text', content: '前缀' },
      { type: 'text', content: token },
      { type: 'text', content: '后缀' }
    ]
  );
}

{
  const dataUrl = 'data:image/png;base64,AAAA';
  const msgs = splitReplyToMessages('u1', `A ${dataUrl} B`);
  assert.deepEqual(
    pick(msgs),
    [
      { type: 'text', content: 'A' },
      { type: 'image', content: dataUrl },
      { type: 'text', content: 'B' }
    ]
  );
}

{
  assert.deepEqual(splitReplyToMessages('u1', { text: '不应落地' }), []);
  assert.deepEqual(splitReplyToMessages('u1', ['不应落地']), []);
}

{
  const msgs = splitReplyToMessages('u1', 123);
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].content, '123');
}

console.log('测试通过：表情 token 不应被拆成图片消息，dataURL 图片仍应拆分为 image，对象旧格式不会落地。');
