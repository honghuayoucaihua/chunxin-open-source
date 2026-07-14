import React from 'react';
import { Mask } from '../types';
import { FALLBACK_ANON_AVATAR } from './forumUtils';
import { DropdownItem, DropdownLabel, DropdownMenu } from '../utils/DropdownPrimitives';
import { SharedEmptyState } from '../settings/SharedPanelPrimitives';

export type IdentityMode = 'self' | 'anonymous' | 'mask';

export type ResolvedIdentity = {
  author: string;
  isAnonymous: boolean;
  maskId: string;
  avatar: string;
};

export const resolveIdentity = (
  identityMode: IdentityMode,
  identityMaskId: string,
  selectedMaskIds: string[],
  masks: Mask[],
  currentUserName: string
): ResolvedIdentity => {
  if (identityMode === 'anonymous') {
    return { author: '匿名', isAnonymous: true, maskId: '', avatar: FALLBACK_ANON_AVATAR };
  }
  if (identityMode === 'mask') {
    const candidates = selectedMaskIds.length > 0 ? masks.filter((m) => selectedMaskIds.includes(m.id)) : masks;
    const picked = identityMaskId ? masks.find((m) => m.id === identityMaskId) : candidates[0];
    const maskName = picked?.name || '匿名';
    return { author: maskName, isAnonymous: false, maskId: picked?.id || '', avatar: FALLBACK_ANON_AVATAR };
  }
  return { author: currentUserName || '我', isAnonymous: false, maskId: '', avatar: FALLBACK_ANON_AVATAR };
};

type ForumIdentityMenuProps = {
  masks: Mask[];
  selectedMaskIds: string[];
  onSelectSelf: () => void;
  onSelectAnonymous: () => void;
  onSelectMask: (maskId: string) => void;
};

const ForumIdentityMenu: React.FC<ForumIdentityMenuProps> = ({
  masks,
  selectedMaskIds,
  onSelectSelf,
  onSelectAnonymous,
  onSelectMask
}) => (
  <DropdownMenu className="absolute bottom-12 left-0 z-[260] w-44">
    <DropdownItem className="px-3 py-2 text-sm" onClick={onSelectSelf}>
      <i className="fa-solid fa-user mr-2"></i>本体
    </DropdownItem>
    <DropdownItem className="px-3 py-2 text-sm" onClick={onSelectAnonymous}>
      <i className="fa-solid fa-user-secret mr-2"></i>匿名
    </DropdownItem>
    <DropdownLabel>面具</DropdownLabel>
    {masks.length === 0 ? (
      <SharedEmptyState className="px-3 py-2 text-xs render-text-secondary">暂无面具</SharedEmptyState>
    ) : (
      (selectedMaskIds.length > 0 ? masks.filter((m) => selectedMaskIds.includes(m.id)) : masks).map((mask) => (
        <DropdownItem key={mask.id} className="px-3 py-2 text-sm" onClick={() => onSelectMask(mask.id)}>
          <i className="fa-solid fa-mask mr-2"></i>{mask.name}
        </DropdownItem>
      ))
    )}
  </DropdownMenu>
);

export default ForumIdentityMenu;
