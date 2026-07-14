import React from 'react';
import { UserProfile, Mask } from '../types';
import { MobileHeader, SectionDivider } from '../Common';
import { InlineActionRow } from '../utils/UtilsContactFormPrimitives';
import { SharedEmptyState } from '../settings/SharedPanelPrimitives';
import { confirmWechatAction } from '../utils/wechatDialog';

// 面具管理视图
export const MasksView: React.FC<{
  user: UserProfile;
  masks: Mask[];
  onBack: () => void;
  onUpdateMasks: (masks: Mask[]) => void;
  onEditMask: (mask: Mask) => void;
}> = ({ user, masks, onBack, onUpdateMasks, onEditMask }) => {
  const handleAddMask = () => {
    const newMask: Mask = {
      id: `mask_${Date.now()}`,
      name: '新面具',
      createdAt: Date.now()
    };
    onUpdateMasks([...masks, newMask]);
    onEditMask(newMask);
  };

  const handleDeleteMask = (id: string) => {
    confirmWechatAction('确定删除这个面具吗？', () => {
      onUpdateMasks(masks.filter(m => m.id !== id));
    });
  };

  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader title="我的面具" onBack={onBack} />
      <div className="flex-1 overflow-y-auto">
        <div className="render-bg-secondary px-4 py-3 border-b render-border-subtle">
          <p className="text-[13px] text-gray-500">面具是你在不同聊天中使用的人设。默认面具基于你的个人信息，你也可以创建其他面具用于不同的聊天场景。</p>
        </div>

        {/* 默认面具 */}
        <SectionDivider label="默认面具" />
        <div className="render-bg-secondary">
          <div className="app-list-item">
            <div className="app-list-item-main">
              <div className="app-list-item-title">基于个人信息</div>
              <div className="app-list-item-desc">{user.description || `${user.name}，${user.occupation || '职业未设置'}`}</div>
            </div>
            <div className="app-list-item-side">
              <span className="text-xs text-gray-400">系统默认</span>
            </div>
          </div>
        </div>

        {/* 自定义面具 */}
        <SectionDivider label="自定义面具" />
        {masks.length === 0 ? (
          <SharedEmptyState className="render-bg-secondary px-4 py-8 text-[14px]">暂无自定义面具</SharedEmptyState>
        ) : (
          masks.map(mask => (
            <div key={mask.id} className="render-bg-secondary border-b render-border-subtle">
              <div className="app-list-item app-list-item--interactive" onClick={() => onEditMask(mask)}>
                <div className="app-list-item-main">
                  <div className="app-list-item-title">{mask.name}</div>
                  <div className="app-list-item-desc truncate">{mask.description || '未设置描述'}</div>
                </div>
                <div className="app-list-item-side flex items-center gap-2">
                  <button
                    type="button"
                    className="app-button app-button-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMask(mask.id);
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {/* 添加面具按钮 */}
        <div className="render-bg-secondary mt-2">
          <InlineActionRow label="添加面具" onClick={handleAddMask} />
        </div>
      </div>
    </div>
  );
};
