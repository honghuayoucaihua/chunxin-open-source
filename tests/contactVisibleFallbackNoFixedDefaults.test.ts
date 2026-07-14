import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildGroupContact } from '../src/app/groupFlowUtils.ts';

const friendFlowSource = readFileSync(new URL('../src/app/friendFlowUtils.ts', import.meta.url), 'utf8');
const groupFlowSource = readFileSync(new URL('../src/app/groupFlowUtils.ts', import.meta.url), 'utf8');
const profileSource = readFileSync(new URL('../src/profile/ProfileSubPages.tsx', import.meta.url), 'utf8');

assert.doesNotMatch(friendFlowSource, /\|\| '#'/, '好友请求联系人不应把空拼音补成 #');
assert.doesNotMatch(groupFlowSource, /\|\| '#'/, '群聊联系人不应把空拼音补成 #');
assert.doesNotMatch(groupFlowSource, /userName\) \? rawBaseName : `\$\{rawBaseName\}、\$\{userName\}`/, '群聊名称不应在空用户昵称时利用 includes 空串绕过真实判断');
assert.doesNotMatch(profileSource, /contact\.region \|\| '中国'/, '联系人资料页不应把空地区显示成中国');
assert.match(profileSource, /contact\.region\?\.trim\(\)/, '联系人资料页应只展示明确填写的地区');

const unnamedUserGroup = buildGroupContact({
  ids: ['c1', 'c2'],
  groupName: '调查小队',
  userName: '',
  groupId: 'g1'
});
assert.equal(unnamedUserGroup.name, '调查小队', '用户昵称为空时，新建群聊名称不应补入“我”');

const namedUserGroup = buildGroupContact({
  ids: ['c1', 'c2'],
  groupName: '调查小队',
  userName: '小满',
  groupId: 'g2'
});
assert.equal(namedUserGroup.name, '调查小队、小满', '用户昵称真实存在时，群聊名称仍可包含真实用户昵称');

console.log('测试通过：联系人可见资料不再补固定地区或拼音占位。');
