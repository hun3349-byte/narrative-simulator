import type {
  ActiveContext,
  WorldBible,
  EpisodeLog,
  Episode,
  Feedback,
  MonologueTone,
  BreadcrumbWarning,
} from '@/lib/types';
import { trackBreadcrumbs } from './breadcrumb-tracker';

interface BuildActiveContextParams {
  worldBible: WorldBible;
  episodeLogs: EpisodeLog[];
  episodes: Episode[];
  feedbackHistory: Feedback[];
  currentEpisodeNumber: number;
}

/**
 * 집필 시 프롬프트에 주입할 Active Context를 조립합니다.
 * 총 약 4,000토큰 목표
 */
export function buildActiveContext(params: BuildActiveContextParams): ActiveContext {
  const {
    worldBible,
    episodeLogs,
    episodes,
    feedbackHistory,
    currentEpisodeNumber,
  } = params;

  // 1. 직전 3화 로그 추출
  const recentLogs = getRecentLogs(episodeLogs, currentEpisodeNumber, 3);

  // 2. 직전 화 본문 마지막 500자
  const previousEnding = getPreviousEnding(episodes, currentEpisodeNumber);

  // 3. 활성 떡밥 추출 (revealed 제외)
  const activeBreadcrumbs = getActiveBreadcrumbs(worldBible, currentEpisodeNumber);

  // 4. 미해결 긴장 수집 (직전 3화에서)
  const unresolvedTensions = collectUnresolvedTensions(recentLogs);

  // 5. 캐릭터 현재 상태
  const characterStates = getCharacterStates(worldBible);

  // 6. 메타 지시 계산
  const episodeMeta = calculateEpisodeMeta(
    currentEpisodeNumber,
    recentLogs,
    worldBible
  );

  // 7. 환님 피드백 가이드 (누적형만)
  const feedbackGuide = getRecurringFeedback(feedbackHistory);

  return {
    worldBible,
    recentLogs,
    previousEnding,
    activeBreadcrumbs,
    unresolvedTensions,
    characterStates,
    episodeMeta,
    feedbackGuide,
  };
}

/**
 * 직전 N화의 로그를 가져옵니다.
 */
function getRecentLogs(
  episodeLogs: EpisodeLog[],
  currentEpisodeNumber: number,
  count: number
): EpisodeLog[] {
  return episodeLogs
    .filter(log => log.episodeNumber < currentEpisodeNumber)
    .sort((a, b) => b.episodeNumber - a.episodeNumber)
    .slice(0, count)
    .reverse();
}

/**
 * 직전 화 본문의 마지막 500자를 가져옵니다.
 */
function getPreviousEnding(
  episodes: Episode[],
  currentEpisodeNumber: number
): string {
  const previousEpisode = episodes.find(
    ep => ep.number === currentEpisodeNumber - 1
  );

  if (!previousEpisode) return '';

  const content = previousEpisode.editedContent || previousEpisode.content;
  if (content.length <= 500) return content;

  return '...' + content.slice(-497);
}

/**
 * 활성 떡밥을 추출합니다 (revealed 제외, 경고 포함).
 */
function getActiveBreadcrumbs(
  worldBible: WorldBible,
  currentEpisodeNumber: number
): ActiveContext['activeBreadcrumbs'] {
  const breadcrumbs = worldBible.breadcrumbs || {};
  const warnings = trackBreadcrumbs(breadcrumbs, currentEpisodeNumber);
  const warningMap = new Map(warnings.map(w => [w.breadcrumbName, w]));

  return Object.entries(breadcrumbs)
    .filter(([_, bc]) => bc.status !== 'revealed')
    .map(([name, bc]) => {
      const warning = warningMap.get(name);
      return {
        name,
        status: bc.status as 'hidden' | 'hinted' | 'suspected',
        lastMentioned: bc.lastMentionedEp,
        nextAction: warning?.suggestedAction,
      };
    });
}

/**
 * 직전 로그들에서 미해결 긴장을 수집합니다.
 */
function collectUnresolvedTensions(recentLogs: EpisodeLog[]): string[] {
  const tensions = new Set<string>();

  for (const log of recentLogs) {
    for (const tension of log.unresolvedTensions || []) {
      tensions.add(tension);
    }
  }

  return Array.from(tensions);
}

/**
 * 캐릭터 현재 상태를 가져옵니다.
 */
function getCharacterStates(worldBible: WorldBible): Record<string, string> {
  const states: Record<string, string> = {};

  for (const [name, character] of Object.entries(worldBible.characters || {})) {
    states[name] = character.currentState || '상태 미정';
  }

  return states;
}

/**
 * 이번 화의 메타 지시를 계산합니다.
 */
function calculateEpisodeMeta(
  currentEpisodeNumber: number,
  recentLogs: EpisodeLog[],
  worldBible: WorldBible
): ActiveContext['episodeMeta'] {
  const lastLog = recentLogs[recentLogs.length - 1];

  // 미니아크 위치 (1~5)
  const miniArcPosition = ((currentEpisodeNumber - 1) % 5) + 1;

  // 빌드업 페이즈
  let buildupPhase: 'early' | 'middle' | 'late';
  if (miniArcPosition <= 2) buildupPhase = 'early';
  else if (miniArcPosition <= 4) buildupPhase = 'middle';
  else buildupPhase = 'late';

  // 직전 화의 클리프행어/톤 (반복 금지)
  const forbiddenCliffhanger = lastLog?.cliffhangerType;
  const forbiddenTone = lastLog?.dominantMonologueTone;

  // 추천 클리프행어 (직전과 다른 것)
  const cliffhangerTypes = [
    'crisis', 'revelation', 'choice', 'reversal',
    'awakening', 'past_connection', 'character_entrance'
  ];
  const suggestedCliffhanger = cliffhangerTypes.find(t => t !== forbiddenCliffhanger) || 'crisis';

  // 추천 톤 (직전과 다른 것)
  const tones: MonologueTone[] = ['자조', '관찰', '냉정', '감각', '메타'];
  const suggestedTone = tones.find(t => t !== forbiddenTone) || '관찰';

  // 떡밥 관련 지시 (경고가 있는 떡밥)
  const breadcrumbInstructions: string[] = [];
  const warnings = trackBreadcrumbs(worldBible.breadcrumbs || {}, currentEpisodeNumber);
  for (const warning of warnings) {
    breadcrumbInstructions.push(warning.suggestedAction);
  }

  return {
    episodeNumber: currentEpisodeNumber,
    miniArcPosition,
    buildupPhase,
    forbiddenCliffhanger,
    forbiddenTone,
    suggestedCliffhanger,
    suggestedTone,
    breadcrumbInstructions: breadcrumbInstructions.length > 0 ? breadcrumbInstructions : undefined,
  };
}

/**
 * 누적형 피드백만 추출합니다.
 */
function getRecurringFeedback(feedbackHistory: Feedback[]): string[] {
  return feedbackHistory
    .filter(fb => fb.isRecurring)
    .map(fb => `[${fb.type}] ${fb.content}`);
}

/**
 * Active Context를 프롬프트 문자열로 변환합니다.
 */
export function activeContextToPrompt(context: ActiveContext): string {
  const sections: string[] = [];

  // 1. World Bible 섹션
  sections.push(`## 세계관 성경 (World Bible)

### 세계 요약
${context.worldBible.worldSummary}

### 핵심 규칙
- 힘의 체계: ${context.worldBible.rules.powerSystem}
${context.worldBible.rules.magicTypes ? `- 능력 종류: ${context.worldBible.rules.magicTypes}` : ''}
- 사회 구조: ${context.worldBible.rules.socialStructure}
- 핵심 역사: ${context.worldBible.rules.keyHistory}
${context.worldBible.rules.contradiction ? `- 세계의 모순: ${context.worldBible.rules.contradiction}` : ''}

### 세력 관계
${context.worldBible.factions}
`);

  // 2. 캐릭터 현재 상태
  sections.push(`### 캐릭터 현재 상태
${Object.entries(context.characterStates)
  .map(([name, state]) => `- ${name}: ${state}`)
  .join('\n')}
`);

  // 3. 직전 3화 로그
  if (context.recentLogs.length > 0) {
    sections.push(`## 직전 화 요약
${context.recentLogs.map(log =>
  `### ${log.episodeNumber}화
- 요약: ${log.summary}
- 클리프행어: ${log.cliffhangerContent}
- 미해결 긴장: ${log.unresolvedTensions.join(', ') || '없음'}`
).join('\n\n')}
`);
  }

  // 4. 직전 화 엔딩
  if (context.previousEnding) {
    sections.push(`## 직전 화 마지막 장면
${context.previousEnding}
`);
  }

  // 5. 활성 떡밥
  if (context.activeBreadcrumbs.length > 0) {
    sections.push(`## 활성 떡밥
${context.activeBreadcrumbs.map(bc => {
  let line = `- ${bc.name}: ${bc.status} (마지막 언급: ${bc.lastMentioned}화)`;
  if (bc.nextAction) {
    line += ` → **${bc.nextAction}**`;
  }
  return line;
}).join('\n')}
`);
  }

  // 6. 미해결 긴장
  if (context.unresolvedTensions.length > 0) {
    sections.push(`## 미해결 긴장
${context.unresolvedTensions.map(t => `- ${t}`).join('\n')}
`);
  }

  // 7. 메타 지시
  sections.push(`## 이번 화 메타 지시
- ${context.episodeMeta.episodeNumber}화 (5화 미니아크 중 ${context.episodeMeta.miniArcPosition}번째)
- 빌드업 페이즈: ${context.episodeMeta.buildupPhase}
${context.episodeMeta.forbiddenCliffhanger ? `- 금지 클리프행어: ${context.episodeMeta.forbiddenCliffhanger} (직전 화에 사용)` : ''}
${context.episodeMeta.forbiddenTone ? `- 금지 독백 톤: ${context.episodeMeta.forbiddenTone} (직전 화에 사용)` : ''}
- 추천 클리프행어: ${context.episodeMeta.suggestedCliffhanger}
- 추천 독백 톤: ${context.episodeMeta.suggestedTone}
${context.episodeMeta.breadcrumbInstructions?.length ? `
### 떡밥 지시
${context.episodeMeta.breadcrumbInstructions.map(i => `- ${i}`).join('\n')}` : ''}
`);

  // 8. 환님 피드백
  if (context.feedbackGuide.length > 0) {
    sections.push(`## 환님 피드백 (누적 - 반드시 반영)
${context.feedbackGuide.join('\n')}
`);
  }

  return sections.join('\n');
}

/**
 * World Bible의 캐릭터 상태를 업데이트합니다.
 */
export function updateCharacterState(
  worldBible: WorldBible,
  characterName: string,
  newState: string
): WorldBible {
  if (!worldBible.characters[characterName]) {
    return worldBible;
  }

  return {
    ...worldBible,
    characters: {
      ...worldBible.characters,
      [characterName]: {
        ...worldBible.characters[characterName],
        currentState: newState,
      },
    },
    lastUpdatedAt: new Date().toISOString(),
  };
}

/**
 * World Bible의 떡밥 상태를 업데이트합니다.
 */
export function updateBreadcrumbStatus(
  worldBible: WorldBible,
  breadcrumbName: string,
  newStatus: 'hidden' | 'hinted' | 'suspected' | 'revealed',
  currentEpisode: number
): WorldBible {
  if (!worldBible.breadcrumbs[breadcrumbName]) {
    return worldBible;
  }

  return {
    ...worldBible,
    breadcrumbs: {
      ...worldBible.breadcrumbs,
      [breadcrumbName]: {
        ...worldBible.breadcrumbs[breadcrumbName],
        status: newStatus,
        lastMentionedEp: currentEpisode,
      },
    },
    lastUpdatedAt: new Date().toISOString(),
  };
}
