import React, { useState } from 'react';
import type { HtmlTemplate, HtmlTemplateVariable } from '../types';
import { MobileHeader, SectionDivider } from '../Common';
import { formatCharCount, getHtmlTemplateContextChars, getHtmlTemplateDescriptionChars, getHtmlTemplateHtmlChars, getHtmlTemplateUsageNoteChars } from '../services/aiContextAssetStats';
import { extractTemplateVariableMetas, buildDefaultVariablesFromMetas } from '../utils/htmlTemplate/templateVarExtractor';
import { AppSwitch } from '../utils/UtilsContactFormPrimitives';
import { TemplateEditorEntryCard, TemplateEditorFieldCard, TemplateEditorSummaryCard, TemplateListCard } from './TemplateEditorPrimitives';
import { SharedCodeBlock, SharedEmptyState, SharedSectionCard } from './SharedPanelPrimitives';
import { confirmWechatAction, promptWechatAction } from '../utils/wechatDialog';

export const HtmlTemplatesView: React.FC<{
  templates: HtmlTemplate[];
  setTemplates: (t: HtmlTemplate[]) => void;
  onBack: () => void;
  onEdit: (template: HtmlTemplate) => void;
}> = ({ templates, setTemplates, onBack, onEdit }) => {
  const addTemplate = () => {
    const create = (name?: string) => {
      if (!name) return;
      const newTemplate: HtmlTemplate = {
        id: `ht-${Date.now()}`,
        name,
        usageNote: '',
        htmlContent: '',
        variables: [],
        enabled: true,
        createdAt: Date.now(),
      };
      setTemplates([...templates, newTemplate]);
      onEdit(newTemplate);
    };
    promptWechatAction('模板名称', '', create);
  };

  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader title="HTML" onBack={onBack} actions={<button className="app-button app-button-primary whitespace-nowrap" onClick={addTemplate}>新增</button>} />
      <div className="mx-3 mt-3 px-3 py-2 rounded-md text-[12px] bg-blue-500/10 text-blue-600">
        HTML可将大段HTML存本地，AI只需输出变量值即可渲染，大幅节省token
      </div>
      <div className="flex-1 overflow-y-auto">
        {templates.map((tpl) => (
          <div key={tpl.id} className="mt-3 mx-3">
            <TemplateListCard className="flex items-center gap-3">
              <button className="flex-1 min-w-0 text-left" onClick={() => onEdit(tpl)}>
                <div className="font-medium text-[14px] leading-5 truncate">{tpl.name}</div>
                <div className="text-xs text-gray-400 mt-1 leading-5 truncate">
                  {tpl.description || tpl.usageNote || '暂无描述'}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {tpl.variables.length} 个变量 · HTML {formatCharCount(getHtmlTemplateHtmlChars(tpl))} · AI上下文约 {formatCharCount(getHtmlTemplateContextChars(tpl))}
                </div>
              </button>
              <AppSwitch active={tpl.enabled} onChange={() => {
                setTemplates(templates.map((item) => (item.id === tpl.id ? { ...item, enabled: !item.enabled } : item)));
              }} />
            </TemplateListCard>
          </div>
        ))}
        {templates.length === 0 && <SharedEmptyState className="py-10">暂无模板</SharedEmptyState>}
      </div>
    </div>
  );
};

const TEMPLATE_HELPER_PROMPT = `你是一个HTML设计师。请根据我的需求生成一个HTML，需要严格遵循以下规范：

## 渲染环境
- 模板将在移动端聊天气泡的iframe中渲染
- 可用宽度约为手机屏幕宽度减去72px（约280-350px）
- 最大高度约440px，超出部分可滚动
- 基础样式已设置 html,body{margin:0;padding:0}
- 不支持JavaScript（iframe沙箱限制）

## 变量语法
- 简单变量：{{变量名}}，会被替换为实际文本值
- 循环列表：{{#列表名}}...{{/列表名}}，当列表非空时渲染；循环内**推荐**用 {{.字段名}} 引用每项属性（避免与外层变量同名时回退导致每行都一样）
- 反向块：{{^列表名}}...{{/列表名}}，当列表为空时渲染（用于显示"暂无数据"）
- 循环示例：
  {{#订单列表}}
    <div>{{.商品名}} - {{.价格}}</div>
  {{/订单列表}}
  {{^订单列表}}
    <div>暂无订单</div>
  {{/订单列表}}

## 允许的HTML标签
div, section, article, main, header, footer, aside, nav, p, span, ul, ol, li, h1-h6, a, button, pre, code, blockquote, img, br, hr, strong, em, b, i, u, s, small, mark, table, thead, tbody, tr, th, td

## 允许的CSS属性
color, background-color, background, font-size, font-weight, font-style, text-decoration, text-align, line-height, letter-spacing, margin, padding, border, border-radius, display, gap, flex, flex-direction, flex-wrap, justify-content, align-items, grid-template-columns, width, max-width, min-width, height, max-height, min-height, white-space, word-break, overflow, opacity, box-shadow

## 设计要求
1. 必须使用<style>标签定义样式（不支持外部CSS文件）
2. 移动端优先，适配约300px窄屏宽度
3. 使用清晰的视觉层次，合理运用间距和颜色
4. 字体大小建议：标题14-16px，正文12-13px，辅助文字11px
5. 输出完整HTML文档（含<!doctype html>、<html>、<head>、<body>）
6. 不要使用任何JavaScript代码

## 输出格式
直接输出完整HTML代码，不要用代码围栏包裹。在每个需要AI动态填充的地方使用 {{变量名}} 占位符。对于列表区域使用 {{#列表名}}...{{/列表名}} 循环块。

我的需求是：[在这里描述你想要的模板内容]`;

export const HtmlTemplateEditView: React.FC<{
  template: HtmlTemplate;
  onBack: () => void;
  onSave: (next: HtmlTemplate) => void;
  onDelete?: (id: string) => void;
}> = ({ template, onBack, onSave, onDelete }) => {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description || '');
  const [usageNote, setUsageNote] = useState(template.usageNote || '');
  const [htmlContent, setHtmlContent] = useState(template.htmlContent);
  const [variables, setVariables] = useState<HtmlTemplateVariable[]>(template.variables);
  const [showPromptHelper, setShowPromptHelper] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const draftTemplate: HtmlTemplate = { ...template, name, description, usageNote, htmlContent, variables };
  const descriptionChars = getHtmlTemplateDescriptionChars(draftTemplate);
  const usageNoteChars = getHtmlTemplateUsageNoteChars(draftTemplate);
  const htmlChars = getHtmlTemplateHtmlChars(draftTemplate);
  const contextChars = getHtmlTemplateContextChars(draftTemplate);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(TEMPLATE_HELPER_PROMPT).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = TEMPLATE_HELPER_PROMPT;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    });
  };

  const handleExtractVars = () => {
    const metas = extractTemplateVariableMetas(htmlContent);
    const existing = new Map(variables.map((v) => [v.name, v]));
    const merged = metas.map((meta) => {
      const prev = existing.get(meta.name);
      if (!prev) return buildDefaultVariablesFromMetas([meta])[0];
      if (meta.type === 'array' && prev.type !== 'array') return { ...prev, type: 'array' as const };
      return prev;
    });
    setVariables(merged);
  };

  const handleSave = () => {
    onSave({
      ...template,
      name: name.trim() || '未命名模板',
      description: description.trim(),
      usageNote: usageNote.trim(),
      htmlContent,
      variables,
      updatedAt: Date.now(),
    });
    onBack();
  };

  const handleDelete = () => {
    if (!onDelete) return;
    const remove = () => { onDelete(template.id); onBack(); };
    confirmWechatAction(`确定删除「${template.name}」吗？`, remove);
  };

  const updateVariable = (index: number, field: keyof HtmlTemplateVariable, value: string) => {
    setVariables((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  };

  const removeVariable = (index: number) => {
    setVariables((prev) => prev.filter((_, i) => i !== index));
  };

  const addVariable = () => {
    setVariables((prev) => [...prev, { name: '', description: '', type: 'text' as const }]);
  };

  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader
        title="编辑模板"
        onBack={onBack}
        actions={<button className="app-button app-button-primary whitespace-nowrap" onClick={handleSave}>保存</button>}
      />
      <div className="flex-1 overflow-y-auto">
        <SectionDivider label="概览" />
        <div className="px-3">
          <TemplateEditorSummaryCard>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-[11px] render-text-tertiary">描述</div>
                <div className="text-[13px] font-medium mt-1">{formatCharCount(descriptionChars)}</div>
              </div>
              <div>
                <div className="text-[11px] render-text-tertiary">备注</div>
                <div className="text-[13px] font-medium mt-1">{formatCharCount(usageNoteChars)}</div>
              </div>
              <div>
                <div className="text-[11px] render-text-tertiary">HTML内容</div>
                <div className="text-[13px] font-medium mt-1">{formatCharCount(htmlChars)}</div>
              </div>
              <div>
                <div className="text-[11px] render-text-tertiary">AI上下文</div>
                <div className="text-[13px] font-medium mt-1">{formatCharCount(contextChars)}</div>
              </div>
            </div>
          </TemplateEditorSummaryCard>
        </div>

        <SectionDivider label="名称" />
        <div className="px-3">
          <TemplateEditorFieldCard>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent outline-none text-[14px] text-gray-900 dark:text-white"
            placeholder="如：冰箱储备清单"
          />
          </TemplateEditorFieldCard>
        </div>

        <SectionDivider label="描述" />
        <div className="px-3">
          <TemplateEditorFieldCard>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-transparent outline-none text-[14px] text-gray-900 dark:text-white"
            placeholder="模板用途说明"
          />
          <div className="mt-2 text-right text-[11px] text-gray-400">描述 {formatCharCount(descriptionChars)}</div>
          </TemplateEditorFieldCard>
        </div>

        <SectionDivider label="备注" />
        <div className="px-3">
          <TemplateEditorFieldCard>
          <input
            value={usageNote}
            onChange={(e) => setUsageNote(e.target.value)}
            className="w-full bg-transparent outline-none text-[14px] text-gray-900 dark:text-white"
            placeholder="仅供自己备注，AI不会按它自动使用模板"
          />
          <div className="mt-2 text-right text-[11px] text-gray-400">备注 {formatCharCount(usageNoteChars)}</div>
          </TemplateEditorFieldCard>
        </div>

        <SectionDivider label="模板制作帮手" />
        <div className="px-3">
          <TemplateEditorFieldCard>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-gray-600">复制提示词，让AI帮你生成模板HTML</span>
              <button className="text-xs text-link font-medium whitespace-nowrap" onClick={() => setShowPromptHelper(!showPromptHelper)}>
                {showPromptHelper ? '收起' : '展开'}
              </button>
            </div>
            {showPromptHelper && (
              <div className="mt-3">
                <SharedSectionCard>
                  <SharedCodeBlock className="max-h-[240px] text-gray-500">{TEMPLATE_HELPER_PROMPT}</SharedCodeBlock>
                  <button
                    className="app-button app-button-primary w-full text-[13px]"
                    onClick={handleCopyPrompt}
                  >
                    {promptCopied ? '已复制到剪贴板' : '复制提示词'}
                  </button>
                </SharedSectionCard>
              </div>
            )}
          </TemplateEditorFieldCard>
        </div>

        <SectionDivider label="HTML内容" />
        <div className="px-3">
          <TemplateEditorFieldCard>
          <textarea
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            className="w-full min-h-[160px] bg-transparent outline-none text-[13px] text-gray-900 dark:text-white resize-none font-mono"
            placeholder={'粘贴HTML，使用 {{变量名}} 作为占位符\n例: <div>{{标题}}</div>\n循环: {{#列表名}}...{{/列表名}}'}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-400">{formatCharCount(htmlChars)} · {(htmlContent.length / 1024).toFixed(1)} KB</span>
            <button className="text-xs text-link font-medium" onClick={handleExtractVars}>自动提取变量</button>
          </div>
          </TemplateEditorFieldCard>
        </div>

        <SectionDivider label={`变量定义（${variables.length} 个）`} />
        <div className="space-y-3 px-3 pb-6">
          {variables.map((v, index) => (
            <TemplateEditorEntryCard key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">变量 {index + 1}</span>
                <div className="flex gap-3">
                  <select
                    value={v.type || 'text'}
                    onChange={(e) => updateVariable(index, 'type', e.target.value)}
                    className="app-field-select text-xs bg-transparent text-gray-500 py-1 pr-7"
                  >
                    <option value="text">文本</option>
                    <option value="number">数字</option>
                    <option value="array">列表</option>
                  </select>
                  <button className="text-xs text-danger whitespace-nowrap" onClick={() => removeVariable(index)}>删除</button>
                </div>
              </div>
              <input
                value={v.name}
                onChange={(e) => updateVariable(index, 'name', e.target.value)}
                className="w-full bg-transparent outline-none text-[14px] text-gray-900 dark:text-white mb-1"
                placeholder="变量名（对应模板中的 {{变量名}}）"
              />
              <input
                value={v.description}
                onChange={(e) => updateVariable(index, 'description', e.target.value)}
                className="w-full bg-transparent outline-none text-[12px] text-gray-500 mb-1"
                placeholder="描述（告诉AI该填什么）"
              />
              <input
                value={v.example || ''}
                onChange={(e) => updateVariable(index, 'example', e.target.value)}
                className="w-full bg-transparent outline-none text-[12px] text-gray-400"
                placeholder="示例值（可选）"
              />
            </TemplateEditorEntryCard>
          ))}
          {variables.length === 0 && <SharedEmptyState className="py-6">暂无变量，可粘贴HTML后点击"自动提取变量"</SharedEmptyState>}
          <button className="app-button app-button-muted w-full whitespace-nowrap" onClick={addVariable}>手动添加变量</button>
          <button className="app-button app-button-danger w-full whitespace-nowrap" onClick={handleDelete}>删除当前模板</button>
        </div>
      </div>
    </div>
  );
};
