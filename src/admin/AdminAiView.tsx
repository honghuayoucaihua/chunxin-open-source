import React, { useEffect, useMemo, useState } from 'react';
import { AdminPassphrasesView } from './AdminPassphraseDonorViews';

export type AiConfigPayload = {
  defaultDailyLimit: number;
  maxContextChars: number;
  proxyTimeoutMs: number;
  defaultTemperature?: number;
  models: string[];
  defaultModel: string;
  fallbackModel: string;
  enforceModelWhitelist: boolean;
};

export type AiRuntimePayload = {
  upstream?: {
    host?: string;
    keyConfigured?: boolean;
  };
};

type PassphraseItem = {
  id: string;
  phrase: string;
  limit: number;
  isUnlimited: boolean;
  validDays: number;
  phraseExpiresDays: number | null;
  maxUses: number | null;
  maxUsesPerUser: number | null;
};

type Props = {
  aiConfig: AiConfigPayload | null;
  aiRuntime: AiRuntimePayload | null;
  loading: boolean;
  onSaveAiConfig: (patch: Partial<AiConfigPayload>) => Promise<void>;
  onFetchModels: () => Promise<string[]>;
  onRefreshAi: () => Promise<void>;
  passphrases: PassphraseItem[];
  passphraseEditingId: string | null;
  onAddPassphrase: () => void;
  onStartEditPassphrase: (item: PassphraseItem) => void;
  onDeletePassphrase: (id: string) => void;
  onSavePassphraseEditing: (data: { phrase: string; limit: number; isUnlimited: boolean; validDays: number; phraseExpiresDays: number | null; maxUses: number | null; maxUsesPerUser: number | null }) => void;
  onCancelPassphraseEditing: () => void;
  onSavePassphraseConfig: () => Promise<void>;
};

type Draft = {
  defaultDailyLimit: string;
  models: string[];
  defaultModel: string;
  fallbackModel: string;
  enforceModelWhitelist: boolean;
};

const fieldLabel = 'text-white/60 text-xs mb-1 block';
const fieldInput = 'w-full bg-slate-700/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500';
const sectionWrap = 'bg-white/5 rounded-xl border border-white/10 p-4 mb-3';
const sectionTitle = 'text-white/80 text-sm font-medium mb-3';

const toDraft = (cfg: AiConfigPayload): Draft => ({
  defaultDailyLimit: String(cfg.defaultDailyLimit),
  models: [...cfg.models],
  defaultModel: cfg.defaultModel,
  fallbackModel: cfg.fallbackModel,
  enforceModelWhitelist: cfg.enforceModelWhitelist
});

const toPayload = (draft: Draft): Partial<AiConfigPayload> => ({
  defaultDailyLimit: Number(draft.defaultDailyLimit || 0),
  models: draft.models,
  defaultModel: draft.defaultModel,
  fallbackModel: draft.fallbackModel,
  enforceModelWhitelist: draft.enforceModelWhitelist
});

const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
  <div className="bg-white/5 rounded-lg p-3 border border-white/5">
    <div className="text-white/40 text-[11px] mb-1">{label}</div>
    <div className="text-white text-base font-medium">{value}</div>
    {hint ? <div className="text-white/30 text-[11px] mt-0.5">{hint}</div> : null}
  </div>
);

const uniqueModels = (input: string[]) => Array.from(new Set(input.map((item) => item.trim()).filter(Boolean)));

export const AdminAiView: React.FC<Props> = ({
  aiConfig,
  aiRuntime,
  loading,
  onSaveAiConfig,
  onFetchModels,
  onRefreshAi,
  passphrases,
  passphraseEditingId,
  onAddPassphrase,
  onStartEditPassphrase,
  onDeletePassphrase,
  onSavePassphraseEditing,
  onCancelPassphraseEditing,
  onSavePassphraseConfig
}) => {
  const [draft, setDraft] = useState<Draft | null>(aiConfig ? toDraft(aiConfig) : null);
  const [newModelInput, setNewModelInput] = useState('');
  const [modelLoading, setModelLoading] = useState(false);

  useEffect(() => {
    if (aiConfig) setDraft(toDraft(aiConfig));
  }, [aiConfig]);

  const isDirty = useMemo(() => {
    if (!draft || !aiConfig) return false;
    return JSON.stringify(draft) !== JSON.stringify(toDraft(aiConfig));
  }, [aiConfig, draft]);

  if (!draft || !aiConfig) {
    return (
      <div className="p-4">
        <div className="text-center text-white/40 py-8 text-sm">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-cyan-400 animate-spin mx-auto mb-3"></div>
          正在加载 AI 配置...
        </div>
      </div>
    );
  }

  const updateDraft = (patch: Partial<Draft>) => setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const handleAddModel = () => {
    const nextModel = newModelInput.trim();
    if (!nextModel) return;
    const nextModels = uniqueModels([...draft.models, nextModel]);
    updateDraft({
      models: nextModels,
      defaultModel: draft.defaultModel || nextModels[0] || '',
      fallbackModel: draft.fallbackModel || nextModels[0] || ''
    });
    setNewModelInput('');
  };

  const handleRemoveModel = (model: string) => {
    if (draft.models.length <= 1) return;
    const nextModels = draft.models.filter((item) => item !== model);
    updateDraft({
      models: nextModels,
      defaultModel: nextModels.includes(draft.defaultModel) ? draft.defaultModel : (nextModels[0] || ''),
      fallbackModel: nextModels.includes(draft.fallbackModel) ? draft.fallbackModel : (nextModels[0] || '')
    });
  };

  const handleFetchModels = async () => {
    if (modelLoading) return;
    setModelLoading(true);
    try {
      const fetchedModels = await onFetchModels();
      const nextModels = uniqueModels(fetchedModels);
      if (nextModels.length === 0) return;
      updateDraft({
        models: nextModels,
        defaultModel: nextModels.includes(draft.defaultModel) ? draft.defaultModel : (nextModels[0] || ''),
        fallbackModel: nextModels.includes(draft.fallbackModel) ? draft.fallbackModel : (nextModels[0] || '')
      });
    } finally {
      setModelLoading(false);
    }
  };

  const upstream = aiRuntime?.upstream || {};

  return (
    <div className="p-4">
      <div className={sectionWrap}>
        <div className="flex items-center justify-between mb-3">
          <h2 className={`${sectionTitle} mb-0`}>
            <i className="fa-solid fa-server mr-1 text-cyan-400"></i> 服务状态
          </h2>
          <button
            onClick={onRefreshAi}
            disabled={loading}
            className="text-white/50 hover:text-white text-xs px-2 py-1 rounded disabled:opacity-50"
          >
            <i className="fa-solid fa-rotate mr-1"></i>刷新
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Stat label="上游主机" value={upstream.host || '-'} hint={upstream.keyConfigured ? '密钥已配置' : '密钥未配置'} />
          <Stat
            label="可用模型"
            value={`${draft.models.length} 个`}
            hint={draft.enforceModelWhitelist ? '白名单已开启' : '白名单已关闭'}
          />
        </div>
      </div>

      <div className="mb-4">
        <label className={fieldLabel}>普通用户每日次数</label>
        <input
          type="number"
          inputMode="numeric"
          value={draft.defaultDailyLimit}
          onChange={(e) => updateDraft({ defaultDailyLimit: e.target.value })}
          className={fieldInput}
          min={0}
        />
      </div>

      <div className={sectionWrap}>
        <div className="flex items-center justify-between mb-3 gap-3">
          <h2 className={`${sectionTitle} mb-0`}>
            <i className="fa-solid fa-list-check mr-1 text-cyan-400"></i> 模型配置
          </h2>
          <button
            onClick={handleFetchModels}
            disabled={loading || modelLoading}
            className="bg-cyan-500/20 text-cyan-400 text-xs px-3 py-1.5 rounded-lg disabled:opacity-40 whitespace-nowrap"
          >
            <i className="fa-solid fa-download mr-1"></i>
            {modelLoading ? '获取中...' : '获取模型'}
          </button>
        </div>

        <div className="space-y-2 mb-3">
          {draft.models.map((model) => {
            return (
              <div key={model} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 border border-white/10 gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-white text-sm truncate">{model}</div>
                  <div className="text-white/35 text-[11px] mt-1 flex gap-2 flex-wrap">
                    {draft.defaultModel === model ? <span>默认模型</span> : null}
                    {draft.fallbackModel === model ? <span>后备模型</span> : null}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveModel(model)}
                  disabled={draft.models.length <= 1}
                  className="text-red-400/60 hover:text-red-400 disabled:opacity-30 p-1"
                >
                  <i className="fa-solid fa-trash text-xs"></i>
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newModelInput}
            onChange={(e) => setNewModelInput(e.target.value)}
            className={fieldInput}
            placeholder="手动添加模型名"
          />
          <button onClick={handleAddModel} className="bg-white/10 text-white/80 px-3 rounded-lg whitespace-nowrap">
            添加
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className={fieldLabel}>默认模型</label>
            <select
              value={draft.defaultModel}
              onChange={(e) => updateDraft({ defaultModel: e.target.value })}
              className="app-field-select text-sm py-2 text-white"
            >
              {draft.models.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={fieldLabel}>后备模型</label>
            <select
              value={draft.fallbackModel}
              onChange={(e) => updateDraft({ fallbackModel: e.target.value })}
              className="app-field-select text-sm py-2 text-white"
            >
              {draft.models.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-white/70 text-sm">
            <input
              type="checkbox"
              checked={draft.enforceModelWhitelist}
              onChange={(e) => updateDraft({ enforceModelWhitelist: e.target.checked })}
            />
            只允许请求白名单中的模型
          </label>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => onSaveAiConfig(toPayload(draft))}
          disabled={loading || !isDirty}
          className="flex-1 bg-gradient-to-r from-cyan-500 to-sky-500 text-white font-medium py-3 rounded-xl disabled:opacity-40 whitespace-nowrap"
        >
          {loading ? '保存中...' : '保存 AI 配置'}
        </button>
        <button
          onClick={() => setDraft(toDraft(aiConfig))}
          disabled={loading || !isDirty}
          className="px-4 bg-white/10 text-white/70 rounded-xl disabled:opacity-40 whitespace-nowrap"
        >
          重置
        </button>
      </div>

      <AdminPassphrasesView
        passphrases={passphrases}
        editingId={passphraseEditingId}
        onAdd={onAddPassphrase}
        onStartEdit={onStartEditPassphrase}
        onDelete={onDeletePassphrase}
        onSaveEditing={onSavePassphraseEditing}
        onCancelEditing={onCancelPassphraseEditing}
        onSaveConfig={onSavePassphraseConfig}
        loading={loading}
      />
    </div>
  );
};
