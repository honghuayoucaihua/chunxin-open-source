import assert from 'node:assert/strict';
import {
  buildDescriptionInputCapabilityLine,
  buildDescriptionInputDoPriorityLine,
  buildDescriptionInputHistorySemanticLine
} from '../src/utils/prompt/descriptionInputPrompt.ts';

{
  const capabilityLine = buildDescriptionInputCapabilityLine({
    descriptionFeatureEnabled: true,
    descriptionSayEnabled: true,
    descriptionDoEnabled: false
  });
  assert.match(capabilityLine, /当前允许用户使用说发送/, '仅开启说发送时，能力说明应只保留说发送');
  assert.doesNotMatch(capabilityLine, /“做”表示用户行为描述/, '仅开启说发送时，不应继续解释做发送语义');

  const doPriorityLine = buildDescriptionInputDoPriorityLine({
    descriptionFeatureEnabled: true,
    descriptionSayEnabled: true,
    descriptionDoEnabled: false
  });
  assert.equal(doPriorityLine, '', '未开启做发送时，不应继续输出做发送优先级说明');
}

{
  const capabilityLine = buildDescriptionInputCapabilityLine({
    descriptionFeatureEnabled: true,
    descriptionSayEnabled: false,
    descriptionDoEnabled: true
  });
  assert.match(capabilityLine, /当前允许用户使用做发送/, '仅开启做发送时，能力说明应只保留做发送');
  assert.doesNotMatch(capabilityLine, /“说”表示用户聊天正文/, '仅开启做发送时，不应继续解释说发送语义');

  const doPriorityLine = buildDescriptionInputDoPriorityLine({
    descriptionFeatureEnabled: true,
    descriptionSayEnabled: false,
    descriptionDoEnabled: true
  });
  assert.match(doPriorityLine, /用户主动使用了“做”发送/, '开启做发送时，应保留做发送优先级说明');

  const historyLine = buildDescriptionInputHistorySemanticLine(
    {
      descriptionFeatureEnabled: true,
      descriptionSayEnabled: false,
      descriptionDoEnabled: true
    },
    ['【动作】']
  );
  assert.match(historyLine, /仅含【动作】/, '历史语义说明应支持仅保留当前启用的说做标记');
}

console.log('测试通过：说做提示语会按前端实际开关输出，不再误注入被禁用的做发送语义。');
