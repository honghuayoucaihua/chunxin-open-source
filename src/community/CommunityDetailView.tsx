import React, { useState, useEffect, useRef } from 'react';
import { MobileHeader, SectionDivider } from '../Common';
import { fetchCommunityDetail, downloadCommunityShare, likeCommunityShare, reportCommunityShare, getCoverImageUrl, getLocalLikedIds, getLocalReportedIds, isValidCommunityCoverImage, saveLocalLikedIds, saveLocalReportedIds } from './communityService';
import { decryptImportedPayload } from '../services/snapshot/exportEncryption';
import { buildOpeningLineMessage, patchContactByLastMessage } from '../app/contactViewUtils';
import { captureRuntimeResetEpoch, isRuntimeResetEpochStale } from '../services/runtimeResetGuard';
import type { Contact, Message, WorldBook } from '../types';
import type { HtmlTemplate } from '../types/htmlTemplate';
import type { BubbleTemplate } from '../types/bubbleTemplate';
import type { CommunityShareItem } from './communityTypes';
import { ContentBottomBar, ContentCard } from '../utils/ContentPrimitives';
import { applyCommunityImportResult, applyCommunityLikeResult, applyCommunityReportResult } from './communityDetailState';
import { SharedEmptyState, SharedLoadingState } from '../settings/SharedPanelPrimitives';
import { normalizeImportedWorldBooks } from '../utils/worldBookImport';

interface Props {
  shareId: string;
  onBack: () => void;
  contacts: Contact[];
  worldBooks: WorldBook[];
  htmlTemplates: HtmlTemplate[];
  bubbleTemplates: BubbleTemplate[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  setWorldBooks: React.Dispatch<React.SetStateAction<WorldBook[]>>;
  setHtmlTemplates: React.Dispatch<React.SetStateAction<HtmlTemplate[]>>;
  setBubbleTemplates: React.Dispatch<React.SetStateAction<BubbleTemplate[]>>;
  setMessages: React.Dispatch<React.SetStateAction<Record<string, Message[]>>>;
  onToast: (msg: string) => void;
}

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const CommunityDetailView: React.FC<Props> = ({ shareId, onBack, contacts, worldBooks, htmlTemplates, bubbleTemplates, setContacts, setWorldBooks, setHtmlTemplates, setBubbleTemplates, setMessages, onToast }) => {
  const [detail, setDetail] = useState<CommunityShareItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [reported, setReported] = useState(false);
  const [liking, setLiking] = useState(false);
  const [reporting, setReporting] = useState(false);
  const communityDetailRequestIdRef = useRef(0);
  const communityDetailMountedRef = useRef(true);
  const communityDetailShareIdRef = useRef(shareId);

  useEffect(() => {
    communityDetailMountedRef.current = true;
    communityDetailShareIdRef.current = shareId;
    setLoading(true);
    setDetail(null);
    setLiked(false);
    setReported(false);
    setImporting(false);
    setLiking(false);
    setReporting(false);
    const requestId = ++communityDetailRequestIdRef.current;
    fetchCommunityDetail(shareId)
      .then(d => {
        if (!communityDetailMountedRef.current || requestId !== communityDetailRequestIdRef.current) {
          return;
        }
        setDetail(d);
        setLiked(getLocalLikedIds().has(shareId));
        setReported(getLocalReportedIds().has(shareId));
      })
      .catch(e => {
        if (!communityDetailMountedRef.current || requestId !== communityDetailRequestIdRef.current) {
          return;
        }
        console.error('获取详情失败:', e);
        onToast('获取详情失败');
      })
      .finally(() => {
        if (communityDetailMountedRef.current && requestId === communityDetailRequestIdRef.current) {
          setLoading(false);
        }
      });
    return () => {
      communityDetailMountedRef.current = false;
    };
  }, [shareId]);

  const handleLike = async () => {
    if (liking || !detail) return;
    const actionShareId = shareId;
    setLiking(true);
    try {
      const action = liked ? 'unlike' : 'like';
      const res = await likeCommunityShare(shareId, action);
      if (!communityDetailMountedRef.current || communityDetailShareIdRef.current !== actionShareId) {
        return;
      }
      setDetail(prev => {
        if (!prev || prev.id !== actionShareId) {
          return prev;
        }
        const nextState = applyCommunityLikeResult({ detail: prev, liked, reported }, res.like_count);
        setLiked(nextState.liked);
        return nextState.detail;
      });

      // 更新本地存储
      const localLiked = getLocalLikedIds();
      if (liked) {
        localLiked.delete(actionShareId);
      } else {
        localLiked.add(actionShareId);
      }
      saveLocalLikedIds(localLiked);
    } catch (e) {
      if (!communityDetailMountedRef.current || communityDetailShareIdRef.current !== actionShareId) {
        return;
      }
      console.error('点赞失败:', e);
      onToast('操作失败');
    } finally {
      if (communityDetailMountedRef.current && communityDetailShareIdRef.current === actionShareId) {
        setLiking(false);
      }
    }
  };

  const handleReport = async () => {
    if (reporting || reported || !detail) return;
    if (!confirm('确定要举报该内容吗？')) return;
    const actionShareId = shareId;
    setReporting(true);
    try {
      const res = await reportCommunityShare(shareId);
      if (!communityDetailMountedRef.current || communityDetailShareIdRef.current !== actionShareId) {
        return;
      }
      setDetail(prev => {
        if (!prev || prev.id !== actionShareId) {
          return prev;
        }
        const nextState = applyCommunityReportResult({ detail: prev, liked, reported }, res.report_count);
        setReported(nextState.reported);
        return nextState.detail;
      });
      const localReported = getLocalReportedIds();
      localReported.add(actionShareId);
      saveLocalReportedIds(localReported);
      onToast('举报已提交');
    } catch (e: any) {
      if (!communityDetailMountedRef.current || communityDetailShareIdRef.current !== actionShareId) {
        return;
      }
      if (e.message?.includes('400')) {
        setReported(true);
        const localReported = getLocalReportedIds();
        localReported.add(actionShareId);
        saveLocalReportedIds(localReported);
      }
      const msg = e.message?.includes('400') ? '你已经举报过了' : '举报失败';
      onToast(msg);
    } finally {
      if (communityDetailMountedRef.current && communityDetailShareIdRef.current === actionShareId) {
        setReporting(false);
      }
    }
  };

  const handleImport = async () => {
    if (!detail) return;
    const actionShareId = shareId;
    const runtimeResetEpoch = captureRuntimeResetEpoch();
    const isCommunityDetailRequestCurrent = () => !isRuntimeResetEpochStale(runtimeResetEpoch);
    setImporting(true);
    try {
      if (!isCommunityDetailRequestCurrent()) {
        return;
      }
      const res = await downloadCommunityShare(shareId);
      if (!isCommunityDetailRequestCurrent()) {
        return;
      }
      let payload: any = res.payload;

      const { data, wasEncrypted } = decryptImportedPayload(payload);
      if (wasEncrypted) {
        payload = data;
      }

      if (detail.type === 'contact') {
        const importedContacts: Contact[] = Array.isArray(payload.contacts) ? payload.contacts : [];
        if (importedContacts.length === 0) {
          onToast('没有可导入的联系人');
          return;
        }
        if (!isCommunityDetailRequestCurrent()) {
          return;
        }
        const existingIds = new Set(contacts.map(c => c.id));
        const newContacts = importedContacts.map(c => {
          let newId = c.id;
          while (existingIds.has(newId)) {
            newId = `${c.id}_${Math.random().toString(36).substr(2, 6)}`;
          }
          existingIds.add(newId);
          return { ...c, id: newId, unreadCount: 0 };
        });
        setContacts(prev => [...prev, ...newContacts]);
        // 为有开场白的联系人创建开场白消息
        const openingMessages: Record<string, Message[]> = {};
        const contactPatches: { id: string; content: string; timestamp: number }[] = [];
        for (const c of newContacts) {
          const line = c.openingLine?.trim();
          if (line) {
            const msg = buildOpeningLineMessage(c.id, line, 'community-import');
            openingMessages[c.id] = [msg];
            contactPatches.push({ id: c.id, content: msg.content, timestamp: msg.timestamp });
          }
        }
        if (Object.keys(openingMessages).length > 0) {
          if (!isCommunityDetailRequestCurrent()) {
            return;
          }
          setMessages(prev => ({ ...prev, ...openingMessages }));
          setContacts(prev => prev.map(c => {
            const patch = contactPatches.find(p => p.id === c.id);
            return patch ? patchContactByLastMessage(c, c.id, patch.content, patch.timestamp) : c;
          }));
        }
        onToast(`成功导入 ${newContacts.length} 个联系人`);
      } else if (detail.type === 'htmltemplate') {
        const importedTemplates: HtmlTemplate[] = Array.isArray(payload.htmlTemplates) ? payload.htmlTemplates : [];
        if (importedTemplates.length === 0) {
          onToast('没有可导入的HTML');
          return;
        }
        if (!isCommunityDetailRequestCurrent()) {
          return;
        }
        const existingIds = new Set(htmlTemplates.map(t => t.id));
        const newTemplates = importedTemplates.map(t => {
          let newId = t.id;
          while (existingIds.has(newId)) {
            newId = `${t.id}_${Math.random().toString(36).substr(2, 6)}`;
          }
          existingIds.add(newId);
          return { ...t, id: newId };
        });
        setHtmlTemplates(prev => [...prev, ...newTemplates]);
        onToast(`成功导入 ${newTemplates.length} 个HTML`);
      } else if (detail.type === 'bubbleworkshop') {
        const importedBubbles: BubbleTemplate[] = Array.isArray(payload.bubbleTemplates) ? payload.bubbleTemplates : [];
        if (importedBubbles.length === 0) {
          onToast('没有可导入的气泡模板');
          return;
        }
        if (!isCommunityDetailRequestCurrent()) {
          return;
        }
        const existingIds = new Set(bubbleTemplates.map(t => t.id));
        const newBubbles = importedBubbles.map(t => {
          let newId = t.id;
          while (existingIds.has(newId)) {
            newId = `${t.id}_${Math.random().toString(36).substr(2, 6)}`;
          }
          existingIds.add(newId);
          return { ...t, id: newId };
        });
        setBubbleTemplates(prev => [...prev, ...newBubbles]);
        onToast(`成功导入 ${newBubbles.length} 个气泡模板`);
      } else {
        const importedBooks: WorldBook[] = normalizeImportedWorldBooks(payload.worldBooks);
        if (importedBooks.length === 0) {
          onToast('没有可导入的世界书');
          return;
        }
        if (!isCommunityDetailRequestCurrent()) {
          return;
        }
        const existingIds = new Set(worldBooks.map(w => w.id));
        const newBooks = importedBooks.map(w => {
          let newId = w.id;
          while (existingIds.has(newId)) {
            newId = `${w.id}_${Math.random().toString(36).substr(2, 6)}`;
          }
          existingIds.add(newId);
          return { ...w, id: newId };
        });
        setWorldBooks(prev => [...prev, ...newBooks]);
        onToast(`成功导入 ${newBooks.length} 个世界书`);
      }
      if (communityDetailMountedRef.current && communityDetailShareIdRef.current === actionShareId && isCommunityDetailRequestCurrent()) {
        setDetail(prev => prev && prev.id === actionShareId ? applyCommunityImportResult({ detail: prev, liked, reported }).detail : prev);
        onBack();
      }
    } catch (e: any) {
      if (!communityDetailMountedRef.current || communityDetailShareIdRef.current !== actionShareId || !isCommunityDetailRequestCurrent()) {
        return;
      }
      console.error('导入失败:', e);
      onToast('导入失败: ' + (e.message || '未知错误'));
    } finally {
      if (communityDetailMountedRef.current && communityDetailShareIdRef.current === actionShareId) {
        setImporting(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full render-bg-primary render-text-primary">
        <MobileHeader title="详情" onBack={onBack} />
        <div className="flex-1 flex items-center justify-center">
          <SharedLoadingState />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col h-full render-bg-primary render-text-primary">
        <MobileHeader title="详情" onBack={onBack} />
        <div className="flex-1 flex items-center justify-center">
          <SharedEmptyState className="render-text-secondary" title="未找到该分享" />
        </div>
      </div>
    );
  }

  const authorDisplay = detail.is_anonymous ? '匿名用户' : (detail.author_name || '匿名用户');
  const typeColor = detail.type === 'contact' ? '#10AD7A' : detail.type === 'htmltemplate' ? '#FF6B6B' : detail.type === 'bubbleworkshop' ? '#A855F7' : '#7D5FFF';
  const coverUrl = getCoverImageUrl(detail.cover_image);

  return (
    <div className="flex flex-col h-full render-bg-primary render-text-primary">
      <MobileHeader title="详情" onBack={onBack} />

      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ paddingBottom: 'var(--tab-scroll-pb)' }}>
        {/* 封面大图 - 竖屏比例 */}
        {isValidCommunityCoverImage(detail.cover_image) && coverUrl ? (
          <div className="w-full aspect-[3/4] overflow-hidden">
            <img src={coverUrl} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full aspect-[3/4] flex flex-col items-center justify-center px-6"
            style={{ background: `linear-gradient(135deg, ${typeColor}22, ${typeColor}44)` }}>
            {detail.avatar ? (
              <img src={detail.avatar} className="w-20 h-20 rounded-xl object-cover shadow-md mb-4" />
            ) : (
              <i className={`fa-solid ${detail.type === 'contact' ? 'fa-user' : detail.type === 'htmltemplate' ? 'fa-code' : detail.type === 'bubbleworkshop' ? 'fa-paintbrush' : 'fa-book'} text-5xl mb-4`}
                style={{ color: typeColor }} />
            )}
            {detail.description && (
              <p className="text-sm text-center leading-relaxed line-clamp-6" style={{ color: `${typeColor}cc` }}>
                {detail.description}
              </p>
            )}
          </div>
        )}

        {/* 标题 + 作者 */}
        <ContentCard variant="community" className="mx-4 mt-4">
          <div className="px-4 py-4">
          <h2 className="text-lg font-semibold render-text-primary flex items-center gap-1.5">
            {detail.name}
            {detail.is_encrypted === 1 && (
              <i className="fa-solid fa-lock text-sm text-amber-500" title="混淆内容"></i>
            )}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${typeColor}22` }}>
              <i className="fa-solid fa-user text-[10px]" style={{ color: typeColor }}></i>
            </div>
            <span className="text-sm render-text-secondary">{authorDisplay}</span>
            <span className="text-xs render-text-secondary ml-auto">{formatTime(detail.created_at)}</span>
          </div>
          </div>
        </ContentCard>

        {/* 点赞 + 举报 */}
        <ContentCard variant="community" className="mx-4 mt-3">
          <div className="flex items-center px-4 py-3 gap-4">
            <button
              onClick={handleLike}
              disabled={liking}
              className="flex items-center gap-1.5 transition-colors"
            >
              <i className={`fa-${liked ? 'solid' : 'regular'} fa-heart text-lg ${liked ? 'text-red-500' : 'render-text-secondary'}`}></i>
              <span className={`text-sm ${liked ? 'text-red-500' : 'render-text-secondary'}`}>{detail.like_count || 0}</span>
            </button>
            <button
              onClick={handleReport}
              disabled={reporting || reported}
              className={`flex items-center gap-1.5 transition-colors ml-auto ${reported ? 'text-amber-500' : 'render-text-secondary'}`}
            >
              <i className="fa-solid fa-flag text-sm"></i>
              <span className="text-xs">{reported ? '已举报' : '举报'}</span>
            </button>
          </div>
        </ContentCard>

        <SectionDivider />

        {/* 详细信息 */}
        <ContentCard variant="community" className="mx-4">
          {detail.description && (
            <div className="px-4 py-3 border-b render-border-subtle">
              <div className="text-xs render-text-secondary mb-1">描述</div>
              <div className="text-sm render-text-primary">{detail.description}</div>
            </div>
          )}
          <div className="px-4 py-3 border-b render-border-subtle flex justify-between">
            <span className="text-sm render-text-secondary">类型</span>
            <span className="text-sm render-text-primary">{detail.type === 'contact' ? '联系人' : detail.type === 'htmltemplate' ? 'HTML' : detail.type === 'bubbleworkshop' ? '气泡' : '世界书'}</span>
          </div>
          <div className="px-4 py-3 border-b render-border-subtle flex justify-between">
            <span className="text-sm render-text-secondary">下载次数</span>
            <span className="text-sm render-text-primary">{detail.download_count}</span>
          </div>
          <div className="px-4 py-3 border-b render-border-subtle flex justify-between">
            <span className="text-sm render-text-secondary">举报次数</span>
            <span className="text-sm render-text-primary">{detail.report_count || 0}</span>
          </div>
          {detail.is_encrypted === 1 && (
            <div className="px-4 py-3 flex items-center gap-2">
              <i className="fa-solid fa-shield-halved text-amber-500 text-sm"></i>
              <span className="text-xs render-text-secondary">该内容已做只读混淆，导入后核心设定不可见且标记为只读</span>
            </div>
          )}
        </ContentCard>

        <SectionDivider />

      </div>
      <ContentBottomBar variant="community">
        <button
          onClick={handleImport}
          disabled={importing}
          className="app-button app-button-primary w-full text-sm font-medium disabled:opacity-50"
        >
          {importing ? (
            <span><i className="fa-solid fa-spinner fa-spin mr-1"></i>导入中...</span>
          ) : (
            <span><i className="fa-solid fa-download mr-1"></i>下载导入</span>
          )}
        </button>
      </ContentBottomBar>
    </div>
  );
};

export default CommunityDetailView;
