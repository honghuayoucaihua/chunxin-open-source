import React from 'react';
import { NoticeForm } from './AdminForms';

type TeamNotice = {
  id: string;
  title: string;
  content: string;
  type: 'announcement' | 'update' | 'notice';
  createdAt: number;
};

export type ApkVersion = {
  id: string;
  version: string;
  versionCode: number;
  apkUrl: string;
  apkSize?: number;
  updateLog?: string;
  forceUpdate: boolean;
  minVersion?: number;
  createdAt: number;
};

export type ApkCandidate = {
  id?: string;
  tagName?: string;
  version: string;
  versionCode: number;
  apkUrl: string;
  apkSize?: number;
  updateLog?: string;
  forceUpdate?: boolean;
  minVersion?: number;
  createdAt: number;
  source?: string;
};

type ApkDraft = {
  version: string;
  versionCode: string;
  apkUrl: string;
  apkSize: string;
  updateLog: string;
  forceUpdate: boolean;
  minVersion: string;
};

const inputClass =
  'w-full bg-slate-700/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500';

const textareaClass =
  'w-full min-h-[96px] bg-slate-700/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500';

const emptyApkDraft = (): ApkDraft => ({
  version: '',
  versionCode: '',
  apkUrl: '',
  apkSize: '',
  updateLog: '',
  forceUpdate: false,
  minVersion: ''
});

export const AdminNoticesView: React.FC<{
  showNoticeForm: boolean;
  setShowNoticeForm: React.Dispatch<React.SetStateAction<boolean>>;
  onAddNotice: (title: string, content: string, type: string) => void;
  loading: boolean;
  notices: TeamNotice[];
  onDeleteNotice: (id: string) => void;
}> = ({ showNoticeForm, setShowNoticeForm, onAddNotice, loading, notices, onDeleteNotice }) => (
  <div className="p-4">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-white font-medium">公告列表</h2>
      <button onClick={() => setShowNoticeForm(!showNoticeForm)} className="bg-orange-500/20 text-orange-400 text-sm px-3 py-1.5 rounded-lg">
        <i className="fa-solid fa-plus mr-1"></i> 发布
      </button>
    </div>

    {showNoticeForm && <NoticeForm onSubmit={onAddNotice} onCancel={() => setShowNoticeForm(false)} loading={loading} />}

    {notices.length > 0 ? (
      <div className="space-y-2">
        {notices.map((notice) => (
          <div key={notice.id} className="bg-white/5 rounded-xl border border-white/10 p-3">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                notice.type === 'announcement' ? 'bg-orange-500/10' : notice.type === 'update' ? 'bg-blue-500/10' : 'bg-green-500/10'
              }`}>
                <i className={`fa-solid text-sm ${
                  notice.type === 'announcement' ? 'fa-bullhorn text-orange-400' : notice.type === 'update' ? 'fa-rocket text-blue-400' : 'fa-bell text-green-400'
                }`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium">{notice.title}</div>
                <div className="text-white/50 text-xs mt-1 line-clamp-2">{notice.content}</div>
                <div className="text-white/30 text-xs mt-1">{new Date(notice.createdAt).toLocaleString('zh-CN')}</div>
              </div>
              <button onClick={() => onDeleteNotice(notice.id)} className="text-red-400/60 hover:text-red-400 p-1">
                <i className="fa-solid fa-trash text-xs"></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="text-center text-white/40 py-8 text-sm">
        <i className="fa-solid fa-bell-slash text-2xl mb-2 block opacity-50"></i>
        暂无公告
      </div>
    )}
  </div>
);

export const AdminApkView: React.FC<{
  apkVersions: ApkVersion[];
  candidate: ApkCandidate | null;
  loading: boolean;
  onAdd: (payload: Omit<ApkVersion, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteApkVersion: (id: string) => Promise<void>;
  onEditApkVersion: (version: ApkVersion) => Promise<void>;
  onPublishCandidate: () => Promise<void>;
  formatBytes: (bytes?: number) => string;
}> = ({
  apkVersions,
  candidate,
  loading,
  onAdd,
  onDeleteApkVersion,
  onEditApkVersion,
  onPublishCandidate,
  formatBytes
}) => {
  const [draft, setDraft] = React.useState<ApkDraft>(emptyApkDraft);

  const handleSubmit = async () => {
    if (!draft.version.trim() || !draft.versionCode.trim() || !draft.apkUrl.trim()) return;
    await onAdd({
      version: draft.version.trim(),
      versionCode: Number(draft.versionCode),
      apkUrl: draft.apkUrl.trim(),
      apkSize: draft.apkSize.trim() ? Number(draft.apkSize) : undefined,
      updateLog: draft.updateLog.trim(),
      forceUpdate: draft.forceUpdate,
      minVersion: draft.minVersion.trim() ? Number(draft.minVersion) : undefined
    });
    setDraft(emptyApkDraft());
  };

  const latest = apkVersions[0] || null;

  return (
    <div className="p-4">
      <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-white text-sm font-medium">GitHub 自动构建候选包</div>
            <div className="text-white/40 text-xs mt-1">GitHub Actions 会自动编译 APK 并上传到 R2 候选区。只有你在这里点击发布后，用户端才会收到更新。</div>
          </div>
          <span className="bg-emerald-500/15 text-emerald-300 text-[11px] px-2 py-1 rounded-full whitespace-nowrap">
            Candidate
          </span>
        </div>

        {candidate ? (
          <div className="bg-emerald-500/5 rounded-lg p-3 border border-emerald-400/20 mb-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-white font-medium">{candidate.version}</span>
              <span className="text-white/40 text-xs">build {candidate.versionCode}</span>
              {candidate.tagName ? <span className="text-emerald-300/80 text-[11px]">{candidate.tagName}</span> : null}
            </div>
            <div className="text-white/55 text-xs break-all">{candidate.apkUrl}</div>
            <div className="flex items-center gap-3 text-white/35 text-xs mt-2 flex-wrap">
              <span>{formatBytes(candidate.apkSize)}</span>
              <span>{new Date(candidate.createdAt).toLocaleString('zh-CN')}</span>
            </div>
            {candidate.updateLog ? (
              <div className="text-white/55 text-xs mt-2 whitespace-pre-line">{candidate.updateLog}</div>
            ) : null}
            <button
              onClick={onPublishCandidate}
              disabled={loading}
              className="w-full mt-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium py-3 rounded-xl disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? '处理中...' : '同意并发布给用户'}
            </button>
          </div>
        ) : (
          <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-white/40 text-sm mb-4">
            暂无可发布的 GitHub 候选 APK
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-white text-sm font-medium">当前对外版本</div>
            <div className="text-white/40 text-xs mt-1">APK 文件本体由 GitHub Actions 构建后上传到 R2，这里维护客户端实际看到的已发布版本元数据。</div>
          </div>
          <span className="bg-cyan-500/15 text-cyan-300 text-[11px] px-2 py-1 rounded-full whitespace-nowrap">
            R2 Published
          </span>
        </div>

        {latest ? (
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-white font-medium">{latest.version}</span>
              <span className="text-white/40 text-xs">build {latest.versionCode}</span>
              {latest.forceUpdate && <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded">强制更新</span>}
            </div>
            <div className="text-white/55 text-xs break-all">{latest.apkUrl}</div>
            <div className="flex items-center gap-3 text-white/35 text-xs mt-2 flex-wrap">
              <span>{formatBytes(latest.apkSize)}</span>
              <span>{new Date(latest.createdAt).toLocaleString('zh-CN')}</span>
              {latest.minVersion ? <span>最低 build {latest.minVersion}</span> : null}
            </div>
            {latest.updateLog ? (
              <div className="text-white/55 text-xs mt-2 whitespace-pre-line">{latest.updateLog}</div>
            ) : null}
          </div>
        ) : (
          <div className="text-center text-white/40 py-6 text-sm">
            <i className="fa-solid fa-box-open text-2xl mb-2 block opacity-50"></i>
            暂无已发布 APK 元数据
          </div>
        )}
      </div>

      <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-4 space-y-3">
        <h3 className="text-white font-medium">新增版本</h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={draft.version}
            onChange={(e) => setDraft((prev) => ({ ...prev, version: e.target.value }))}
            className={inputClass}
            placeholder="版本号，如 1.0.203"
          />
          <input
            type="number"
            value={draft.versionCode}
            onChange={(e) => setDraft((prev) => ({ ...prev, versionCode: e.target.value }))}
            className={inputClass}
            placeholder="版本代码"
          />
        </div>
          <input
            type="text"
            value={draft.apkUrl}
            onChange={(e) => setDraft((prev) => ({ ...prev, apkUrl: e.target.value }))}
            className={inputClass}
            placeholder="R2 APK 下载地址"
          />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={draft.apkSize}
            onChange={(e) => setDraft((prev) => ({ ...prev, apkSize: e.target.value }))}
            className={inputClass}
            placeholder="APK 字节大小（可选）"
          />
          <input
            type="number"
            value={draft.minVersion}
            onChange={(e) => setDraft((prev) => ({ ...prev, minVersion: e.target.value }))}
            className={inputClass}
            placeholder="最低版本（可选）"
          />
        </div>
        <textarea
          value={draft.updateLog}
          onChange={(e) => setDraft((prev) => ({ ...prev, updateLog: e.target.value }))}
          className={textareaClass}
          placeholder="更新日志"
        />
        <label className="flex items-center gap-2 text-white/70 text-sm">
          <input
            type="checkbox"
            checked={draft.forceUpdate}
            onChange={(e) => setDraft((prev) => ({ ...prev, forceUpdate: e.target.checked }))}
          />
          强制更新
        </label>
        <button
          onClick={handleSubmit}
          disabled={loading || !draft.version.trim() || !draft.versionCode.trim() || !draft.apkUrl.trim()}
          className="w-full bg-gradient-to-r from-cyan-500 to-sky-500 text-white font-medium py-3 rounded-xl disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? '保存中...' : '添加版本'}
        </button>
      </div>

      <div className="space-y-2">
        {apkVersions.map((ver) => (
          <div key={ver.id} className="bg-white/5 rounded-xl border border-white/10 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium">{ver.version}</span>
                  <span className="text-white/40 text-xs">build {ver.versionCode}</span>
                  {ver.forceUpdate && <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded">强制</span>}
                </div>
                <div className="text-white/50 text-xs mt-1 break-all">{ver.apkUrl}</div>
                <div className="text-white/35 text-xs mt-1 flex gap-3 flex-wrap">
                  <span>{formatBytes(ver.apkSize)}</span>
                  {ver.minVersion ? <span>最低 build {ver.minVersion}</span> : null}
                  <span>{new Date(ver.createdAt).toLocaleString('zh-CN')}</span>
                </div>
                {ver.updateLog ? <div className="text-white/55 text-xs mt-2 whitespace-pre-line">{ver.updateLog}</div> : null}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => onEditApkVersion(ver)} className="text-cyan-400/70 hover:text-cyan-400 p-1.5">
                  <i className="fa-solid fa-pen text-xs"></i>
                </button>
                <button onClick={() => onDeleteApkVersion(ver.id)} className="text-red-400/60 hover:text-red-400 p-1.5">
                  <i className="fa-solid fa-trash text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        ))}

        {apkVersions.length === 0 ? (
          <div className="text-center text-white/40 py-8 text-sm">
            <i className="fa-solid fa-mobile-screen text-2xl mb-2 block opacity-50"></i>
            还没有版本记录
          </div>
        ) : null}
      </div>
    </div>
  );
};
