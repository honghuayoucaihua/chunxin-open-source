import assert from 'node:assert/strict';
import {
  containsGeneratedSystemEventFormat,
  normalizeGeneratedNonSystemEventText,
  normalizeGeneratedStrictNonSystemEventText,
  normalizeGeneratedVisibleText
} from '../src/utils/generatedVisibleText.ts';

assert.equal(
  normalizeGeneratedVisibleText('我知道了。【动作】把手机扣在桌上', { collapseWhitespace: true }),
  '',
  '普通可见正文混入动作格式时应整段拒收，不再截断成半句'
);

assert.equal(
  normalizeGeneratedVisibleText('【心声】其实有点担心\n今晚早点睡\n译文：Sleep early', { joinWith: '\n' }),
  '',
  '普通可见正文混入心声或译文格式时应整段拒收'
);

assert.equal(
  normalizeGeneratedVisibleText('正文第一段\n系统说明：上面是正文\n正文第二段', { joinWith: '\n' }),
  '',
  '普通可见正文混入系统说明格式时应整段拒收'
);

assert.equal(
  normalizeGeneratedNonSystemEventText('今晚见。\n[位置] 春信咖啡\n【系统】我拍了拍你', { joinWith: '\n' }),
  '',
  '普通文本混入系统事件格式时应整段拒收'
);

assert.equal(
  normalizeGeneratedNonSystemEventText('我先看完再回你 [系统转账·待收款] ¥20', { collapseWhitespace: true }),
  '',
  '普通文本行内混入系统事件格式时应整段拒收'
);

assert.equal(
  normalizeGeneratedNonSystemEventText('我给你转账这句话只是普通聊天内容', { collapseWhitespace: true }),
  '我给你转账这句话只是普通聊天内容',
  '非系统格式标签的自然语言不应被猜测拦截'
);

assert.equal(
  containsGeneratedSystemEventFormat('我把位置发你了 [位置] 春信咖啡'),
  true,
  '共享检测应识别行内混入的系统能力格式'
);

assert.equal(
  containsGeneratedSystemEventFormat('我给你转账这句话只是普通聊天内容'),
  false,
  '共享检测不应误伤普通自然语言'
);

assert.equal(
  normalizeGeneratedStrictNonSystemEventText('我把位置发你了 [位置] 春信咖啡', { collapseWhitespace: true }),
  '',
  '严格非系统纯文本遇到系统能力格式时应整段拒收，避免留下假系统能力正文'
);

assert.equal(
  normalizeGeneratedStrictNonSystemEventText({ text: '对象旧结构不应转正文' }, { collapseWhitespace: true }),
  '',
  'AI 生成文本字段只接受字符串或数字，不应把对象强转成 [object Object]'
);

assert.equal(
  normalizeGeneratedVisibleText(['数组旧结构不应转正文'], { collapseWhitespace: true }),
  '',
  'AI 生成文本字段不应把数组旧结构强转成可见正文'
);

console.log('测试通过：AI 生成的可见文本会清理心声、动作、翻译、系统说明和明确系统事件格式片段。');
