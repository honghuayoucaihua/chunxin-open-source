import React, { useEffect, useRef, useState } from 'react';
import { MobileHeader } from '../Common';
import { StickerImportView } from './UtilsContactSubPages';
import {
  getImageLibraryState,
  saveImageLibraryState,
  type ImageLibraryGroup,
  type ImageLibraryItem
} from '../services/imageLibraryStore';
import { compressImage } from '../services/imageService';
import ImageLibraryUrlImportPanel from './ImageLibraryUrlImportPanel';
import { ImageLibraryGroupCard, ImageLibraryItemCard } from './ImageLibraryCards';
import { CollectionSummaryBar } from './CollectionPrimitives';
import { SharedEmptyState } from '../settings/SharedPanelPrimitives';
import { confirmWechatAction, promptWechatAction, showWechatAlert } from './wechatDialog';
const MAX_IMAGE_UPLOAD_MB = 12;
const MAX_IMAGE_UPLOAD_BYTES = MAX_IMAGE_UPLOAD_MB * 1024 * 1024;
const URL_IMAGE_IMPORT_TIMEOUT_MS = 15000;

const fetchImageWithTimeout = async (url: string): Promise<Response> => {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), URL_IMAGE_IMPORT_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });
  } finally {
    globalThis.clearTimeout(timeout);
  }
};

export const ImageLibraryGroupsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const initial = getImageLibraryState();
  const [groups, setGroups] = useState<ImageLibraryGroup[]>(initial.groups);
  const [items, setItems] = useState<ImageLibraryItem[]>(initial.items);
  const [uploadGroupId, setUploadGroupId] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showUrlImport, setShowUrlImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const showImportError = (error: unknown) => {
    const raw = String((error as any)?.message || '').trim();
    const message = raw.includes('图片太大了') ? `图片太大了（上限 ${MAX_IMAGE_UPLOAD_MB}MB）` : '图片处理失败，请重试';
    showWechatAlert(message);
  };
  const toCompressedDataUrl = (file: File) => {
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) throw new Error('图片太大了');
    return compressImage(file, { quality: 0.82, maxSizeKB: 600, mimeType: 'image/jpeg' });
  };

  const convertUrlToCompressedDataUrl = async (url: string) => {
    const response = await fetchImageWithTimeout(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('不是有效图片');
    if (blob.size > MAX_IMAGE_UPLOAD_BYTES) throw new Error('图片太大了');
    const ext = blob.type.split('/')[1] || 'jpg';
    const file = new File([blob], `url-import.${ext}`, { type: blob.type });
    return toCompressedDataUrl(file);
  };
  useEffect(() => {
    saveImageLibraryState(groups, items);
  }, [groups, items]);

  const openAddGroup = () => {
    const saveGroup = (name?: string) => {
      const trimmed = String(name || '').trim();
      if (!trimmed) return;
      const id = `img-group-${Date.now()}`;
      setGroups((prev) => [...prev, { id, name: trimmed, order: prev.length, createdAt: Date.now(), updatedAt: Date.now() }]);
    };
    promptWechatAction('新建相册', '', saveGroup);
  };

  const renameGroup = (group: ImageLibraryGroup) => {
    const saveGroup = (name?: string) => {
      const trimmed = String(name || '').trim();
      if (!trimmed) return;
      setGroups((prev) => prev.map((item) => (item.id === group.id ? { ...item, name: trimmed, updatedAt: Date.now() } : item)));
    };
    promptWechatAction('重命名相册', group.name, saveGroup);
  };

  const deleteGroup = (group: ImageLibraryGroup) => {
    const confirmDelete = () => {
      setGroups((prev) => prev.filter((item) => item.id !== group.id).map((item, index) => ({ ...item, order: index })));
      setItems((prev) => prev.filter((item) => item.groupId !== group.id));
    };
    confirmWechatAction(`删除相册「${group.name}」及其图片？`, confirmDelete);
  };

  const openUpload = (groupId: string) => {
    setUploadGroupId(groupId);
    fileInputRef.current?.click();
  };

  const openUrlImport = (groupId: string) => {
    setUploadGroupId(groupId);
    setShowUrlImport(true);
  };
  const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length > 0) setPendingFiles(files);
  };

  const onConfirmImport = (stickers: { url: string; desc: string }[]) => {
    if (!uploadGroupId) return;
    const createdAt = Date.now();
    const nextItems = stickers.map((sticker, index) => ({
      id: `${uploadGroupId}-${createdAt}-${index}`,
      groupId: uploadGroupId,
      url: String(sticker.url || '').trim(),
      desc: String(sticker.desc || '').trim(),
      createdAt
    })).filter((item) => item.url);
    setItems((prev) => [...prev, ...nextItems]);
    setPendingFiles([]);
    setUploadGroupId(null);
  };

  const onConfirmUrlImport = (images: { url: string; desc: string }[]) => {
    if (!uploadGroupId) return;
    const createdAt = Date.now();
    const nextItems = images.map((item, index) => ({
      id: `${uploadGroupId}-${createdAt}-url-${index}`,
      groupId: uploadGroupId,
      url: String(item.url || '').trim(),
      desc: String(item.desc || '').trim(),
      createdAt
    })).filter((item) => item.url);
    setItems((prev) => [...prev, ...nextItems]);
    setShowUrlImport(false);
    setUploadGroupId(null);
  };
  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const editItemDesc = (item: ImageLibraryItem) => {
    const saveDesc = (next?: string) => {
      const value = String(next || '').trim();
      setItems((prev) => prev.map((current) => (current.id === item.id ? { ...current, desc: value } : current)));
    };
    promptWechatAction('编辑图片描述', item.desc || '', saveDesc);
  };

  const removeSelectedItems = () => {
    if (selectedItemIds.length === 0) return;
    const doDelete = () => {
      const selectedSet = new Set(selectedItemIds);
      setItems((prev) => prev.filter((item) => !selectedSet.has(item.id)));
      setSelectedItemIds([]);
      setIsSelecting(false);
    };
    confirmWechatAction(`删除选中的 ${selectedItemIds.length} 张图片？`, doDelete);
  };

  const orderedGroups = [...groups].sort((a, b) => a.order - b.order);
  const activeGroup = activeGroupId ? orderedGroups.find((group) => group.id === activeGroupId) || null : null;
  const activeGroupItems = activeGroup ? items.filter((item) => item.groupId === activeGroup.id) : [];

  useEffect(() => {
    if (!activeGroupId) return;
    const exists = groups.some((group) => group.id === activeGroupId);
    if (!exists) {
      setActiveGroupId(null);
      setIsSelecting(false);
      setSelectedItemIds([]);
    }
  }, [activeGroupId, groups]);

  const handleBack = () => {
    if (activeGroup) {
      setActiveGroupId(null);
      setIsSelecting(false);
      setSelectedItemIds([]);
      return;
    }
    onBack();
  };

  const listHeaderAction = <button className="app-button app-button-primary whitespace-nowrap" onClick={openAddGroup}>新建相册</button>;
  const detailHeaderAction = activeGroup
    ? <button className="app-button app-button-muted whitespace-nowrap" onClick={() => { setIsSelecting((prev) => !prev); if (isSelecting) setSelectedItemIds([]); }}>{isSelecting ? '完成' : '编辑'}</button>
    : null;
  return (
    <div className="fixed inset-0 z-[300] render-bg-primary flex flex-col animate-in slide-in-from-right duration-300">
      <MobileHeader title={activeGroup ? activeGroup.name : '相册管理'} onBack={handleBack} actions={activeGroup ? detailHeaderAction : listHeaderAction} />
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFileSelected} />
      {pendingFiles.length > 0 && (
        <StickerImportView
          files={pendingFiles}
          fileToDataUrl={toCompressedDataUrl}
          onImportError={showImportError}
          onBack={() => {
            setPendingFiles([]);
            setUploadGroupId(null);
          }}
          onConfirm={onConfirmImport}
          title="添加相册图片"
          confirmLabel="添加图片"
          descLabel="图片描述"
          placeholder="输入图片描述"
        />
      )}
      <ImageLibraryUrlImportPanel
        visible={showUrlImport}
        onClose={() => { setShowUrlImport(false); setUploadGroupId(null); }}
        onConfirm={onConfirmUrlImport}
        toDataUrl={convertUrlToCompressedDataUrl}
        onImportError={showImportError}
        onImportNotice={showWechatAlert}
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!activeGroup && orderedGroups.map((group) => {
          const groupItems = items.filter((item) => item.groupId === group.id);
          return (
            <ImageLibraryGroupCard
              key={group.id}
              group={group}
              coverUrl={groupItems[0]?.url}
              itemCount={groupItems.length}
              onOpen={() => setActiveGroupId(group.id)}
              onUpload={() => openUpload(group.id)}
              onImportUrl={() => openUrlImport(group.id)}
              onRename={() => renameGroup(group)}
              onDelete={() => deleteGroup(group)}
            />
          );
        })}
        {!activeGroup && orderedGroups.length === 0 && (
          <SharedEmptyState className="py-8 text-[13px]">暂无相册，点击右上角新建相册</SharedEmptyState>
        )}
        {activeGroup && (
          <div className="space-y-3">
            <CollectionSummaryBar
              summary={`共 ${activeGroupItems.length} 张图片`}
              actions={
                <>
                  <button type="button" className="app-button app-button-muted px-3 py-1 text-[12px] min-h-0" onClick={() => openUpload(activeGroup.id)}>上传图片</button>
                  <button type="button" className="app-button app-button-muted px-3 py-1 text-[12px] min-h-0" onClick={() => openUrlImport(activeGroup.id)}>URL导入</button>
                </>
              }
            />
            {activeGroupItems.length === 0 && (
              <SharedEmptyState className="app-surface-panel app-collection-card py-8 text-[13px]">当前相册暂无图片</SharedEmptyState>
            )}
            {activeGroupItems.map((item) => {
              const selected = selectedItemIds.includes(item.id);
              return (
                <ImageLibraryItemCard
                  key={item.id}
                  item={item}
                  selected={selected}
                  isSelecting={isSelecting}
                  onToggleSelect={() => {
                    if (!isSelecting) return;
                    setSelectedItemIds((prev) => (prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]));
                  }}
                  onEdit={() => editItemDesc(item)}
                  onDelete={() => removeItem(item.id)}
                />
              );
            })}
            {isSelecting && (
              <div className="sticky bottom-0 pb-[calc(8px+var(--safe-bottom))]">
                <button
                  className="app-button app-button-danger w-full h-11 disabled:opacity-50"
                  disabled={selectedItemIds.length === 0}
                  onClick={removeSelectedItems}
                >
                  删除已选（{selectedItemIds.length}）
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
