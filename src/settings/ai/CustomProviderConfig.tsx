import React from 'react';
import { AISettings } from '../../types';
import { SectionDivider } from '../../Common';
import { AIInputRow } from '../AISettingsParts';
import { AppSwitch, InlineSwitchRow } from '../../utils/UtilsContactFormPrimitives';
import { showWechatAlert } from '../../utils/wechatDialog';
import { redactSensitiveText } from '../../services/httpService.ts';

type ModelTestStatus = 'idle' | 'testing' | 'success' | 'error';

interface ModelTestResult {
  status: ModelTestStatus;
  message: string;
  details?: string;
  timestamp?: number;
}

interface CustomProviderConfigProps {
  settings: AISettings;
  setSettings: React.Dispatch<React.SetStateAction<AISettings>>;
  currentProviderBaseUrl: string;
  modelList: string[];
  modelLoading: boolean;
  onFetchModels: () => void;
  onSaveProviderConfig: () => void;
  onOpenSavePresetDialog: () => void;
  setModelList: React.Dispatch<React.SetStateAction<string[]>>;
}

type AdvancedModelFieldKey =
  | 'modelTemperature'
  | 'modelTopP'
  | 'modelPresencePenalty'
  | 'modelFrequencyPenalty'
  | 'modelMaxTokens'
  | 'requestTimeout';

type AdvancedModelFieldConfig = {
  key: AdvancedModelFieldKey;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  hint: string;
};

const ADVANCED_MODEL_FIELD_CONFIGS: AdvancedModelFieldConfig[] = [
  { key: 'modelTemperature', label: '温度', min: 0, max: 2, step: 0.1, defaultValue: 0.8, hint: '范围 0 ~ 2，数值越高随机性越强' },
  { key: 'modelTopP', label: 'Top P', min: 0, max: 1, step: 0.05, defaultValue: 1, hint: '范围 0 ~ 1，控制采样候选范围' },
  { key: 'modelPresencePenalty', label: 'Presence', min: -2, max: 2, step: 0.1, defaultValue: 0, hint: '范围 -2 ~ 2，控制主题新颖度' },
  { key: 'modelFrequencyPenalty', label: 'Frequency', min: -2, max: 2, step: 0.1, defaultValue: 0, hint: '范围 -2 ~ 2，控制重复倾向' },
  { key: 'modelMaxTokens', label: 'Max Tokens', min: 1, max: 32768, step: 1, defaultValue: 2048, hint: '范围 1 ~ 32768，限制最大输出长度' },
  { key: 'requestTimeout', label: '超时时间', min: 5, max: 300, step: 5, defaultValue: 60, hint: '范围 5 ~ 300 秒，请求超时自动中断' }
];

export const CustomProviderConfig: React.FC<CustomProviderConfigProps> = ({
  settings,
  setSettings,
  currentProviderBaseUrl,
  modelList,
  modelLoading,
  onFetchModels,
  onSaveProviderConfig,
  onOpenSavePresetDialog,
  setModelList
}) => {
  const [showModelPicker, setShowModelPicker] = React.useState(false);
  const [testResult, setTestResult] = React.useState<ModelTestResult>({ status: 'idle', message: '' });

  const parseOptionalNumber = (value: string): number | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const clampNumber = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
  const getAdvancedFieldValue = (key: AdvancedModelFieldKey): number | undefined => {
    const value = settings[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  };
  const setAdvancedFieldValue = (key: AdvancedModelFieldKey, nextValue: number | undefined) => {
    setSettings(prev => ({ ...prev, [key]: nextValue }));
  };

  const testModelConnection = async () => {
    const baseUrl = (settings.baseUrl || currentProviderBaseUrl || '').trim();
    const apiKey = (settings.apiKey || '').trim();
    const model = (settings.model || '').trim();

    if (!baseUrl) {
      setTestResult({ status: 'error', message: '请先填写请求地址', timestamp: Date.now() });
      return;
    }
    if (!apiKey) {
      setTestResult({ status: 'error', message: '请先填写 API Key', timestamp: Date.now() });
      return;
    }
    if (!model) {
      setTestResult({ status: 'error', message: '请先填写模型名称', timestamp: Date.now() });
      return;
    }

    setTestResult({ status: 'testing', message: '正在检测连接...', timestamp: Date.now() });

    const timeoutSeconds = settings.enableAdvancedModelSettings && typeof settings.requestTimeout === 'number'
      ? Math.min(300, Math.max(5, settings.requestTimeout))
      : 30;

    const fetchWithTimeout = async (url: string, options: RequestInit): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);
      try {
        return await fetch(url, { ...options, signal: controller.signal });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`请求超时（${timeoutSeconds}秒）`);
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    try {
      const normalizedBase = baseUrl.replace(/\/+$/, '');
      const responseFormat = settings.responseFormat || 'openai';
      const testMessage = 'Hello, this is a test. Please respond briefly.';

      if (responseFormat === 'anthropic') {
        const endpoint = normalizedBase.endsWith('/messages') ? normalizedBase : `${normalizedBase}/messages`;
        const response = await fetchWithTimeout(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model,
            max_tokens: 100,
            messages: [{ role: 'user', content: testMessage }]
          })
        });
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          const safeErrorText = redactSensitiveText(errorText).slice(0, 200);
          throw new Error(`HTTP ${response.status}${safeErrorText ? `: ${safeErrorText}` : ''}`);
        }
        setTestResult({ status: 'success', message: '连接成功', details: `模型 ${model} 响应正常`, timestamp: Date.now() });
        return;
      }

      if (responseFormat === 'response') {
        const endpoint = normalizedBase.endsWith('/responses') ? normalizedBase : `${normalizedBase}/responses`;
        const response = await fetchWithTimeout(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            input: [{ role: 'user', content: [{ type: 'input_text', text: testMessage }] }]
          })
        });
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          const safeErrorText = redactSensitiveText(errorText).slice(0, 200);
          throw new Error(`HTTP ${response.status}${safeErrorText ? `: ${safeErrorText}` : ''}`);
        }
        setTestResult({ status: 'success', message: '连接成功', details: `模型 ${model} 响应正常`, timestamp: Date.now() });
        return;
      }

      // OpenAI compatible format
      const endpoint = normalizedBase.includes('/chat/completions') ? normalizedBase : `${normalizedBase}/chat/completions`;
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: testMessage }],
          max_tokens: 100
        })
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        const safeErrorText = redactSensitiveText(errorText).slice(0, 200);
        throw new Error(`HTTP ${response.status}${safeErrorText ? `: ${safeErrorText}` : ''}`);
      }
      setTestResult({ status: 'success', message: '连接成功', details: `模型 ${model} 响应正常`, timestamp: Date.now() });
    } catch (error) {
      console.error('Model test error:', error);
      const errorMessage = redactSensitiveText(error instanceof Error ? error.message : String(error));
      let details = errorMessage;
      let message = '连接失败';

      // 尝试解析 API 返回的错误信息
      const tryExtractApiError = (msg: string): string | null => {
        try {
          // 尝试提取 JSON 格式的错误信息
          const jsonMatch = msg.match(/\{[\s\S]*"error"[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.error?.message) return parsed.error.message;
            if (parsed.error?.type) return `错误类型: ${parsed.error.type}`;
          }
          // OpenAI 风格: {"error": {"message": "..."}}
          const openaiMatch = msg.match(/"message"\s*:\s*"([^"]+)"/);
          if (openaiMatch) return openaiMatch[1];
        } catch {}
        return null;
      };

      const apiError = tryExtractApiError(errorMessage);

      // 网络错误
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('ERR_NETWORK')) {
        message = '网络错误';
        details = '无法连接到服务器，请检查：\n1. 请求地址是否正确\n2. 网络连接是否正常\n3. 是否需要代理访问';
      }
      // CORS 错误
      else if (errorMessage.includes('CORS') || errorMessage.includes('cross-origin')) {
        message = '跨域错误';
        details = '浏览器阻止了跨域请求，请检查：\n1. API 服务商是否支持浏览器直接调用\n2. 或使用支持 CORS 的代理服务';
      }
      // 超时
      else if (errorMessage.includes('超时') || errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT') || errorMessage.includes('HTTP 408')) {
        message = '请求超时';
        details = `服务器在 ${timeoutSeconds} 秒内未响应，请尝试：\n1. 增加超时时间设置\n2. 检查网络连接\n3. 稍后重试`;
      }
      // 400 Bad Request
      else if (errorMessage.includes('HTTP 400')) {
        message = '请求格式错误';
        details = apiError || '请求参数无效，可能是模型名称不正确或不支持该请求格式';
      }
      // 401 Unauthorized
      else if (errorMessage.includes('HTTP 401')) {
        message = '认证失败';
        details = 'API Key 无效或未提供，请检查密钥是否正确填写';
      }
      // 402 Payment Required
      else if (errorMessage.includes('HTTP 402')) {
        message = '余额不足';
        details = 'API 账户余额已用尽，请前往服务商官网充值';
      }
      // 403 Forbidden
      else if (errorMessage.includes('HTTP 403')) {
        message = '访问被拒绝';
        details = 'API Key 没有访问该模型的权限，或账户已被禁用';
      }
      // 404 Not Found
      else if (errorMessage.includes('HTTP 404')) {
        message = '接口不存在';
        details = '请求地址不正确，请检查：\n1. baseUrl 是否正确\n2. responseFormat 设置是否匹配 API 类型';
      }
      // 422 Unprocessable Entity
      else if (errorMessage.includes('HTTP 422')) {
        message = '参数错误';
        details = apiError || '请求参数格式不正确，请检查模型名称是否拼写正确';
      }
      // 429 Too Many Requests
      else if (errorMessage.includes('HTTP 429')) {
        message = '请求过于频繁';
        details = 'API 调用次数已达上限，请：\n1. 等待一段时间后重试\n2. 检查账户配额是否充足\n3. 考虑升级套餐';
      }
      // 500 Internal Server Error
      else if (errorMessage.includes('HTTP 500')) {
        message = '服务器内部错误';
        details = 'AI 服务端出现异常，请稍后重试';
      }
      // 502 Bad Gateway
      else if (errorMessage.includes('HTTP 502')) {
        message = '网关错误';
        details = 'API 网关无法连接到后端服务，请稍后重试';
      }
      // 503 Service Unavailable
      else if (errorMessage.includes('HTTP 503')) {
        message = '服务不可用';
        details = 'AI 服务暂时过载或维护中，请稍后重试';
      }
      // 504 Gateway Timeout
      else if (errorMessage.includes('HTTP 504')) {
        message = '网关超时';
        details = 'API 网关等待后端响应超时，请稍后重试';
      }
      // 其他错误，如果有解析出的 API 错误信息则显示
      else if (apiError) {
        message = '请求失败';
        details = apiError;
      }

      setTestResult({ status: 'error', message, details, timestamp: Date.now() });
    }
  };

  return (
    <>
      <SectionDivider label="模型与密钥" />
      <div className="render-bg-secondary">
        <AIInputRow
          label="请求地址"
          value={settings.baseUrl || currentProviderBaseUrl}
          placeholder="输入请求地址"
          onChange={(v) => {
            setModelList([]);
            setSettings(prev => ({
              ...prev,
              baseUrl: v,
              model: v === prev.baseUrl ? prev.model : ''
            }));
          }}
        />
        <AIInputRow label="API Key" value={settings.apiKey} placeholder="输入密钥" onChange={(v) => setSettings(prev => ({ ...prev, apiKey: v }))} />
        <div className="flex items-center px-4 py-3 border-b render-border-subtle">
          <div className="w-24 text-[13px] render-text-tertiary">模型</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 bg-transparent outline-none text-[14px] render-text-primary py-1.5"
                value={settings.model}
                placeholder={modelList.length > 0 ? '可手动输入模型名' : '输入模型名称'}
                onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
              />
              <button
                className={`text-[12px] px-2 py-1 rounded border whitespace-nowrap ${modelList.length > 0 ? 'text-link render-border' : 'text-gray-400 border-gray-200 cursor-not-allowed'}`}
                disabled={modelList.length === 0}
                onClick={() => setShowModelPicker(true)}
              >
                选择
              </button>
            </div>
            {modelList.length === 0 && (
              <div className="text-[11px] text-gray-400 mt-1">可直接输入模型名，或点击"获取/选择模型"</div>
            )}
          </div>
        </div>
        {settings.provider !== 'builtin' && (
          <div className="render-bg-secondary">
            <InlineSwitchRow
              label="模型支持图片识别"
              desc="不确定时请保持关闭"
              active={!!settings.customModelSupportsImageRecognition}
              onChange={() => setSettings(prev => ({ ...prev, customModelSupportsImageRecognition: !prev.customModelSupportsImageRecognition }))}
            />
          </div>
        )}
        <div className="px-4 py-3 border-b render-border-subtle">
          <button
            className={`text-sm font-bold ${modelLoading ? 'text-gray-400' : 'text-link'}`}
            onClick={() => {
              if (modelList.length > 0) {
                setShowModelPicker(true);
                return;
              }
              onFetchModels();
            }}
            disabled={modelLoading}
          >
            {modelLoading ? '获取中...' : (modelList.length > 0 ? '选择模型' : '获取模型')}
          </button>
        </div>
        <div className="px-4 py-3 border-b render-border-subtle">
          <button
            className="text-sm font-bold text-link"
            onClick={() => {
              onSaveProviderConfig();
              showWechatAlert('AI 配置已保存');
            }}
          >
            保存
          </button>
        </div>
        <div className="px-4 py-3 border-b render-border-subtle">
          <button
            className="text-sm font-bold text-link"
            onClick={onOpenSavePresetDialog}
          >
            保存到预设
          </button>
        </div>
        <SectionDivider label="模型检测" />
        <div className="render-bg-secondary">
          <div className="px-4 py-3 border-b render-border-subtle">
            <button
              className={`text-sm font-bold ${testResult.status === 'testing' ? 'text-gray-400' : 'text-link'}`}
              onClick={testModelConnection}
              disabled={testResult.status === 'testing'}
            >
              {testResult.status === 'testing' ? '检测中...' : '检测模型连接'}
            </button>
            <div className="text-[11px] text-gray-400 mt-1">发送测试请求验证 API 配置是否正确</div>
          </div>
          {testResult.status !== 'idle' && (
            <div className={`px-4 py-3 border-b render-border-subtle ${
              testResult.status === 'success' ? 'bg-green-50' :
              testResult.status === 'error' ? 'bg-red-50' :
              'bg-gray-50'
            }`}>
              <div className={`text-[13px] font-medium ${
                testResult.status === 'success' ? 'text-green-600' :
                testResult.status === 'error' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {testResult.status === 'testing' ? '⏳' : testResult.status === 'success' ? '✓' : '✕'} {testResult.message}
              </div>
              {testResult.details && (
                <div className="text-[12px] text-gray-500 mt-1 whitespace-pre-line">{testResult.details}</div>
              )}
            </div>
          )}
        </div>
        <div className="render-bg-secondary">
          <InlineSwitchRow
            label="高级功能"
            desc="开启后可配置温度等模型参数"
            active={!!settings.enableAdvancedModelSettings}
            onChange={() => setSettings(prev => ({ ...prev, enableAdvancedModelSettings: !prev.enableAdvancedModelSettings }))}
          />
        </div>
        {settings.enableAdvancedModelSettings && (
          <>
            {ADVANCED_MODEL_FIELD_CONFIGS.map((field) => {
              const currentValue = getAdvancedFieldValue(field.key);
              const enabled = typeof currentValue === 'number';
              return (
                <div key={field.key} className="px-4 py-3 border-b render-border-subtle">
                  <div className="flex items-center justify-between">
                    <div className="text-[13px] render-text-tertiary">{field.label}</div>
                    <AppSwitch
                      active={enabled}
                      onChange={() => {
                        if (enabled) {
                          setAdvancedFieldValue(field.key, undefined);
                          return;
                        }
                        setAdvancedFieldValue(field.key, field.defaultValue);
                      }}
                    />
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">{field.hint}</div>
                  {enabled && (
                    <div className="mt-2 flex items-center gap-3">
                      <input
                        type="range"
                        className="flex-1"
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={currentValue}
                        onChange={(e) => {
                          const next = parseOptionalNumber(e.target.value);
                          if (typeof next !== 'number') return;
                          setAdvancedFieldValue(field.key, clampNumber(next, field.min, field.max));
                        }}
                      />
                      <input
                        type="number"
                        className="w-24 bg-transparent outline-none text-[13px] render-text-primary border rounded px-2 py-1 render-border"
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={String(currentValue)}
                        onChange={(e) => {
                          const next = parseOptionalNumber(e.target.value);
                          if (typeof next !== 'number') return;
                          setAdvancedFieldValue(field.key, clampNumber(next, field.min, field.max));
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {showModelPicker && (
        <div className="fixed inset-0 z-[420] bg-black/40 flex items-end" onClick={() => setShowModelPicker(false)}>
          <div className="w-full render-bg-secondary rounded-t-2xl max-h-[60vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b render-border-subtle flex items-center justify-between">
              <div className="text-[15px] font-medium">选择模型</div>
              <button className="text-[13px] text-link" onClick={() => setShowModelPicker(false)}>关闭</button>
            </div>
            <div className="overflow-y-auto max-h-[50vh]">
              {modelList.map((model) => {
                const selected = model === settings.model;
                return (
                  <button
                    key={model}
                    className={`w-full text-left px-4 py-3 border-b render-border-subtle text-[14px] ${selected ? 'text-link bg-[var(--bg-hover)]' : 'render-text-primary'}`}
                    onClick={() => {
                      setSettings(prev => ({ ...prev, model }));
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
