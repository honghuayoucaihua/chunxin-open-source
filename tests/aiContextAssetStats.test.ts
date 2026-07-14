import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildHtmlTemplateChoiceDescription,
  buildWorldBookChoiceDescription,
  formatCharCount,
  getHtmlTemplateContextChars,
  getHtmlTemplateDescriptionChars,
  getHtmlTemplateHtmlChars,
  getHtmlTemplateUsageNoteChars,
  getWorldBookContentChars,
  getWorldBookContextChars,
  getWorldBookDescriptionChars,
  getWorldBookEntryChars
} from '../src/services/aiContextAssetStats.ts';

const encodeHiddenRaw = (value: unknown): string => {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
};

{
  const worldBook = {
    id: 'wb-1',
    name: '校园设定',
    description: '用于补充学校背景',
    enabled: true,
    entries: [
      { id: 'e-1', text: '这里是一所寄宿高中。' },
      { id: 'e-2', text: '晚上十点统一熄灯。' }
    ]
  };

  assert.equal(getWorldBookDescriptionChars(worldBook), '用于补充学校背景'.length, '世界书描述字符数应正确');
  assert.equal(getWorldBookEntryChars(worldBook.entries[0]), '这里是一所寄宿高中。'.length, '世界书单条内容字符数应正确');
  assert.equal(getWorldBookContentChars(worldBook), '这里是一所寄宿高中。晚上十点统一熄灯。'.length, '世界书内容合计字符数应正确');
  assert.equal(getWorldBookContextChars(worldBook), '【校园设定】这里是一所寄宿高中。；晚上十点统一熄灯。'.length, '世界书 AI 上下文字符数应按真实拼接结果计算');
  assert.equal(buildWorldBookChoiceDescription(worldBook), `AI上下文约 ${formatCharCount(getWorldBookContextChars(worldBook))} · 用于补充学校背景`, '世界书选择说明应带上 AI 上下文字符数');
}

{
  const hiddenWorldBook = {
    id: 'wb-2',
    name: '社区世界书',
    description: '只读壳',
    enabled: true,
    entries: [],
    encryptedReadOnly: true,
    encryptedHiddenRaw: encodeHiddenRaw({
      id: 'wb-2',
      name: '社区世界书',
      description: '来自社区的世界书',
      entries: [
        { id: 'e-1', text: '远处的钟声响了。' },
        { id: 'e-2', text: '夜色笼罩着校园。' }
      ]
    })
  };

  assert.equal(getWorldBookContextChars(hiddenWorldBook), '【社区世界书】远处的钟声响了。；夜色笼罩着校园。'.length, '加密只读世界书应从 encryptedHiddenRaw 计算上下文字符数');
  assert.equal(buildWorldBookChoiceDescription(hiddenWorldBook), `AI上下文约 ${formatCharCount(getWorldBookContextChars(hiddenWorldBook))} · 来自社区的世界书`, '加密只读世界书选择说明应显示真实上下文字符数');
}

{
  const template = {
    id: 'tpl-1',
    name: '账单卡片',
    description: '展示最近消费',
    usageNote: '仅在需要账单卡片时使用',
    htmlContent: '{{#账单列表}}<div>{{.名称}} {{.金额}}</div>{{/账单列表}}',
    variables: [
      { name: '标题', description: '卡片标题', type: 'text' as const, example: '今日账单' },
      { name: '账单列表', description: '消费列表', type: 'array' as const }
    ],
    enabled: true,
    createdAt: Date.now()
  };

  const expectedContext = [
    '【模板：账单卡片】(id: tpl-1)',
    '说明：展示最近消费',
    '变量：',
    '  - 标题: 卡片标题（例：今日账单）',
    '  - 账单列表（数组，每项为对象，字段必须包含：名称、金额）: 消费列表'
  ].join('\n').length;

  assert.equal(getHtmlTemplateDescriptionChars(template), '展示最近消费'.length, '模板描述字符数应正确');
  assert.equal(getHtmlTemplateUsageNoteChars(template), '仅在需要账单卡片时使用'.length, '模板备注字符数应正确');
  assert.equal(getHtmlTemplateHtmlChars(template), template.htmlContent.length, '模板 HTML 内容字符数应正确');
  assert.equal(getHtmlTemplateContextChars(template), expectedContext, '模板 AI 上下文字符数应贴近真实提示词拼接');
  assert.equal(buildHtmlTemplateChoiceDescription(template), `AI上下文约 ${formatCharCount(expectedContext)} · 展示最近消费`, '模板选择说明应带上 AI 上下文字符数');
}

{
  const hiddenTemplate = {
    id: 'tpl-2',
    name: '社区模板',
    description: '只读壳',
    usageNote: '',
    htmlContent: '',
    variables: [],
    enabled: true,
    createdAt: Date.now(),
    encryptedReadOnly: true,
    encryptedHiddenRaw: encodeHiddenRaw({
      id: 'tpl-2',
      name: '社区模板',
      description: '社区导入模板',
      triggerHint: '当用户提到菜单时',
      htmlContent: '<div>{{标题}}</div>',
      variables: [{ name: '标题', description: '页面标题', type: 'text' }]
    })
  };

  assert.ok(getHtmlTemplateContextChars(hiddenTemplate) > 0, '加密只读 HTML 模板应从 encryptedHiddenRaw 计算上下文字符数');
  assert.equal(buildHtmlTemplateChoiceDescription(hiddenTemplate), `AI上下文约 ${formatCharCount(getHtmlTemplateContextChars(hiddenTemplate))} · 社区导入模板`, '加密只读 HTML 模板选择说明应显示真实上下文字符数');
  assert.equal(getHtmlTemplateUsageNoteChars(hiddenTemplate), 0, '加密只读旧触发字段不应再作为备注或 AI 上下文读取');
}

{
  const source = readFileSync(new URL('../src/services/aiContextAssetStats.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /getHtmlTemplateTriggerHintChars/, '模板备注字符统计不应继续使用触发语义命名');
  assert.match(source, /getHtmlTemplateUsageNoteChars/, '模板备注字符统计应使用备注语义命名');
  assert.match(source, /hidden\.usageNote/, '加密只读模板应优先读取新备注字段');
  assert.doesNotMatch(source, /hidden\.triggerHint|template\?\.triggerHint/, 'HTML 模板上下文不应再读取旧触发字段');
}

console.log('测试通过：AI 上下文资源字符统计正常。');
