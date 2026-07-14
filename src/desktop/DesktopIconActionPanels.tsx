import React from 'react';
import type { DesktopIcon, DesktopWidget } from '../types';

export type DesktopIconMenuState = {
  id: string;
  x: number;
  y: number;
};

type DesktopIconActionPanelsProps = {
  iconMenu: DesktopIconMenuState | null;
  icons: DesktopIcon[];
  dockIconIds?: string[];
  renameIconId: string | null;
  renameValue: string;
  notesEditWidgetId: string | null;
  notesEditValue: string;
  widgets: DesktopWidget[];
  accentColor: string;
  onCloseIconMenu: () => void;
  onOpenRename: (iconId: string, name: string) => void;
  onRenameValueChange: (value: string) => void;
  onCloseRename: () => void;
  onSaveIcons: (icons: DesktopIcon[]) => void;
  onDockIconIdsChange: (ids?: string[]) => void;
  onStartEditIcon: (iconId: string) => void;
  onCloseNotesEdit: () => void;
  onNotesEditValueChange: (value: string) => void;
  onSaveWidgetConfig: (widgetId: string, config: Record<string, any>) => void;
};

type IconMenuItem = {
  label: string;
  icon: string;
  danger?: boolean;
  action: () => void;
};

export const DesktopIconActionPanels: React.FC<DesktopIconActionPanelsProps> = ({
  iconMenu,
  icons,
  dockIconIds,
  renameIconId,
  renameValue,
  notesEditWidgetId,
  notesEditValue,
  widgets,
  accentColor,
  onCloseIconMenu,
  onOpenRename,
  onRenameValueChange,
  onCloseRename,
  onSaveIcons,
  onDockIconIdsChange,
  onStartEditIcon,
  onCloseNotesEdit,
  onNotesEditValueChange,
  onSaveWidgetConfig
}) => {
  const activeIcon = iconMenu ? icons.find((icon) => icon.id === iconMenu.id) || null : null;
  const renameIcon = renameIconId ? icons.find((icon) => icon.id === renameIconId) || null : null;
  const notesWidget = notesEditWidgetId ? widgets.find((widget) => widget.id === notesEditWidgetId) || null : null;

  const saveRename = () => {
    if (!renameIcon) return;
    const newName = renameValue.trim();
    if (newName && newName !== renameIcon.name) {
      onSaveIcons(icons.map((icon) => icon.id === renameIcon.id ? { ...icon, name: newName } : icon));
    }
    onCloseRename();
  };

  const saveNotes = () => {
    if (!notesWidget) return;
    onSaveWidgetConfig(notesWidget.id, { content: notesEditValue.trim() });
    onCloseNotesEdit();
  };

  const menuItems: IconMenuItem[] = activeIcon ? (() => {
    const currentDockIds = dockIconIds || [];
    const isInDock = currentDockIds.includes(activeIcon.id);

    return [
      {
        label: '重命名',
        icon: 'fa-pen',
        action: () => onOpenRename(activeIcon.id, activeIcon.name)
      },
      {
        label: '更换图标',
        icon: 'fa-image',
        action: () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              onSaveIcons(icons.map((icon) => icon.id === activeIcon.id ? { ...icon, customIconUrl: dataUrl } : icon));
            };
            reader.readAsDataURL(file);
          };
          input.click();
          onCloseIconMenu();
        }
      },
      {
        label: isInDock ? '从Dock移除' : '添加到Dock',
        icon: isInDock ? 'fa-minus' : 'fa-plus',
        action: () => {
          if (isInDock) {
            const nextIds = currentDockIds.filter((id) => id !== activeIcon.id);
            onDockIconIdsChange(nextIds.length ? nextIds : undefined);
          } else if (currentDockIds.length < 4) {
            onDockIconIdsChange([...currentDockIds, activeIcon.id]);
          }
          onCloseIconMenu();
        }
      },
      {
        label: '编辑排列',
        icon: 'fa-arrows-up-down-left-right',
        action: () => onStartEditIcon(activeIcon.id)
      },
      {
        label: '删除图标',
        icon: 'fa-trash',
        danger: true,
        action: () => {
          if (confirm(`确定要删除「${activeIcon.name}」吗？`)) {
            onSaveIcons(icons.filter((icon) => icon.id !== activeIcon.id));
            if (isInDock) {
              const nextIds = currentDockIds.filter((id) => id !== activeIcon.id);
              onDockIconIdsChange(nextIds.length ? nextIds : undefined);
            }
          }
          onCloseIconMenu();
        }
      }
    ];
  })() : [];

  return (
    <>
      {iconMenu && activeIcon && (
        <>
          <div className="fixed inset-0 z-[65]" onClick={onCloseIconMenu} />
          <div
            className="fixed z-[70] bg-white rounded-xl shadow-2xl py-2 min-w-[160px]"
            style={{
              left: Math.min(Math.max(iconMenu.x - 80, 8), window.innerWidth - 176),
              top: Math.min(iconMenu.y + 8, window.innerHeight - 240)
            }}
          >
            {menuItems.map((item, index) => (
              <button
                key={`${item.label}-${index}`}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${item.danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-100'}`}
                onClick={item.action}
              >
                <i className={`fa-solid ${item.icon} w-4 text-center`} />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      {renameIcon && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50" onClick={onCloseRename}>
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 mx-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-1 text-gray-800">重命名图标</h3>
            <p className="text-xs text-gray-500 mb-4">当前：{renameIcon.name}</p>
            <input
              type="text"
              value={renameValue}
              onChange={(event) => onRenameValueChange(event.target.value)}
              placeholder="输入新名称"
              className="w-full px-4 py-3 rounded-xl bg-gray-100 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-400 mb-4"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  saveRename();
                }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <button className="flex-1 py-2.5 rounded-xl bg-gray-200 text-gray-600 text-sm" onClick={onCloseRename}>取消</button>
              <button
                className="flex-1 py-2.5 rounded-xl text-white text-sm"
                style={{ backgroundColor: accentColor }}
                onClick={saveRename}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {notesWidget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50" onClick={onCloseNotesEdit}>
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 mx-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-1 text-gray-800">编辑便签</h3>
            <p className="text-xs text-gray-500 mb-4">直接输入内容，保存后即时更新</p>
            <textarea
              value={notesEditValue}
              onChange={(event) => onNotesEditValueChange(event.target.value)}
              placeholder="输入便签内容..."
              className="w-full px-4 py-3 rounded-xl bg-gray-100 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-400 mb-4 h-32 resize-none"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && event.metaKey) {
                  saveNotes();
                }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <button className="flex-1 py-2.5 rounded-xl bg-gray-200 text-gray-600 text-sm" onClick={onCloseNotesEdit}>取消</button>
              <button
                className="flex-1 py-2.5 rounded-xl text-white text-sm"
                style={{ backgroundColor: accentColor }}
                onClick={saveNotes}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DesktopIconActionPanels;
