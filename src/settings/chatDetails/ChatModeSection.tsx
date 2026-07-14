import React from 'react';
import { ChatMode } from '../../types';
import { AppSwitch } from '../../utils/UtilsContactFormPrimitives';

interface ChatModeSectionProps {
  currentMode: ChatMode;
  descriptionFeatureEnabled: boolean;
  descriptionSayEnabled: boolean;
  descriptionDoEnabled: boolean;
  onSetChatMode: (mode: ChatMode) => void;
  onSetDescriptionFeatureEnabled: (enabled: boolean) => void;
  onSetDescriptionSayEnabled: (enabled: boolean) => void;
  onSetDescriptionDoEnabled: (enabled: boolean) => void;
}

const MODE_ITEMS: Array<{ key: ChatMode; label: string; desc: string; wide?: boolean }> = [
  { key: 'online', label: '线上', desc: '无心声无动作' },
  { key: 'online-inner', label: '线上-心声', desc: '有心声无动作' },
  { key: 'offline', label: '线下', desc: '无心声有动作' },
  { key: 'offline-inner', label: '线下-心声', desc: '有心声有动作' },
  { key: 'story', label: '剧情模式', desc: '沉浸叙事体验', wide: true }
];

export const ChatModeSection: React.FC<ChatModeSectionProps> = (props) => {
  const showDescriptionControls = props.currentMode !== 'story';
  const canDisableSay = props.descriptionDoEnabled;
  const canDisableDo = props.descriptionSayEnabled;

  return (
    <>
      <div className="render-bg-secondary p-4 grid grid-cols-2 gap-3">
        {MODE_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`px-3 py-3 rounded-lg border text-left transition-colors ${item.wide ? 'col-span-2' : ''} ${props.currentMode === item.key ? 'text-white' : 'text-gray-600 border-gray-200 dark:border-gray-800'}`}
            style={props.currentMode === item.key ? { backgroundColor: 'var(--app-accent-color)', borderColor: 'var(--app-accent-color)' } : {}}
            onClick={() => props.onSetChatMode(item.key)}
          >
            <div className="text-[13px] font-semibold leading-none">{item.label}</div>
            <div className={`text-[11px] mt-1 ${props.currentMode === item.key ? 'opacity-90' : 'text-gray-400'}`}>{item.desc}</div>
          </button>
        ))}
      </div>
      {showDescriptionControls && (
        <div className="render-bg-secondary px-4 pb-4 space-y-3 border-t render-border-subtle">
          <div className="app-list-item px-0">
            <div className="app-list-item-main">
              <div className="app-list-item-title">开启描述功能</div>
            </div>
            <div className="app-list-item-side">
              <AppSwitch
                active={props.descriptionFeatureEnabled}
                onChange={() => {
                  props.onSetDescriptionFeatureEnabled(!props.descriptionFeatureEnabled);
                }}
              />
            </div>
          </div>
          {props.descriptionFeatureEnabled && (
            <div className="space-y-3">
              <div className="app-list-item px-0">
                <div className="app-list-item-main">
                  <div className="app-list-item-title">允许使用“说”发送</div>
                </div>
                <div className="app-list-item-side">
                  <AppSwitch
                    active={props.descriptionSayEnabled}
                    onChange={() => {
                      if (!props.descriptionSayEnabled && !props.descriptionDoEnabled) return;
                      if (!canDisableSay && props.descriptionSayEnabled) return;
                      props.onSetDescriptionSayEnabled(!props.descriptionSayEnabled);
                    }}
                  />
                </div>
              </div>
              <div className="app-list-item px-0">
                <div className="app-list-item-main">
                  <div className="app-list-item-title">允许使用“做”发送</div>
                </div>
                <div className="app-list-item-side">
                  <AppSwitch
                    active={props.descriptionDoEnabled}
                    onChange={() => {
                      if (!props.descriptionSayEnabled && !props.descriptionDoEnabled) return;
                      if (!canDisableDo && props.descriptionDoEnabled) return;
                      props.onSetDescriptionDoEnabled(!props.descriptionDoEnabled);
                    }}
                  />
                </div>
              </div>
              <div className="text-[12px] text-gray-400">
                输入框会显示“说/做”切换；至少保留一种输入方式，避免特色功能被完全关掉。
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
