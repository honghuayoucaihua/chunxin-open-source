import React from 'react';
import { SectionDivider } from '../../Common';
import { UsageProgressBar } from '../AISettingsParts';
import { BuiltinAIUsage, testBuiltinConnection, sendBuiltinAIRequest, hasRemainingQuota } from '../../services/builtinAI';

type ModelTestStatus = 'idle' | 'testing' | 'success' | 'error';

interface ModelTestResult {
  status: ModelTestStatus;
  message: string;
  details?: string;
}

interface BuiltinAIConfigProps {
  builtinUsage: BuiltinAIUsage;
  builtinModel: string;
  builtinModelList: string[];
  onBuiltinModelChange: (model: string) => void;
  onOpenPassphraseDialog: () => void;
}

export const BuiltinAIConfig: React.FC<BuiltinAIConfigProps> = ({
  builtinUsage,
  builtinModel,
  builtinModelList,
  onBuiltinModelChange,
  onOpenPassphraseDialog
}) => {
  const [testResult, setTestResult] = React.useState<ModelTestResult>({ status: 'idle', message: '' });
  const activeBuiltinModel = builtinModel || builtinModelList[0] || 'free/cc';

  const testBuiltinModelConnection = async () => {
    if (!hasRemainingQuota()) {
      setTestResult({ status: 'error', message: '次数已用完', details: '今日可用次数已用完，请明天再试' });
      return;
    }

    setTestResult({ status: 'testing', message: '正在检测连接...' });

    try {
      // 先测试基础连接
      const connectionOk = await testBuiltinConnection();
      if (!connectionOk) {
        setTestResult({ status: 'error', message: '服务连接失败', details: '无法连接到叙说AI服务器，请检查网络连接' });
        return;
      }

      // 发送测试请求
      const response = await sendBuiltinAIRequest({
        model: activeBuiltinModel,
        messages: [{ role: 'user', content: 'Hello, this is a connection test. Please respond briefly.' }]
      });

      if (response.success) {
        setTestResult({ status: 'success', message: '连接成功', details: `模型 ${activeBuiltinModel} 响应正常` });
      } else {
        if (response.quotaExceeded) {
          setTestResult({ status: 'error', message: '次数已用完', details: '今日可用次数已用完，请明天再试' });
        } else {
          setTestResult({ status: 'error', message: '模型响应失败', details: response.error || '未知错误' });
        }
      }
    } catch (error) {
      console.error('Builtin AI test error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      let details = errorMessage;
      let message = '连接失败';

      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError') || errorMessage.includes('网络连接失败')) {
        message = '网络错误';
        details = '无法连接到服务器，请检查网络连接是否正常';
      } else if (errorMessage.includes('次数已用完') || errorMessage.includes('quota')) {
        message = '次数已用完';
        details = '今日可用次数已用完，请明天再试';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
        message = '请求超时';
        details = '服务器响应时间过长，请稍后重试';
      } else if (errorMessage.includes('JSON') || errorMessage.includes('解析')) {
        message = '响应格式错误';
        details = '服务器返回了无效的响应格式，请稍后重试';
      }

      setTestResult({ status: 'error', message, details });
    }
  };

  return (
    <div className="render-bg-secondary">
      <SectionDivider label="叙说AI服务" />
      <UsageProgressBar usage={builtinUsage} />

      <div className="flex items-center px-4 py-3 border-b render-border-subtle">
        <div className="w-24 text-[13px] render-text-tertiary">模型</div>
        <div className="flex-1">
          <div className="relative">
            <select
              className="app-field-select text-[14px] py-1.5"
              value={builtinModel || activeBuiltinModel}
              onChange={(e) => onBuiltinModelChange(e.target.value)}
              disabled={builtinModelList.length === 0}
            >
              {builtinModelList.length === 0 ? (
                <option value={activeBuiltinModel}>{activeBuiltinModel}</option>
              ) : (
                builtinModelList.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* 模型检测 */}
      <div className="px-4 py-3 border-b render-border-subtle">
        <button
          className={`text-sm font-bold ${testResult.status === 'testing' ? 'text-gray-400' : 'text-link'}`}
          onClick={testBuiltinModelConnection}
          disabled={testResult.status === 'testing'}
        >
          {testResult.status === 'testing' ? '检测中...' : '检测模型连接'}
        </button>
        <div className="text-[11px] text-gray-400 mt-1">发送测试请求验证服务是否正常</div>
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

      {/* 口令兑换 */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b render-border-subtle active:bg-black/5 cursor-pointer"
        onClick={onOpenPassphraseDialog}
      >
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-key text-[14px]" style={{ color: 'var(--app-accent-color)' }}></i>
          <span className="text-[14px] render-text-primary">兑换口令</span>
        </div>
        <div className="flex items-center gap-1 render-text-tertiary">
          <span className="text-[12px]">{builtinUsage.isPremium ? '已升级' : '兑换口令'}</span>
          <i className="fa-solid fa-chevron-right text-[10px]"></i>
        </div>
      </div>

      <div className="px-4 py-3 text-[12px] render-text-tertiary">
        <div className="flex items-center gap-2 mb-2">
          <i className="fa-solid fa-info-circle"></i>
          <span>使用说明</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-[11px]">
          <li>普通与高级共用同一套内置模型列表</li>
          <li>口令只会提升每日可用次数，不区分模型权限</li>
          <li>请求失败不会反复重试，避免额外消耗次数</li>
          <li>次数每日0点自动重置</li>
        </ul>
      </div>
    </div>
  );
};
