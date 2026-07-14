import React from 'react';
import type { AISettings, Contact } from '../types';
import { getGeminiChatReply } from '../services/geminiServiceLoader';
import { extractStrictJsonObject } from '../utils/chat/aiReplyParser.ts';
import { normalizeGeneratedNonSystemEventText } from '../utils/generatedVisibleText.ts';
import {
  readTruthOrDareThemes,
  writeTruthOrDareThemes,
  type TruthOrDareTheme
} from './truthOrDarePersistence';
export type { TruthOrDareTheme } from './truthOrDarePersistence';

type TruthOrDareModalPhase = 'invite' | 'drawing' | 'choose' | 'god';

type TruthOrDareModalProps = {
  visible: boolean;
  phase: TruthOrDareModalPhase;
  drawingName?: string;
  pendingPlayer?: string;
  contact: Contact;
  aiSettings?: AISettings;
  onClose: () => void;
  onToast?: (message: string) => void;
  onRequestInvite: (theme: TruthOrDareTheme) => void;
  onChooseResult: (mode: 'truth' | 'dare') => void;
  onGodAction: (action: 'skip' | 'forceTruth' | 'forceDare') => void;
};

const getThemeDisplayName = (theme?: TruthOrDareTheme, fallback = '未命名主题'): string => {
  const name = String(theme?.name || '').trim();
  return name || fallback;
};

export const buildTruthOrDareThemeFillSystemPrompt = (): string => [
  '你是真心话大冒险题库策划助手，只输出严格 JSON。',
  '题目服务于沉浸式角色扮演聊天：要能制造具体回应、轻微张力、关系推进或情绪层次。',
  '禁止输出说明文字、Markdown、代码块、心声、动作、旁白、翻译或系统说明。'
].join('\n');

export const buildTruthOrDareThemeFillPrompt = (themeName: string): string => {
  const name = String(themeName || '').trim() || '未命名主题';
  return [
    `围绕主题“${name}”生成真心话大冒险题库 JSON。`,
    '输出结构必须是：{"questions":["真心话1"],"challenges":["大冒险1"]}。',
    '要求：',
    '1) questions 和 challenges 各 8 条，全部使用简体中文。',
    '2) 每条 8-28 字，短、具体、口语化，适合直接出现在聊天里。',
    '3) 真心话要能引出具体经历、偏好、关系态度或当下情绪，不要只问“喜欢什么/害怕什么”这类空泛问题。',
    '4) 大冒险要是聊天中可执行的小动作、小表达或轻量互动，不要求现实危险行为，不要求转账、红包、露脸、隐私暴露或越界接触。',
    '5) 题目要有不同方向：轻松、试探、走心、调侃、关系推进各占一些；不要 8 条同质化。',
    '6) 保持暧昧或亲密也要克制，避免低俗、羞辱、胁迫、未成年人不宜、身体羞辱、危险挑战和强迫告白。',
    '7) 只输出 JSON，不要任何额外文字。'
  ].join('\n');
};

export const parseAiThemeContent = (raw: string): { questions: string[]; challenges: string[] } | null => {
  const parsed = extractStrictJsonObject(String(raw || ''));
  const questions = Array.isArray(parsed?.questions)
    ? parsed.questions
        .map((q: any) => normalizeGeneratedNonSystemEventText(q, { collapseWhitespace: true }))
        .filter(Boolean)
    : [];
  const challenges = Array.isArray(parsed?.challenges)
    ? parsed.challenges
        .map((c: any) => normalizeGeneratedNonSystemEventText(c, { collapseWhitespace: true }))
        .filter(Boolean)
    : [];
  if (!questions.length || !challenges.length) return null;
  return { questions: questions.slice(0, 12), challenges: challenges.slice(0, 12) };
};

const TruthOrDareModal: React.FC<TruthOrDareModalProps> = (props) => {
  const [themes, setThemes] = React.useState<TruthOrDareTheme[]>(() => readTruthOrDareThemes());
  const [selectedThemeId, setSelectedThemeId] = React.useState<string>('classic');
  const [showSettings, setShowSettings] = React.useState(false);
  const [isAiFilling, setIsAiFilling] = React.useState(false);

  const selectedTheme = React.useMemo(() => (
    themes.find((item) => item.id === selectedThemeId) || themes[0]
  ), [themes, selectedThemeId]);
  const selectedThemeName = String(selectedTheme?.name || '').trim();
  const canAiFill = !!props.aiSettings && selectedThemeName.length >= 2;

  React.useEffect(() => {
    writeTruthOrDareThemes(themes);
  }, [themes]);

  React.useEffect(() => {
    if (!selectedTheme && themes.length > 0) setSelectedThemeId(themes[0].id);
  }, [selectedTheme, themes]);

  React.useEffect(() => {
    if (!props.visible) setShowSettings(false);
  }, [props.visible]);

  const updateSelectedTheme = (patch: Partial<TruthOrDareTheme>) => {
    if (!selectedTheme) return;
    setThemes((prev) => prev.map((item) => item.id === selectedTheme.id ? { ...item, ...patch, updatedAt: Date.now() } : item));
  };

  const handleCreateTheme = () => {
    const id = `theme-${Date.now()}`;
    const next: TruthOrDareTheme = { id, name: `新主题${themes.length + 1}`, questions: [], challenges: [], updatedAt: Date.now() };
    setThemes((prev) => [next, ...prev]);
    setSelectedThemeId(id);
  };

  const removeCurrentTheme = () => {
    if (!selectedTheme) return;
    if (themes.length <= 1) {
      const resetTheme: TruthOrDareTheme = {
        ...selectedTheme,
        name: '',
        questions: [],
        challenges: [],
        updatedAt: Date.now()
      };
      setThemes([resetTheme]);
      setSelectedThemeId(resetTheme.id);
      props.onToast?.('已清空当前主题');
      return;
    }
    const nextThemes = themes.filter((item) => item.id !== selectedTheme.id);
    setThemes(nextThemes);
    setSelectedThemeId(nextThemes[0].id);
  };

  const fillByAI = async () => {
    if (!selectedTheme || !props.aiSettings) {
      props.onToast?.('当前无法使用 AI 填写');
      return;
    }
    if (selectedThemeName.length < 2) {
      props.onToast?.('请先填写主题名称后再生成');
      return;
    }
    setIsAiFilling(true);
    try {
      const prompt = buildTruthOrDareThemeFillPrompt(selectedThemeName);
      const reply = await getGeminiChatReply(
        [{ role: 'user', text: prompt }],
        buildTruthOrDareThemeFillSystemPrompt(),
        props.aiSettings
      );
      const parsed = parseAiThemeContent(reply || '');
      if (!parsed) {
        props.onToast?.('AI 填写失败，请重试');
        return;
      }
      updateSelectedTheme({ questions: parsed.questions, challenges: parsed.challenges });
      props.onToast?.('AI 已填充主题内容');
    } catch (error) {
      console.error('[TruthOrDare] AI fill failed:', error);
      props.onToast?.('AI 填写失败，请检查模型配置');
    } finally {
      setIsAiFilling(false);
    }
  };

  if (!props.visible) return null;

  return (
    <div className="fixed inset-0 z-[620] bg-black/35 flex items-center justify-center px-4" onClick={props.onClose}>
      <div className="w-full max-w-md render-bg-secondary rounded-2xl border render-border" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b render-border flex items-center justify-between">
          <span className="text-[16px] font-semibold render-text-primary">真心话大冒险</span>
          <button className="text-[13px] render-text-secondary" onClick={() => setShowSettings((prev) => !prev)}><i className="fa-solid fa-gear mr-1"></i>{showSettings ? '关闭设置' : '设置'}</button>
        </div>

        {showSettings ? (
          <div className="px-4 py-3 space-y-3 max-h-[62vh] overflow-y-auto">
            <div className="flex items-center gap-2">
              <button className="h-9 px-3 rounded border render-border-subtle text-[13px]" onClick={handleCreateTheme}>新建主题</button>
              <button className="h-9 px-3 rounded border render-border-subtle text-[13px]" onClick={removeCurrentTheme}>{themes.length <= 1 ? '清空当前主题' : '删除选中主题'}</button>
            </div>
            <div className="space-y-2">
              {themes.map((theme) => (
                <label key={theme.id} className="flex items-center justify-between text-[13px] render-text-primary">
                  <span>{getThemeDisplayName(theme)}</span>
                  <input type="radio" name="truth-dare-theme" checked={selectedThemeId === theme.id} onChange={() => setSelectedThemeId(theme.id)} />
                </label>
              ))}
            </div>
            {selectedTheme && (
              <>
                <div className="space-y-1">
                  <div className="text-[12px] text-gray-500">主题名称</div>
                  <input value={selectedTheme.name} onChange={(e) => updateSelectedTheme({ name: e.target.value.slice(0, 30) })} placeholder="输入主题名" className="w-full h-9 rounded border render-border-subtle render-bg-primary px-2 text-[13px]" />
                  <div className="pt-2 space-y-2">
                    <div className="text-[11px] text-gray-500">你可以填写主题名称，再点击自动生成来问题和挑战。</div>
                    <button className="h-9 px-3 rounded text-[13px] text-white disabled:opacity-60" style={{ backgroundColor: 'var(--app-accent-color)' }} onClick={() => void fillByAI()} disabled={isAiFilling || !canAiFill}>{isAiFilling ? '生成中...' : '自动生成'}</button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[12px] text-gray-500">真心话问题（每行一条）</div>
                  <textarea value={selectedTheme.questions.join('\n')} onChange={(e) => updateSelectedTheme({ questions: e.target.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 20) })} className="w-full min-h-[92px] rounded border render-border-subtle render-bg-primary px-2 py-1.5 text-[13px] resize-none" />
                </div>
                <div className="space-y-1">
                  <div className="text-[12px] text-gray-500">大冒险挑战（每行一条）</div>
                  <textarea value={selectedTheme.challenges.join('\n')} onChange={(e) => updateSelectedTheme({ challenges: e.target.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 20) })} className="w-full min-h-[92px] rounded border render-border-subtle render-bg-primary px-2 py-1.5 text-[13px] resize-none" />
                </div>
                <div className="sticky bottom-0 pt-2 pb-1 render-bg-secondary">
                  <button className="w-full h-10 rounded text-white text-[14px]" style={{ backgroundColor: 'var(--app-accent-color)' }} onClick={() => { setShowSettings(false); props.onToast?.('主题设置已完成，当前主题已生效'); }}>完成</button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="px-4 py-4 space-y-4">
            {props.phase === 'invite' && (
              <>
                <div className="text-[14px] render-text-primary">是否邀请对方进行真心话大冒险？</div>
                <div className="text-[12px] text-gray-500">当前主题：{getThemeDisplayName(selectedTheme, '未设置主题')}</div>
                <div className="flex items-center gap-3 pt-1">
                  <button className="flex-1 h-10 rounded border render-border-subtle text-[14px]" onClick={props.onClose}>取消</button>
                  <button className="flex-1 h-10 rounded text-white text-[14px]" style={{ backgroundColor: 'var(--app-accent-color)' }} onClick={() => selectedTheme && props.onRequestInvite(selectedTheme)}>发起邀请</button>
                </div>
              </>
            )}
            {props.phase === 'drawing' && (
              <>
                <div className="text-[14px] render-text-primary">正在抽取本轮选择者...</div>
                <div className="h-20 rounded-xl border render-border-subtle flex items-center justify-center render-bg-primary">
                  <div className="text-[22px] font-semibold tracking-wide animate-pulse">{String(props.drawingName || '抽取中...')}</div>
                </div>
                <div className="text-[12px] text-gray-500">随机滚动中，请稍候</div>
              </>
            )}
            {props.phase === 'choose' && (
              <>
                <div className="text-[14px] render-text-primary">本轮抽中：{String(props.pendingPlayer || '玩家')}，请选择真心话还是大冒险</div>
                <div className="grid grid-cols-2 gap-3">
                  <button className="h-10 rounded border render-border-subtle text-[14px]" onClick={() => props.onChooseResult('truth')}>真心话</button>
                  <button className="h-10 rounded border render-border-subtle text-[14px]" onClick={() => props.onChooseResult('dare')}>大冒险</button>
                </div>
              </>
            )}
            {props.phase === 'god' && (
              <>
                <div className="text-[14px] render-text-primary">上帝模式：请选择干预方式</div>
                <div className="space-y-2">
                  <button className="w-full h-10 rounded border render-border-subtle text-[14px]" onClick={() => props.onGodAction('skip')}>跳过本轮</button>
                  <button className="w-full h-10 rounded border render-border-subtle text-[14px]" onClick={() => props.onGodAction('forceTruth')}>指定对方真心话</button>
                  <button className="w-full h-10 rounded border render-border-subtle text-[14px]" onClick={() => props.onGodAction('forceDare')}>指定对方大冒险</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TruthOrDareModal;
