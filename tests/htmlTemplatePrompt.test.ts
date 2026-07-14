import assert from 'node:assert/strict';
import { extractTemplateVariables } from '../src/utils/htmlTemplate/templateVarExtractor.ts';
import { buildHtmlTemplateSection } from '../src/utils/prompt/personaPromptSections.ts';

const html = `
<div class="title">{{标题}}</div>
<ul>
  {{#交易列表}}
    <li>{{名称}} - {{.金额}}</li>
  {{/交易列表}}
</ul>
{{^交易列表}}<div>暂无交易</div>{{/交易列表}}
<div class="footer">{{备注}}</div>
`.trim();

// 复现：旧版会把循环块内字段也当成顶层变量，导致AI容易把字段填到vars顶层，从而循环渲染时每行都一样
const vars = extractTemplateVariables(html);
assert.deepEqual(
  vars,
  ['标题', '备注', '交易列表'],
  '变量提取应只包含：顶层变量 + 列表变量名（不应包含循环块内字段）'
);

// 复现：旧版提示词不强调“列表每项必须包含哪些字段”，AI容易输出缺字段的对象数组，从而触发外层回退导致重复
const section = buildHtmlTemplateSection({
  contact: { useCustomHtmlTemplates: false } as any,
  htmlTemplates: [
    {
      id: 'ht-test',
      name: '测试模板',
      usageNote: '账单卡片备注',
      htmlContent: html,
      variables: [
        { name: '标题', description: '页面标题', type: 'text' },
        { name: '交易列表', description: '交易条目', type: 'array' },
        { name: '备注', description: '底部备注', type: 'text' }
      ],
      enabled: true,
      createdAt: Date.now()
    } as any
  ]
});

assert.ok(
  section.includes('交易列表') && section.includes('字段') && section.includes('名称') && section.includes('金额'),
  'HTML变量提示词应包含循环列表“每项字段要求”，避免循环渲染时每行都一样'
);
assert.ok(!section.includes('使用场景：当用户发送“查看账单”时'), 'HTML变量提示词不应把旧使用场景字段交给 AI 当触发依据');
assert.ok(!section.includes('账单卡片备注'), 'HTML变量提示词不应把模板备注交给 AI 当触发依据');
assert.ok(!section.includes('触发条件：'), 'HTML变量提示词不应把模板说明表达为关键词触发条件');
assert.ok(section.includes('不要根据用户普通正文里的某个关键词自动触发模板'), 'HTML变量提示词应明确禁止关键词触发模板');

console.log('测试通过：HTML模板变量提取与提示词包含循环字段要求。');
