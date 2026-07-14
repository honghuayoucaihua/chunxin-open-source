import React from 'react';
import type { DesktopWidget } from '../types';

export type DesktopWidgetPreset = {
  type: DesktopWidget['type'];
  name: string;
  icon: string;
  width: number;
  height: number;
};

type TodoConfigItem = {
  text: string;
  done: boolean;
};

export const WIDGET_TYPES: DesktopWidgetPreset[] = [
  { type: 'clock', name: '时钟', icon: 'fa-clock', width: 2, height: 1 },
  { type: 'clock', name: '时钟(大)', icon: 'fa-clock', width: 4, height: 1 },
  { type: 'clock', name: '时钟(方)', icon: 'fa-clock', width: 2, height: 2 },
  { type: 'date', name: '日期', icon: 'fa-calendar-day', width: 2, height: 1 },
  { type: 'music', name: '音乐', icon: 'fa-music', width: 2, height: 1 },
  { type: 'music', name: '音乐(大)', icon: 'fa-music', width: 4, height: 1 },
  { type: 'notes', name: '便签', icon: 'fa-note-sticky', width: 2, height: 1 },
  { type: 'notes', name: '便签(大)', icon: 'fa-note-sticky', width: 2, height: 2 },
  { type: 'countdown', name: '倒计时', icon: 'fa-hourglass-half', width: 2, height: 1 },
  { type: 'countdown', name: '倒计时(大)', icon: 'fa-hourglass-half', width: 2, height: 2 },
  { type: 'image', name: '图片', icon: 'fa-image', width: 2, height: 2 },
  { type: 'image', name: '图片(宽)', icon: 'fa-image', width: 4, height: 2 },
  { type: 'todo', name: '待办', icon: 'fa-list-check', width: 2, height: 2 },
  { type: 'calendar', name: '日历', icon: 'fa-calendar', width: 2, height: 2 },
  { type: 'battery', name: '电量', icon: 'fa-battery-full', width: 1, height: 1 },
];

export const getDesktopWidgetName = (type: DesktopWidget['type']): string =>
  WIDGET_TYPES.find((widgetType) => widgetType.type === type)?.name || '小组件';

const toTodoConfigItems = (items: unknown): TodoConfigItem[] => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (typeof item === 'string') {
      return { text: item, done: false };
    }
    if (item && typeof item === 'object') {
      const source = item as { text?: unknown; done?: unknown };
      return {
        text: String(source.text || ''),
        done: Boolean(source.done),
      };
    }
    return { text: '', done: false };
  }).filter((item) => item.text.trim());
};

const buildTodoConfigItems = (rawText: string, currentItems: unknown): TodoConfigItem[] => {
  const existingItems = toTodoConfigItems(currentItems);
  return rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => {
      const existingItem = existingItems.find((item) => item.text === text);
      return existingItem ? { text, done: existingItem.done } : { text, done: false };
    });
};

export const DesktopWidgetPickerSheet: React.FC<{
  accentColor: string;
  onClose: () => void;
  onSelect: (preset: DesktopWidgetPreset) => void;
}> = ({ accentColor, onClose, onSelect }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-white/95 p-6 backdrop-blur-xl" onClick={(event) => event.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold text-gray-800">添加小组件</h3>
        <div className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto">
          {WIDGET_TYPES.map((widgetType) => (
            <button
              key={`${widgetType.type}-${widgetType.width}x${widgetType.height}`}
              className="flex items-center gap-3 rounded-xl bg-gray-100 p-3 transition-colors hover:bg-gray-200"
              onClick={() => onSelect(widgetType)}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: accentColor }}>
                <i className={`fa-solid ${widgetType.icon} text-white`} />
              </div>
              <div className="text-left">
                <div className="text-sm text-gray-700">{widgetType.name}</div>
                <div className="text-xs text-gray-400">{widgetType.width}x{widgetType.height}</div>
              </div>
            </button>
          ))}
        </div>
        <button
          className="mt-4 w-full rounded-xl bg-gray-200 py-3 text-gray-600"
          onClick={onClose}
        >
          取消
        </button>
      </div>
    </div>
  );
};

export const DesktopWidgetConfigDialog: React.FC<{
  widget: DesktopWidget;
  accentColor: string;
  onClose: () => void;
  onSave: (widgetId: string, config: Record<string, any>) => void;
}> = ({ widget, accentColor, onClose, onSave }) => {
  const imageInputId = `desktop-widget-image-file-${widget.id}`;
  const widgetName = getDesktopWidgetName(widget.type);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (widget.type === 'countdown') {
      onSave(widget.id, {
        title: String(formData.get('title') || ''),
        mode: String(formData.get('mode') || 'countdown') as 'countdown' | 'anniversary',
        targetDate: String(formData.get('targetDate') || ''),
        repeat: String(formData.get('repeat') || 'none') as 'none' | 'yearly' | 'monthly' | 'weekly',
        displayMode: String(formData.get('displayMode') || 'auto') as 'auto' | 'full' | 'days',
      });
      return;
    }

    if (widget.type === 'image') {
      onSave(widget.id, {
        url: String(formData.get('url') || ''),
      });
      return;
    }

    if (widget.type === 'notes') {
      onSave(widget.id, {
        content: String(formData.get('content') || ''),
      });
      return;
    }

    if (widget.type === 'todo') {
      onSave(widget.id, {
        items: buildTodoConfigItems(String(formData.get('items') || ''), widget.config?.items),
      });
    }
  };

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      onSave(widget.id, { url: readerEvent.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6" onClick={(event) => event.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold text-gray-800">编辑{widgetName}</h3>
        <form onSubmit={handleSubmit}>
          {widget.type === 'countdown' && (
            <>
              <label className="mb-1 block text-sm text-gray-600">标题</label>
              <input name="title" defaultValue={widget.config?.title || ''} className="mb-3 w-full rounded-xl bg-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" placeholder="例如：新年、恋爱纪念日" />
              <label className="mb-1 block text-sm text-gray-600">模式</label>
              <div className="mb-3 flex gap-2">
                {(['countdown', 'anniversary'] as const).map((mode) => (
                  <label key={mode} className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gray-100 py-2 text-sm transition-colors hover:bg-gray-200">
                    <input type="radio" name="mode" value={mode} defaultChecked={(widget.config?.mode || 'countdown') === mode} className="accent-blue-500" />
                    {mode === 'countdown' ? '倒计时' : '纪念日'}
                  </label>
                ))}
              </div>
              <label className="mb-1 block text-sm text-gray-600">目标时间</label>
              <input name="targetDate" type="datetime-local" defaultValue={widget.config?.targetDate ? widget.config.targetDate.slice(0, 16) : ''} className="mb-3 w-full rounded-xl bg-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
              <label className="mb-1 block text-sm text-gray-600">重复周期</label>
              <select name="repeat" defaultValue={widget.config?.repeat || 'none'} className="app-field-select mb-3 bg-gray-100 text-sm">
                <option value="none">不重复</option>
                <option value="yearly">每年</option>
                <option value="monthly">每月</option>
                <option value="weekly">每周</option>
              </select>
              <label className="mb-1 block text-sm text-gray-600">显示模式</label>
              <select name="displayMode" defaultValue={widget.config?.displayMode || 'auto'} className="app-field-select mb-4 bg-gray-100 text-sm">
                <option value="auto">自动（大于1天只显示天数）</option>
                <option value="full">完整（天时分秒）</option>
                <option value="days">仅天数</option>
              </select>
            </>
          )}

          {widget.type === 'image' && (
            <>
              <label className="mb-1 block text-sm text-gray-600">图片 URL</label>
              <input name="url" defaultValue={widget.config?.url || ''} className="mb-2 w-full rounded-xl bg-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" placeholder="https://..." />
              <div className="mb-4">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id={imageInputId}
                  onChange={handleImageFileChange}
                />
                <label htmlFor={imageInputId} className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs text-blue-600 transition-colors hover:bg-blue-100">
                  <i className="fa-solid fa-upload" />
                  <span>上传本地图片</span>
                </label>
              </div>
            </>
          )}

          {widget.type === 'notes' && (
            <>
              <label className="mb-1 block text-sm text-gray-600">内容</label>
              <textarea name="content" defaultValue={widget.config?.content || ''} className="mb-4 h-24 w-full resize-none rounded-xl bg-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" placeholder="输入便签内容..." />
            </>
          )}

          {widget.type === 'todo' && (
            <>
              <label className="mb-1 block text-sm text-gray-600">待办事项（每行一个）</label>
              <textarea name="items" defaultValue={toTodoConfigItems(widget.config?.items).map((item) => item.text).join('\n')} className="mb-4 h-24 w-full resize-none rounded-xl bg-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" placeholder={'任务1\n任务2'} />
            </>
          )}

          <div className="flex gap-2">
            <button type="button" className="flex-1 rounded-xl bg-gray-200 py-2 text-sm text-gray-600" onClick={onClose}>取消</button>
            <button type="submit" className="flex-1 rounded-xl py-2 text-sm text-white" style={{ backgroundColor: accentColor }}>保存</button>
          </div>
        </form>
      </div>
    </div>
  );
};
