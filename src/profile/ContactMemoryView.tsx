import React, { useState } from 'react';
import { ContactMemoryEntry } from '../types';
import { MobileHeader } from '../Common';
import { SharedEmptyState } from '../settings/SharedPanelPrimitives';
import { confirmWechatAction } from '../utils/wechatDialog';

// 长期记忆编辑视图
export const ContactMemoryView: React.FC<{
  contactId: string;
  memories: ContactMemoryEntry[];
  onBack: () => void;
  onUpdate: (memories: ContactMemoryEntry[]) => void;
}> = ({ contactId, memories, onBack, onUpdate }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemory, setNewMemory] = useState('');

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    const h = `${d.getHours()}`.padStart(2, '0');
    const min = `${d.getMinutes()}`.padStart(2, '0');
    return `${m}-${day} ${h}:${min}`;
  };

  const sourceLabel: Record<ContactMemoryEntry['source'], string> = {
    user: '用户',
    model: '联系人',
    system: '系统'
  };

  const handleEdit = (memory: ContactMemoryEntry) => {
    setEditingId(memory.id);
    setEditText(memory.text);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editText.trim()) return;
    const updated = memories.map(m =>
      m.id === editingId ? { ...m, text: editText.trim() } : m
    );
    onUpdate(updated);
    setEditingId(null);
    setEditText('');
  };

  const handleDelete = (id: string) => {
    confirmWechatAction('确定删除这条记忆吗？', () => {
      onUpdate(memories.filter(m => m.id !== id));
    });
  };

  const handleAddMemory = () => {
    if (!newMemory.trim()) return;
    const newEntry: ContactMemoryEntry = {
      id: `mem-manual-${Date.now()}`,
      text: newMemory.trim(),
      source: 'system',
      timestamp: Date.now(),
      weight: 2
    };
    onUpdate([...memories, newEntry]);
    setNewMemory('');
    setShowAddModal(false);
  };

  const handleClearAll = () => {
    confirmWechatAction('确定清空所有记忆吗？此操作不可恢复。', () => {
      onUpdate([]);
    });
  };

  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader
        title="长期记忆"
        onBack={onBack}
        actions={
          <button
            className="app-button app-button-primary whitespace-nowrap"
            onClick={() => setShowAddModal(true)}
          >
            添加
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        {memories.length === 0 ? (
          <SharedEmptyState
            className="py-10"
            iconClassName="fa-solid fa-brain text-4xl"
            title="暂无长期记忆"
            description="AI会在对话中自动积累记忆"
          />
        ) : (
          <>
            <div className="px-4 py-2 text-xs text-gray-400 render-bg-primary">
              共 {memories.length} 条记忆 · 点击编辑
            </div>
            {memories.map(memory => (
              <div
                key={memory.id}
                className="render-bg-secondary px-4 py-3 border-b render-border-subtle active:bg-black/5"
              >
                {editingId === memory.id ? (
                  <div className="space-y-2">
                    <textarea
                      className="w-full bg-transparent outline-none text-[14px] render-text-primary min-h-[60px]"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        className="app-button app-button-muted px-3 py-1 text-xs min-h-0"
                        onClick={() => { setEditingId(null); setEditText(''); }}
                      >
                        取消
                      </button>
                      <button
                        className="app-button app-button-primary px-3 py-1 text-xs min-h-0"
                        onClick={handleSaveEdit}
                      >
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => handleEdit(memory)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: memory.source === 'user' ? '#e6f7ff' : memory.source === 'model' ? '#f6ffed' : '#fff7e6',
                          color: memory.source === 'user' ? '#1890ff' : memory.source === 'model' ? '#52c41a' : '#fa8c16'
                        }}
                      >
                        {sourceLabel[memory.source]}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(memory.timestamp)}</span>
                      {memory.weight && memory.weight > 1 && (
                        <span className="text-xs text-gray-400">· 重要度 {memory.weight.toFixed(1)}</span>
                      )}
                    </div>
                    <div className="text-[14px] render-text-primary leading-relaxed">{memory.text}</div>
                    <div className="flex justify-end mt-2">
                      <button
                        className="text-xs text-danger"
                        onClick={(e) => { e.stopPropagation(); handleDelete(memory.id); }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="px-4 py-4">
              <button
                className="app-button app-button-danger w-full"
                onClick={handleClearAll}
              >
                清空所有记忆
              </button>
            </div>
          </>
        )}
      </div>

      {/* 添加记忆弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="app-surface-panel w-80 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="app-surface-header">
              <span className="text-[16px] font-medium render-text-primary">添加记忆</span>
            </div>
            <div className="app-surface-body">
              <textarea
                className="app-field-textarea w-full min-h-[100px] text-[14px] render-text-primary"
                placeholder="输入要添加的记忆内容..."
                value={newMemory}
                onChange={(e) => setNewMemory(e.target.value)}
                autoFocus
              />
            </div>
            <div className="app-surface-footer">
              <button
                className="app-button app-button-muted app-footer-button"
                onClick={() => { setShowAddModal(false); setNewMemory(''); }}
              >
                取消
              </button>
              <button
                className={`app-button app-footer-button ${newMemory.trim() ? 'app-button-primary' : 'app-button-muted opacity-60 cursor-not-allowed'}`}
                onClick={handleAddMemory}
                disabled={!newMemory.trim()}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
