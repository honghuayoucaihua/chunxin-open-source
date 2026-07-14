import React, { useEffect, useState } from 'react';
import { AISettings, MomentInteractionSource } from '../types';
import { MobileHeader, SectionDivider } from '../Common';
import {
  getBuiltinAIUsage,
  fetchFreeModels,
  getBuiltinAIModel,
  setBuiltinAIModel,
  syncBuiltinAIModelSelection,
  BuiltinAIUsage
} from '../services/builtinAI';
import { AI_PROVIDER_OPTIONS, IMAGE_GENERATION_DEFAULT_BASE_URLS } from './aiSettingsConstants';
import { PassphraseDialog, SavePresetDialog } from './AISettingsParts';
import { BuiltinAIConfig } from './ai/BuiltinAIConfig';
import { CustomProviderConfig } from './ai/CustomProviderConfig';
import { MinimaxTTSConfig } from './ai/MinimaxTTSConfig';
import { ImageGenerationConfig } from './ai/ImageGenerationConfig';
import { AIPresetManager, AIProviderPreset, getPresetKey } from './ai/AIPresetManager';
import { InlineSegmentedRow, InlineSwitchRow } from '../utils/UtilsContactFormPrimitives';
import { showWechatAlert } from '../utils/wechatDialog';
import { captureRuntimeResetEpoch, isRuntimeResetEpochStale } from '../services/runtimeResetGuard.ts';

const MODEL_LIST_FETCH_TIMEOUT_MS = 15000;

const fetchModelListWithTimeout = async (endpoint: string, headers: Record<string, string>): Promise<Response> => {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), MODEL_LIST_FETCH_TIMEOUT_MS);
  try {
    return await fetch(endpoint, {
      method: 'GET',
      headers,
      signal: controller.signal
    });
  } finally {
    globalThis.clearTimeout(timeout);
  }
};

export const AISettingsView: React.FC<{ settings: AISettings, setSettings: React.Dispatch<React.SetStateAction<AISettings>>, onBack: () => void }> = ({ settings, setSettings, onBack }) => {
  const providerOptions = AI_PROVIDER_OPTIONS;

  const currentProvider = providerOptions.find(p => p.key === settings.provider) || providerOptions[0];
  const [modelLoading, setModelLoading] = useState(false);
  const [modelList, setModelList] = useState<string[]>([]);
  const [imageModelLoading, setImageModelLoading] = useState(false);
  const [imageModelList, setImageModelList] = useState<string[]>([]);
  const [builtinModelList, setBuiltinModelList] = useState<string[]>([]);
  const [builtinUsage, setBuiltinUsage] = useState<BuiltinAIUsage>(getBuiltinAIUsage());
  const [showPassphraseDialog, setShowPassphraseDialog] = useState(false);
  const [builtinModel, setBuiltinModel] = useState(getBuiltinAIModel());
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false);
  const [providerPresets, setProviderPresets] = useState<AIProviderPreset[]>([]);
  const [selectedPresetKey, setSelectedPresetKey] = useState('');
  const latestSettingsRef = React.useRef(settings);
  const builtinRequestSeqRef = React.useRef(0);

  const normalizeBaseUrl = (base: string) => base.replace(/\/+$/, '');
  const getProviderConfigCacheKey = (provider: string) => `aiProviderConfig:${provider}`;
  const getProviderPresetStoreKey = () => 'aiProviderPresets';
  const getActiveProviderKey = (s: AISettings): string => {
    if (s.provider !== 'custom') return s.provider;
    if (s.responseFormat === 'response') return 'custom_response';
    if (s.responseFormat === 'anthropic') return 'custom_anthropic';
    return 'custom';
  };
  const normalizeImageResponseFormat = (format: unknown): 'openai' | 'google' | 'volcengine' => {
    if (format === 'google' || format === 'volcengine') return format;
    return 'openai';
  };
  const resolveImageBaseUrl = (format: 'openai' | 'google' | 'volcengine', value?: unknown): string => {
    if (typeof value === 'string' && value.trim()) return value;
    return IMAGE_GENERATION_DEFAULT_BASE_URLS[format];
  };
  const parseFiniteNumber = (value: unknown): number | undefined => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const beginBuiltinRequest = () => {
    const runtimeEpoch = captureRuntimeResetEpoch();
    const requestId = builtinRequestSeqRef.current + 1;
    builtinRequestSeqRef.current = requestId;
    return { runtimeEpoch, requestId };
  };
  const isBuiltinRequestStale = (request: { runtimeEpoch: number; requestId: number }): boolean => {
    if (isRuntimeResetEpochStale(request.runtimeEpoch)) return true;
    if (builtinRequestSeqRef.current !== request.requestId) return true;
    return latestSettingsRef.current.provider !== 'builtin';
  };
  const isModelRequestStale = (
    runtimeEpoch: number,
    provider: AISettings['provider'],
    responseFormat: AISettings['responseFormat'],
    apiKey: string,
    baseUrl: string
  ): boolean => {
    if (isRuntimeResetEpochStale(runtimeEpoch)) return true;
    const latestSettings = latestSettingsRef.current;
    return latestSettings.provider !== provider
      || latestSettings.responseFormat !== responseFormat
      || latestSettings.apiKey.trim() !== apiKey
      || (latestSettings.baseUrl || '').trim() !== baseUrl;
  };
  const isImageModelRequestStale = (
    runtimeEpoch: number,
    provider: AISettings['provider'],
    imageResponseFormat: 'openai' | 'google' | 'volcengine',
    imageApiKey: string,
    imageBaseUrl: string
  ): boolean => {
    if (isRuntimeResetEpochStale(runtimeEpoch)) return true;
    const latestSettings = latestSettingsRef.current;
    return latestSettings.provider !== provider
      || normalizeImageResponseFormat(latestSettings.imageResponseFormat) !== imageResponseFormat
      || String(latestSettings.imageApiKey || '').trim() !== imageApiKey
      || resolveImageBaseUrl(
        normalizeImageResponseFormat(latestSettings.imageResponseFormat),
        latestSettings.imageBaseUrl
      ).trim() !== imageBaseUrl;
  };
  const pickAdvancedModelConfig = (source: Partial<AISettings> | Record<string, unknown>) => ({
    enableAdvancedModelSettings: !!(source as any).enableAdvancedModelSettings,
    modelTemperature: parseFiniteNumber((source as any).modelTemperature),
    modelTopP: parseFiniteNumber((source as any).modelTopP),
    modelPresencePenalty: parseFiniteNumber((source as any).modelPresencePenalty),
    modelFrequencyPenalty: parseFiniteNumber((source as any).modelFrequencyPenalty),
    modelMaxTokens: parseFiniteNumber((source as any).modelMaxTokens),
    requestTimeout: parseFiniteNumber((source as any).requestTimeout)
  });

  const loadProviderPresets = () => {
    try {
      const raw = localStorage.getItem(getProviderPresetStoreKey());
      const list = raw ? JSON.parse(raw) : [];
      setProviderPresets(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Load provider presets error:', error);
      setProviderPresets([]);
    }
  };

  // 加载叙说AI模型列表和本地用量
  useEffect(() => {
    if (settings.provider === 'builtin') {
      const loadBuiltinModels = async () => {
        const request = beginBuiltinRequest();
        const models = await fetchFreeModels();
        if (isBuiltinRequestStale(request)) return;
        setBuiltinModelList(models);
        const nextModel = await syncBuiltinAIModelSelection();
        if (isBuiltinRequestStale(request)) return;
        setBuiltinModel(nextModel);
        setBuiltinUsage(getBuiltinAIUsage());
      };
      void loadBuiltinModels();
    }
  }, [settings.provider]);

  // 更新使用次数显示
  useEffect(() => {
    const interval = setInterval(() => {
      setBuiltinUsage(getBuiltinAIUsage());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadProviderPresets();
  }, []);

  useEffect(() => {
    latestSettingsRef.current = settings;
  }, [settings]);

  const buildModelEndpoint = (base: string, apiKey: string) => {
    const normalized = normalizeBaseUrl(base);
    if (settings.provider === 'gemini') {
      if (normalized.includes('/v1beta')) {
        return `${normalized}/models?key=${encodeURIComponent(apiKey)}`;
      }
      return `${normalized}/v1beta/models?key=${encodeURIComponent(apiKey)}`;
    }
    const removedChat = normalized
      .replace(/\/v1\/chat\/completions$/i, '/v1')
      .replace(/\/chat\/completions$/i, '');
    return `${removedChat}/models`;
  };

  const parseModelList = (data: any) => {
    if (!data) return [] as string[];
    if (Array.isArray(data.models)) {
      return data.models
        .map((m: any) => (m.name || m.id || '').toString())
        .filter(Boolean)
        .map((name: string) => name.replace(/^models\//, ''));
    }
    if (Array.isArray(data.data)) {
      return data.data
        .map((m: any) => (m.id || m.name || '').toString())
        .filter(Boolean);
    }
    if (Array.isArray(data)) {
      return data
        .map((m: any) => (m.id || m.name || m.model || '').toString())
        .filter(Boolean);
    }
    return [] as string[];
  };

  const handleFetchModels = async () => {
    if (modelLoading) return;
    const apiKey = settings.apiKey.trim();
    const baseUrl = (settings.baseUrl || currentProvider.baseUrl || '').trim();

    if (!baseUrl) {
      showWechatAlert('请先填写请求地址');
      return;
    }
    if (!apiKey && settings.provider !== 'custom') {
      showWechatAlert('请先填写 API Key');
      return;
    }

    const runtimeEpoch = captureRuntimeResetEpoch();
    const requestProvider = settings.provider;
    const requestResponseFormat = settings.responseFormat;
    setModelLoading(true);
    try {
      const endpoint = buildModelEndpoint(baseUrl, apiKey);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (settings.provider === 'anthropic' && apiKey) {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else if (settings.provider !== 'gemini' && apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
      }

      const response = await fetchModelListWithTimeout(endpoint, headers);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const models = parseModelList(data);
      if (isModelRequestStale(runtimeEpoch, requestProvider, requestResponseFormat, apiKey, baseUrl)) return;
      if (!models.length) {
        showWechatAlert('没有获取到模型列表');
        return;
      }
      setModelList(models);
      setSettings(prev => ({
        ...prev,
        model: models.includes(prev.model) ? prev.model : models[0]
      }));
    } catch (error) {
      console.error('Fetch models error:', error);
      showWechatAlert('模型列表获取失败');
    } finally {
      setModelLoading(false);
    }
  };

  const handlePassphraseSuccess = () => {
    setBuiltinUsage(getBuiltinAIUsage());
    void (async () => {
      const request = beginBuiltinRequest();
      const models = await fetchFreeModels();
      if (isBuiltinRequestStale(request)) return;
      setBuiltinModelList(models);
      const nextModel = await syncBuiltinAIModelSelection();
      if (isBuiltinRequestStale(request)) return;
      setBuiltinModel(nextModel);
    })();
    showWechatAlert('口令验证成功，已刷新今日可用额度');
  };

  const handleBuiltinModelChange = (model: string) => {
    setBuiltinModel(model);
    setBuiltinAIModel(model);
  };

  const handleSaveProviderConfig = () => {
    try {
      localStorage.setItem(
        getProviderConfigCacheKey(getActiveProviderKey(settings)),
        JSON.stringify({
          apiKey: settings.apiKey,
          baseUrl: settings.baseUrl,
          model: settings.model,
          responseFormat: settings.responseFormat,
          customModelSupportsImageRecognition: !!settings.customModelSupportsImageRecognition,
          ...pickAdvancedModelConfig(settings),
          enableImageGeneration: !!settings.enableImageGeneration,
          imageResponseFormat: normalizeImageResponseFormat(settings.imageResponseFormat),
          imageModel: settings.imageModel || '',
          imageBaseUrl: resolveImageBaseUrl(normalizeImageResponseFormat(settings.imageResponseFormat), settings.imageBaseUrl),
          imageApiKey: settings.imageApiKey || '',
          modelList: modelList.slice(),
          imageModelList: imageModelList.slice()
        })
      );
    } catch (error) {
      console.error('Save provider config error:', error);
    }
  };

  const handleSavePreset = (presetName: string) => {
    const name = presetName.trim();
    if (!name) {
      showWechatAlert('请先输入预设名称');
      return;
    }

    try {
      const activeProvider = getActiveProviderKey(settings);
      const storeKey = getProviderPresetStoreKey();
      const raw = localStorage.getItem(storeKey);
      const list = raw ? JSON.parse(raw) : [];
      const safeList = Array.isArray(list) ? list : [];

      const nextPreset = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name,
        provider: activeProvider,
        config: {
          apiKey: settings.apiKey,
          baseUrl: settings.baseUrl,
          model: settings.model,
          responseFormat: settings.responseFormat,
          customModelSupportsImageRecognition: !!settings.customModelSupportsImageRecognition,
          ...pickAdvancedModelConfig(settings),
          enableImageGeneration: !!settings.enableImageGeneration,
          imageResponseFormat: normalizeImageResponseFormat(settings.imageResponseFormat),
          imageModel: settings.imageModel || '',
          imageBaseUrl: resolveImageBaseUrl(normalizeImageResponseFormat(settings.imageResponseFormat), settings.imageBaseUrl),
          imageApiKey: settings.imageApiKey || ''
        },
        modelList: modelList.slice(),
        imageModelList: imageModelList.slice(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const merged = [
        nextPreset,
        ...safeList.filter((item: any) => !(item && item.provider === activeProvider && item.name === name))
      ];

      localStorage.setItem(storeKey, JSON.stringify(merged));
      setProviderPresets(merged);
      setShowSavePresetDialog(false);
      showWechatAlert('预设已保存');
    } catch (error) {
      console.error('Save preset error:', error);
      showWechatAlert('预设保存失败');
    }
  };

  const handleSwitchProvider = (provider: typeof providerOptions[number]) => {
    setModelList([]);
    setImageModelList([]);
    setSelectedPresetKey('');
    try {
      localStorage.setItem(
        getProviderConfigCacheKey(getActiveProviderKey(settings)),
        JSON.stringify({
          apiKey: settings.apiKey,
          baseUrl: settings.baseUrl,
          model: settings.model,
          responseFormat: settings.responseFormat,
          customModelSupportsImageRecognition: !!settings.customModelSupportsImageRecognition,
          ...pickAdvancedModelConfig(settings),
          enableImageGeneration: !!settings.enableImageGeneration,
          imageResponseFormat: normalizeImageResponseFormat(settings.imageResponseFormat),
          imageModel: settings.imageModel || '',
          imageBaseUrl: resolveImageBaseUrl(normalizeImageResponseFormat(settings.imageResponseFormat), settings.imageBaseUrl),
          imageApiKey: settings.imageApiKey || '',
          modelList: modelList.slice(),
          imageModelList: imageModelList.slice()
        })
      );
    } catch (error) {
      console.error('Cache current provider config error:', error);
    }

    let nextConfig: {
      apiKey?: string;
      baseUrl?: string;
      model?: string;
      responseFormat?: AISettings['responseFormat'];
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
      modelList?: string[];
      imageModelList?: string[];
    } = {};

    try {
      const cached = localStorage.getItem(getProviderConfigCacheKey(provider.key));
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') nextConfig = parsed;
      }
    } catch (error) {
      console.error('Load target provider config error:', error);
    }

    setModelList(Array.isArray(nextConfig.modelList) ? nextConfig.modelList : []);
    setImageModelList(Array.isArray(nextConfig.imageModelList) ? nextConfig.imageModelList : []);

    setSettings(prev => ({
      ...prev,
      provider: (provider.key === 'custom_response' || provider.key === 'custom_anthropic') ? 'custom' as any : provider.key as any,
      apiKey: typeof nextConfig.apiKey === 'string' ? nextConfig.apiKey : '',
      baseUrl: typeof nextConfig.baseUrl === 'string' ? nextConfig.baseUrl : provider.baseUrl,
      model: typeof nextConfig.model === 'string' ? nextConfig.model : '',
      responseFormat: provider.key === 'custom_response'
        ? 'response'
        : provider.key === 'custom_anthropic'
          ? 'anthropic'
          : provider.key === 'custom'
            ? 'openai'
            : (nextConfig.responseFormat === 'response' || nextConfig.responseFormat === 'anthropic'
              ? nextConfig.responseFormat
              : 'openai'),
      customModelSupportsImageRecognition: !!nextConfig.customModelSupportsImageRecognition,
      ...pickAdvancedModelConfig(nextConfig),
      enableImageGeneration: !!nextConfig.enableImageGeneration,
      imageResponseFormat: normalizeImageResponseFormat(nextConfig.imageResponseFormat),
      imageModel: typeof nextConfig.imageModel === 'string' ? nextConfig.imageModel : '',
      imageBaseUrl: resolveImageBaseUrl(normalizeImageResponseFormat(nextConfig.imageResponseFormat), nextConfig.imageBaseUrl),
      imageApiKey: typeof nextConfig.imageApiKey === 'string' ? nextConfig.imageApiKey : ''
    }));
  };

  const buildImageModelEndpoint = (format: 'openai' | 'google' | 'volcengine', base: string, apiKey: string) => {
    const normalized = normalizeBaseUrl(base);
    if (format === 'google') {
      if (normalized.includes('/v1beta')) return `${normalized}/models?key=${encodeURIComponent(apiKey)}`;
      return `${normalized}/v1beta/models?key=${encodeURIComponent(apiKey)}`;
    }
    const removedPath = normalized
      .replace(/\/v1\/chat\/completions$/i, '/v1')
      .replace(/\/chat\/completions$/i, '')
      .replace(/\/images\/generations$/i, '');
    return `${removedPath}/models`;
  };

  const handleFetchImageModels = async () => {
    if (imageModelLoading) return;
    const imageFormat = normalizeImageResponseFormat(settings.imageResponseFormat);
    const apiKey = String(settings.imageApiKey || '').trim();
    const baseUrl = resolveImageBaseUrl(imageFormat, settings.imageBaseUrl).trim();

    if (!baseUrl) {
      showWechatAlert('请先填写图像请求地址');
      return;
    }
    if (!apiKey) {
      showWechatAlert('请先填写图像 API Key');
      return;
    }

    const runtimeEpoch = captureRuntimeResetEpoch();
    const requestProvider = settings.provider;
    const requestImageResponseFormat = imageFormat;
    setImageModelLoading(true);
    try {
      const endpoint = buildImageModelEndpoint(imageFormat, baseUrl, apiKey);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (imageFormat !== 'google') headers.Authorization = `Bearer ${apiKey}`;

      const response = await fetchModelListWithTimeout(endpoint, headers);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const models = parseModelList(data);
      if (isImageModelRequestStale(runtimeEpoch, requestProvider, requestImageResponseFormat, apiKey, baseUrl)) return;
      if (!models.length) {
        showWechatAlert('没有获取到图像模型列表');
        return;
      }
      setImageModelList(models);
      setSettings(prev => ({
        ...prev,
        imageModel: models.includes(String(prev.imageModel || '')) ? String(prev.imageModel || '') : models[0]
      }));
    } catch (error) {
      console.error('Fetch image models error:', error);
      showWechatAlert('图像模型列表获取失败');
    } finally {
      setImageModelLoading(false);
    }
  };

  const handleApplyPreset = (preset: AIProviderPreset) => {
    const providerKey = String(preset.provider || 'custom');
    const targetProvider = providerOptions.find(p => p.key === providerKey);
    const cfg = preset.config || {};
    const nextModelList = Array.isArray(preset.modelList) ? preset.modelList : [];
    const nextImageModelList = Array.isArray(preset.imageModelList) ? preset.imageModelList : [];

    setModelList(nextModelList);
    setImageModelList(nextImageModelList);
    setSettings(prev => ({
      ...prev,
      provider: (providerKey === 'custom_response' || providerKey === 'custom_anthropic') ? 'custom' as any : providerKey as any,
      apiKey: typeof cfg.apiKey === 'string' ? cfg.apiKey : '',
      baseUrl: typeof cfg.baseUrl === 'string' ? cfg.baseUrl : (targetProvider?.baseUrl || ''),
      model: typeof cfg.model === 'string' ? cfg.model : '',
      responseFormat: providerKey === 'custom_response'
        ? 'response'
        : providerKey === 'custom_anthropic'
          ? 'anthropic'
          : (cfg.responseFormat === 'response' || cfg.responseFormat === 'anthropic' ? cfg.responseFormat : 'openai'),
      customModelSupportsImageRecognition: !!(cfg as any).customModelSupportsImageRecognition,
      ...pickAdvancedModelConfig(cfg as any),
      enableImageGeneration: !!(cfg as any).enableImageGeneration,
      imageResponseFormat: normalizeImageResponseFormat((cfg as any).imageResponseFormat),
      imageModel: typeof (cfg as any).imageModel === 'string' ? (cfg as any).imageModel : '',
      imageBaseUrl: resolveImageBaseUrl(normalizeImageResponseFormat((cfg as any).imageResponseFormat), (cfg as any).imageBaseUrl),
      imageApiKey: typeof (cfg as any).imageApiKey === 'string' ? (cfg as any).imageApiKey : ''
    }));

    setSelectedPresetKey(getPresetKey(preset));
    showWechatAlert(`已应用预设：${preset.name || '未命名预设'}`);
  };

  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader
        title="AI 配置"
        onBack={onBack}
      />
      <div className="flex-1 overflow-y-auto">
        <SectionDivider label="服务商" />
        <div className="render-bg-secondary p-4 grid grid-cols-2 gap-2">
          {providerOptions.map(p => {
            const isActive = p.key === 'custom_response'
              ? settings.provider === 'custom' && settings.responseFormat === 'response'
              : p.key === 'custom_anthropic'
                ? settings.provider === 'custom' && settings.responseFormat === 'anthropic'
                : p.key === 'custom'
                  ? settings.provider === 'custom' && settings.responseFormat === 'openai'
                  : settings.provider === p.key;
            return (
              <button
                key={p.key}
                className={`px-3 py-2 rounded border text-[13px] ${isActive ? 'text-white' : 'render-text-tertiary render-border'}`}
                style={isActive ? { backgroundColor: 'var(--app-accent-color)', borderColor: 'var(--app-accent-color)' } : {}}
                onClick={() => handleSwitchProvider(p)}
              >
                {p.label}
                {p.key === 'builtin' && <span className="ml-1 text-[10px] opacity-80">免费</span>}
              </button>
            );
          })}
        </div>

        <AIPresetManager
          providerPresets={providerPresets}
          selectedPresetKey={selectedPresetKey}
          onApplyPreset={handleApplyPreset}
        />

        {/* 叙说AI配置 */}
        {settings.provider === 'builtin' && (
          <BuiltinAIConfig
            builtinUsage={builtinUsage}
            builtinModel={builtinModel}
            builtinModelList={builtinModelList}
            onBuiltinModelChange={handleBuiltinModelChange}
            onOpenPassphraseDialog={() => setShowPassphraseDialog(true)}
          />
        )}

        {/* 其他服务商配置 */}
        {settings.provider !== 'builtin' && (
          <CustomProviderConfig
            settings={settings}
            setSettings={setSettings}
            currentProviderBaseUrl={currentProvider.baseUrl}
            modelList={modelList}
            modelLoading={modelLoading}
            onFetchModels={handleFetchModels}
            onSaveProviderConfig={handleSaveProviderConfig}
            onOpenSavePresetDialog={() => setShowSavePresetDialog(true)}
            setModelList={setModelList}
          />
        )}

        {settings.provider !== 'builtin' && (
          <ImageGenerationConfig
            settings={settings}
            setSettings={setSettings}
            imageModelList={imageModelList}
            setImageModelList={setImageModelList}
            modelLoading={imageModelLoading}
            onFetchModels={handleFetchImageModels}
          />
        )}

        <MinimaxTTSConfig settings={settings} setSettings={setSettings} />

        <SectionDivider label="AI 相关功能" />
        <div className="render-bg-secondary">
          <InlineSwitchRow
            label="延迟回复"
            desc="AI 分句延迟发送，模拟真人聊天"
            active={settings.enableDelayReply}
            onChange={() => setSettings(prev => ({ ...prev, enableDelayReply: !prev.enableDelayReply }))}
          />
          <InlineSwitchRow
            label="分句发送"
            desc="输入框有文字时显示临时发送按钮"
            active={settings.enableSentenceSend}
            onChange={() => setSettings(prev => ({ ...prev, enableSentenceSend: !prev.enableSentenceSend }))}
          />
          <InlineSwitchRow
            label="时间感知"
            desc="开启后将当前时间注入提示词，提升时态与场景一致性"
            active={settings.enableTimeAwareness}
            onChange={() => setSettings(prev => ({ ...prev, enableTimeAwareness: !prev.enableTimeAwareness }))}
          />
          <InlineSegmentedRow
            label="朋友圈互动数据"
            value={settings.momentInteractionSource || 'random'}
            options={[['none', '无'], ['contacts', '通讯录'], ['random', '随机']].map(([value, label]) => ({ key: value, label })) as Array<{ key: MomentInteractionSource; label: string }>}
            onChange={(value) => setSettings(prev => ({ ...prev, momentInteractionSource: value as MomentInteractionSource }))}
          />
        </div>

      </div>

      <PassphraseDialog
        isOpen={showPassphraseDialog}
        onClose={() => setShowPassphraseDialog(false)}
        onSuccess={handlePassphraseSuccess}
      />
      <SavePresetDialog
        isOpen={showSavePresetDialog}
        defaultName={`${currentProvider.label}-${settings.model || '默认模型'}`}
        onClose={() => setShowSavePresetDialog(false)}
        onConfirm={handleSavePreset}
      />
    </div>
  );
};
