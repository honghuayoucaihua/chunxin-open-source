import React, { useState, useEffect, useRef } from 'react';
import { MobileHeader } from '../Common';
import { StickerImportView } from './UtilsContactSubPages';
import { getRuntimeGroupEmojiMap, normalizeGroupEmojiList, persistGroupEmojiMap } from '../chatroom/emojiState';
import EmojiUrlImportPanel from '../chatroom/EmojiUrlImportPanel';
import { CollectionBottomSheet, CollectionSummaryBar } from './CollectionPrimitives';
import {
  collectEmojiBootstrapState,
  collectEmojiStoreStateFromWindow,
  patchEmojiRuntimeState,
  persistEmojiUiStateToLocalStorage
} from '../chatroom/emojiStore';
import { confirmWechatAction, showWechatAlert } from './wechatDialog';

// 发送位置
export const EmojiGroupsView: React.FC<{
  onBack: () => void;
}> = ({ onBack }) => {
  const LEGACY_BUILTIN_EMOJI_GROUP_IDS = new Set(['douyin', 'xiaohongshu']);
  const normalizeEmojiGroups = (input: { id: string; name: string; folder: string; enabled: boolean; isBuiltIn: boolean; order: number }[]) => {
    return input.filter(g => !LEGACY_BUILTIN_EMOJI_GROUP_IDS.has(g.id));
  };
  const bootstrapEmojiState = collectEmojiBootstrapState();

  const [groups, setGroups] = useState<{ id: string; name: string; folder: string; enabled: boolean; isBuiltIn: boolean; order: number }[]>(() => normalizeEmojiGroups(bootstrapEmojiState.emojiGroups));
  const [editingGroup, setEditingGroup] = useState<{ id: string; name: string; folder: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupFolder, setNewGroupFolder] = useState('');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [selectedGroupEmojiIds, setSelectedGroupEmojiIds] = useState<string[]>([]);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showGroupUrlImportPanel, setShowGroupUrlImportPanel] = useState(false);
  
  // 批量上传状态
  const [uploadingGroupId, setUploadingGroupId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 隐藏的表情ID
  const [hiddenEmojiIds, setHiddenEmojiIds] = useState<string[]>(() => {
    const saved = bootstrapEmojiState.hiddenEmojiIds;
    if (Array.isArray(saved)) return saved;
    return [];
  });

  // 保存分组到全局状态
  useEffect(() => {
    patchEmojiRuntimeState({ emojiGroups: groups });
    persistEmojiUiStateToLocalStorage({
      ...collectEmojiStoreStateFromWindow(),
      emojiGroups: groups
    });
  }, [groups]);

  // 保存隐藏表情到全局状态
  useEffect(() => {
    patchEmojiRuntimeState({ hiddenEmojiIds });
    persistEmojiUiStateToLocalStorage({
      ...collectEmojiStoreStateFromWindow(),
      hiddenEmojiIds
    });
  }, [hiddenEmojiIds]);

  // 切换分组启用状态
  const toggleGroupEnabled = (id: string) => {
    setGroups(prev => {
      const newGroups = prev.map(g => g.id === id ? { ...g, enabled: !g.enabled } : g);
      return newGroups;
    });
  };

  const getGroupEmojis = (groupId: string) => {
    const storedMap = ((window as any).allGroupEmojis && typeof (window as any).allGroupEmojis === 'object')
      ? (window as any).allGroupEmojis
      : getRuntimeGroupEmojiMap();
    return Array.isArray(storedMap[groupId]) ? storedMap[groupId] : [];
  };

  const saveGroupEmojis = (groupId: string, list: { id: string; url: string; desc: string; groupId: string }[]) => {
    const storedMap = { ...getRuntimeGroupEmojiMap(), [groupId]: list };
    patchEmojiRuntimeState({ groupEmojis: storedMap });
    void persistGroupEmojiMap(storedMap);
  };

  const openGroupManager = (groupId: string) => {
    setActiveGroupId(groupId);
    setSelectedGroupEmojiIds([]);
    setShowGroupSettings(false);
    setShowGroupUrlImportPanel(false);
  };

  const closeGroupManager = () => {
    setActiveGroupId(null);
    setSelectedGroupEmojiIds([]);
    setShowGroupSettings(false);
    setShowGroupUrlImportPanel(false);
  };

  const removeSelectedGroupEmojis = () => {
    if (!activeGroupId || selectedGroupEmojiIds.length === 0) return;
    const execute = () => {
      const selectedSet = new Set(selectedGroupEmojiIds);
      const current = getGroupEmojis(activeGroupId);
      const next = current.filter((item: any) => !selectedSet.has(item.id));
      saveGroupEmojis(activeGroupId, next);
      setHiddenEmojiIds((prev) => prev.filter((id) => !selectedSet.has(id)));
      setSelectedGroupEmojiIds([]);
    };
    confirmWechatAction(`确定删除选中的${selectedGroupEmojiIds.length}个表情吗？`, execute);
  };

  // 删除分组（仅非内置分组可删除）
  const deleteGroup = (id: string) => {
    const group = groups.find(g => g.id === id);
    if (group?.isBuiltIn) {
      showWechatAlert('内置分组不可删除');
      return;
    }
    const doDelete = () => {
      closeGroupManager();
      setEditingGroup((prev) => (prev?.id === id ? null : prev));
      setShowGroupSettings(false);
      setGroups(prev => {
        const newGroups = prev.filter(g => g.id !== id);
        const allGroupEmojis = { ...getRuntimeGroupEmojiMap() };
        delete allGroupEmojis[id];
        patchEmojiRuntimeState({
          emojiGroups: newGroups,
          groupEmojis: allGroupEmojis
        });
        void persistGroupEmojiMap(allGroupEmojis);
        delete (window as any)[`groupEmojis_${id}`];
        return newGroups;
      });
    };
    confirmWechatAction(`确定删除分组"${group?.name}"吗？`, doDelete);
  };

  // 开始编辑分组
  const startEdit = (group: { id: string; name: string; folder: string }) => {
    setEditingGroup({ ...group });
  };

  // 保存编辑
  const saveEdit = () => {
    if (!editingGroup || !editingGroup.name.trim()) return;
    setGroups(prev => prev.map(g => 
      g.id === editingGroup.id 
        ? { ...g, name: editingGroup.name.trim(), folder: editingGroup.folder.trim() || g.folder }
        : g
    ));
    setEditingGroup(null);
  };

  // 添加新分组
  const addNewGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup = {
      id: `custom-${Date.now()}`,
      name: newGroupName.trim(),
      folder: newGroupFolder.trim() || `custom-${Date.now()}`,
      enabled: true,
      isBuiltIn: false,
      order: groups.length
    };
    setGroups(prev => [...prev, newGroup]);
    setNewGroupName('');
    setNewGroupFolder('');
    setShowAddModal(false);
  };

  // 上移分组
  const moveUp = (id: string) => {
    const idx = groups.findIndex(g => g.id === id);
    if (idx <= 0) return;
    const newGroups = [...groups];
    [newGroups[idx - 1], newGroups[idx]] = [newGroups[idx], newGroups[idx - 1]];
    setGroups(newGroups.map((g, i) => ({ ...g, order: i })));
  };

  // 下移分组
  const moveDown = (id: string) => {
    const idx = groups.findIndex(g => g.id === id);
    if (idx < 0 || idx >= groups.length - 1) return;
    const newGroups = [...groups];
    [newGroups[idx], newGroups[idx + 1]] = [newGroups[idx + 1], newGroups[idx]];
    setGroups(newGroups.map((g, i) => ({ ...g, order: i })));
  };

  // 恢复隐藏的表情
  const restoreHiddenEmojis = () => {
    confirmWechatAction(`确定恢复所有隐藏的表情（共${hiddenEmojiIds.length}个）吗？`, () => {
      setHiddenEmojiIds([]);
    });
  };

  // 获取分组中删除的表情数量
  const getGroupDeletedCount = (groupId: string) => {
    return hiddenEmojiIds.filter(id => id.startsWith(groupId + '-')).length;
  };

  // 恢复特定分组的删除表情
  const restoreGroupDeletedEmojis = (groupId: string) => {
    const count = getGroupDeletedCount(groupId);
    if (count === 0) return;
    setHiddenEmojiIds(prev => prev.filter(id => !id.startsWith(groupId + '-')));
  };

  // 打开文件选择器，为指定分组添加表情
  const openFilePicker = (groupId: string) => {
    setUploadingGroupId(groupId);
    fileInputRef.current?.click();
  };

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setPendingFiles(files);
    }
    // 重置 input
    e.target.value = '';
  };

  // 确认添加表情到分组
  const confirmAddEmojis = (stickers: { url: string; desc: string }[]) => {
    if (!uploadingGroupId) return;
    
    // 获取当前分组的自定义表情
    const groupEmojisKey = `groupEmojis_${uploadingGroupId}`;
    const storedMap = getRuntimeGroupEmojiMap();
    const existingEmojis = Array.isArray(storedMap[uploadingGroupId])
      ? storedMap[uploadingGroupId]
      : ((window as any)[groupEmojisKey] || []);
    
    // 创建新表情
    const newEmojis = stickers.map((s, i) => ({
      id: `${uploadingGroupId}-${Date.now()}-${i}`,
      url: s.url,
      desc: s.desc,
      groupId: uploadingGroupId
    }));
    
    // 合并并保存
    const merged = [...existingEmojis, ...newEmojis];
    (window as any)[groupEmojisKey] = merged;
    
    // 触发全局状态更新（用于 ChatRoom 读取）
    const allGroupEmojis = { ...storedMap };
    allGroupEmojis[uploadingGroupId] = merged;
    patchEmojiRuntimeState({ groupEmojis: allGroupEmojis });
    void persistGroupEmojiMap(allGroupEmojis);
    
    // 清理状态
    setPendingFiles([]);
    setUploadingGroupId(null);
  };

  // 获取分组的表情数量
  const getGroupEmojiCount = (groupId: string) => {
    return getGroupEmojis(groupId).length;
  };

  const handleBack = () => {
    if (activeGroupId) {
      closeGroupManager();
      return;
    }
    onBack();
  };

  const activeGroup = activeGroupId
    ? (groups.find((group) => group.id === activeGroupId) || null)
    : null;
  const activeGroupEmojis = activeGroup ? getGroupEmojis(activeGroup.id) : [];

  const appendUrlImportedGroupEmojis = async (list: { url: string; desc: string }[]) => {
    if (!activeGroup) return;
    const existing = getGroupEmojis(activeGroup.id);
    const appended = normalizeGroupEmojiList(activeGroup.id, list.map((item, index) => ({
      id: `${activeGroup.id}-url-${Date.now()}-${index}`,
      url: item.url,
      desc: item.desc,
      groupId: activeGroup.id
    })));
    if (appended.length === 0) return;
    saveGroupEmojis(activeGroup.id, [...existing, ...appended]);
  };
  const headerActions = activeGroup ? (
    <button
      className="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-gray-800"
      onClick={() => setShowGroupSettings(true)}
      title="分组设置"
    >
      <i className="fa-solid fa-ellipsis-vertical text-sm"></i>
    </button>
  ) : null;

  return (
    <div className="fixed inset-0 z-[300] render-bg-primary flex flex-col animate-in slide-in-from-right duration-300">
      <MobileHeader title={activeGroup ? activeGroup.name : '表情管理'} onBack={handleBack} actions={headerActions} />
      
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      
      {/* 批量添加表情弹窗 */}
      {pendingFiles.length > 0 && (
        <StickerImportView
          files={pendingFiles}
          onBack={() => setPendingFiles([])}
          onConfirm={confirmAddEmojis}
        />
      )}
      
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {activeGroup ? (
          <div className="p-4 space-y-3">
            <CollectionSummaryBar
              summary={`共 ${activeGroupEmojis.length} 个表情`}
              actions={
                <>
                {!activeGroup.isBuiltIn && (
                  <button
                    className="app-button app-button-primary px-3 py-1.5 text-[12px] min-h-0"
                    onClick={() => openFilePicker(activeGroup.id)}
                  >
                    添加表情
                  </button>
                )}
                {!activeGroup.isBuiltIn && (
                  <button
                    className="app-button app-button-muted px-3 py-1.5 text-[12px] min-h-0"
                    onClick={() => setShowGroupUrlImportPanel(true)}
                  >
                    URL导入
                  </button>
                )}
                {selectedGroupEmojiIds.length > 0 && (
                  <button
                    className="app-button app-button-danger px-3 py-1.5 text-[12px] min-h-0"
                    onClick={removeSelectedGroupEmojis}
                  >
                    删除({selectedGroupEmojiIds.length})
                  </button>
                )}
                </>
              }
            />

            {activeGroupEmojis.length === 0 ? (
              <div className="app-surface-panel app-collection-card py-10 text-center text-[13px] render-text-secondary">
                该分组暂无表情
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {activeGroupEmojis.map((item: any) => {
                  const selected = selectedGroupEmojiIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      className="relative w-full aspect-square"
                      onClick={() => setSelectedGroupEmojiIds((prev) => prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id])}
                    >
                      <img
                        src={item.url}
                        loading="lazy"
                        decoding="async"
                        className={`w-full h-full object-cover rounded-xl border render-border-subtle ${selected ? 'ring-2 ring-blue-500' : ''}`}
                      />
                      <span className="absolute bottom-0 left-0 right-0 bg-black/45 text-white text-[10px] py-1 px-1 truncate rounded-b-xl">{item.desc}</span>
                      {selected && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center">
                          <i className="fa-solid fa-check"></i>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="p-4">
              <div className="app-surface-panel app-collection-card overflow-hidden">
                {[...groups].sort((a, b) => a.order - b.order).map((group, idx) => {
                  const deletedCount = getGroupDeletedCount(group.id);
                  const emojiCount = getGroupEmojiCount(group.id);
                  return (
                    <div
                      key={group.id}
                      className={`p-4 border-b render-border-subtle last:border-b-0 ${!group.enabled ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center">
                        <div className="flex flex-col mr-3 space-y-1">
                          <button
                            className={`w-6 h-6 flex items-center justify-center rounded text-xs ${idx === 0 ? 'text-gray-300' : 'text-gray-500 active:bg-gray-100 dark:active:bg-gray-800'}`}
                            onClick={() => moveUp(group.id)}
                            disabled={idx === 0}
                          >
                            <i className="fa-solid fa-chevron-up"></i>
                          </button>
                          <button
                            className={`w-6 h-6 flex items-center justify-center rounded text-xs ${idx === groups.length - 1 ? 'text-gray-300' : 'text-gray-500 active:bg-gray-100 dark:active:bg-gray-800'}`}
                            onClick={() => moveDown(group.id)}
                            disabled={idx === groups.length - 1}
                          >
                            <i className="fa-solid fa-chevron-down"></i>
                          </button>
                        </div>

                        <button className="flex-1 min-w-0 text-left" onClick={() => openGroupManager(group.id)}>
                          <div className="flex items-center">
                            <span className="text-[15px] render-text-primary font-medium">{group.name}</span>
                            {group.isBuiltIn && (
                              <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 rounded">内置</span>
                            )}
                            {!group.isBuiltIn && emojiCount > 0 && (
                              <span className="ml-2 text-[10px] text-blue-500">{emojiCount}个表情</span>
                            )}
                          </div>
                          {group.isBuiltIn && (
                            <div className="text-[12px] render-text-secondary truncate mt-0.5">{group.folder}</div>
                          )}
                          {deletedCount > 0 && group.enabled && (
                            <span
                              className="mt-1 px-1.5 py-0.5 text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded cursor-pointer inline-block"
                              onClick={(e) => { e.stopPropagation(); restoreGroupDeletedEmojis(group.id); }}
                            >
                              {deletedCount}个已删除（点击恢复）
                            </span>
                          )}
                        </button>

                        <div className="flex items-center space-x-2">
                          <button
                            className={`w-12 h-7 rounded-full relative transition-colors ${group.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                            onClick={() => toggleGroupEnabled(group.id)}
                          >
                            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${group.enabled ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {hiddenEmojiIds.length > 0 && (
              <div className="px-4 pb-4">
                <button
                  className="app-surface-panel app-collection-card w-full py-3 flex items-center justify-center space-x-2 text-orange-600 font-medium"
                  onClick={restoreHiddenEmojis}
                >
                  <i className="fa-solid fa-rotate-left"></i>
                  <span>恢复所有删除的表情 ({hiddenEmojiIds.length}个)</span>
                </button>
              </div>
            )}

            <div className="px-4 pb-4">
              <button
                className="app-surface-panel app-collection-card w-full py-3 flex items-center justify-center space-x-2 text-link font-medium"
                onClick={() => setShowAddModal(true)}
              >
                <i className="fa-solid fa-plus"></i>
                <span>添加分组</span>
              </button>
            </div>

            <div className="px-4 pb-8">
              <div className="text-[12px] render-text-secondary space-y-1">
                <p>• 在聊天表情面板中可以整理表情，删除不需要的表情</p>
                <p>• 启用的分组表情会发送给AI，让AI可以在对话中发送表情</p>
                <p>• 拖动排序可调整分组在表情面板中的显示顺序</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 编辑分组弹窗 */}
      {editingGroup && (
        <CollectionBottomSheet
          title="编辑分组"
          onClose={() => setEditingGroup(null)}
          footer={
            <>
              <button className="app-button app-button-muted" onClick={() => setEditingGroup(null)}>取消</button>
              <button className="app-button app-button-primary" onClick={saveEdit}>保存</button>
            </>
          }
        >
          <label className="text-[13px] render-text-secondary mb-1 block">分组名称</label>
          <input
            className="app-field-input"
            value={editingGroup.name}
            onChange={e => setEditingGroup(prev => prev ? { ...prev, name: e.target.value } : null)}
            placeholder="输入分组名称"
          />
        </CollectionBottomSheet>
      )}

      {/* 添加分组弹窗 */}
      {showAddModal && (
        <CollectionBottomSheet
          title="添加分组"
          onClose={() => setShowAddModal(false)}
          footer={
            <>
              <button className="app-button app-button-muted" onClick={() => setShowAddModal(false)}>取消</button>
              <button className="app-button app-button-primary disabled:opacity-50" onClick={addNewGroup} disabled={!newGroupName.trim()}>添加</button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="text-[13px] render-text-secondary mb-1 block">分组名称</label>
              <input
                className="app-field-input"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="输入分组名称"
                autoFocus
              />
            </div>
            <p className="text-[11px] render-text-secondary">添加后点击分组右侧的 + 按钮可批量上传表情</p>
          </div>
        </CollectionBottomSheet>
      )}

      <EmojiUrlImportPanel
        visible={showGroupUrlImportPanel}
        onClose={() => setShowGroupUrlImportPanel(false)}
        onConfirmData={appendUrlImportedGroupEmojis}
        title={activeGroup ? `导入到${activeGroup.name}` : '从URL导入表情'}
        confirmPrefix="添加"
      />

      {activeGroup && showGroupSettings && (
        <CollectionBottomSheet onClose={() => setShowGroupSettings(false)}>
          <div className="app-options-list">
            <button
              className="app-list-item app-list-item--interactive"
              onClick={() => {
                setShowGroupSettings(false);
                startEdit(activeGroup);
              }}
            >
              <div className="app-list-item-main">
                <div className="app-list-item-title">编辑分组名称</div>
              </div>
            </button>
            <button
              className="app-list-item app-list-item--interactive app-list-item--danger"
              onClick={() => {
                setShowGroupSettings(false);
                deleteGroup(activeGroup.id);
              }}
            >
              <div className="app-list-item-main">
                <div className="app-list-item-title">删除分组</div>
              </div>
            </button>
          </div>
          <button className="app-button app-button-muted w-full mt-3" onClick={() => setShowGroupSettings(false)}>取消</button>
        </CollectionBottomSheet>
      )}
    </div>
  );
};
