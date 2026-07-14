
import React, { useState, useEffect } from 'react';
import { Contact } from '../types';
import { MobileHeader, SectionDivider } from '../Common';
import { InlineActionRow, TextareaFieldBlock } from '../utils/UtilsContactFormPrimitives';

// Re-export sub-components from profile/
export { ContactMemoryView } from './ContactMemoryView';
export { EditProfileView, EditProfileFieldView } from './EditProfileView';
export { ContactPersonaView } from './ContactPersonaView';
export { MasksView } from './MasksView';
export { MaskEditView } from './MaskEditView';

// 详细资料
export const ProfileView: React.FC<{
  contact: Contact,
  onBack: () => void,
  onSend: () => void,
  onSetRemark?: (remark: string) => void,
  onMoreInfo?: () => void,
  onEditRemark?: () => void,
  onMoments?: () => void
}> = ({ contact, onBack, onSend, onSetRemark, onMoreInfo, onEditRemark, onMoments }) => (
  (() => {
    const isReadOnly = !!contact.encryptedReadOnly;
    return (
  <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200 render-profile-root">
    <MobileHeader title="详细资料" onBack={onBack} className="render-profile-header" actions={<button className="app-icon-button w-9 h-9 rounded-full"><i className="fa-solid fa-ellipsis-h"></i></button>} />
    <div className="flex-1 overflow-y-auto">
      <div className="render-bg-secondary p-6 flex items-start border-b render-border-subtle render-profile-hero">
        <img src={contact.avatar} className="w-16 h-16 rounded-md mr-4 object-cover shadow-sm" />
        <div className="flex-1 overflow-hidden">
          <h2 className="text-xl font-bold render-text-primary truncate">{contact.remark?.trim() || contact.name}</h2>
          <p className="text-[14px] text-gray-500 mt-1 truncate">账号ID: {contact.wechatId || contact.id}</p>
          {contact.region?.trim() ? <p className="text-[14px] text-gray-500 mt-0.5 truncate">地区: {contact.region.trim()}</p> : null}
        </div>
      </div>
      <SectionDivider />
      {isReadOnly && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-md text-[12px] bg-amber-500/10 text-amber-600">
          该联系人来自加密导入，「更多信息」中的人设数据为只读保护
        </div>
      )}
      <div className="render-bg-secondary">
        <InlineActionRow label="设置备注和标签" rightText={contact.remark || '未设置'} onClick={() => onEditRemark?.()} />
      </div>
      <SectionDivider />
      <div className="render-bg-secondary">
        <InlineActionRow label="朋友圈" onClick={() => onMoments?.()} />
        {isReadOnly ? (
          <div className="app-list-item">
            <div className="app-list-item-main">
              <div className="app-list-item-title">更多信息</div>
              <div className="app-list-item-desc">只读联系人不可编辑</div>
            </div>
          </div>
        ) : (
          <InlineActionRow label="更多信息" onClick={() => onMoreInfo?.()} />
        )}
      </div>
      <SectionDivider />
      <div className="render-bg-secondary app-surface-panel">
        <button type="button" className="app-button app-button-primary w-full" onClick={onSend}>
          <i className="fa-solid fa-comment mr-2"></i>发消息
        </button>
        <button type="button" className="app-button app-button-muted w-full mt-3">
          <i className="fa-solid fa-video mr-2"></i>音视频通话
        </button>
      </div>
    </div>
  </div>
    );
  })()
);

export const ContactRemarkView: React.FC<{ contact: Contact; onBack: () => void; onSave: (remark: string) => void }> = ({ contact, onBack, onSave }) => {
  const [remark, setRemark] = useState(contact.remark || '');

  // 同步 contact.remark 的变化
  useEffect(() => {
    setRemark(contact.remark || '');
  }, [contact.remark]);

  return (
    <div className="fixed inset-0 z-[200] render-bg-primary flex flex-col animate-in slide-in-from-right duration-200">
        <MobileHeader
          title="设置备注和标签"
          onBack={onBack}
          actions={<button className={`app-button ${remark.trim() ? 'app-button-primary' : 'app-button-muted opacity-60 cursor-not-allowed'}`} disabled={!remark.trim()} onClick={() => { onSave(remark.trim()); onBack(); }}>保存</button>}
        />
      <div className="flex-1 overflow-y-auto">
        <SectionDivider />
        <TextareaFieldBlock
          label="备注"
          value={remark}
          placeholder="设置备注名"
          rowsClassName="min-h-[120px] leading-relaxed"
          onChange={setRemark}
        />
      </div>
    </div>
  );
};
