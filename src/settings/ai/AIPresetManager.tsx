import React from 'react';
import { SectionDivider } from '../../Common';

export type AIProviderPreset = {
  id: string;
  name: string;
  provider: string;
  config?: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    responseFormat?: string;
    customModelSupportsImageRecognition?: boolean;
    enableAdvancedModelSettings?: boolean;
    modelTemperature?: number;
    modelTopP?: number;
    modelPresencePenalty?: number;
    modelFrequencyPenalty?: number;
    modelMaxTokens?: number;
    enableImageGeneration?: boolean;
    imageResponseFormat?: 'openai' | 'google' | 'volcengine';
    imageModel?: string;
    imageBaseUrl?: string;
    imageApiKey?: string;
  };
  modelList?: string[];
  imageModelList?: string[];
  createdAt?: number;
  updatedAt?: number;
};

export const getPresetKey = (preset: AIProviderPreset): string =>
  String(preset.id || `${preset.provider || 'custom'}:${preset.name || ''}`);

interface AIPresetManagerProps {
  providerPresets: AIProviderPreset[];
  selectedPresetKey: string;
  onApplyPreset: (preset: AIProviderPreset) => void;
}

export const AIPresetManager: React.FC<AIPresetManagerProps> = ({
  providerPresets,
  selectedPresetKey,
  onApplyPreset
}) => {
  if (providerPresets.length === 0) return null;

  return (
    <>
      <SectionDivider label="预设" />
      <div className="render-bg-secondary p-4">
        {selectedPresetKey && (
          <div className="text-[11px] mb-2" style={{ color: 'var(--app-accent-color)' }}>
            已选中预设：{(providerPresets.find(p => getPresetKey(p) === selectedPresetKey)?.name) || '未命名预设'}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {providerPresets.map(preset => {
            const active = getPresetKey(preset) === selectedPresetKey;
            return (
              <button
                key={getPresetKey(preset)}
                className={`px-3 py-2 rounded border text-[13px] text-left ${active ? 'text-white' : 'render-text-tertiary render-border'}`}
                style={active ? { backgroundColor: 'var(--app-accent-color)', borderColor: 'var(--app-accent-color)' } : {}}
                onClick={() => onApplyPreset(preset)}
              >
                <div className="truncate">{preset.name || '未命名预设'}{active ? '（已选中）' : ''}</div>
                <div className={`text-[10px] truncate mt-0.5 ${active ? 'text-white/80' : 'text-gray-400'}`}>{preset.provider || 'custom'}</div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
