import React, { useState } from 'react';
import { UserProfile } from '../types';
import { MobileHeader, SectionDivider } from '../Common';
import { compressImage } from '../services/imageService';
import { InlineActionRow } from '../utils/UtilsContactFormPrimitives';

// 编辑字段子页面（独立导出）
export const EditProfileFieldView: React.FC<{
  fieldKey: keyof UserProfile;
  fieldLabel: string;
  initialValue: string;
  onBack: () => void;
  onSave: (value: string) => void;
}> = ({ fieldKey, fieldLabel, initialValue, onBack, onSave }) => {
  const [val, setVal] = useState(initialValue);

  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader
        title={`设置${fieldLabel}`}
        onBack={onBack}
        actions={
          <button
            className="app-button app-button-primary"
            onClick={() => { onSave(val); onBack(); }}
          >
            保存
          </button>
        }
      />
      <div className="render-bg-secondary app-textarea-block mt-4">
        <div className="app-textarea-block-title">{fieldLabel}</div>
        <input
          autoFocus
          className="app-field-input w-full text-[14px] render-text-primary"
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder={`请输入${fieldLabel}`}
        />
      </div>
    </div>
  );
};

// 修改个人资料
export const EditProfileView: React.FC<{
  user: UserProfile,
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>,
  onBack: () => void,
  showPersona?: boolean,
  onMore?: () => void,
  onNavigate?: (fieldKey: keyof UserProfile, fieldLabel: string, initialValue: string) => void,
  onMasks?: () => void,
  masksCount?: number
}> = ({ user, setUser, onBack, showPersona = false, onMore, onNavigate, onMasks, masksCount = 0 }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleFieldClick = (key: keyof UserProfile, label: string, value: string) => {
    if (onNavigate) {
      onNavigate(key, label, value);
    }
  };

  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader title={showPersona ? '更多信息' : '个人信息'} onBack={onBack} />
      <div className="flex-1 overflow-y-auto">
        {!showPersona && (
          <>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const dataUrl = await compressImage(file);
                setUser(prev => ({ ...prev, avatar: dataUrl }));
              } catch (err) {
                console.error('图片压缩失败:', err);
              }
              if (e.target) e.target.value = '';
            }} />
            <div className="render-bg-secondary">
              <button type="button" className="app-list-item app-list-item--interactive" onClick={handleAvatar}>
                <div className="app-list-item-main">
                  <div className="app-list-item-title">头像</div>
                </div>
                <div className="app-list-item-side">
                  <img src={user.avatar} className="w-14 h-14 rounded-md object-cover shadow-sm" />
                </div>
              </button>
              <InlineActionRow label="名字" rightText={user.name} onClick={() => handleFieldClick('name', '名字', user.name)} />
              <InlineActionRow label="账号ID" rightText={user.wechatId} onClick={() => handleFieldClick('wechatId', '账号ID', user.wechatId)} />
              <button type="button" className="app-list-item app-list-item--interactive" onClick={() => {}}>
                <div className="app-list-item-main">
                  <div className="app-list-item-title">我的二维码</div>
                </div>
                <div className="app-list-item-side">
                  <i className="fa-solid fa-qrcode text-gray-400"></i>
                </div>
              </button>
              <InlineActionRow label="更多" onClick={() => onMore?.()} />
            </div>
            <SectionDivider />
            <div className="render-bg-secondary">
              <InlineActionRow label="性别" rightText={user.gender === 'male' ? '男' : '女'} onClick={() => setUser(prev => ({ ...prev, gender: prev.gender === 'male' ? 'female' : 'male' }))} />
              <InlineActionRow label="地区" rightText={user.region} onClick={() => handleFieldClick('region', '地区', user.region)} />
              <InlineActionRow label="我的状态" rightText={user.status || '未设置'} onClick={() => handleFieldClick('status', '我的状态', user.status || '')} />
              <InlineActionRow label="拍一拍" rightText={user.patDesc || '未设置'} onClick={() => handleFieldClick('patDesc', '拍一拍', user.patDesc || '')} />
              <div className="app-list-item app-list-item--interactive" onClick={() => handleFieldClick('signature', '个性签名', user.signature || '')}>
                <div className="app-list-item-main">
                  <div className="app-list-item-title">个性签名</div>
                  <div className="app-list-item-desc">{user.signature || '未填写'}</div>
                </div>
              </div>
            </div>
            <SectionDivider />
            <div className="render-bg-secondary">
              <InlineActionRow label="我的面具" rightText={`${masksCount} 个`} onClick={() => onMasks?.()} />
            </div>
          </>
        )}

        {showPersona && (
          <>
            <SectionDivider label="人设来源" />
            <div className="render-bg-secondary">
              <InlineActionRow label="年龄" rightText={user.age || '未填写'} onClick={() => handleFieldClick('age', '年龄', user.age || '')} />
              <InlineActionRow label="星座" rightText={user.constellation || '未填写'} onClick={() => handleFieldClick('constellation', '星座', user.constellation || '')} />
              <InlineActionRow label="MBTI" rightText={user.mbti || '未填写'} onClick={() => handleFieldClick('mbti', 'MBTI', user.mbti || '')} />
              <InlineActionRow label="职业" rightText={user.occupation || '未填写'} onClick={() => handleFieldClick('occupation', '职业', user.occupation || '')} />
              <InlineActionRow label="性格" rightText={user.personalityTraits || '未填写'} onClick={() => handleFieldClick('personalityTraits', '性格', user.personalityTraits || '')} />
              <InlineActionRow label="兴趣爱好" rightText={user.hobbies || '未填写'} onClick={() => handleFieldClick('hobbies', '兴趣爱好', user.hobbies || '')} />
              <InlineActionRow label="描述" rightText={user.description || '未填写'} onClick={() => handleFieldClick('description', '描述', user.description || '')} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
