import assert from 'node:assert/strict';
import {
  extractFirstJsonObject,
  extractFirstJsonObjectDetailed,
  extractStrictJsonObject
} from '../src/utils/chat/aiReplyParser.ts';

{
  const raw = '{"text":"直接对象"}';
  const extracted = extractFirstJsonObjectDetailed(raw);
  assert.equal(extracted?.stage, 'direct', '纯 JSON 对象应命中 direct 阶段');
  assert.equal(extracted?.value.text, '直接对象', 'direct 阶段应返回原始对象');
}

{
  const raw = '```json\n{"text":"代码块对象"}\n```';
  const extracted = extractFirstJsonObjectDetailed(raw);
  assert.equal(extracted, null, '代码块 JSON 不应被当作有效结构化回复');
  assert.equal(extractStrictJsonObject(raw), null, '严格 JSON 入口不应接受代码块包裹');
}

{
  const raw = '前缀说明 {"text":"中间对象","count":2} 后缀说明';
  const extracted = extractFirstJsonObjectDetailed(raw);
  assert.equal(extracted, null, '前后缀包裹对象不应从解释文字中截取落地');
}

{
  const raw = '标签片段 {"type":"sentence","value":"不要误命中"} 真正回复 {"text":"正确主对象","tags":[{"type":"sentence","value":"主句子"}],"status":"ok"}';
  const extracted = extractFirstJsonObjectDetailed(raw);
  assert.equal(extracted, null, '混入多个对象时不应猜测哪个才是主回复');
}

{
  const raw = 'content 字段如下："content":"{\\"text\\":\\"content包对象\\",\\"tags\\":[{\\"type\\":\\"sentence\\",\\"value\\":\\"第一句\\"}]}"';
  const extracted = extractFirstJsonObjectDetailed(raw);
  assert.equal(extracted, null, 'content 字符串内包 JSON 不应被额外解包');
}

{
  const raw = '模型输出：{\\"text\\":\\"转义对象\\",\\"status\\":\\"ok\\"}';
  const extracted = extractFirstJsonObjectDetailed(raw);
  assert.equal(extracted, null, '整体转义对象不应被宽松还原');
}

{
  const raw = '"content":"只有字段包装","tags":[{"type":"sentence","value":"后续句子"}]';
  const extracted = extractFirstJsonObjectDetailed(raw);
  assert.equal(extracted, null, '缺失外层花括号的字段片段不应被补全');
}

{
  const raw = '"content":"{\\"text\\":\\"共享入口\\"}"';
  const extracted = extractFirstJsonObject(raw);
  assert.equal(extracted, null, '共享 JSON 抽取入口也只接受完整 JSON 对象');
}

console.log('测试通过：JSON 提取器只接受完整 JSON 对象，不再从违规输出中救场。');
