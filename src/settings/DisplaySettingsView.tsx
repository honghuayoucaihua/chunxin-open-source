import React from 'react';
import { AppearanceSettings } from '../types';
import { DEFAULT_APPEARANCE_SETTINGS } from '../constants';
import { MobileHeader, SectionDivider } from '../Common';
import { BUILT_IN_RENDER_SKINS, type AppRenderConfig } from '../render-schema';
import { InlineSegmentedRow, InlineSwitchRow } from '../utils/UtilsContactFormPrimitives';
import { confirmWechatAction } from '../utils/wechatDialog';

const FONT_FAMILY_OPTIONS: Array<{ key: AppearanceSettings['fontFamily']; label: string; subtitle: string }> = [
  { key: 'system', label: '系统默认', subtitle: '跟随系统字体' },
  { key: 'pingfang', label: '苹方优先', subtitle: '中文观感更接近 iOS' },
  { key: 'noto', label: 'Noto Sans', subtitle: 'CDN 字体，跨平台统一' },
  { key: 'serif', label: '衬线字体', subtitle: 'CDN 字体，阅读感更强' },
  { key: 'mono', label: '等宽字体', subtitle: 'CDN 字体，技术风格' },
  { key: 'custom', label: '自定义字体', subtitle: '上传本地字体文件' }
];

const DARK_CONTRAST_OPTIONS: Array<{ key: AppearanceSettings['darkContrast']; label: string; desc: string }> = [
  { key: 'soft', label: '柔和', desc: '更护眼，明暗差更小' },
  { key: 'standard', label: '标准', desc: '平衡默认观感' },
  { key: 'high', label: '高对比', desc: '文字更醒目，层次更清晰' }
];

export const DisplaySettingsView: React.FC<{ settings: AppearanceSettings, setSettings: React.Dispatch<React.SetStateAction<AppearanceSettings>>, onBack: () => void }> = ({ settings, setSettings, onBack }) => {
  const currentCfg: AppRenderConfig = settings.renderConfig || BUILT_IN_RENDER_SKINS[settings.renderSkinId];
  const safeLineHeight = Number.isFinite(Number(currentCfg.typography.lineHeight)) ? Number(currentCfg.typography.lineHeight) : 1.6;
  const safeLetterSpacing = Number.isFinite(Number(currentCfg.typography.letterSpacing)) ? Number(currentCfg.typography.letterSpacing) : 0;
  const safeMessageMaxWidth = Number.isFinite(Number(currentCfg.chat.bubble.maxWidthPercent)) ? Number(currentCfg.chat.bubble.maxWidthPercent) : 85;
  const safeAvatarRadius = Number.isFinite(Number(currentCfg.chat.meta.avatarRadius)) ? Number(currentCfg.chat.meta.avatarRadius) : 4;
  const safeAvatarShape: 'default' | 'square' | 'circle' = currentCfg.chat.meta.avatarShape === 'rounded' ? 'default' : currentCfg.chat.meta.avatarShape;
  const safeNotificationTextSize = Number.isFinite(Number(settings.notificationTextSize)) ? Math.max(10, Math.min(24, Number(settings.notificationTextSize))) : 12;
  const update = (patch: Partial<AppearanceSettings>) => setSettings(prev => ({ ...prev, ...patch }));
  const updateRenderConfig = (updater: (cfg: AppRenderConfig) => AppRenderConfig) => {
    setSettings(prev => {
      const base = prev.renderConfig || BUILT_IN_RENDER_SKINS[prev.renderSkinId];
      return {
        ...prev,
        renderConfig: updater(base)
      };
    });
  };
  const customFontInputRef = React.useRef<HTMLInputElement>(null);

  const handleUploadCustomFont = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl.startsWith('data:')) {
        alert('字体读取失败，请重试');
        return;
      }
      update({
        fontFamily: 'custom',
        customFontName: file.name.replace(/\.[^/.]+$/, ''),
        customFontDataUrl: dataUrl
      });
    };
    reader.onerror = () => alert('字体读取失败，请重试');
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    confirmWechatAction('确定要将所有显示设置恢复为默认值吗？', () => {
      setSettings(DEFAULT_APPEARANCE_SETTINGS);
    });
  };

  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader
        title="显示设置"
        onBack={onBack}
        actions={<button onClick={handleReset} className="app-button app-button-muted whitespace-nowrap">恢复默认</button>}
      />

      <div className="flex-1 overflow-y-auto pb-10">
        <SectionDivider label="消息显示核心" />
        <div className="render-bg-secondary p-4 space-y-4">
          <div className="render-bg-secondary -m-4 mb-0">
            <InlineSwitchRow
              label="聊天气泡允许换行"
              desc="关闭时会忽略消息中的手动换行"
              active={!!settings.allowBubbleLineBreak}
              onChange={() => update({ allowBubbleLineBreak: !settings.allowBubbleLineBreak })}
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block uppercase font-bold">聊天气泡最大宽度（{safeMessageMaxWidth}%）</label>
            <input
              type="range"
              min="60"
              max="95"
              step="1"
              value={safeMessageMaxWidth}
              onChange={(e) => {
                const next = parseInt(e.target.value, 10);
                updateRenderConfig(cfg => ({
                  ...cfg,
                  chat: {
                    ...cfg.chat,
                    bubble: {
                      ...cfg.chat.bubble,
                      maxWidthPercent: next
                    }
                  }
                }));
              }}
              className="w-full accent-[var(--app-accent-color)]"
            />
            <p className="text-xs text-gray-400 mt-1">值越大，单条消息可占用更多横向空间。</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block uppercase font-bold">头像形状</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'default', label: '默认', desc: '默认' },
                { key: 'square', label: '方形', desc: '无圆角' },
                { key: 'circle', label: '圆形', desc: '纯圆头像' }
              ].map(item => {
                const active = safeAvatarShape === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      if (item.key === 'default') {
                        updateRenderConfig(cfg => ({
                          ...cfg,
                          chat: {
                            ...cfg.chat,
                            meta: {
                              ...cfg.chat.meta,
                              avatarShape: 'rounded',
                              avatarRadius: 4
                            }
                          }
                        }));
                        return;
                      }
                      updateRenderConfig(cfg => ({
                        ...cfg,
                        chat: {
                          ...cfg.chat,
                          meta: {
                            ...cfg.chat.meta,
                            avatarShape: item.key as 'square' | 'circle'
                          }
                        }
                      }));
                    }}
                    className={`rounded border px-2 py-2 text-left transition-colors ${active ? 'text-white' : 'render-border render-text-secondary'}`}
                    style={active ? { backgroundColor: 'var(--app-accent-color)', borderColor: 'var(--app-accent-color)' } : {}}
                  >
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className={`text-[11px] mt-1 ${active ? 'text-white/85' : 'text-gray-400'}`}>{item.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block uppercase font-bold">统一间距（{currentCfg.chat.messageSpacing}px）</label>
            <input
              type="range"
              min="8"
              max="28"
              step="1"
              value={currentCfg.chat.messageSpacing}
              onChange={(e) => {
                const next = parseInt(e.target.value, 10);
                updateRenderConfig(cfg => ({
                  ...cfg,
                  chat: {
                    ...cfg.chat,
                    messageSpacing: next
                  }
                }));
              }}
              className="w-full accent-[var(--app-accent-color)]"
            />
            <p className="text-xs text-gray-400 mt-1">统一影响：消息间距、列表 cell 上下内边距、会话内容区留白。</p>
          </div>
        </div>

        <SectionDivider label="字体与排版" />
        <div className="render-bg-secondary p-4 space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-2 block uppercase font-bold">字体家族</label>
            <div className="grid grid-cols-2 gap-2">
              {FONT_FAMILY_OPTIONS.map(item => {
                const active = settings.fontFamily === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => update({ fontFamily: item.key })}
                    className={`rounded-lg border p-2.5 text-left transition-colors ${active ? 'text-white' : 'render-border render-text-primary'}`}
                    style={active ? { backgroundColor: 'var(--app-accent-color)', borderColor: 'var(--app-accent-color)' } : {}}
                  >
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className={`text-[11px] mt-1 ${active ? 'text-white/85' : 'text-gray-400'}`}>{item.subtitle}</div>
                  </button>
                );
              })}
            </div>

            <input
              ref={customFontInputRef}
              type="file"
              accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
              className="hidden"
              onChange={(e) => handleUploadCustomFont(e.target.files?.[0])}
            />

            <div className="mt-3 flex items-center gap-2">
              <button
                className="px-3 py-1.5 rounded-md text-xs border render-border-subtle render-text-primary"
                onClick={() => customFontInputRef.current?.click()}
              >
                上传字体文件
              </button>
              {settings.customFontName && (
                <span className="text-xs text-gray-500 truncate max-w-[180px]">当前：{settings.customFontName}</span>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block uppercase font-bold">全局字体大小（{currentCfg.typography.fontSize}px）</label>
            <input
              type="range"
              min="12"
              max="24"
              step="1"
              value={currentCfg.typography.fontSize}
              onChange={(e) => {
                const next = parseInt(e.target.value, 10);
                updateRenderConfig(cfg => ({
                  ...cfg,
                  typography: {
                    ...cfg.typography,
                    fontSize: next
                  }
                }));
              }}
              className="w-full accent-[var(--app-accent-color)]"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block uppercase font-bold">通知文字大小（{safeNotificationTextSize}px）</label>
            <input
              type="range"
              min="10"
              max="24"
              step="1"
              value={safeNotificationTextSize}
              onChange={(e) => update({ notificationTextSize: parseInt(e.target.value, 10) })}
              className="w-full accent-[var(--app-accent-color)]"
            />
            <p className="text-xs text-gray-400 mt-1">作用于系统消息、通话提示，以及心声、动作、旁白这类通知胶囊。</p>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block uppercase font-bold">行高（{safeLineHeight.toFixed(2)}）</label>
            <input
              type="range"
              min="1.20"
              max="2.00"
              step="0.05"
              value={safeLineHeight}
              onChange={(e) => {
                const next = Number(e.target.value);
                updateRenderConfig(cfg => ({
                  ...cfg,
                  typography: {
                    ...cfg.typography,
                    lineHeight: next
                  }
                }));
              }}
              className="w-full accent-[var(--app-accent-color)]"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block uppercase font-bold">字间距（{safeLetterSpacing.toFixed(1)}px）</label>
            <input
              type="range"
              min="-0.5"
              max="2"
              step="0.1"
              value={safeLetterSpacing}
              onChange={(e) => {
                const next = Number(e.target.value);
                updateRenderConfig(cfg => ({
                  ...cfg,
                  typography: {
                    ...cfg.typography,
                    letterSpacing: next
                  }
                }));
              }}
              className="w-full accent-[var(--app-accent-color)]"
            />
          </div>

          <div className="render-bg-secondary -mx-4 -mb-4 mt-1">
            <InlineSwitchRow
              label="字体加粗"
              desc="提高可读性，适合高亮文本场景"
              active={settings.enableFontBold}
              onChange={() => update({ enableFontBold: !settings.enableFontBold })}
            />
          </div>
        </div>

        <SectionDivider label="深色模式与主题模式" />
        <div className="render-bg-secondary">
          <InlineSegmentedRow
            label="主题模式"
            value={settings.themeMode}
            options={[
              { key: 'auto', label: '跟随系统' },
              { key: 'light', label: '浅色' },
              { key: 'dark', label: '深色' }
            ]}
            onChange={(value) => update({ themeMode: value as AppearanceSettings['themeMode'] })}
          />
        </div>

        <div className="render-bg-secondary p-4 pt-2 space-y-3 border-t render-border-subtle">
          <label className="text-xs text-gray-500 block uppercase font-bold">深色模式对比度</label>
          <div className="grid grid-cols-3 gap-2">
            {DARK_CONTRAST_OPTIONS.map(item => {
              const active = settings.darkContrast === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => update({ darkContrast: item.key })}
                  className={`rounded border px-2 py-2 text-xs transition-colors ${active ? 'text-white' : 'render-border render-text-secondary'}`}
                  style={active ? { backgroundColor: 'var(--app-accent-color)', borderColor: 'var(--app-accent-color)' } : {}}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400">{DARK_CONTRAST_OPTIONS.find(i => i.key === settings.darkContrast)?.desc}</p>
        </div>

        <SectionDivider label="动态效果" />
        <div className="render-bg-secondary">
          <InlineSwitchRow
            label="下雨效果"
            desc="开启后页面会显示下雨动画"
            active={!!settings.enableRainEffect}
            onChange={() => update({ enableRainEffect: !settings.enableRainEffect })}
          />
          <InlineSwitchRow
            label="下雪效果"
            desc="开启后页面会显示下雪动画"
            active={!!settings.enableSnowEffect}
            onChange={() => update({ enableSnowEffect: !settings.enableSnowEffect })}
          />
          <InlineSwitchRow
            label="打雷效果"
            desc="开启后页面会出现闪电亮度变化"
            active={!!settings.enableThunderEffect}
            onChange={() => update({ enableThunderEffect: !settings.enableThunderEffect })}
          />
        </div>

        <SectionDivider label="HTML 高级设置" />
        <div className="render-bg-secondary">
          <InlineSwitchRow
            label="允许执行脚本"
            desc="高风险：开启后 HTML 气泡中的 JS 可执行，仅在可信内容场景使用"
            active={!!settings.enableHtmlBubbleScripts}
            onChange={() => update({ enableHtmlBubbleScripts: !settings.enableHtmlBubbleScripts })}
          />
        </div>

        <SectionDivider label="桌面模式" />
        <div className="render-bg-secondary">
          <InlineSwitchRow
            label="启用桌面模式"
            desc="开启后将以模拟手机桌面的形式展示应用"
            active={!!settings.enableDesktopMode}
            onChange={() => update({ enableDesktopMode: !settings.enableDesktopMode })}
          />
        </div>
      </div>
    </div>
  );
};
