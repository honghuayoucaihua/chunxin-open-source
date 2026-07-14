import React, { useEffect, useState } from 'react';
import { BuiltinAIUsage, getDailyLimit, getRemainingQuota, getUsageProgress, verifyPassphrase } from '../services/builtinAI';
import { InlineFieldRow } from '../utils/UtilsContactFormPrimitives';

export const AIInputRow: React.FC<{ label: string; value: string; placeholder?: string; onChange: (v: string) => void }> = ({ label, value, placeholder, onChange }) => <InlineFieldRow label={label} value={value} placeholder={placeholder || ''} onChange={onChange} />;

export const UsageProgressBar: React.FC<{ usage: BuiltinAIUsage }> = ({ usage }) => {
  const limit = getDailyLimit();
  const progress = getUsageProgress();
  const remaining = getRemainingQuota();
  const percentage = Math.min(100, Math.max(0, 100 - progress));

  const getRemainingDays = () => {
    if (!usage.premiumExpiresAt) return null;
    const now = Date.now();
    const expires = usage.premiumExpiresAt;
    if (now >= expires) return 0;
    const days = Math.ceil((expires - now) / (24 * 60 * 60 * 1000));
    return days;
  };

  const remainingDays = getRemainingDays();

  return (
    <div className="px-4 py-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[13px] render-text-secondary">今日剩余次数</span>
        <span className="text-[13px] font-medium" style={{ color: remaining < 50 ? 'var(--color-danger)' : 'var(--app-accent-color)' }}>
          {remaining === Infinity ? '∞ 无限' : `${remaining} / ${limit === -1 ? '∞' : limit}`}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: limit === -1 ? '100%' : `${percentage}%`,
            backgroundColor: remaining < 50 ? 'var(--color-danger)' : 'var(--app-accent-color)'
          }}
        />
      </div>

      {remainingDays !== null && (
        <div className="mt-2 text-[11px] flex items-center gap-1" style={{ color: remainingDays <= 3 ? 'var(--color-danger)' : '#10aeff' }}>
          <i className="fa-solid fa-clock"></i>
          {remainingDays > 0 ? `有效期剩余 ${remainingDays} 天` : <span className="text-red-500">已过期</span>}
        </div>
      )}

      {usage.isPremium && !usage.premiumExpiresAt && (
        <div className="mt-2 text-[11px] text-green-600 flex items-center gap-1">
          <i className="fa-solid fa-crown text-yellow-500"></i>
          高级用户 · 永久有效
        </div>
      )}
    </div>
  );
};

export const PassphraseDialog: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void }> = ({ isOpen, onClose, onSuccess }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!input.trim()) {
      setError('请输入口令');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await verifyPassphrase(input.trim());
      if (result.success) {
        setInput('');
        onSuccess();
        onClose();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('验证失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="app-surface-panel rounded-lg w-72 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="app-surface-header text-center !pb-3">
          <span className="text-[16px] font-medium render-text-primary">输入口令</span>
        </div>
        <div className="app-surface-body !pt-0">
          <input
            type="text"
            className="app-field-input text-[14px] render-text-primary"
            placeholder="请输入口令"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleSubmit()}
            autoFocus
            disabled={loading}
          />
          {error && <div className="mt-2 text-[12px] text-red-500">{error}</div>}
        </div>
        <div className="app-surface-footer">
          <button className="app-button app-button-muted app-footer-button border-r render-border-subtle" onClick={onClose} disabled={loading}>取消</button>
          <button className="app-button app-button-muted app-footer-button" style={{ color: 'var(--app-accent-color)' }} onClick={handleSubmit} disabled={loading}>{loading ? '验证中...' : '确定'}</button>
        </div>
      </div>
    </div>
  );
};

export const SavePresetDialog: React.FC<{
  isOpen: boolean;
  defaultName: string;
  onClose: () => void;
  onConfirm: (name: string) => void;
}> = ({ isOpen, defaultName, onClose, onConfirm }) => {
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (isOpen) setName(defaultName);
  }, [isOpen, defaultName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="app-surface-panel rounded-lg w-80 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="app-surface-header text-center !pb-3">
          <span className="text-[16px] font-medium render-text-primary">保存为预设</span>
        </div>
        <div className="app-surface-body !pt-0">
          <input
            type="text"
            className="app-field-input text-[14px] render-text-primary"
            placeholder="输入预设名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onConfirm(name)}
            autoFocus
          />
          <div className="mt-2 text-[11px] text-gray-400">将保存当前服务商配置与当前模型列表</div>
        </div>
        <div className="app-surface-footer">
          <button className="app-button app-button-muted app-footer-button border-r render-border-subtle" onClick={onClose}>取消</button>
          <button className="app-button app-button-muted app-footer-button" style={{ color: 'var(--app-accent-color)' }} onClick={() => onConfirm(name)}>保存</button>
        </div>
      </div>
    </div>
  );
};
