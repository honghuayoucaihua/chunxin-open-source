import React from 'react';
import { AISettings } from '../../types';
import { SectionDivider } from '../../Common';
import { AIInputRow } from '../AISettingsParts';
import { IMAGE_GENERATION_DEFAULT_BASE_URLS } from '../aiSettingsConstants';
import { InlineSegmentedRow, InlineSwitchRow } from '../../utils/UtilsContactFormPrimitives';

interface ImageGenerationConfigProps {
  settings: AISettings;
  setSettings: React.Dispatch<React.SetStateAction<AISettings>>;
  imageModelList: string[];
  setImageModelList: React.Dispatch<React.SetStateAction<string[]>>;
  modelLoading: boolean;
  onFetchModels: () => void;
}

export const ImageGenerationConfig: React.FC<ImageGenerationConfigProps> = ({
  settings,
  setSettings,
  imageModelList,
  setImageModelList,
  modelLoading,
  onFetchModels
}) => {
  const [showModelPicker, setShowModelPicker] = React.useState(false);
  const imageFormat = settings.imageResponseFormat === 'google' || settings.imageResponseFormat === 'volcengine'
    ? settings.imageResponseFormat
    : 'openai';

  const handleSelectFormat = (format: 'openai' | 'google' | 'volcengine') => {
    setImageModelList([]);
    setSettings(prev => {
      const prevFormat = prev.imageResponseFormat === 'google' || prev.imageResponseFormat === 'volcengine'
        ? prev.imageResponseFormat
        : 'openai';
      const prevBaseUrl = String(prev.imageBaseUrl || '').trim();
      const defaultBaseUrl = IMAGE_GENERATION_DEFAULT_BASE_URLS[format];
      const volcengineBaseUrl = IMAGE_GENERATION_DEFAULT_BASE_URLS.volcengine;
      const shouldResetFromVolcengine =
        format !== 'volcengine'
        && (prevFormat === 'volcengine' || prevBaseUrl === volcengineBaseUrl);

      const nextBaseUrl = format === 'volcengine'
        ? defaultBaseUrl
        : shouldResetFromVolcengine
          ? defaultBaseUrl
          : (prevBaseUrl || defaultBaseUrl);

      return {
        ...prev,
        imageResponseFormat: format,
        imageModel: '',
        imageBaseUrl: nextBaseUrl
      };
    });
  };

  return (
    <>
      <SectionDivider label="图像生成" />
      <div className="render-bg-secondary">
        <InlineSwitchRow
        label="启用图像生成"
        desc="开启后可配置图像生成模型"
        active={!!settings.enableImageGeneration}
        onChange={() => setSettings(prev => ({ ...prev, enableImageGeneration: !prev.enableImageGeneration }))}
        />
      </div>
      {!!settings.enableImageGeneration && (
        <div className="render-bg-secondary">
          <InlineSegmentedRow
            label="请求格式"
            value={imageFormat}
            options={[
              { key: 'openai', label: 'OpenAI' },
              { key: 'google', label: 'Google' },
              { key: 'volcengine', label: '火山引擎' }
            ]}
            onChange={(value) => handleSelectFormat(value as 'openai' | 'google' | 'volcengine')}
          />
          {imageFormat !== 'volcengine' && (
            <AIInputRow
              label="图像地址"
              value={settings.imageBaseUrl || IMAGE_GENERATION_DEFAULT_BASE_URLS[imageFormat]}
              placeholder="输入图像生成接口地址"
              onChange={(value) => {
                setImageModelList([]);
                setSettings(prev => ({ ...prev, imageBaseUrl: value, imageModel: '' }));
              }}
            />
          )}
          <AIInputRow
            label="图像 Key"
            value={settings.imageApiKey || ''}
            placeholder="输入图像生成 API Key"
            onChange={(value) => setSettings(prev => ({ ...prev, imageApiKey: value }))}
          />
          {imageFormat === 'volcengine' && (
            <div className="px-4 py-2 border-b render-border-subtle">
              <div className="text-[11px] text-gray-400">已内置火山引擎地址，此处无需配置图像地址</div>
            </div>
          )}
          <div className="flex items-center px-4 py-3 border-b render-border-subtle">
            <div className="w-24 text-[13px] render-text-tertiary">图像模型</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 bg-transparent outline-none text-[14px] render-text-primary py-1.5"
                  value={settings.imageModel || ''}
                  placeholder={imageModelList.length > 0 ? '可手动输入模型名' : '输入图像模型名称'}
                  onChange={(e) => setSettings(prev => ({ ...prev, imageModel: e.target.value }))}
                />
                <button
                  className={`text-[12px] px-2 py-1 rounded border whitespace-nowrap ${imageModelList.length > 0 ? 'text-link render-border' : 'text-gray-400 border-gray-200 cursor-not-allowed'}`}
                  disabled={imageModelList.length === 0}
                  onClick={() => setShowModelPicker(true)}
                >
                  选择
                </button>
              </div>
              {imageModelList.length === 0 && (
                <div className="text-[11px] text-gray-400 mt-1">可直接输入模型名，或点击"获取/选择模型"</div>
              )}
            </div>
          </div>
          <div className="px-4 py-2 border-b render-border-subtle">
            <div className="text-[11px] text-gray-400">支持 OpenAI / Google / 火山引擎三种格式，请添加可用图像模型</div>
          </div>
          <div className="px-4 py-3 border-b render-border-subtle">
            <button
              className={`text-sm font-bold ${modelLoading ? 'text-gray-400' : 'text-link'}`}
              onClick={() => {
                if (imageModelList.length > 0) {
                  setShowModelPicker(true);
                  return;
                }
                onFetchModels();
              }}
              disabled={modelLoading}
            >
              {modelLoading ? '获取中...' : (imageModelList.length > 0 ? '选择模型' : '获取模型')}
            </button>
          </div>
        </div>
      )}

      {showModelPicker && (
        <div className="fixed inset-0 z-[420] bg-black/40 flex items-end" onClick={() => setShowModelPicker(false)}>
          <div className="w-full render-bg-secondary rounded-t-2xl max-h-[60vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b render-border-subtle flex items-center justify-between">
              <div className="text-[15px] font-medium">选择图像模型</div>
              <button className="text-[13px] text-link" onClick={() => setShowModelPicker(false)}>关闭</button>
            </div>
            <div className="overflow-y-auto max-h-[50vh]">
              {imageModelList.map((model) => {
                const selected = model === settings.imageModel;
                return (
                  <button
                    key={model}
                    className={`w-full text-left px-4 py-3 border-b render-border-subtle text-[14px] ${selected ? 'text-link bg-[var(--bg-hover)]' : 'render-text-primary'}`}
                    onClick={() => {
                      setSettings(prev => ({ ...prev, imageModel: model }));
                      setShowModelPicker(false);
                    }}
                  >
                    {model}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
