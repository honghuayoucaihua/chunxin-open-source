/**
 * 关于叙说页面
 * 显示官方公告、功德箱、帮助与反馈
 * 上中下三部分布局：顶部标题栏、中间信息流、底部导航按钮
 */

import React, { useState, useEffect } from 'react';
import { MobileHeader } from '../Common';
import { fetchTeamNoticesRuntime } from '../tabs/teamNoticeRuntime';
import { pickTeamNoticePreview } from '../utils/teamNoticePreview';
import {
  TROUBLESHOOTING_FAQ
} from './helpWhitepaperContent';

interface TeamNotice {
  id: string;
  title: string;
  content: string;
  type: 'announcement' | 'update' | 'notice';
  createdAt: number;
}

type TeamNoticeFilter = 'all' | TeamNotice['type'];

const DONATION_URL = '';

// 关于叙说子页面（独立导出）
export const XushuoAboutView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader title="关于叙说" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center py-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <i className="fa-solid fa-comments text-white text-3xl"></i>
          </div>
          <h1 className="text-xl font-bold render-text-primary">叙说·春信</h1>
        </div>
        
        <div className="render-bg-secondary rounded-xl p-4 render-text-secondary text-[14px] leading-relaxed space-y-3">
          <p>你好，我是李柯，感谢体验叙说。叙说是一个完全免费使用的AI聊天应用，在这里你可以塑造不同性格和背景的联系人，并在你需要的时候聆听你的叙说。</p>
          <p className="font-medium render-text-primary">【费用说明】</p>
          <p>叙说将长期保持免费，可能会减少次数或者倒闭，但是绝对不会收费。</p>

          <p className="font-medium render-text-primary pt-2">【致谢】</p>
          <p>感谢唯一金主徐烁<br/>
          感谢 GD 音乐台提供的 API<br/>
          感谢所有为叙说义务推广、问答的偷偷听雨爱、白术、钱钱、残鱼映雪、左耳钉，昼缘，离决，粉兔……等所有伙伴 <br/>
          （排名不分先后，也欢迎联系邮箱提交你的名字）<br/>
          感谢所有为叙说项目提供支持、反馈和帮助的你们<br/>
          叙说属于你们每一个人</p>

          <p className="mt-2">如有问题或建议，欢迎反馈shiyuedongfang@gmail.com，祝你使用愉快~</p>
        </div>

        <div className="render-bg-secondary rounded-xl p-4 render-text-secondary text-[14px] leading-relaxed space-y-3">
          <p className="font-medium render-text-primary">【快速入门指南】</p>

          <p><strong>1）开始聊天</strong><br/>
          点击底部「叙说」，选择联系人后即可发起对话。联系人会按照其性格设定进行回复。</p>

          <p><strong>2）创建和管理联系人</strong><br/>
          点击右上角「+」可新增联系人；你还可以编辑联系人资料、调整人设，让对话更贴近你的需求。</p>

          <p><strong>3）配置 AI 服务</strong><br/>
          默认可直接使用「叙说AI」服务，无需任何设置；如需自定义模型，可进入「我」→「设置」→「AI设置」填写自己的 API 配置。</p>

          <p><strong>4）使用更多功能</strong><br/>
          在应用内可体验社区、音乐、公众号、匿名聊天等扩展功能，满足聊天之外的日常使用场景。</p>

          <p><strong>5）个性化与辅助工具</strong><br/>
          你可以在设置中调整皮肤主题、显示样式和部分功能偏好，让界面与交互更符合自己的习惯。</p>

          <p><strong>6）备份与迁移数据</strong><br/>
          建议定期在「我」→「设置」→「通用」中执行数据备份，必要时可一键恢复，减少数据丢失风险。</p>
        </div>

      </div>
    </div>
  );
};

// 帮助与反馈子页面（独立导出）
export const XushuoHelpView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      <MobileHeader title="帮助与反馈" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="render-bg-secondary rounded-xl p-4 shadow-sm text-center">
          <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
            <i className="fa-solid fa-envelope text-green-500 text-xl"></i>
          </div>
          <h2 className="text-lg font-medium render-text-primary">帮助与反馈</h2>
          <p className="text-sm render-text-tertiary mt-1">请确保仔细阅读常见问题排查指南再进行反馈</p>
        </div>
        
        <a 
          href="mailto:shiyuedongfang@gmail.com?subject=叙说·春信 - 用户反馈"
          className="render-bg-secondary rounded-xl p-4 shadow-sm block"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mr-3">
              <i className="fa-solid fa-envelope text-red-500"></i>
            </div>
            <div className="flex-1">
              <div className="text-[15px] render-text-primary">发送邮件反馈</div>
              <div className="text-[12px] render-text-tertiary mt-0.5">shiyuedongfang@gmail.com</div>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-300 text-sm"></i>
          </div>
        </a>
        
        <div className="render-bg-secondary rounded-xl p-4 shadow-sm">
          <h3 className="font-medium render-text-primary mb-3">常见问题排查指南</h3>
          <div className="space-y-3 text-sm render-text-secondary">
            {TROUBLESHOOTING_FAQ.map((item) => (
              <div key={item.question}>
                <p className="font-medium render-text-primary">{item.question}</p>
                <p className="mt-1">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// 主页面
const XushuoTeamView: React.FC<{ 
  onBack: () => void;
  onNavigate?: (subView: 'xushuoAbout' | 'xushuoHelp') => void;
}> = ({ onBack, onNavigate }) => {
  const [notices, setNotices] = useState<TeamNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TeamNoticeFilter>('all');

  const handleOpenDonation = () => {
    if (typeof globalThis.location !== 'undefined') {
      globalThis.location.href = DONATION_URL;
      return;
    }
    globalThis.open?.(DONATION_URL, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    const loadNotices = async () => {
      try {
        const list = (await fetchTeamNoticesRuntime()) as TeamNotice[];
        setNotices(list);
        // 同步更新主界面公告缩略缓存，确保返回聊天列表后显示正确的最新公告
        try {
          const preview = pickTeamNoticePreview(list);
          const key = 'xushuo_team_notice_preview_v1';
          if (preview) {
            localStorage.setItem(key, JSON.stringify(preview));
          } else {
            localStorage.removeItem(key);
          }
        } catch {
          // 缓存更新失败不影响页面显示
        }
      } catch (err) {
        console.error('加载通知失败:', err);
      } finally {
        setLoading(false);
      }
    };
    loadNotices();
  }, []);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'announcement':
        return { color: 'bg-orange-500', label: '公告' };
      case 'update':
        return { color: 'bg-blue-500', label: '更新' };
      case 'notice':
      default:
        return { color: 'bg-green-500', label: '通知' };
    }
  };

  const filteredNotices = notices.filter((item) => (
    typeFilter === 'all' ? true : item.type === typeFilter
  ));

  // 渲染信息流卡片
  const renderFeedCard = (item: TeamNotice) => {
    const typeStyle = getTypeStyle(item.type);
    return (
      <div 
        key={item.id} 
        className="render-bg-secondary rounded-xl p-4 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className={`${typeStyle.color} text-white text-xs px-2 py-0.5 rounded`}>
            {typeStyle.label}
          </span>
          <span className="text-xs render-text-tertiary">
            {formatDate(item.createdAt)}
          </span>
        </div>
        <h3 className="font-medium render-text-primary mb-2 text-[15px]">{item.title}</h3>
        <p className="text-sm render-text-secondary leading-relaxed whitespace-pre-wrap">{item.content}</p>
      </div>
    );
  };

  // 欢迎卡片
  const renderWelcomeCard = () => (
    <div 
      key="welcome"
      className="render-bg-secondary rounded-xl p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded">
          官方
        </span>
      </div>
      <h3 className="font-medium render-text-primary mb-2 text-[15px]">欢迎使用 叙说·春信</h3>
    </div>
  );

  return (
    <div className="flex flex-col h-full render-bg-primary animate-in slide-in-from-right duration-200">
      {/* 顶部 - 标题栏 */}
      <MobileHeader title="关于叙说" onBack={onBack} />
      
      {/* 中间 - 瀑布流信息流卡片 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 欢迎卡片 - 始终在最上面 */}
        {renderWelcomeCard()}

        <div className="render-bg-secondary rounded-xl p-3 shadow-sm space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13px] font-medium render-text-primary">团队动态筛选</div>
              <div className="text-[12px] render-text-tertiary mt-0.5">
                {typeFilter === 'all' ? '显示全部通知' : `当前仅显示${getTypeStyle(typeFilter).label}`}
              </div>
            </div>
            <div className="text-[12px] render-text-tertiary whitespace-nowrap">
              {filteredNotices.length}/{notices.length}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as TeamNoticeFilter)}
              className="app-field-select flex-1 min-w-0 px-2 py-1.5 bg-gray-100 dark:bg-gray-700 render-text-primary text-xs border-none"
              aria-label="筛选团队通知类型"
            >
              <option value="all">全部动态</option>
              <option value="announcement">只看公告</option>
              <option value="update">只看更新</option>
              <option value="notice">只看通知</option>
            </select>
          </div>
        </div>
        
        {/* 通知列表 */}
        {loading ? (
          <div className="flex justify-center py-8">
            <i className="fa-solid fa-spinner fa-spin text-gray-400 text-xl"></i>
          </div>
        ) : filteredNotices.length > 0 ? (
          <div className="space-y-4">
            {filteredNotices.map((notice) => renderFeedCard(notice))}
          </div>
        ) : (
          <div className="render-bg-secondary rounded-xl p-4 shadow-sm text-sm render-text-tertiary">
            当前筛选下还没有对应通知，换个分类看看。
          </div>
        )}
      </div>
      
      {/* 底部 - 三个纯文字按钮 */}
      <div className="app-surface-footer flex-shrink-0 safe-area-bottom">
        <div className="flex">
          <button
            onClick={() => onNavigate?.('xushuoAbout')}
            className="app-button app-button-muted app-footer-button flex-1 text-center text-[15px]"
          >
            须知
          </button>
          <button
            onClick={handleOpenDonation}
            className="app-button app-button-muted app-footer-button flex-1 text-center text-[15px]"
          >
            赞赏
          </button>
          <button
            onClick={() => onNavigate?.('xushuoHelp')}
            className="app-button app-button-muted app-footer-button flex-1 text-center text-[15px]"
          >
            帮助与反馈
          </button>
        </div>
      </div>
    </div>
  );
};

export default XushuoTeamView;
