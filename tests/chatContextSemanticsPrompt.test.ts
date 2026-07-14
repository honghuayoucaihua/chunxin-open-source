import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildChatContextSemanticsLines } from '../src/utils/prompt/contextSemanticsPrompt.ts';
import {
  buildDescriptionInputCapabilityLine,
  buildDescriptionInputDoPriorityLine,
  buildDescriptionInputHistorySemanticLine
} from '../src/utils/prompt/descriptionInputPrompt.ts';

const personaPromptSectionsSource = readFileSync(new URL('../src/utils/prompt/personaPromptSections.ts', import.meta.url), 'utf8');
const promptBuildersSource = readFileSync(new URL('../src/utils/promptBuilders.ts', import.meta.url), 'utf8');

{
  const lines = buildChatContextSemanticsLines().join('\n');
  assert.match(lines, /【系统】.*不是用户台词/, '上下文语义应说明系统通知不是用户台词');
  assert.match(lines, /\[系统红包·状态\].*\[系统转账·状态\].*不是用户台词/, '上下文语义应说明系统支付记录不是用户台词');
  assert.match(lines, /不是角色可模仿的输出格式/, '上下文语义应禁止角色模仿系统通知格式');
  assert.match(lines, /不要在普通回复中伪造【系统】通知、领取结果、收款结果或界面状态/, '上下文语义应禁止伪造系统状态');
  assert.match(lines, /【用户行为】.*真实行为或意图/, '上下文语义应说明用户行为标签的含义');
  assert.match(lines, /不要把【用户行为】当成可输出格式/, '上下文语义应禁止模仿用户行为标签');
}

{
  const capabilities = {
    descriptionFeatureEnabled: true,
    descriptionSayEnabled: true,
    descriptionDoEnabled: true
  };
  assert.match(
    buildDescriptionInputCapabilityLine(capabilities),
    /“说”表示用户聊天正文，“做”表示用户行为描述/,
    '说做能力提示应明确区分正文和用户行为'
  );
  assert.match(
    buildDescriptionInputDoPriorityLine(capabilities),
    /回复中的动作字段仍必须遵守当前模式开关/,
    '做发送提示应避免重新打开动作输出格式'
  );
  assert.match(
    buildDescriptionInputHistorySemanticLine(capabilities, ['【动作】']),
    /不要把这些标签当成可模仿的回复格式/,
    '历史语义提示应禁止模仿说做标签'
  );
}

assert.match(personaPromptSectionsSource, /buildChatContextSemanticsLines\(\{ linePrefix: '- ' \}\)/, '单聊人设提示应接入共享上下文语义');
assert.match(promptBuildersSource, /buildChatContextSemanticsLines\(\)/, '群聊提示应接入共享上下文语义');

console.log('测试通过：系统通知与说做上下文语义已统一。');
