import React from 'react';
import type { AnonymousChatSettings } from './anonymousChatUtils';
import { AppSwitch } from '../utils/AppSwitch';

type AnonymousHeaderActionsProps = {
  onOpenHistory: () => void;
  onToggleSettings: () => void;
};

type AnonymousSettingsOverlayProps = {
  visible: boolean;
  settings: AnonymousChatSettings;
  tagDraft: string;
  onTagDraftChange: (value: string) => void;
  onToggleTag: (tag: string) => void;
  onSettingsChange: (updater: (prev: AnonymousChatSettings) => AnonymousChatSettings) => void;
  onClose: () => void;
};

export const AnonymousHeaderActions: React.FC<AnonymousHeaderActionsProps> = ({
  onOpenHistory,
  onToggleSettings
}) => (
  <div className="flex items-center gap-3">
    <button className="app-icon-button" onClick={(event) => { event.stopPropagation(); onOpenHistory(); }}>
      <i className="fa-solid fa-clock-rotate-left text-[15px]"></i>
    </button>
    <button className="app-icon-button" onClick={(event) => { event.stopPropagation(); onToggleSettings(); }}>
      <i className="fa-solid fa-gear text-[15px]"></i>
    </button>
  </div>
);

export const AnonymousSettingsOverlay: React.FC<AnonymousSettingsOverlayProps> = ({
  visible,
  settings,
  tagDraft,
  onTagDraftChange,
  onToggleTag,
  onSettingsChange,
  onClose
}) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[120]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/25" />
      <div
        className="absolute top-[calc(var(--safe-top)+54px)] right-3 w-[86%] max-w-[360px] app-surface-panel rounded-xl p-3 max-h-[60vh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="text-sm font-bold mb-2 render-text-primary">匿名聊天设置</div>
        <div className="app-list-item px-0">
          <div className="app-list-item-main">
            <div className="app-list-item-title">只匹配异性</div>
          </div>
          <div className="app-list-item-side">
            <AppSwitch
              active={settings.onlyOppositeSex}
              onChange={() => onSettingsChange((prev) => ({ ...prev, onlyOppositeSex: !prev.onlyOppositeSex }))}
            />
          </div>
        </div>
        <div className="py-2">
          <div className="text-[13px] mb-2 render-text-primary">筛选年龄</div>
          <div className="flex items-center gap-2 text-sm">
            <input
              type="number"
              min={16}
              max={70}
              value={settings.ageRange[0]}
              onChange={(event) => {
                const nextMin = Math.max(16, Number(event.target.value || 16));
                onSettingsChange((prev) => ({ ...prev, ageRange: [nextMin, Math.max(nextMin, prev.ageRange[1])] }));
              }}
              className="app-field-input w-20 px-2 py-1.5"
            />
            <span className="render-text-secondary">至</span>
            <input
              type="number"
              min={16}
              max={70}
              value={settings.ageRange[1]}
              onChange={(event) => {
                const nextMax = Math.max(16, Number(event.target.value || 35));
                onSettingsChange((prev) => ({ ...prev, ageRange: [Math.min(prev.ageRange[0], nextMax), nextMax] }));
              }}
              className="app-field-input w-20 px-2 py-1.5"
            />
          </div>
        </div>
        <div className="py-2">
          <div className="text-[13px] mb-2 render-text-primary">个性标签（最多6个，逗号分隔）</div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={tagDraft}
              onChange={(event) => onTagDraftChange(event.target.value)}
              placeholder="例如：旅行, 摄影, 羽毛球"
              className="app-field-input flex-1 px-2 py-1.5 text-sm"
            />
            <button
              className="app-button app-button-primary px-3 py-1.5 text-xs min-h-0"
              onClick={() => {
                const nextTags = tagDraft
                  .split(/[，,]/)
                  .map(tag => String(tag || '').trim())
                  .filter(Boolean);
                if (nextTags.length === 0) return;
                onSettingsChange((prev) => ({ ...prev, tags: Array.from(new Set([...prev.tags, ...nextTags])).slice(0, 6) }));
                onTagDraftChange('');
              }}
            >
              添加
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {settings.tags.length === 0 && (
              <span className="text-xs render-text-secondary">未设置，匹配将随机匹配兴趣标签</span>
            )}
            {settings.tags.map(tag => (
              <button
                key={tag}
                className="app-button app-button-muted px-2.5 py-1 rounded-full text-xs min-h-0"
                onClick={() => onToggleTag(tag)}
              >
                {tag} ×
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
