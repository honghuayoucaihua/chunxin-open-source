import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildAnonymousPersona,
  buildAnonymousSystemPrompt,
  createAnonymousPartner
} from '../src/app/anonymousChatUtils.ts';

const partner = createAnonymousPartner({
  onlyOppositeSex: false,
  ageRange: [22, 22],
  tags: []
}, 'other');

assert.deepEqual(partner.tags, [], '匿名聊天本地匹配不应补造兴趣标签');
assert.doesNotMatch(partner.persona, /兴趣1|兴趣2|兴趣3|兴趣：。/, '匿名聊天人设不应写入固定兴趣占位');

const scalarTagPartner = createAnonymousPartner({
  onlyOppositeSex: false,
  ageRange: [22, 22],
  tags: [{ text: '对象兴趣不应落地' }, ' 咖啡 ', 123] as any
}, 'other');
assert.deepEqual(scalarTagPartner.tags, ['咖啡', '123'], '匿名聊天兴趣标签只应接收可展示标量');
assert.doesNotMatch(scalarTagPartner.persona, /\[object Object\]/, '匿名聊天对象型兴趣不应强转进人设');

const repairedAgePartner = createAnonymousPartner({
  onlyOppositeSex: false,
  ageRange: [{ value: 18 }, 16] as any,
  tags: []
}, 'other');
assert.equal(repairedAgePartner.age, 16, '匿名聊天本地匹配应对异常年龄范围安全归一化');
assert.doesNotMatch(repairedAgePartner.persona, /\[object Object\]/, '匿名聊天本地匹配不应把对象型年龄写进人设');

const persona = buildAnonymousPersona({
  gender: 'female',
  age: 24,
  tags: [],
  persona: ''
});
assert.doesNotMatch(persona, /兴趣1|兴趣2|兴趣3|兴趣：。/, '匿名聊天基础人设缺兴趣时不应补固定兴趣');

const objectFieldPersona = buildAnonymousPersona({
  gender: 'female',
  age: { value: 24 } as any,
  tags: [{ text: '对象兴趣不应落地' }, '散步'] as any,
  persona: ''
});
assert.match(objectFieldPersona, /兴趣：散步/, '匿名聊天基础人设仍应保留干净兴趣');
assert.doesNotMatch(objectFieldPersona, /\[object Object\]/, '匿名聊天基础人设不应强转对象型年龄或标签');

const systemPrompt = buildAnonymousSystemPrompt({
  gender: 'female',
  age: 24,
  tags: [],
  persona: ''
}, [], [], {
  name: '',
  wechatId: '',
  avatar: '',
  gender: 'other',
  region: '',
  signature: '',
  momentsCover: ''
}, '');
assert.doesNotMatch(systemPrompt, /兴趣1|兴趣2|兴趣3|兴趣：。/, '匿名聊天系统提示缺兴趣时不应补固定兴趣');

const objectFieldSystemPrompt = buildAnonymousSystemPrompt({
  gender: 'female',
  age: { value: 24 } as any,
  tags: [{ text: '对象兴趣不应落地' }, '音乐'] as any,
  persona: { text: '对象人设不应落地' } as any
}, [], [], {
  name: '',
  wechatId: '',
  avatar: '',
  gender: 'other',
  region: { text: '对象地区不应落地' } as any,
  signature: '',
  momentsCover: ''
}, '');
assert.match(objectFieldSystemPrompt, /兴趣：音乐/, '匿名聊天系统提示仍应保留干净兴趣');
assert.doesNotMatch(objectFieldSystemPrompt, /\[object Object\]|对象人设不应落地|对象地区不应落地/, '匿名聊天系统提示不应强转对象型资料');

const source = readFileSync(new URL('../src/app/anonymousChatUtils.ts', import.meta.url), 'utf8');
assert.doesNotMatch(source, /兴趣1|兴趣2|兴趣3/, '匿名聊天代码不应保留固定兴趣占位');

console.log('测试通过：匿名聊天不再补造固定兴趣标签。');
