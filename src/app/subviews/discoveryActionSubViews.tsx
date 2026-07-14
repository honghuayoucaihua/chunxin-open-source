import React from 'react';
import type { AISettings, Contact, FriendRequest, SubView, UserProfile } from '../../types';
import { ScanView, ShakeView } from '../lazyViews/discoveryActionLazyViews';

export type DiscoveryActionSubView = Extract<SubView, 'scan' | 'shake'>;

type DiscoveryActionSubViewParams = {
  subView: DiscoveryActionSubView;
  goBackSubView: () => void;
  contacts: Contact[];
  user: UserProfile;
  aiSettings: AISettings;
  onScanImage: (file: File) => Promise<Contact | null>;
  onScanRequestCreated: (request: FriendRequest) => void;
  onShakeCreateContact: (contact: Contact) => void;
};

export const renderDiscoveryActionSubView = (params: DiscoveryActionSubViewParams) => {
  if (params.subView === 'scan') {
    return (
      <ScanView
        onBack={params.goBackSubView}
        onScanImage={async (file) => {
          const scanned = await params.onScanImage(file);
          if (!scanned) return;
          const request: FriendRequest = {
            id: `scan-img-${Date.now()}`,
            contact: scanned,
            greeting: `你好，我是${scanned.name}，通过名片添加你。`,
            timestamp: Date.now(),
            status: 'pending',
            source: 'scan'
          };
          params.onScanRequestCreated(request);
        }}
      />
    );
  }
  if (params.subView === 'shake') {
    return (
      <ShakeView
        onBack={params.goBackSubView}
        contacts={params.contacts}
        user={params.user}
        aiSettings={params.aiSettings}
        onCreateContact={params.onShakeCreateContact}
      />
    );
  }
  return null;
};
