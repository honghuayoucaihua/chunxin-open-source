export type CommunityShareType = 'contact' | 'worldbook' | 'htmltemplate' | 'bubbleworkshop';

export const COMMUNITY_TYPE_META: Record<CommunityShareType, {
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  bgColor: string;
  badgeClassName: string;
}> = {
  contact: {
    label: '联系人',
    shortLabel: '联系人',
    icon: 'fa-user',
    color: '#10AD7A',
    bgColor: 'bg-emerald-500/20',
    badgeClassName: 'bg-emerald-500/10 text-emerald-400'
  },
  worldbook: {
    label: '世界书',
    shortLabel: '世界书',
    icon: 'fa-book',
    color: '#7D5FFF',
    bgColor: 'bg-purple-500/20',
    badgeClassName: 'bg-purple-500/10 text-purple-400'
  },
  htmltemplate: {
    label: 'HTML',
    shortLabel: 'HTML',
    icon: 'fa-code',
    color: '#FF6B6B',
    bgColor: 'bg-rose-500/20',
    badgeClassName: 'bg-rose-500/10 text-rose-400'
  },
  bubbleworkshop: {
    label: '气泡模板',
    shortLabel: '气泡',
    icon: 'fa-paintbrush',
    color: '#A855F7',
    bgColor: 'bg-fuchsia-500/20',
    badgeClassName: 'bg-fuchsia-500/10 text-fuchsia-400'
  }
};

export interface CommunityShareItem {
  id: string;
  type: CommunityShareType;
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

export interface CommunityShareDetail extends CommunityShareItem {
  payload: string;
}

export interface CommunityListResponse {
  items: CommunityShareItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CommunityUploadRequest {
  type: CommunityShareType;
  name: string;
  description: string;
  avatar: string;
  cover_image: string;
  author_name: string;
  author_password: string;
  is_anonymous: boolean;
  is_encrypted: boolean;
  payload: any;
}

export type CommunitySortMode = 'newest' | 'popular' | 'likes' | 'downloads';
