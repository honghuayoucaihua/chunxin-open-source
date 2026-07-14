import React, { useState, useRef } from 'react';
import { COMMUNITY_TYPE_META, type CommunityShareType } from '../community/communityTypes';
import {
  COMMUNITY_COVER_IMAGE_MAX_SIZE_KB,
  COMMUNITY_COVER_IMAGE_MAX_WIDTH
} from '../community/communityPayloadShared.js';
import { compressImage } from '../services/imageService';

export interface CommunityAdminItem {
  id: string;
  type: string;
  name: string;
  description: string;
  avatar: string;
  cover_image: string;
  author_name: string;
  is_anonymous: number;
  is_encrypted: number;
  like_count: number;
  download_count: number;
  report_count: number;
  created_at: number;
}

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const sanitizeCountInput = (value: string): number => {
  const digits = value.replace(/\D+/g, '');
  if (!digits) return 0;
  return Number.parseInt(digits, 10) || 0;
};

export const AdminCommunityView: React.FC<{
  items: CommunityAdminItem[];
  loading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  onDelete: (id: string) => Promise<void>;
  onEdit: (id: string, data: { name?: string; description?: string; like_count?: number; download_count?: number; report_count?: number; cover_image?: string }) => Promise<boolean>;
  onRefresh: () => void;
  coverUrlPrefix: string;
}> = ({ items, loading, search, onSearchChange, onDelete, onEdit, onRefresh, coverUrlPrefix }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<CommunityAdminItem | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', like_count: 0, download_count: 0, report_count: 0, cover_image: '' });
  const [saving, setSaving] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const closeEditModal = () => {
    if (saving) return;
    setEditingItem(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`确定要删除「${name}」吗？此操作不可恢复。`)) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (item: CommunityAdminItem) => {
    setEditingItem(item);
    setEditForm({
      name: item.name || '',
      description: item.description || '',
      like_count: item.like_count || 0,
      download_count: item.download_count || 0,
      report_count: item.report_count || 0,
      cover_image: item.cover_image || ''
    });
  };

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, {
        maxSizeKB: COMMUNITY_COVER_IMAGE_MAX_SIZE_KB,
        maxWidth: COMMUNITY_COVER_IMAGE_MAX_WIDTH
      });
      setEditForm(f => ({ ...f, cover_image: compressed }));
    } catch {
      window.alert('图片处理失败，请换一张图重试');
    }
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const trimmedName = editForm.name.trim();
    if (!trimmedName) return;
    setSaving(true);
    const ok = await onEdit(editingItem.id, { ...editForm, name: trimmedName });
    setSaving(false);
    if (ok) {
      closeEditModal();
    }
  };

  const totalShares = items.length;
  const reportedShares = items.filter(i => i.report_count > 0).length;
  const totalLikes = items.reduce((s, i) => s + (i.like_count || 0), 0);
  const totalDownloads = items.reduce((s, i) => s + (i.download_count || 0), 0);
  const hasSearch = search.trim().length > 0;

  const getCoverUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    return `${coverUrlPrefix}${path}`;
  };

  return (
    <div className="p-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: hasSearch ? '匹配分享' : '总分享', value: totalShares, color: 'text-emerald-400' },
          { label: hasSearch ? '匹配举报' : '被举报', value: reportedShares, color: reportedShares > 0 ? 'text-red-400' : 'text-white/60' },
          { label: hasSearch ? '匹配点赞' : '总点赞', value: totalLikes, color: 'text-pink-400' },
          { label: hasSearch ? '匹配下载' : '总下载', value: totalDownloads, color: 'text-cyan-400' }
        ].map(s => (
          <div key={s.label} className="bg-white/5 rounded-xl border border-white/10 p-3 text-center">
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-white/40 text-[10px] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 搜索 + 刷新 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 flex items-center bg-white/5 border border-white/10 rounded-lg px-3 py-2">
          <i className="fa-solid fa-magnifying-glass text-white/30 text-sm mr-2"></i>
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="搜索名称、描述、作者..."
            className="flex-1 bg-transparent outline-none text-white text-sm placeholder-white/30"
          />
          {search && (
            <button onClick={() => onSearchChange('')} className="text-white/30 hover:text-white/60 ml-1">
              <i className="fa-solid fa-xmark text-xs"></i>
            </button>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="bg-emerald-500/20 text-emerald-400 text-sm px-3 py-2 rounded-lg disabled:opacity-50"
        >
          <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i>
        </button>
      </div>

      {/* 分享列表 */}
      {loading && items.length === 0 ? (
        <div className="text-center text-white/40 py-12 text-sm">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-emerald-400 animate-spin mx-auto mb-3"></div>
          加载中...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center text-white/40 py-12 text-sm">
          <i className="fa-solid fa-box-open text-2xl mb-2 block opacity-50"></i>
          {search ? '未找到匹配内容' : '暂无社区分享'}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const authorDisplay = item.is_anonymous ? '匿名用户' : (item.author_name || '匿名用户');
            const hasReport = item.report_count > 0;
            const typeMeta = COMMUNITY_TYPE_META[item.type as CommunityShareType] || COMMUNITY_TYPE_META.worldbook;
            return (
              <div key={item.id} className={`bg-white/5 rounded-xl border p-3 ${hasReport ? 'border-red-500/30' : 'border-white/10'}`}>
                <div className="flex items-start gap-3">
                  {/* 缩略图 */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    {item.cover_image ? (
                      <img src={getCoverUrl(item.cover_image)} className="w-full h-full object-cover" />
                    ) : item.avatar ? (
                      <img src={item.avatar} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${typeMeta.bgColor}`}>
                        <i className={`fa-solid ${typeMeta.icon} text-sm`} style={{ color: typeMeta.color }}></i>
                      </div>
                    )}
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white text-sm font-medium truncate">{item.name}</span>
                      {item.is_encrypted === 1 && (
                        <i className="fa-solid fa-lock text-amber-400 text-[10px]"></i>
                      )}
                      {hasReport && (
                        <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded flex-shrink-0">
                          {item.report_count} 举报
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeMeta.badgeClassName}`}>
                        {typeMeta.label}
                      </span>
                      <span className="text-white/40 text-xs truncate">{authorDisplay}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-white/30 text-[11px]">
                      <span><i className="fa-solid fa-heart mr-0.5 text-pink-400/50"></i>{item.like_count || 0}</span>
                      <span><i className="fa-solid fa-download mr-0.5 text-cyan-400/50"></i>{item.download_count}</span>
                      <span>{formatTime(item.created_at)}</span>
                    </div>
                  </div>

                  {/* 编辑 + 删除按钮 */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(item)}
                      className="text-white/40 hover:text-emerald-400 p-1.5 transition-colors"
                      title="编辑"
                    >
                      <i className="fa-solid fa-pen text-xs"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      disabled={deletingId === item.id}
                      className="text-red-400/60 hover:text-red-400 p-1.5 transition-colors"
                      title="删除此分享"
                    >
                      <i className="fa-solid fa-trash text-xs"></i>
                    </button>
                  </div>
                </div>

                {item.description && (
                  <div className="text-white/40 text-xs mt-2 ml-[60px] line-clamp-1">{item.description}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 编辑弹窗 */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeEditModal}>
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-sm border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-white font-medium">编辑分享</h3>
              <button onClick={closeEditModal} disabled={saving} className="text-white/40 hover:text-white disabled:opacity-40">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* 封面图片 */}
              <div>
                <label className="text-white/60 text-xs mb-1 block">封面图片</label>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverSelect}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  {editForm.cover_image ? (
                    <div className="relative">
                      <img
                        src={editForm.cover_image.startsWith('data:') || editForm.cover_image.startsWith('http') ? editForm.cover_image : `${coverUrlPrefix}${editForm.cover_image}`}
                        className="w-16 h-20 rounded-lg object-cover"
                      />
                      <button
                        onClick={() => setEditForm(f => ({ ...f, cover_image: '' }))}
                        disabled={saving}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs disabled:opacity-40"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => coverInputRef.current?.click()}
                      disabled={saving}
                      className="w-16 h-20 rounded-lg border border-dashed border-white/20 flex items-center justify-center text-white/30 hover:border-white/40 hover:text-white/50 transition-colors disabled:opacity-40"
                    >
                      <i className="fa-solid fa-plus text-sm"></i>
                    </button>
                  )}
                  {editForm.cover_image && (
                    <button
                      onClick={() => coverInputRef.current?.click()}
                      disabled={saving}
                      className="text-emerald-400 text-xs disabled:opacity-40"
                    >
                      更换图片
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-white/60 text-xs mb-1 block">名称</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  disabled={saving}
                  className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-white text-sm outline-none ${editForm.name.trim() ? 'border-white/10 focus:border-emerald-500/50' : 'border-red-500/40 focus:border-red-500/60'}`}
                />
                {!editForm.name.trim() && (
                  <div className="text-red-400 text-[11px] mt-1">名称不能为空</div>
                )}
              </div>

              <div>
                <label className="text-white/60 text-xs mb-1 block">描述</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  disabled={saving}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-white/60 text-xs mb-1 block">点赞数</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editForm.like_count}
                    onChange={e => setEditForm(f => ({ ...f, like_count: sanitizeCountInput(e.target.value) }))}
                    disabled={saving}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-xs mb-1 block">下载数</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editForm.download_count}
                    onChange={e => setEditForm(f => ({ ...f, download_count: sanitizeCountInput(e.target.value) }))}
                    disabled={saving}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-xs mb-1 block">举报数</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editForm.report_count}
                    onChange={e => setEditForm(f => ({ ...f, report_count: sanitizeCountInput(e.target.value) }))}
                    disabled={saving}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 px-4 pb-4">
              <button
                onClick={closeEditModal}
                disabled={saving}
                className="flex-1 py-2 rounded-lg border border-white/10 text-white/60 text-sm disabled:opacity-40"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editForm.name.trim()}
                className="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
