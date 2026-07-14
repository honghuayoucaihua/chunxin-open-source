import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildBehaviorSection, buildRoleProfileSection } from '../src/utils/prompt/personaPromptSections.ts';
import { buildRoleplayQualityLines } from '../src/utils/prompt/roleplayQualityPrompt.ts';
import type { Contact } from '../src/types/contact.ts';

const promptBuildersSource = readFileSync(new URL('../src/utils/promptBuilders.ts', import.meta.url), 'utf8');
const personaPromptSectionsSource = readFileSync(new URL('../src/utils/prompt/personaPromptSections.ts', import.meta.url), 'utf8');

{
  const lines = buildRoleplayQualityLines().join('\n');
  assert.match(lines, /承接用户上一句的具体信息、情绪或动作/, '角色演绎规则应要求承接用户具体输入');
  assert.match(lines, /真实聊天意图/, '角色演绎规则应避免无意图空话');
  assert.match(lines, /情绪要有来由和层次/, '角色演绎规则应要求情绪真实有层次');
  assert.match(lines, /稳定但不机械/, '角色演绎规则应兼顾人设稳定和关系变化');
  assert.match(lines, /关系推进要小步发生/, '角色演绎规则应避免关系突变');
  assert.match(lines, /不要一轮解决/, '角色演绎规则应避免把暧昧、冲突或担心一轮写完');
  assert.match(lines, /回复长度和节奏要跟随用户输入与当前场景/, '角色演绎规则应按上下文控制回复节奏');
  assert.match(lines, /不要每轮都写成小作文/, '角色演绎规则应避免所有回复都变成长篇');
  assert.match(lines, /不要过度解释自己的心理/, '角色演绎规则应减少心理说明书式表达');
  assert.match(lines, /少用“我理解你”“听起来”这类模板化开头/, '角色演绎规则应减少模板腔');
}

{
  const groupLines = buildRoleplayQualityLines({ isGroup: true }).join('\n');
  assert.match(groupLines, /每个 speakerId 都要保持独立人设/, '群聊规则应要求成员人设独立');
  assert.match(groupLines, /不需要每轮让所有成员都发言/, '群聊规则应避免强行平均分配发言');
  assert.match(groupLines, /避免所有成员轮流发表完整小作文/, '群聊规则应避免轮流小作文');
  assert.match(groupLines, /不能替用户发言/, '群聊规则应保持用户行动边界');
}

{
  const roleProfilePrompt = buildRoleProfileSection({
    id: 'c-status',
    name: '林夏',
    chatMode: 'online',
    status: '最近在赶项目，睡得有点少'
  } as Contact);
  assert.match(roleProfilePrompt, /状态：最近在赶项目，睡得有点少/, '单聊角色资料应包含联系人当前状态');
  assert.match(roleProfilePrompt, /状态时效：角色状态“最近在赶项目，睡得有点少”可能是近期或临时状态/, '联系人状态应标记时效性，避免被当成永久人设');
}

{
  const roleProfilePrompt = buildRoleProfileSection({
    id: 'c-legacy',
    name: '旧联系人',
    chatMode: 'online',
    personality: '【核心人设】旧标题人设\n【背景故事】旧标题背景'
  } as Contact);
  assert.doesNotMatch(roleProfilePrompt, /旧标题人设|旧标题背景/, '角色资料不应再解析旧 personality 标题兜底注入提示词');
}

{
  const behaviorPrompt = buildBehaviorSection({
    id: 'c1',
    name: '林夏',
    chatMode: 'online',
    relationship: '朋友'
  } as Contact);
  assert.match(behaviorPrompt, /承接用户上一句的具体信息、情绪或动作/, '单聊行为提示应接入共享角色演绎规则');
  assert.match(behaviorPrompt, /真实聊天意图/, '单聊行为提示应要求回复有真实意图');
  assert.match(behaviorPrompt, /情绪要有来由和层次/, '单聊行为提示应强化情绪真实度');
  assert.match(behaviorPrompt, /回复长度和节奏要跟随用户输入与当前场景/, '单聊行为提示应继承节奏控制规则');
}

assert.match(personaPromptSectionsSource, /buildRoleplayQualityLines\(\{ linePrefix: '- ' \}\)/, '单聊人设提示应接入共享角色演绎规则');
assert.doesNotMatch(personaPromptSectionsSource, /extractLegacyPersonaLines|LEGACY_PERSONA_PREFIXES/, '角色资料提示不应保留旧 personality 标题解析兜底');
assert.match(promptBuildersSource, /buildRoleplayQualityLines\(\{ isGroup: true \}\)/, '群聊提示应接入共享角色演绎规则');
assert.match(promptBuildersSource, /extraSystemPrompt\?: string/, '群聊提示选项应支持额外系统提示');
assert.match(promptBuildersSource, /系统覆盖指令/, '群聊系统提示应像单聊一样保留额外系统提示');

console.log('测试通过：单聊与群聊已统一角色演绎质量规则。');
