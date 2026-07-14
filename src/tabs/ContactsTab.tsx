
import React, { useMemo } from 'react';
import { Contact } from '../types';
import { MobileHeader, SectionDivider } from '../Common';
import SkinIcon from '../shell/SkinIcon';

export const ContactsTab: React.FC<{
  contacts: Contact[];
  onSelect: (id: string) => void;
  onSearchTrigger: () => void;
  onAddFriend?: () => void;
  onNewFriends?: () => void;
  onGroupChats?: () => void;
  newFriendCount?: number;
  formatTime?: (timestamp?: number) => string;
}> = ({ contacts, onSelect, onSearchTrigger, onAddFriend, onNewFriends, onGroupChats, newFriendCount = 0, formatTime }) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");
  const rootSkinId = (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-render-skin') : null) || 'wechat';
  const isQQSkin = rootSkinId === 'qq';
  const isKakaoSkin = rootSkinId === 'kakao';
  const isY2KSkin = rootSkinId === 'y2k';
  const contactsTagColor = isKakaoSkin ? '#7a6200' : '#4F86F6';

  const getContactInitial = (contact: Contact): string => {
    const fromPinyin = (contact.pinyin || '').trim().charAt(0).toUpperCase();
    if (/^[A-Z]$/.test(fromPinyin)) return fromPinyin;

    const source = (contact.remark || contact.name || '').trim();
    const first = source.charAt(0);
    if (!first) return '#';
    if (/^[A-Z]$/i.test(first)) return first.toUpperCase();
    if (/^[0-9]$/.test(first)) return '#';

    const zhInitialBoundaries: Array<[string, string]> = [
      ['A', '阿'], ['B', '芭'], ['C', '擦'], ['D', '搭'], ['E', '蛾'], ['F', '发'],
      ['G', '噶'], ['H', '哈'], ['J', '击'], ['K', '喀'], ['L', '垃'], ['M', '妈'],
      ['N', '拿'], ['O', '哦'], ['P', '啪'], ['Q', '期'], ['R', '然'], ['S', '撒'],
      ['T', '塌'], ['W', '挖'], ['X', '昔'], ['Y', '压'], ['Z', '匝']
    ];

    for (let i = zhInitialBoundaries.length - 1; i >= 0; i--) {
      const [initial, boundary] = zhInitialBoundaries[i];
      if (first.localeCompare(boundary, 'zh-Hans-CN-u-co-pinyin') >= 0) return initial;
    }

    return '#';
  };

  // 通讯录仅展示个人联系人，群聊通过"群聊"入口查看
  const filteredContacts = useMemo(
    () => contacts.filter(c => c.id !== 'officialAccounts' && !c.isGroup),
    [contacts]
  );
  const grouped = useMemo(() => {
    const buckets: Record<string, Contact[]> = {};
    for (const item of filteredContacts) {
      const key = getContactInitial(item);
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(item);
    }
    for (const key of Object.keys(buckets)) {
      buckets[key].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
    }
    return buckets;
  }, [filteredContacts]);

  const renderEntryRow = (icon: string, color: string, label: string, onClick?: () => void, rightContent?: React.ReactNode) => (
    <button type="button" className="app-list-item app-list-item--interactive w-full text-left render-bg-secondary" onClick={onClick}>
      <div className={`wechat-cell-icon wechat-cell-icon-${icon} w-9 h-9 rounded flex items-center justify-center mr-3 flex-shrink-0 shadow-sm`} style={{ backgroundColor: color }}>
        <SkinIcon icon={icon} className="text-white text-[18px]" />
      </div>
      <div className="app-list-item-main">
        <div className="app-list-item-title">{label}</div>
      </div>
      {rightContent ? <div className="app-list-item-side">{rightContent}</div> : null}
    </button>
  );

  return (
    <div className="flex flex-col render-bg-secondary render-text-primary overflow-hidden h-full render-contacts-tab-root">
      {!isY2KSkin && <MobileHeader title={isQQSkin ? '联系人' : '通讯录'} className="render-contacts-header" actions={<div className="flex items-center space-x-3"><button className="app-icon-button" onClick={onSearchTrigger}><i className="fa-solid fa-magnifying-glass text-lg"></i></button><button className="app-icon-button" onClick={onAddFriend}><i className="fa-solid fa-user-plus text-xl"></i></button></div>} />}
      <div className="flex-1 overflow-y-auto no-scrollbar relative" style={{ paddingBottom: 'var(--tab-scroll-pb)' }}>
        <div className="render-bg-secondary">
          {renderEntryRow('fa-user-plus', '#FA9D3B', '新的朋友', onNewFriends, newFriendCount > 0 ? <span className="inline-flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold">{newFriendCount > 99 ? '99+' : newFriendCount}</span> : null)}
          {renderEntryRow('fa-users', '#10AD7A', '群聊', onGroupChats)}
          {renderEntryRow('fa-tag', contactsTagColor, '标签')}
          {renderEntryRow('fa-user-tie', contactsTagColor, '公众号')}
        </div>

        {alphabet.map(char => grouped[char] && (
          <React.Fragment key={char}>
            <SectionDivider label={char} />
            {grouped[char].map(c => (
              <div
                key={c.id}
                className="flex items-center render-bg-secondary border-b render-border active:bg-[var(--bg-hover)] render-contact-list-row"
                style={{
                  paddingTop: 'var(--app-cell-padding-y)',
                  paddingBottom: 'var(--app-cell-padding-y)',
                  paddingLeft: 'var(--app-content-padding)',
                  paddingRight: 'var(--app-content-padding)'
                }}
                onClick={() => onSelect(c.id)}
              >
                {(typeof c.avatar === 'string' && c.avatar.startsWith('icon:')) ? (
                  <div className={`wechat-cell-icon wechat-cell-icon-${c.avatar.replace('icon:', '')} w-9 h-9 flex items-center justify-center mr-3 flex-shrink-0 shadow-sm icon-bg-blue app-avatar-radius`}>
                    <SkinIcon icon={c.avatar.replace('icon:', '')} className="text-white text-[18px]" />
                  </div>
                ) : (
                  <img src={typeof c.avatar === 'string' ? c.avatar : ''} className="w-9 h-9 mr-3 object-cover app-avatar-radius" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-normal truncate">{c.name}</span>
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
        <div className="py-8 text-center render-text-secondary text-[15px] render-bg-secondary">
           {filteredContacts.length} 位联系人
        </div>
        <div className="absolute right-0.5 top-0 bottom-0 w-5 flex flex-col items-center justify-center space-y-0.5 z-[70] pointer-events-none">
          {alphabet.map(char => (
            <span key={char} className="text-[10px] render-text-secondary font-bold cursor-pointer active:scale-125 transition-transform hover:text-[var(--app-accent-color)] pointer-events-auto">{char}</span>
          ))}
        </div>
      </div>
    </div>
  );
};
