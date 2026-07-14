import React from 'react';
import { AISettings } from '../../types';
import { SectionDivider } from '../../Common';
import { AIInputRow } from '../AISettingsParts';
import { MINIMAX_MODEL_LIST } from '../aiSettingsConstants';
import { InlineSegmentedRow, InlineSelectRow, InlineSwitchRow } from '../../utils/UtilsContactFormPrimitives';

interface MinimaxTTSConfigProps {
  settings: AISettings;
  setSettings: React.Dispatch<React.SetStateAction<AISettings>>;
}

export const MinimaxTTSConfig: React.FC<MinimaxTTSConfigProps> = ({
  settings,
  setSettings
}) => {
  const minimaxModelList = [...MINIMAX_MODEL_LIST];

  React.useEffect(() => {
    if (!settings.minimaxTTS.enabled) return;
    if (String(settings.minimaxTTS.model || '').trim()) return;
    if (minimaxModelList.length === 0) return;
    setSettings((prev) => ({
      ...prev,
      minimaxTTS: {
        ...prev.minimaxTTS,
        model: minimaxModelList[0]
      }
    }));
  }, [settings.minimaxTTS.enabled, settings.minimaxTTS.model, minimaxModelList, setSettings]);

  return (
    <>
      <SectionDivider label="MiniMax 语音合成" />
      <div className="render-bg-secondary">
        <InlineSwitchRow
        label="启用 MiniMax TTS"
        desc="开启后可配置 API 版本、密钥与模型"
        active={settings.minimaxTTS.enabled}
        onChange={() => setSettings(prev => ({ ...prev, minimaxTTS: { ...prev.minimaxTTS, enabled: !prev.minimaxTTS.enabled } }))}
        />
      </div>
      {settings.minimaxTTS.enabled && (
        <div className="render-bg-secondary">
          <InlineSegmentedRow
            label="API 版本"
            value={settings.minimaxTTS.region}
            options={[
              { key: 'official', label: '官方版' },
              { key: 'international', label: '国际版' },
              { key: 'china', label: '大陆版' }
            ]}
            onChange={(value) => setSettings(prev => ({ ...prev, minimaxTTS: { ...prev.minimaxTTS, region: value as 'official' | 'international' | 'china' } }))}
          />
          <AIInputRow label="API Key" value={settings.minimaxTTS.apiKey} placeholder="输入 MiniMax API Key" onChange={(v) => setSettings(prev => ({ ...prev, minimaxTTS: { ...prev.minimaxTTS, apiKey: v } }))} />
          <AIInputRow label="Group ID" value={settings.minimaxTTS.groupId} placeholder="输入 MiniMax Group ID" onChange={(v) => setSettings(prev => ({ ...prev, minimaxTTS: { ...prev.minimaxTTS, groupId: v } }))} />
          <InlineSelectRow
            label="TTS 模型"
            value={settings.minimaxTTS.model}
            options={minimaxModelList.length === 0 ? ['暂无模型列表'] : minimaxModelList}
            onChange={(value) => {
              if (minimaxModelList.length === 0) return;
              setSettings(prev => ({ ...prev, minimaxTTS: { ...prev.minimaxTTS, model: value } }));
            }}
          />
          <div className="px-4 py-2 text-[11px] text-gray-400 border-b render-border-subtle">使用内置模型列表</div>
        </div>
      )}
    </>
  );
};
