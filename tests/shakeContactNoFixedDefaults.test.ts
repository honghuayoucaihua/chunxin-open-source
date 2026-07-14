import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const shakeSource = readFileSync(new URL('../src/utils/shakeContactAiRuntime.ts', import.meta.url), 'utf8');
const shakeViewSource = readFileSync(new URL('../src/utils/UtilsBasicSubPages.tsx', import.meta.url), 'utf8');

assert.doesNotMatch(
  shakeSource,
  /SHAKE_CONTACT_AVATAR|SHAKE_CONTACT_PAT_DESC|'拍了拍我'|avatar:\s*'\/assets\/image\/user\.png'|pinyin:\s*'#'|patDesc:\s*'拍了拍我'/,
  '摇一摇 AI 生成联系人不应把默认头像、默认拍一拍或固定拼音写入角色数据'
);

assert.match(shakeSource, /avatar:\s*''/, '摇一摇 AI 生成联系人缺少头像时应保持角色数据为空');
assert.match(shakeSource, /patDesc:\s*''/, '摇一摇 AI 生成联系人缺少拍一拍时应保持角色数据为空');
assert.match(shakeSource, /const pinyin = safeName\.charAt\(0\)\.toUpperCase\(\);/, '摇一摇联系人拼音分组应从名称派生，不使用固定占位');
assert.match(shakeSource, /SHAKE_CONTACT_AI_ALLOWED_KEYS/, '摇一摇 AI 生成联系人应固定可接受字段白名单');
assert.match(shakeSource, /SHAKE_CONTACT_AI_TEXT_KEYS/, '摇一摇 AI 生成联系人应拒收对象型文本字段');
assert.match(shakeSource, /validateShakeContactAiPayload/, '摇一摇 AI 生成联系人应先做结构校验再落地');
assert.doesNotMatch(shakeSource, /usedNames \|\| '无'|已有名字：\$\{usedNames \|\| '无'\}/, '摇一摇 AI 提示词不应把空的已有名字写成“无”');
assert.match(shakeSource, /if \(usedNames\.length > 0\) \{[\s\S]+不要使用下列已有名字：\$\{usedNames\.join\('、'\)\}/, '摇一摇 AI 提示词应只在确有已有名字时加入去重约束');
assert.match(
  shakeViewSource,
  /result\.avatar \|\| '\/assets\/image\/user\.png'/,
  '摇一摇结果卡头像占位应只用于 UI 显示，不写入联系人数据'
);
assert.doesNotMatch(shakeViewSource, /result\.region \|\| '中国'/, '摇一摇结果卡不应显示无依据的默认地区');

console.log('测试通过：摇一摇 AI 生成联系人不再写入固定角色资料。');
