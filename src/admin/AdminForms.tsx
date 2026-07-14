import React, { useState } from 'react';

type PassphraseEditItem = {
  phrase: string;
  limit: number;
  isUnlimited: boolean;
  validDays: number;
  phraseExpiresDays: number | null;
  maxUses: number | null;
  maxUsesPerUser: number | null;
};

export const PassphraseEditForm: React.FC<{
  item: PassphraseEditItem;
  onSave: (data: { phrase: string; limit: number; isUnlimited: boolean; validDays: number; phraseExpiresDays: number | null; maxUses: number | null; maxUsesPerUser: number | null }) => void;
  onCancel: () => void;
}> = ({ item, onSave, onCancel }) => {
  const [phrase, setPhrase] = useState(item.phrase);
  const [limit, setLimit] = useState(item.limit);
  const [isUnlimited, setIsUnlimited] = useState(item.isUnlimited);
  const [validDays, setValidDays] = useState(item.validDays);
  const [phraseExpiresDays, setPhraseExpiresDays] = useState(item.phraseExpiresDays);
  const [maxUses, setMaxUses] = useState(item.maxUses);
  const [maxUsesPerUser, setMaxUsesPerUser] = useState(item.maxUsesPerUser);

  const handleSave = () => {
    if (!phrase.trim()) {
      return;
    }
    onSave({ phrase: phrase.trim(), limit, isUnlimited, validDays, phraseExpiresDays, maxUses, maxUsesPerUser });
  };

  return (
    <div className="p-3 space-y-3">
      <input
        type="text"
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-purple-500"
        placeholder="口令名称"
        autoFocus
      />

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-white/60 text-sm">
          <input
            type="checkbox"
            checked={isUnlimited}
            onChange={(e) => setIsUnlimited(e.target.checked)}
            className="rounded"
          />
          无限次数
        </label>
      </div>

      {!isUnlimited && (
        <div className="flex items-center gap-2">
          <span className="text-white/50 text-sm w-16">每日次数</span>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value) || 0)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            min={1}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-white/50 text-sm w-16">口令有效期</span>
        <input
          type="number"
          value={phraseExpiresDays ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            setPhraseExpiresDays(val === '' ? null : Math.max(0, parseInt(val) || 0));
          }}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
          min={0}
          placeholder="留空=永久"
        />
        <span className="text-white/40 text-xs">口令过期后不能兑换</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-white/50 text-sm w-16">总次数</span>
        <input
          type="number"
          value={maxUses ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            setMaxUses(val === '' ? null : Math.max(0, parseInt(val) || 0));
          }}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
          min={0}
          placeholder="留空=不限"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-white/50 text-sm w-16">每人次数</span>
        <input
          type="number"
          value={maxUsesPerUser ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            setMaxUsesPerUser(val === '' ? null : Math.max(0, parseInt(val) || 0));
          }}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
          min={0}
          placeholder="留空=不限"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-white/50 text-sm w-16">兑换后有效期</span>
        <input
          type="number"
          value={validDays}
          onChange={(e) => setValidDays(parseInt(e.target.value) || 0)}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
          min={0}
          placeholder="天数"
        />
        <span className="text-white/40 text-xs">(0=永久)</span>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} className="flex-1 bg-purple-500 text-white py-2 rounded-lg text-sm whitespace-nowrap">确定</button>
        <button onClick={onCancel} className="flex-1 bg-white/10 text-white/60 py-2 rounded-lg text-sm whitespace-nowrap">取消</button>
      </div>
    </div>
  );
};

export const NoticeForm: React.FC<{
  onSubmit: (title: string, content: string, type: string) => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ onSubmit, onCancel, loading }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('notice');

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-4 space-y-3">
      <div>
        <label className="text-white/60 text-xs mb-1 block">类型</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="app-field-select bg-slate-700/50 border-white/10 text-white text-sm"
        >
          <option value="notice">普通通知</option>
          <option value="announcement">公告</option>
          <option value="update">更新</option>
        </select>
      </div>
      <div>
        <label className="text-white/60 text-xs mb-1 block">标题 *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-slate-700/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
          placeholder="公告标题"
        />
      </div>
      <div>
        <label className="text-white/60 text-xs mb-1 block">内容 *</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full bg-slate-700/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none"
          rows={4}
          placeholder="公告内容..."
        />
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg bg-white/10 text-white/70 text-sm whitespace-nowrap">取消</button>
        <button onClick={() => onSubmit(title, content, type)} disabled={loading} className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-sm disabled:opacity-50 whitespace-nowrap">
          {loading ? '发布中...' : '发布'}
        </button>
      </div>
  </div>
);
};
