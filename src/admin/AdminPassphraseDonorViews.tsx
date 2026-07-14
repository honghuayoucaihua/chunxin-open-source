import React from 'react';
import { PassphraseEditForm } from './AdminForms';

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

export const AdminPassphrasesView: React.FC<{
  passphrases: PassphraseItem[];
  editingId: string | null;
  onAdd: () => void;
  onStartEdit: (item: PassphraseItem) => void;
  onDelete: (id: string) => void;
  onSaveEditing: (data: { phrase: string; limit: number; isUnlimited: boolean; validDays: number; phraseExpiresDays: number | null; maxUses: number | null; maxUsesPerUser: number | null }) => void;
  onCancelEditing: () => void;
  onSaveConfig: () => Promise<void>;
  loading: boolean;
}> = ({
  passphrases,
  editingId,
  onAdd,
  onStartEdit,
  onDelete,
  onSaveEditing,
  onCancelEditing,
  onSaveConfig,
  loading
}) => (
  <div>
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-white font-medium">口令列表</h2>
      <button onClick={onAdd} className="bg-purple-500/20 text-purple-400 text-sm px-3 py-1.5 rounded-lg">
        <i className="fa-solid fa-plus mr-1"></i> 添加
      </button>
    </div>

    <div className="space-y-2">
      {passphrases.length === 0 && <div className="text-center text-white/40 py-8 text-sm">暂无口令，点击上方添加</div>}

      {passphrases.map((item) => (
        <div key={item.id} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          {editingId === item.id ? (
            <PassphraseEditForm item={item} onSave={onSaveEditing} onCancel={onCancelEditing} />
          ) : (
            <div className="p-3 flex items-center justify-between active:bg-white/5" onClick={() => onStartEdit(item)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-medium truncate">{item.phrase}</span>
                  {item.isUnlimited && <span className="bg-yellow-500/20 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded flex-shrink-0">无限</span>}
                  {item.phraseExpiresDays !== null && item.phraseExpiresDays > 0 && <span className="bg-orange-500/20 text-orange-400 text-[10px] px-1.5 py-0.5 rounded flex-shrink-0">口令限{item.phraseExpiresDays}天</span>}
                  {item.validDays > 0 && <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded flex-shrink-0">高级{item.validDays}天</span>}
                </div>
                <div className="text-white/40 text-xs">
                  {item.isUnlimited ? '无限次数' : `${item.limit} 次/天`}
                  {item.maxUses !== null && item.maxUses > 0 && ` · 总限${item.maxUses}次`}
                  {item.maxUsesPerUser !== null && item.maxUsesPerUser > 0 && ` · 每人限${item.maxUsesPerUser}次`}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <i className="fa-solid fa-pen text-white/30 text-xs"></i>
                <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="text-red-400/60 hover:text-red-400 p-1">
                  <i className="fa-solid fa-trash text-xs"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>

    {passphrases.length > 0 && (
      <button onClick={onSaveConfig} disabled={loading} className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium py-3 rounded-xl disabled:opacity-50 whitespace-nowrap">
        {loading ? '保存中...' : '保存口令配置'}
      </button>
    )}

    <div className="mt-6 bg-white/5 rounded-xl p-4 border border-white/10">
      <h3 className="text-white/80 text-sm font-medium mb-2">
        <i className="fa-solid fa-circle-info mr-1 text-blue-400"></i> 说明
      </h3>
      <ul className="text-white/50 text-xs space-y-1">
        <li>• <strong>无限次数</strong>：用户可无限使用AI服务</li>
        <li>• <strong>每日次数</strong>：用户每天可使用的次数限制</li>
        <li>• <strong>口令有效期</strong>：口令创建后多久过期，过期后不能再兑换</li>
        <li>• <strong>总次数</strong>：该口令最多可被兑换的总次数，留空=不限</li>
        <li>• <strong>每人次数</strong>：同一用户最多可用该口令兑换的次数，留空=不限</li>
        <li>• <strong>兑换后有效期</strong>：兑换成功后高级状态持续多久，0表示永久</li>
      </ul>
    </div>
  </div>
);
