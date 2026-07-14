import assert from 'node:assert/strict';
import {
  buildTruthOrDareRuntimePrompt,
  buildTruthOrDareSystemPrompt,
  getTruthOrDareState,
  hasUnsupportedTruthOrDareReplyShape,
  hasUnsupportedTruthOrDareSpecial,
  isAllowedTruthOrDareSpecial
} from '../src/app/sendMessage/truthOrDareRuntimePrompt.ts';

const truthDareStateMessage = {
  id: 'td-state',
  senderId: 'system',
  type: 'system' as const,
  timestamp: Date.parse('2026-05-14T08:00:00.000Z'),
  content: '【真心话大冒险状态】当前轮到你选择真心话'
};

{
  const messages: any[] = [
    truthDareStateMessage,
    {
      id: 'user-do',
      senderId: 'me',
      type: 'text',
      timestamp: Date.parse('2026-05-14T08:01:00.000Z'),
      content: '',
      actionDesc: '把手里的纸条递过去'
    }
  ];
  const state = getTruthOrDareState(messages);
  assert.equal(state.active, true, '存在真心话状态消息时应识别为进行中');
  assert.equal(state.userRepliedAfterState, true, '用户使用做发送后，也应视为已经回复过当前轮');
  const runtimePrompt = buildTruthOrDareRuntimePrompt(messages);
  assert.match(runtimePrompt, /可选指令/, '用户使用做发送回复后，运行时提示词也应允许模型判断是否进入下一轮');
  assert.doesNotMatch(runtimePrompt, /催促|快一点|下一轮\/快一点/, '真心话大冒险不应用固定用户正文关键词示例触发下一轮');
  assert.match(runtimePrompt, /不要按用户普通正文里的固定词面触发/, '真心话大冒险推进判断应声明不按普通正文关键词触发');
}

{
  const messages: any[] = [
    truthDareStateMessage,
    {
      id: 'user-image',
      senderId: 'me',
      type: 'image',
      timestamp: Date.parse('2026-05-14T08:02:00.000Z'),
      content: 'https://example.com/reply.png',
      imageCaption: '给你看抽到的卡片'
    }
  ];
  const state = getTruthOrDareState(messages);
  assert.equal(state.userRepliedAfterState, true, '用户发送图片等非纯文本消息后，也应视为已经回复过当前轮');
}

{
  const messages: any[] = [truthDareStateMessage];
  const state = getTruthOrDareState(messages);
  assert.equal(state.userRepliedAfterState, false, '没有用户回复时，不应误判为已回复');
  const runtimePrompt = buildTruthOrDareRuntimePrompt(messages);
  assert.doesNotMatch(runtimePrompt, /可选指令/, '没有用户回复时，不应提前提示下一轮指令');
}

{
  const messages: any[] = [{
    id: 'object-state-mark',
    senderId: 'system',
    type: 'system',
    timestamp: Date.parse('2026-05-14T08:03:30.000Z'),
    content: { text: '【真心话大冒险状态】对象状态不应激活' }
  }];
  const state = getTruthOrDareState(messages);
  assert.equal(state.active, false, '对象型系统状态不应强转后激活真心话大冒险上下文');
  assert.equal(buildTruthOrDareRuntimePrompt(messages), '', '对象型系统状态不应进入真心话大冒险运行时提示');
}

{
  const messages: any[] = [{
    id: 'user-mentions-state-mark',
    senderId: 'me',
    type: 'text',
    timestamp: Date.parse('2026-05-14T08:03:00.000Z'),
    content: '我只是把【真心话大冒险状态】这几个字当普通聊天内容发出来'
  }];
  const state = getTruthOrDareState(messages);
  assert.equal(state.active, false, '普通用户正文不应通过状态标记词面触发真心话大冒险上下文');
  assert.equal(buildTruthOrDareRuntimePrompt(messages), '', '没有系统状态消息时不应注入真心话大冒险运行时提示');
}

{
  assert.equal(
    hasUnsupportedTruthOrDareReplyShape(JSON.stringify({ text: '我接着说。', specials: [] }), { chatMode: 'online' }),
    false,
    '真心话大冒险合法自动回应结构应允许通过'
  );
  assert.equal(
    hasUnsupportedTruthOrDareReplyShape(JSON.stringify({ text: '我接着说。', actionDesc: '把纸条收起来' }), { chatMode: 'online' }),
    true,
    '真心话大冒险在线模式不应接受禁用的动作字段后再忽略落地'
  );
  assert.equal(
    hasUnsupportedTruthOrDareReplyShape(JSON.stringify({ text: '我接着说。', tags: [{ type: 'action', value: '收起纸条' }] }), { chatMode: 'offline' }),
    true,
    '真心话大冒险不应接受 tags 旧/外部格式绕过本功能字段白名单'
  );
  assert.equal(
    hasUnsupportedTruthOrDareReplyShape(JSON.stringify({ content: '旧 content 正文不应落地' }), { chatMode: 'online' }),
    true,
    '真心话大冒险不应接受 content 旧字段兜底为 text'
  );
  assert.equal(
    hasUnsupportedTruthOrDareReplyShape({ text: '对象回复不应被强转' }, { chatMode: 'online' }),
    true,
    '真心话大冒险自动回应不应把对象型原始回复强转成可见文本'
  );
  assert.equal(
    hasUnsupportedTruthOrDareReplyShape(JSON.stringify({ text: '下一轮吧。', specials: { type: 'system', command: 'next_round' } }), { chatMode: 'online' }),
    true,
    '真心话大冒险 specials 必须是数组，不能靠解析器忽略错误形状'
  );
}

{
  assert.equal(
    isAllowedTruthOrDareSpecial({ type: 'system', truthDareCommand: 'nextRound' } as any),
    true,
    '真心话大冒险自动回应只应允许 next_round 内部指令'
  );
  assert.equal(
    hasUnsupportedTruthOrDareSpecial([{ type: 'system', truthDareCommand: 'nextRound' } as any]),
    false,
    '只有 next_round 指令时不应判为不支持 special'
  );
  assert.equal(
    hasUnsupportedTruthOrDareSpecial([{ type: 'redpacket', amount: '8.88', message: '奖励你' } as any]),
    true,
    '真心话大冒险自动回应不应接受红包等普通聊天系统能力'
  );
  assert.equal(
    hasUnsupportedTruthOrDareSpecial([
      { type: 'system', truthDareCommand: 'nextRound' } as any,
      { type: 'location', locationName: '春信咖啡' } as any
    ]),
    true,
    'next_round 与其它系统能力混出时也应整轮拒收'
  );
}

{
  const prompt = buildTruthOrDareSystemPrompt({
    baseSystemPrompt: { text: '对象基础提示不应落地' } as any,
    contactName: { text: '对象联系人不应落地' } as any,
    userName: { text: '对象用户不应落地' } as any,
    chatMode: 'online',
    persona: { text: '对象人设不应落地' } as any,
    extraSystemPrompt: { text: '对象附加不应落地' } as any
  });
  assert.doesNotMatch(prompt, /\[object Object\]|对象基础提示不应落地|对象联系人不应落地|对象用户不应落地|对象人设不应落地|对象附加不应落地/, '真心话大冒险系统提示不应把对象型身份或提示字段强转成可见文本');
  assert.match(prompt, /当前联系人（未提供姓名，不要编造姓名）/, '对象型联系人名被拒收后应走缺名边界');
  assert.match(prompt, /角色风格：自然、有趣、尊重边界/, '对象型角色风格被拒收后应使用通用风格边界');
}

console.log('测试通过：真心话大冒险会正确识别做发送与非纯文本用户回复。');
