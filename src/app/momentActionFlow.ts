import type { MomentInteractionSource } from '../types/settings';
import { extractStrictJsonObject } from '../utils/chatHelpers';
import { normalizeGeneratedStrictNonSystemEventText } from '../utils/generatedVisibleText.ts';
import { loadPersonaPromptSections } from '../utils/promptLoader';
import {
  buildMomentPostQualityLines,
  buildSocialInteractionQualityLines
} from '../utils/prompt/socialInteractionQualityPrompt.ts';

const MOMENT_EVENT_DELAY_MS = 200;
export const MAX_REMIND_WHO_POST_GENERATIONS_PER_BATCH = 3;

const buildMomentUserSection = async (user: any, contact?: any): Promise<string> => {
  const { buildUserInfoSection } = await loadPersonaPromptSections();
  return buildUserInfoSection({ contact: contact || {} as any, masks: [], user });
};

const normalizeMomentGeneratedText = (
  value: unknown,
  options: { joinWith?: string; collapseWhitespace?: boolean } = {}
): string => {
  return normalizeGeneratedStrictNonSystemEventText(value, options);
};

const readVisibleScalarText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return Number.isFinite(value) ? String(value).trim() : '';
  if (typeof value === 'bigint') return String(value).trim();
  return '';
};

const readContactDisplayName = (contact: any): string => (
  readVisibleScalarText(contact?.remark) || readVisibleScalarText(contact?.name)
);

const buildContactInteractionNames = (contacts: any[], excludedName?: string): string[] => {
  return (contacts || [])
    .map(readContactDisplayName)
    .filter(Boolean)
    .filter((name: string) => !excludedName || name !== excludedName);
};

const resolveInteractionMinCount = (allowedNames?: string[]): number => (
  allowedNames && allowedNames.length > 0 ? Math.min(2, allowedNames.length) : 2
);

const buildManualMomentInstruction = (
  authorName: string,
  roleSection: string,
  userSection: string,
  source: MomentInteractionSource,
  contactNames?: string[]
): string => {
  const postQualityLines = buildMomentPostQualityLines({ linePrefix: '- ' }).join('\n');
  const interactionQualityLines = buildSocialInteractionQualityLines({ linePrefix: '- ' }).join('\n');
  const base = `你扮演「${authorName}」。${roleSection}${userSection}
朋友圈内容不必每条都与用户直接相关，但你可以参考用户信息来决定互动风格和话题方向。

【朋友圈质量规则】
${postQualityLines}

请严格按该角色人设创作一条“可直接发布”的高质量朋友圈：
1) 内容必须具体、有画面、有细节，情绪真实，避免空话套话；
2) 文风与角色身份、经历、语气保持一致；
3) 禁止输出解释、前言、后记、创作说明；
4) 如果文案明确涉及地点，再补充 location；不涉及则留空字符串；
5) 如果需要生成点赞和评论，还要遵守以下互动质量：
${interactionQualityLines}`;

  if (source === 'none') {
    return base + `\n6) 不需要生成点赞和评论；\n7) 只输出一个 JSON 对象，不要输出任何额外文本：{"author":"contact","content":"最终文案","location":"可选地点"}`;
  }

  if (source === 'contacts' && contactNames && contactNames.length > 0) {
    return base + `\n6) 必须同时生成点赞与评论，点赞/评论用户名必须从以下联系人昵称列表中选取：[${contactNames.join('、')}]；\n7) 只输出一个 JSON 对象，不要输出任何额外文本：{"author":"contact","content":"最终文案","location":"可选地点","likes":["昵称1","昵称2"],"comments":[{"user":"昵称","text":"评论内容","replyTo":"被回复人(可选)"}]}`;
  }

  return base + `\n6) 必须同时生成点赞与评论，且点赞/评论用户名必须是虚构昵称，不能引用通讯录或任何已知联系人；\n7) 只输出一个 JSON 对象，不要输出任何额外文本：{"author":"contact","content":"最终文案","location":"可选地点","likes":["小满","阿青"],"comments":[{"user":"柚子","text":"评论内容","replyTo":"被回复人(可选)"}]}`;
};

const buildCommentReplyInstruction = (
  responderName: string,
  roleSection: string,
  userSection: string,
  momentAuthor: string,
  replyTo?: string
): string => {
  const replyTarget = readVisibleScalarText(replyTo);
  const replyContext = replyTarget ? `这是用户对你评论的回复，原评论对象：${replyTarget}。` : '';
  const interactionQualityLines = buildSocialInteractionQualityLines({ linePrefix: '- ' }).join('\n');
  const cleanMomentAuthor = readVisibleScalarText(momentAuthor);
  const authorContext = cleanMomentAuthor ? `\n当前互动的朋友圈发布者是「${cleanMomentAuthor}」。` : '';
  return `你扮演「${responderName}」。${roleSection}${userSection}${authorContext}${replyContext}你正在与用户进行朋友圈评论互动。\n【评论互动质量】\n${interactionQualityLines}\n请仅基于用户最新评论与帖子主题，给出一句简短自然回复（15字以内）。只输出 JSON，不要解释，结构固定为 {"text":"回复正文"}。`;
};

const resolveMomentReplyText = (raw: unknown): string => {
  const source = readVisibleScalarText(raw);
  const parsed = extractStrictJsonObject(source);
  const normalizedText = normalizeMomentGeneratedText(parsed?.text, { collapseWhitespace: true });
  return normalizedText;
};

const buildMomentInteractionUserPrompt = (input: {
  author?: unknown;
  content?: unknown;
  location?: unknown;
  latestComment?: unknown;
  imageCount?: number;
  imageDescription?: unknown;
}): string => {
  const author = readVisibleScalarText(input.author);
  const content = readVisibleScalarText(input.content);
  const location = readVisibleScalarText(input.location);
  const latestComment = readVisibleScalarText(input.latestComment);
  const imageDescription = readVisibleScalarText(input.imageDescription);
  const lines = [
    author ? `【发帖人】${author}` : '',
    content ? `【帖子主题】${content}` : '',
    location ? `【帖子定位】${location}` : '',
    latestComment ? `【用户最新评论】${latestComment}` : '',
    Number(input.imageCount || 0) > 0 ? `【图片数量】${Number(input.imageCount)}` : '',
    imageDescription ? `【图片描述】\n${imageDescription}` : ''
  ].filter(Boolean);
  return lines.join('\n');
};

export const runManualGenerateMoment = async (params: any): Promise<void> => {
  const author = params.pickRandomMomentAuthor(params.contacts);
  if (!author) return;
  const { buildRoleProfileSection } = await loadPersonaPromptSections();
  const authorName = readContactDisplayName(author);
  const roleSection = buildRoleProfileSection(author);
  const userSection = await buildMomentUserSection(params.user, author);
  const runtimeUserPrompt = params.buildRuntimePromptWithMemory(author, 10);
  const interactionSource: MomentInteractionSource = params.aiSettings.momentInteractionSource || 'random';
  let contactNames: string[] | undefined;
  if (interactionSource === 'contacts') {
    contactNames = buildContactInteractionNames(params.contacts || []);
  }
  const text = await params.getChatReply(
    [{ role: 'user', text: interactionSource === 'none' ? '请直接生成一条高质量朋友圈成稿' : '请直接生成一条高质量朋友圈成稿（含虚构点赞和评论）' }],
    buildManualMomentInstruction(authorName, roleSection, userSection, interactionSource, contactNames),
    params.aiSettings,
    runtimeUserPrompt
  );
  const parsedJson = extractStrictJsonObject(text);
  const content = normalizeMomentGeneratedText(parsedJson?.content, { joinWith: '\n' });
  if (!content) return;
  const allowedInteractionNames = interactionSource === 'contacts' ? contactNames : undefined;
  const interactionMinCount = resolveInteractionMinCount(allowedInteractionNames);
  const likes = interactionSource === 'none' ? [] : params.normalizeAiLikeNames(parsedJson?.likes, allowedInteractionNames, { minCount: interactionMinCount });
  const comments = interactionSource === 'none' ? [] : params.normalizeAiComments(parsedJson?.comments, 'manual-comment', allowedInteractionNames, { minCount: interactionMinCount });
  const newMoment = params.buildManualMoment(
    author,
    content,
    normalizeGeneratedStrictNonSystemEventText(parsedJson?.location, { collapseWhitespace: true }),
    likes,
    comments
  );
  params.setMoments((prev: any[]) => [newMoment, ...prev]);
};

export const runMomentCommentCreate = (params: any, momentId: string, commentText: string, replyTo?: { user?: string }): void => {
  const resolved = params.resolveMomentResponderContact(params.moments, params.contacts, momentId, replyTo?.user);
  if (!resolved) return;
  const { targetMoment, responderContact } = resolved;
  setTimeout(async () => {
    try {
      const { buildRoleProfileSection } = await loadPersonaPromptSections();
      const responderName = readContactDisplayName(responderContact);
      const momentAuthor = readVisibleScalarText(targetMoment.author)
        || (targetMoment.authorId === 'me' ? readVisibleScalarText(params.user?.name) : responderName)
        || '';
      const roleSection = buildRoleProfileSection(responderContact);
      const userSection = await buildMomentUserSection(params.user, responderContact);
      const systemInstruction = buildCommentReplyInstruction(
        responderName,
        roleSection,
        userSection,
        momentAuthor,
        replyTo?.user
      );
      const runtimeUserPrompt = params.buildRuntimePromptWithMemory(responderContact, 8);
      const text = await params.getChatReply(
        [{ role: 'user', text: buildMomentInteractionUserPrompt({
          author: momentAuthor,
          content: targetMoment.content,
          location: targetMoment.location,
          latestComment: commentText
        }) }],
        systemInstruction,
        params.aiSettings,
        runtimeUserPrompt
      );
      const replyText = resolveMomentReplyText(text);
      if (!replyText) return;
      const replyTarget = readVisibleScalarText(replyTo?.user) || readVisibleScalarText(params.user?.name) || undefined;
      params.setMoments((prev: any[]) => prev.map((moment) => (
        moment.id !== momentId
          ? moment
          : { ...moment, comments: [...moment.comments, { id: `${Date.now()}-${responderContact.id}`, user: responderName, text: replyText, replyTo: replyTarget }] }
      )));
    } catch (error) {
      console.error('Moment comment reply failed:', error);
    }
  }, MOMENT_EVENT_DELAY_MS);
};

export const runRemindWhoPost = async (params: any, contactIds: string[]): Promise<void> => {
  const interactionSource: MomentInteractionSource = params.aiSettings?.momentInteractionSource || 'random';
  const { buildRoleProfileSection } = await loadPersonaPromptSections();
  const selectedContactIds = Array.from(new Set((contactIds || []).filter(Boolean))).slice(0, MAX_REMIND_WHO_POST_GENERATIONS_PER_BATCH);
  let contactNames: string[] | undefined;
  if (interactionSource === 'contacts') {
    contactNames = buildContactInteractionNames(params.contacts || []);
  }
  for (const contactId of selectedContactIds) {
    const author = (params.contacts || []).find((c: any) => c.id === contactId);
    if (!author) continue;
    const authorName = readContactDisplayName(author);
    const roleSection = buildRoleProfileSection(author);
    const userSection = await buildMomentUserSection(params.user, author);
    const runtimeUserPrompt = params.buildRuntimePromptWithMemory(author, 10);
    try {
      const text = await params.getChatReply(
        [{ role: 'user', text: interactionSource === 'none' ? '请直接生成一条高质量朋友圈成稿' : '请直接生成一条高质量朋友圈成稿（含虚构点赞和评论）' }],
        buildManualMomentInstruction(authorName, roleSection, userSection, interactionSource, contactNames),
        params.aiSettings,
        runtimeUserPrompt
      );
      const parsedJson = extractStrictJsonObject(text);
      const content = normalizeMomentGeneratedText(parsedJson?.content, { joinWith: '\n' });
      if (!content) return;
      const allowedInteractionNames = interactionSource === 'contacts' ? contactNames : undefined;
      const interactionMinCount = resolveInteractionMinCount(allowedInteractionNames);
      const likes = interactionSource === 'none' ? [] : params.normalizeAiLikeNames(parsedJson?.likes, allowedInteractionNames, { minCount: interactionMinCount });
      const comments = interactionSource === 'none' ? [] : params.normalizeAiComments(parsedJson?.comments, 'remind-comment', allowedInteractionNames, { minCount: interactionMinCount });
      const newMoment = params.buildManualMoment(
        author,
        content,
        normalizeGeneratedStrictNonSystemEventText(parsedJson?.location, { collapseWhitespace: true }),
        likes,
        comments
      );
      params.setMoments((prev: any[]) => [newMoment, ...prev]);
    } catch (error) {
      console.error(`Failed to generate moment for contact ${authorName}:`, error);
    }
  }
};

export const runPublishMoment = (params: any, text: string, imgs: string[], loc: string, visibility: string, imageDescriptions: string[] = [], identityContactId?: string): void => {
  let newMoment: any;
  let identityContact: any = null;
  if (identityContactId) {
    identityContact = (params.contacts || []).find((c: any) => c.id === identityContactId);
    if (identityContact) {
      newMoment = params.createContactPublishedMoment(identityContact, text, imgs, loc, imageDescriptions);
    } else {
      newMoment = params.createUserPublishedMoment(params.user, text, imgs, loc, imageDescriptions);
    }
  } else {
    newMoment = params.createUserPublishedMoment(params.user, text, imgs, loc, imageDescriptions);
  }
  params.setMoments([newMoment, ...params.moments]);
  const interactionSource: MomentInteractionSource = params.aiSettings?.momentInteractionSource || 'random';
  const selectedContactIds = ((window as any).selectedContacts || []) as string[];
  const visibleAudience = params.selectVisibleAudience(params.contacts, visibility, selectedContactIds)
    .filter((c: any) => !identityContactId || c.id !== identityContactId);
  if (interactionSource !== 'none' && visibleAudience.length > 0) {
    setTimeout(async () => {
      try {
        const { buildRoleProfileSection } = await loadPersonaPromptSections();
        const audienceRuntimeBlocks = visibleAudience.slice(0, 3)
          .map((contact: any) => params.buildRuntimePromptWithMemory(contact, 4))
          .filter(Boolean);
        const runtimeUserPrompt = audienceRuntimeBlocks.join('\n\n');
        const descSummary = Array.isArray(imageDescriptions)
          ? imageDescriptions.map((item: string, idx: number) => {
              const textValue = readVisibleScalarText(item);
              return textValue ? `${idx + 1}. ${textValue}` : '';
            }).filter(Boolean).join('\n')
          : '';

        let systemPrompt: string;
        const interactionQualityLines = buildSocialInteractionQualityLines({ linePrefix: '- ' }).join('\n');
        if (identityContact) {
          const identityName = readContactDisplayName(identityContact);
          const identityRoleSection = buildRoleProfileSection(identityContact);
          let nameHint = '';
          if (interactionSource === 'contacts') {
            const names = buildContactInteractionNames(params.contacts || [], identityName);
            if (names.length > 0) {
              nameHint = `\n6) 点赞和评论的昵称必须从以下列表中选取：[${names.join('、')}]；`;
            }
          }
          systemPrompt = `你是“朋友圈互动生成器”。\n当前朋友圈的发布者是联系人「${identityName}」，${identityRoleSection}\n该联系人的朋友们看到这条朋友圈后会产生互动。\n【评论互动质量】\n${interactionQualityLines}\n请基于朋友圈内容生成点赞与评论互动，要求：\n1) likes 生成 2-5 个昵称，风格自然不雷同；\n2) comments 生成 2-5 条，结构为 {"user":"昵称","text":"评论内容","replyTo":"被回复人(可选)"}；\n3) 评论口语化、自然、15字以内；\n4) 若是回复评论，使用 replyTo 字段，不要在 text 写“回复某某：”；\n5) 只输出 JSON：{"likes":["昵称1"],"comments":[{"user":"昵称","text":"评论","replyTo":"可选"}]}${nameHint}`;
        } else {
          let contactNameHint = '';
          if (interactionSource === 'contacts') {
            const names = buildContactInteractionNames(params.contacts || []);
            if (names.length > 0) {
              contactNameHint = `\n6) 点赞和评论的昵称必须从以下联系人列表中选取：[${names.join('、')}]；`;
            }
          }
          systemPrompt = `你是“朋友圈互动生成器”。\n【评论互动质量】\n${interactionQualityLines}\n请基于朋友圈内容生成点赞与评论互动，要求：\n1) likes 生成 2-5 个昵称，风格自然不雷同；\n2) comments 生成 2-5 条，结构为 {"user":"昵称","text":"评论内容","replyTo":"被回复人(可选)"}；\n3) 评论口语化、自然、15字以内；\n4) 若是回复评论，使用 replyTo 字段，不要在 text 写“回复某某：”；\n5) 只输出 JSON：{"likes":["昵称1"],"comments":[{"user":"昵称","text":"评论","replyTo":"可选"}]}${contactNameHint}`;
        }

        const textReply = await params.getChatReply(
          [{ role: 'user', text: buildMomentInteractionUserPrompt({
            content: newMoment.content,
            location: newMoment.location,
            imageCount: newMoment.images?.length,
            imageDescription: descSummary
          }) }],
          systemPrompt,
          params.aiSettings,
          runtimeUserPrompt
        );
        const parsed = extractStrictJsonObject(readVisibleScalarText(textReply));
        const allowedInteractionNames = interactionSource === 'contacts'
          ? buildContactInteractionNames(params.contacts || [], identityContact ? readContactDisplayName(identityContact) : undefined)
          : undefined;
        const interactionMinCount = resolveInteractionMinCount(allowedInteractionNames);
        const events = params.buildMomentInteractionEvents(
          newMoment.id,
          params.normalizeAiLikeNames(parsed?.likes, allowedInteractionNames, { minCount: interactionMinCount }),
          params.normalizeAiComments(parsed?.comments, 'post-comment', allowedInteractionNames, { minCount: interactionMinCount })
        );
        events.forEach((event: any) => {
          setTimeout(() => {
            if (event.type === 'like') {
              const { momentId, name } = event.payload;
              params.setMoments((prev: any[]) => prev.map(moment => moment.id !== momentId || moment.likes.includes(name) ? moment : { ...moment, likes: [...moment.likes, name] }));
              return;
            }
            const { momentId, comment } = event.payload;
            params.setMoments((prev: any[]) => prev.map(moment => moment.id === momentId ? { ...moment, comments: [...moment.comments, comment] } : moment));
          }, event.delay);
        });
      } catch (error) {
        console.error('Moment publish interaction failed:', error);
      }
    }, MOMENT_EVENT_DELAY_MS);
  }
  (window as any).selectedContacts = [];
  (window as any).selectedIdentityId = undefined;
  params.goBackSubView();
};
