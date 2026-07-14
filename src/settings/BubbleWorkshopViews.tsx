import React, { useState, useRef, useEffect } from 'react';
import type { BubbleTemplate } from '../types';
import { MobileHeader } from '../Common';
import { CollapsibleSection } from '../CommonCollapsible';
import { AppSwitch } from '../utils/UtilsContactFormPrimitives';
import { TemplateEditorFieldCard, TemplateEditorSummaryCard, TemplateListCard } from './TemplateEditorPrimitives';
import { SharedCodeBlock, SharedPreviewCard, SharedSectionCard } from './SharedPanelPrimitives';
import { confirmWechatAction, promptWechatAction } from '../utils/wechatDialog';

/** 自动修复常见CSS语法问题：函数名与括号之间的空格 */
const sanitizeBubbleCSS = (raw: string): string =>
  raw.replace(/(var|calc|rgba?|hsla?|linear-gradient|radial-gradient|conic-gradient|drop-shadow|blur|brightness|contrast|grayscale|hue-rotate|invert|opacity|saturate|sepia|rotate|scale|translate|skew|matrix|perspective|clamp|min|max|env|url|attr|counter|counters|cubic-bezier|steps|repeat|minmax|fit-content|image-set)\s+\(/gi, '$1(');

export const BubbleWorkshopListView: React.FC<{
  templates: BubbleTemplate[];
  setTemplates: (t: BubbleTemplate[]) => void;
  onBack: () => void;
  onEdit: (template: BubbleTemplate) => void;
}> = ({ templates, setTemplates, onBack, onEdit }) => {
  const [keyword, setKeyword] = useState('');

  const addTemplate = () => {
    const create = (name?: string) => {
      if (!name) return;
      const newTemplate: BubbleTemplate = {
        id: `bt-${Date.now()}`,
        name,
        cssContent: '',
        enabled: true,
        createdAt: Date.now(),
      };
      setTemplates([...templates, newTemplate]);
      onEdit(newTemplate);
    };
    promptWechatAction('气泡模板名称', '', create);
  };

  const normalizedKeyword = keyword.trim().toLowerCase();
  const filteredTemplates = templates.filter((tpl) => {
    if (!normalizedKeyword) return true;
    const haystack = `${tpl.name} ${tpl.description || ''}`.toLowerCase();
    return haystack.includes(normalizedKeyword);
  });
  const enabledTemplates = filteredTemplates.filter((tpl) => tpl.enabled);
  const disabledTemplates = filteredTemplates.filter((tpl) => !tpl.enabled);

  const renderTemplateItem = (tpl: BubbleTemplate) => (
    <TemplateListCard key={tpl.id} className="flex items-center gap-3">
      <button className="flex-1 min-w-0 text-left" onClick={() => onEdit(tpl)}>
        <div className="flex items-center gap-2">
          <div className="font-medium text-[14px] leading-5 truncate render-text-primary">{tpl.name}</div>
          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] ${tpl.enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-500/10 text-gray-500'}`}>
            {tpl.enabled ? '已启用' : '未启用'}
          </span>
        </div>
        <div className="text-xs render-text-tertiary mt-1 leading-5 truncate">
          {tpl.description || '暂无描述'}
        </div>
        <div className="text-xs render-text-tertiary mt-0.5">
          {(tpl.cssContent.length / 1024).toFixed(1)}KB
        </div>
      </button>
      <AppSwitch active={tpl.enabled} onChange={() => {
        setTemplates(templates.map((item) => (item.id === tpl.id ? { ...item, enabled: !item.enabled } : item)));
      }} />
    </TemplateListCard>
  );

  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader title="气泡工坊" onBack={onBack} actions={<button className="app-button app-button-primary whitespace-nowrap" onClick={addTemplate}>新增</button>} />
      <div className="px-3 pt-3 pb-2 border-b render-border-subtle render-bg-secondary">
        <TemplateEditorSummaryCard>
          <div className="px-3 py-2 text-xs font-medium render-text-primary border-b render-border-subtle">
            气泡工坊
          </div>
          <div className="p-3 space-y-3 render-bg-tertiary">
            <div className="text-[12px] render-text-secondary">
              自定义气泡 CSS 样式，启用后优先级高于聊天页中的气泡基础与配色设置。
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border render-border bg-white/60 dark:bg-black/10 px-3 py-2">
                <div className="text-[11px] render-text-tertiary">模板总数</div>
                <div className="text-base font-semibold render-text-primary">{templates.length}</div>
              </div>
              <div className="rounded-lg border render-border bg-white/60 dark:bg-black/10 px-3 py-2">
                <div className="text-[11px] render-text-tertiary">已启用</div>
                <div className="text-base font-semibold text-emerald-600">{templates.filter((tpl) => tpl.enabled).length}</div>
              </div>
              <div className="rounded-lg border render-border bg-white/60 dark:bg-black/10 px-3 py-2">
                <div className="text-[11px] render-text-tertiary">搜索结果</div>
                <div className="text-base font-semibold render-text-primary">{filteredTemplates.length}</div>
              </div>
            </div>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索模板名称或描述"
              className="w-full rounded-lg border render-border px-3 py-2 text-sm render-bg-primary"
            />
          </div>
        </TemplateEditorSummaryCard>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-8">
        <CollapsibleSection
          storageKey="bubbleWorkshop:enabled"
          title="已启用"
          summary={enabledTemplates.length > 0 ? `${enabledTemplates.length} 个模板正在生效` : '当前没有启用模板'}
          defaultExpanded
        >
          <div className="space-y-3">
            {enabledTemplates.length > 0 ? enabledTemplates.map(renderTemplateItem) : (
              <div className="text-center text-sm render-text-tertiary py-6">当前没有启用模板</div>
            )}
          </div>
        </CollapsibleSection>
        <CollapsibleSection
          storageKey="bubbleWorkshop:disabled"
          title="未启用"
          summary={disabledTemplates.length > 0 ? `${disabledTemplates.length} 个模板待启用` : '没有未启用模板'}
          defaultExpanded={templates.length === 0}
        >
          <div className="space-y-3">
            {disabledTemplates.length > 0 ? disabledTemplates.map(renderTemplateItem) : (
              <div className="text-center text-sm render-text-tertiary py-6">
                {templates.length === 0 ? '暂无气泡模板，点击右上角“新增”开始创建' : '没有未启用模板'}
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
};

const BUBBLE_CSS_HELPER_PROMPT = `你是CSS样式设计师。请根据我的需求生成气泡样式CSS。

## 渲染环境
- 气泡在移动端聊天界面中渲染
- 我的消息类名: .message-bubble-me
- 对方消息类名: .message-bubble-other

## 可用CSS变量（仅用于布局与统一外观）
- --app-bubble-radius: 气泡圆角
- --app-bubble-padding-x / --app-bubble-padding-y: 气泡内边距
- --app-bubble-shadow: 气泡阴影
- --app-tail-size: 尾巴尺寸

## 设计要求
1. 仅输出CSS代码，不要代码围栏
2. 使用 .message-bubble-me / .message-bubble-other 选择器
3. 可以创造性地使用 border、box-shadow、background、渐变（linear-gradient等）、backdrop-filter 等
4. 确保文字可读性
5. 【强制】气泡颜色必须直接写死（如 #RRGGBB / rgba / hsl / linear-gradient等），不要依赖主题变量
6. 【强制禁止】不要使用以下变量：--bubble-me、--bubble-other、--bubble-text-me、--bubble-text-other
7. 【强制禁止】不要写 var(--bubble-me, ...)、var(--bubble-other, ...)、var(--bubble-text-me, ...)、var(--bubble-text-other, ...) 这类带回退值的写法（在本项目中会被默认值覆盖导致颜色不生效）
8. 【重要】CSS函数名与括号之间不要有空格，正确: var(--x)、calc(1px)、rgba(0,0,0,0.5)、linear-gradient(...)，错误: var (--x)、calc (1px)
9. 如需生成“尾巴/贴纸/角标”等伪元素装饰，请使用 ::before/::after，并在选择器前加 [data-render-skin] 前缀；对 content 与 display 使用 !important（兼容不同皮肤优先级）

## 可创作方向（可选）
- 背景：纯色/渐变/纹理叠加（repeating-linear-gradient等）
- 玻璃：半透明背景 + backdrop-filter + 柔和阴影
- 图片：background-image:url(...) 叠加纹理，或用伪元素做贴纸/角标
- 质感：inset box-shadow 做描边/高光，少量噪点纹理提升层次

## 输出示例（固定配色 + 可选尾巴/装饰）
.message-bubble-me {
  background: linear-gradient(135deg, #ffcce5, #ffb3d9);
  color: #fff;
  border-bottom-right-radius: calc(var(--app-bubble-radius) / 2);
}
.message-bubble-other {
  background: #fff;
  color: #e66799;
  border: 1px solid rgba(255, 204, 229, 0.5);
  border-bottom-left-radius: calc(var(--app-bubble-radius) / 2);
}

/* 可选：三角小尾巴（如不需要，可删除本段） */
[data-render-skin] .message-bubble-me::after {
  content: "" !important;
  display: block !important;
  position: absolute;
  right: calc(var(--app-tail-size, 8px) * -1);
  bottom: 0;
  width: 0;
  height: 0;
  border-top: var(--app-tail-size, 8px) solid transparent;
  border-bottom: var(--app-tail-size, 8px) solid transparent;
  border-left: var(--app-tail-size, 8px) solid #ffcce5;
  pointer-events: none;
}
[data-render-skin] .message-bubble-other::after {
  content: "" !important;
  display: block !important;
  position: absolute;
  left: calc(var(--app-tail-size, 8px) * -1);
  bottom: 0;
  width: 0;
  height: 0;
  border-top: var(--app-tail-size, 8px) solid transparent;
  border-bottom: var(--app-tail-size, 8px) solid transparent;
  border-right: var(--app-tail-size, 8px) solid #fff;
  pointer-events: none;
}

/* 可选：图片贴纸/角标（示例） */
[data-render-skin] .message-bubble-me::before {
  content: "" !important;
  display: block !important;
  position: absolute;
  top: -10px;
  right: 8px;
  width: 18px;
  height: 18px;
  background-image: url("你的图片链接");
  background-size: contain;
  background-repeat: no-repeat;
  opacity: 0.9;
  pointer-events: none;
}

## 严格禁止（会破坏布局）
- 不要在 .message-bubble-me / .message-bubble-other 本体上设置 display（如 inline-block、flex 等）
- 不要在 .message-bubble-me / .message-bubble-other 本体上设置 position（如 relative、absolute 等）
- 不要在本体上设置 max-width / width / height / min-width / min-height
- 不要在本体上设置 word-break / word-wrap / overflow-wrap / white-space
- 不要在本体上设置 font-size / line-height / letter-spacing / text-shadow
- 不要在本体上设置 margin / float / clear / overflow
- 只修改本体的视觉装饰属性：background、color、border、border-radius、box-shadow、padding、opacity、backdrop-filter、outline、transform(仅视觉变换)
- 允许在 ::before/::after 上使用 content、position、top/left/right/bottom/inset、width/height、background-image、background-size、background-repeat、pointer-events、filter、transform 等做装饰
- 如果输出包含以上禁止属性，必须删除后重新输出

我的需求是：[在这里描述你想要的气泡风格]`;

export const BubbleWorkshopEditView: React.FC<{
  template: BubbleTemplate;
  onBack: () => void;
  onSave: (next: BubbleTemplate) => void;
  onDelete?: (id: string) => void;
}> = ({ template, onBack, onSave, onDelete }) => {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description || '');
  const [cssContent, setCssContent] = useState(template.cssContent);
  const [promptCopied, setPromptCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(BUBBLE_CSS_HELPER_PROMPT).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = BUBBLE_CSS_HELPER_PROMPT;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    });
  };

  const handleSave = () => {
    onSave({
      ...template,
      name: name.trim() || '未命名气泡',
      description: description.trim(),
      cssContent: sanitizeBubbleCSS(cssContent),
      updatedAt: Date.now(),
    });
    onBack();
  };

  const handleDelete = () => {
    if (!onDelete) return;
    const remove = () => { onDelete(template.id); onBack(); };
    confirmWechatAction(`确定删除「${template.name}」吗？`, remove);
  };

  // 实时预览：将CSS注入隔离容器
  const sanitizedCSS = sanitizeBubbleCSS(cssContent);

  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;
    const shadow = container.shadowRoot || container.attachShadow({ mode: 'open' });
    const rootStyles = getComputedStyle(document.documentElement);
    const bubbleMe = rootStyles.getPropertyValue('--bubble-me').trim() || '#95EC69';
    const bubbleOther = rootStyles.getPropertyValue('--bubble-other').trim() || '#fff';
    const bubbleTextMe = rootStyles.getPropertyValue('--bubble-text-me').trim() || '#000';
    const bubbleTextOther = rootStyles.getPropertyValue('--bubble-text-other').trim() || '#000';
    const bubbleRadius = rootStyles.getPropertyValue('--app-bubble-radius').trim() || '12px';

    shadow.innerHTML = `
      <style>
        :host { display: block; }
        .preview-wrapper {
          --bubble-me: ${bubbleMe};
          --bubble-other: ${bubbleOther};
          --bubble-text-me: ${bubbleTextMe};
          --bubble-text-other: ${bubbleTextOther};
          --app-bubble-radius: ${bubbleRadius};
          --app-bubble-padding-x: 12px;
          --app-bubble-padding-y: 8px;
          --app-bubble-shadow: 0 1px 2px rgba(0,0,0,0.1);
          --app-tail-size: 6px;
          padding: 12px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 14px;
        }
        .msg-row { display: flex; margin-bottom: 10px; }
        .msg-row.left { justify-content: flex-start; }
        .msg-row.right { justify-content: flex-end; }
        .message-bubble-other {
          background: var(--bubble-other);
          color: var(--bubble-text-other);
          border-radius: var(--app-bubble-radius);
          padding: var(--app-bubble-padding-y) var(--app-bubble-padding-x);
          max-width: 75%;
          box-shadow: var(--app-bubble-shadow);
          word-break: break-all;
        }
        .message-bubble-me {
          background: var(--bubble-me);
          color: var(--bubble-text-me);
          border-radius: var(--app-bubble-radius);
          padding: var(--app-bubble-padding-y) var(--app-bubble-padding-x);
          max-width: 75%;
          box-shadow: var(--app-bubble-shadow);
          word-break: break-all;
        }
        ${sanitizedCSS}
      </style>
      <div class="preview-wrapper">
        <div class="msg-row left">
          <div class="message-bubble-other">你好呀 👋</div>
        </div>
        <div class="msg-row right">
          <div class="message-bubble-me">这是气泡预览效果</div>
        </div>
        <div class="msg-row left">
          <div class="message-bubble-other">看起来怎么样？</div>
        </div>
        <div class="msg-row right">
          <div class="message-bubble-me">非常不错！🎉</div>
        </div>
      </div>
    `;
  }, [sanitizedCSS]);

  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader
        title="编辑气泡"
        onBack={onBack}
        actions={<button className="app-button app-button-primary whitespace-nowrap" onClick={handleSave}>保存</button>}
      />
      <div className="px-3 pt-3 pb-2 border-b render-border-subtle render-bg-secondary">
        <div className="rounded-xl border render-border overflow-hidden">
          <div className="px-3 py-2 text-xs font-medium render-text-primary border-b render-border-subtle">
            模板概览
          </div>
          <div className="p-3 space-y-3 render-bg-tertiary">
            <div className="text-[12px] render-text-secondary">
              在这里编辑单个气泡模板。保存后会立即参与气泡工坊渲染，优先级高于聊天页里的普通气泡设置。
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border render-border bg-white/60 dark:bg-black/10 px-3 py-2">
                <div className="text-[11px] render-text-tertiary">模板名称</div>
                <div className="text-sm font-semibold render-text-primary truncate">{name.trim() || '未命名气泡'}</div>
              </div>
              <div className="rounded-lg border render-border bg-white/60 dark:bg-black/10 px-3 py-2">
                <div className="text-[11px] render-text-tertiary">CSS 大小</div>
                <div className="text-sm font-semibold render-text-primary">{(cssContent.length / 1024).toFixed(1)}KB</div>
              </div>
              <div className="rounded-lg border render-border bg-white/60 dark:bg-black/10 px-3 py-2">
                <div className="text-[11px] render-text-tertiary">状态</div>
                <div className={`text-sm font-semibold ${template.enabled ? 'text-emerald-600' : 'render-text-primary'}`}>{template.enabled ? '已启用' : '未启用'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-8">
        <CollapsibleSection
          storageKey="bubbleWorkshop:edit:basic"
          title="基础信息"
          summary={description.trim() ? '已填写名称与说明' : '可填写名称与说明'}
          defaultExpanded
        >
          <div className="space-y-3">
            <TemplateEditorFieldCard className="border render-border">
              <div className="text-[11px] text-gray-500 mb-1">名称</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent outline-none text-[14px] render-text-primary"
                placeholder="如：渐变彩虹气泡"
              />
            </TemplateEditorFieldCard>
            <TemplateEditorFieldCard className="border render-border">
              <div className="text-[11px] text-gray-500 mb-1">描述</div>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-transparent outline-none text-[14px] render-text-primary"
                placeholder="气泡样式说明"
              />
            </TemplateEditorFieldCard>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          storageKey="bubbleWorkshop:edit:preview"
          title="实时预览"
          summary="预览左右消息气泡效果"
          defaultExpanded
        >
          <SharedPreviewCard title="效果预览">
            <div ref={previewRef} />
          </SharedPreviewCard>
        </CollapsibleSection>

        <CollapsibleSection
          storageKey="bubbleWorkshop:edit:prompt"
          title="AI 提示词帮手"
          summary="复制提示词，让 AI 帮你生成气泡 CSS"
          defaultExpanded={false}
        >
          <SharedSectionCard>
            <div className="text-[13px] render-text-secondary">仅提供提示词，不在应用内直接生成。</div>
            <SharedCodeBlock className="max-h-[240px]">{BUBBLE_CSS_HELPER_PROMPT}</SharedCodeBlock>
            <button
              type="button"
              className="app-button app-button-primary w-full text-[13px]"
              onClick={handleCopyPrompt}
            >
              {promptCopied ? '已复制到剪贴板' : '复制提示词'}
            </button>
          </SharedSectionCard>
        </CollapsibleSection>

        <CollapsibleSection
          storageKey="bubbleWorkshop:edit:css"
          title="CSS 内容"
          summary={cssContent.trim() ? '已填写 CSS' : '尚未填写 CSS'}
          defaultExpanded={false}
        >
          <TemplateEditorFieldCard className="border render-border">
            <textarea
              value={cssContent}
              onChange={(e) => setCssContent(e.target.value)}
              className="w-full min-h-[220px] bg-transparent outline-none text-[13px] render-text-primary resize-none font-mono"
              placeholder={'.message-bubble-me {\n  background: linear-gradient(135deg, #667eea, #764ba2);\n  color: #fff;\n}\n.message-bubble-other {\n  background: #f0f0f0;\n  color: #333;\n}'}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs render-text-tertiary">{(cssContent.length / 1024).toFixed(1)} KB</span>
              {cssContent !== sanitizedCSS ? (
                <span className="text-xs text-orange-500">已自动修复函数名空格</span>
              ) : null}
            </div>
          </TemplateEditorFieldCard>
        </CollapsibleSection>

        <CollapsibleSection
          storageKey="bubbleWorkshop:edit:danger"
          title="危险操作"
          summary="删除当前模板"
          defaultExpanded={false}
        >
          <button type="button" className="app-button app-button-danger w-full whitespace-nowrap" onClick={handleDelete}>
            删除当前模板
          </button>
        </CollapsibleSection>
      </div>
    </div>
  );
};
