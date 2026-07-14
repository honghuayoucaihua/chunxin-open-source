import React, { useEffect, useState, useRef } from 'react';
import { MobileHeader, SectionDivider } from '../Common';
import { uploadCommunityShare } from './communityService';
import { encryptExportPayload } from '../services/snapshot/exportEncryption';
import { compressImage, compressBase64Image } from '../services/imageService';
import { BUILTIN_CONTACT_IDS } from '../constants';
import type { Contact, WorldBook } from '../types';
import type { HtmlTemplate } from '../types/htmlTemplate';
import type { BubbleTemplate } from '../types/bubbleTemplate';
import type { CommunityShareType } from './communityTypes';
import {
  COMMUNITY_COVER_IMAGE_MAX_SIZE_KB,
  COMMUNITY_COVER_IMAGE_MAX_WIDTH,
  COMMUNITY_UPLOAD_PAYLOAD_LIMIT_BYTES,
  buildCommunityPayloadTooLargeMessage,
  prepareCommunityPayloadForStorage,
  sanitizeContactForCommunity
} from './communityPayloadShared.js';
import { AppSwitch, InlineFieldRow, TextareaFieldBlock } from '../utils/UtilsContactFormPrimitives';
import { SharedEmptyState } from '../settings/SharedPanelPrimitives';
import { readCommunityAuthorCredentials, saveCommunityAuthorCredentials } from './communityAuthorStorage';

interface Props {
  onBack: () => void;
  contacts: Contact[];
  worldBooks: WorldBook[];
  htmlTemplates: HtmlTemplate[];
  bubbleTemplates: BubbleTemplate[];
  onToast: (msg: string) => void;
}

const CommunityUploadView: React.FC<Props> = ({ onBack, contacts, worldBooks, htmlTemplates, bubbleTemplates, onToast }) => {
  const storedAuthorCredentials = readCommunityAuthorCredentials();
  const [type, setType] = useState<CommunityShareType>('contact');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [description, setDescription] = useState('');
  const [encrypted, setEncrypted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coverImage, setCoverImage] = useState('');
  const [authorName, setAuthorName] = useState(storedAuthorCredentials.authorName);
  const [authorPassword, setAuthorPassword] = useState(storedAuthorCredentials.authorPassword);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const communityUploadMountedRef = useRef(true);

  useEffect(() => {
    communityUploadMountedRef.current = true;
    return () => {
      communityUploadMountedRef.current = false;
    };
  }, []);

  const items = type === 'contact'
    ? contacts.filter(c => !c.isGroup && !c.isIfLine && !c.encryptedReadOnly && !BUILTIN_CONTACT_IDS.has(c.id))
    : type === 'worldbook'
    ? worldBooks.filter(w => !w.encryptedReadOnly)
    : type === 'bubbleworkshop'
    ? bubbleTemplates.filter(t => !t.encryptedReadOnly)
    : htmlTemplates.filter(t => !t.encryptedReadOnly);

  const selectedId = selectedIds.size > 0 ? [...selectedIds][0] : null;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.has(id)) return new Set();
      return new Set([id]);
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
      setCoverImage(compressed);
    } catch (err) {
      console.error('封面图片处理失败:', err);
      onToast('图片处理失败');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (uploading) return;
    if (selectedIds.size === 0) {
      onToast('请至少选择一项内容');
      return;
    }
    const normalizedAuthorName = authorName.trim();
    const normalizedAuthorPassword = authorPassword.trim();
    if (!description.trim()) {
      onToast('请填写描述');
      return;
    }
    if (!normalizedAuthorName || !normalizedAuthorPassword) {
      onToast('请填写作者名和密码');
      return;
    }
    setUploading(true);
    try {
      const selectedItem = items.find(i => selectedIds.has(i.id));
      if (!selectedItem) return;
      const name = selectedItem.name;
      const rawAvatar = type === 'contact' ? (selectedItem as Contact).avatar || '' : '';
      const avatar = rawAvatar ? await compressBase64Image(rawAvatar, { maxSizeKB: 50, maxWidth: 200 }) : '';

      let payload: any;
      if (type === 'contact') {
        const scope = 'contacts' as const;
        const cleaned: any = sanitizeContactForCommunity(selectedItem as Contact);
        if (cleaned.avatar) {
          try {
            cleaned.avatar = await compressBase64Image(cleaned.avatar, { maxSizeKB: 50, maxWidth: 200 });
          } catch { /* 压缩失败保留原图 */ }
        }
        payload = { contacts: [cleaned], messages: {} };
        if (encrypted) {
          payload = encryptExportPayload(payload, scope);
        }
      } else if (type === 'worldbook') {
        const scope = 'worldbooks' as const;
        // 剥离只读隐藏原始数据，避免重复携带隐藏明文。
        const { encryptedHiddenRaw, ...rest } = selectedItem as any;
        payload = { worldBooks: [rest] };
        if (encrypted) {
          payload = encryptExportPayload(payload, scope);
        }
      } else if (type === 'bubbleworkshop') {
        const { encryptedHiddenRaw, ...rest } = selectedItem as any;
        payload = { bubbleTemplates: [rest] };
        if (encrypted) {
          payload = encryptExportPayload(payload, 'bubbletemplates');
        }
      } else {
        payload = { htmlTemplates: [selectedItem] };
        if (encrypted) {
          payload = encryptExportPayload(payload, 'htmltemplates');
        }
      }

      const prepared = prepareCommunityPayloadForStorage(type, payload, encrypted);
      if (prepared.bytes > COMMUNITY_UPLOAD_PAYLOAD_LIMIT_BYTES) {
        onToast(buildCommunityPayloadTooLargeMessage(prepared.bytes));
        return;
      }

      // 保存作者信息到 localStorage
      setAuthorName(normalizedAuthorName);
      setAuthorPassword(normalizedAuthorPassword);
      saveCommunityAuthorCredentials(normalizedAuthorName, normalizedAuthorPassword);

      await uploadCommunityShare({
        type,
        name,
        description,
        avatar,
        cover_image: coverImage,
        author_name: normalizedAuthorName,
        author_password: normalizedAuthorPassword,
        is_anonymous: isAnonymous,
        is_encrypted: encrypted,
        payload: prepared.payload
      });
      if (!communityUploadMountedRef.current) {
        return;
      }
      onToast('上传成功');
      onBack();
    } catch (e: any) {
      if (!communityUploadMountedRef.current) {
        return;
      }
      console.error('上传失败:', e);
      onToast('上传失败: ' + (e.message || '未知错误'));
    } finally {
      if (communityUploadMountedRef.current) {
        setUploading(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-full render-bg-primary render-text-primary">
      <MobileHeader
        title="上传到社区"
        onBack={onBack}
        actions={
          <button
            onClick={handleUpload}
            disabled={uploading || selectedIds.size === 0}
            className="text-sm font-medium disabled:opacity-40"
            style={{ color: 'var(--app-accent-color)' }}
          >
            {uploading ? '上传中...' : '确认上传'}
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ paddingBottom: 'var(--tab-scroll-pb)' }}>
        {/* 类型选择 */}
        <SectionDivider label="选择类型" />
        <div className="flex px-4 py-2 gap-3">
          {([
            { key: 'contact' as const, label: '联系人', icon: 'fa-user', color: '#10AD7A' },
            { key: 'worldbook' as const, label: '世界书', icon: 'fa-book', color: '#7D5FFF' },
            { key: 'htmltemplate' as const, label: 'HTML', icon: 'fa-code', color: '#FF6B6B' },
            { key: 'bubbleworkshop' as const, label: '气泡', icon: 'fa-paintbrush', color: '#A855F7' }
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => { setType(t.key); setSelectedIds(new Set()); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                type === t.key
                  ? 'border-current text-white'
                  : 'render-bg-tertiary render-text-secondary border-transparent'
              }`}
              style={type === t.key ? { backgroundColor: t.color, borderColor: t.color } : {}}
            >
              <i className={`fa-solid ${t.icon}`}></i>
              {t.label}
            </button>
          ))}
        </div>

        {/* 封面图片 */}
        <SectionDivider label="封面图片（可选）" />
        <div className="px-4 py-3 render-bg-secondary">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverSelect}
            className="hidden"
          />
          {coverImage ? (
            <div className="relative mx-auto" style={{ maxWidth: 220 }}>
              <div className="w-full aspect-[3/4] rounded-lg overflow-hidden">
                <img src={coverImage} className="w-full h-full object-cover" />
              </div>
              <button
                onClick={() => setCoverImage('')}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark text-xs"></i>
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mx-auto rounded-lg border-2 border-dashed render-border flex flex-col items-center justify-center gap-2 render-text-secondary aspect-[3/4]"
              style={{ maxWidth: 220, width: '100%' }}
            >
              <i className="fa-solid fa-image text-2xl opacity-40"></i>
              <span className="text-xs">点击选择封面图片</span>
            </button>
          )}
        </div>

        {/* 作者信息 */}
        <SectionDivider label="作者信息" />
        <div className="render-bg-secondary">
          <InlineFieldRow label="昵称" value={authorName} placeholder="支持中文、英文、数字" onChange={(value) => { if (value.length <= 30) setAuthorName(value); }} />
          <div className="app-list-item">
            <div className="app-list-item-main max-w-[7rem]">
              <div className="app-list-item-title">密码</div>
            </div>
            <div className="app-list-item-side flex-1">
              <input
                type="password"
                value={authorPassword}
                onChange={e => setAuthorPassword(e.target.value)}
                placeholder="用于管理你的分享"
                className="app-field-input app-list-item-input text-right text-[14px] render-text-primary placeholder:text-gray-400"
                maxLength={32}
              />
            </div>
          </div>
          <div className="app-list-item">
            <div className="app-list-item-main">
              <div className="app-list-item-title flex items-center gap-2">
                <i className="fa-solid fa-user-secret text-sm render-text-secondary"></i>
                <span>匿名上传</span>
              </div>
            </div>
            <div className="app-list-item-side">
              <AppSwitch active={isAnonymous} onChange={() => setIsAnonymous(!isAnonymous)} />
            </div>
          </div>
        </div>
        <div className="px-4 py-1.5 text-xs render-text-secondary">
          昵称+密码用于管理你的分享内容，请妥善保管
        </div>

        {/* 只读混淆选项 */}
        <SectionDivider label="选项" />
        <div className="render-bg-secondary">
          <div className="app-list-item">
            <div className="app-list-item-main">
              <div className="app-list-item-title flex items-center gap-2">
                <i className="fa-solid fa-lock text-amber-500 text-sm"></i>
                <span>只读混淆上传</span>
              </div>
            </div>
            <div className="app-list-item-side">
              <AppSwitch active={encrypted} onChange={() => setEncrypted(!encrypted)} />
            </div>
          </div>
        </div>
        <div className="px-4 py-1.5 text-xs render-text-secondary">
          混淆后导入的内容将标记为只读，核心设定不可见
        </div>
        <div className="px-4 py-1.5 text-xs render-text-secondary">
          联系人分享会自动剥离聊天记录、壁纸等大体积运行时数据，超出 128KB 的内容会被拦截
        </div>

        {/* 描述 */}
        <SectionDivider label="描述" />
        <div className="render-bg-secondary">
          <TextareaFieldBlock label="内容描述" value={description} placeholder="简要描述你分享的内容（必填）" rowsClassName="h-20" onChange={(value) => setDescription(value.slice(0, 200))} />
          <div className="text-right text-xs render-text-secondary">{description.length}/200</div>
        </div>

        {/* 选择内容 */}
        <SectionDivider label={`选择${type === 'contact' ? '联系人' : type === 'worldbook' ? '世界书' : type === 'bubbleworkshop' ? '气泡模板' : 'HTML'}${selectedId ? '（已选 1）' : ''}`} />
        <div className="px-4 py-2 render-bg-secondary border-b render-border-subtle">
          <span className="text-xs render-text-secondary">每次只能上传一个{type === 'contact' ? '联系人' : type === 'worldbook' ? '世界书' : type === 'bubbleworkshop' ? '气泡模板' : 'HTML'}</span>
        </div>

        {items.length === 0 && (
          <SharedEmptyState
            className="py-10 render-text-secondary"
            iconClassName="fa-solid fa-inbox text-3xl opacity-30"
            title={`没有可上传的${type === 'contact' ? '联系人' : type === 'worldbook' ? '世界书' : type === 'bubbleworkshop' ? '气泡模板' : 'HTML'}`}
          />
        )}

        {items.map(item => {
          const selected = selectedIds.has(item.id);
          const isContact = type === 'contact';
          const isHtmlTemplate = type === 'htmltemplate';
          const isBubbleTemplate = type === 'bubbleworkshop';
          const contact = isContact ? item as Contact : null;
          const tpl = isHtmlTemplate ? item as HtmlTemplate : null;
          const bubbleTpl = isBubbleTemplate ? item as unknown as BubbleTemplate : null;
          return (
            <div
              key={item.id}
              onClick={() => toggleSelect(item.id)}
              className={`flex items-center px-4 py-2.5 render-bg-secondary cursor-pointer border-b render-border-subtle transition-colors`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 flex-shrink-0 transition-colors ${
                selected ? 'border-transparent text-white' : 'render-border'
              }`}
                style={selected ? { backgroundColor: 'var(--app-accent-color)' } : {}}
              >
                {selected && <i className="fa-solid fa-check text-[10px]"></i>}
              </div>
              {isContact && contact?.avatar ? (
                <img src={contact.avatar} className="w-9 h-9 rounded-lg object-cover mr-3 flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mr-3 flex-shrink-0"
                  style={{ backgroundColor: isContact ? '#10AD7A' : isHtmlTemplate ? '#FF6B6B' : isBubbleTemplate ? '#A855F7' : '#7D5FFF' }}>
                  <i className={`fa-solid ${isContact ? 'fa-user' : isHtmlTemplate ? 'fa-code' : isBubbleTemplate ? 'fa-paintbrush' : 'fa-book'} text-white text-sm`}></i>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-sm render-text-primary truncate block">{item.name}</span>
                {!isContact && !isHtmlTemplate && (item as WorldBook).description && (
                  <span className="text-xs render-text-secondary truncate block">{(item as WorldBook).description}</span>
                )}
                {isHtmlTemplate && tpl && (
                  <span className="text-xs render-text-secondary truncate block">
                    {tpl.description || tpl.usageNote || 'HTML模板'}{tpl.variables.length > 0 ? ` · ${tpl.variables.length}个变量` : ''} · {(new Blob([tpl.htmlContent]).size / 1024).toFixed(1)}KB
                  </span>
                )}
                {isBubbleTemplate && bubbleTpl && (
                  <span className="text-xs render-text-secondary truncate block">
                    {bubbleTpl.description || '气泡样式'} · {(new Blob([bubbleTpl.cssContent]).size / 1024).toFixed(1)}KB
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CommunityUploadView;
