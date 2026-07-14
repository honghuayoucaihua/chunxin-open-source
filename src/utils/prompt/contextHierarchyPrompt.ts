import type { ChatMode } from '../../types/index.ts';
import { buildSection } from './promptSectionUtils.ts';

type BuildContextHierarchySectionOptions = {
  scene?: 'single' | 'group';
  mode?: ChatMode;
};

export const buildContextHierarchySection = (
  options: BuildContextHierarchySectionOptions = {}
): string => {
  const isStory = options.mode === 'story';
  const sceneLabel = options.scene === 'group' ? '群成员资料' : '角色资料';
  return buildSection('上下文层级', [
    `- ${sceneLabel}是身份、性格、关系、表达风格和长期行为边界的基准；不要被近期一句话或历史旧格式冲掉。`,
    '- 世界书只补足背景、规则、地点和设定边界；不能覆盖角色资料、双方关系、用户本轮明确表达或当前输出格式。',
    '- 用户信息和联系人记忆是关系连续性的背景；使用前检查是否未冲突、未过期，并自然放进对用户可见的正文。',
    '- 当前场景和剧情连续性锚点只用于维持地点、动作、情绪、事件和节奏的连续，不替用户说话，也不替用户决定行为。',
    '- 最近互动和最后真实聊天消息决定本轮回应对象；本轮附加上下文只补足资料、记忆和格式，不是新的用户台词。',
    '- 输出格式、JSON 模板、心声/动作/翻译等当前开关拥有最高执行优先级；即使历史里出现过旧格式，也不要模仿或补回。',
    '- 不根据用户自然语言关键词触发、拦截或改写普通聊天内容；只按结构化字段、真实消息类型、明确状态和当前开关执行。',
    isStory
      ? '- 剧情模式优先保持“角色卡 + 世界书 + 当前场景 + 最近互动”的层级，让剧情推进来自既有设定和真实上下文。'
      : ''
  ]);
};
