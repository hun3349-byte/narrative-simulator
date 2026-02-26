import type {
  ActiveContext,
  WorldBible,
  EpisodeLog,
  Episode,
  Feedback,
  MonologueTone,
  BreadcrumbWarning,
  EpisodeDirection,
} from '@/lib/types';
import { trackBreadcrumbs } from './breadcrumb-tracker';

// ============================================
// 동적 가지치기 (Dynamic Pruning) 시스템
// ============================================

/**
 * 장면 유형 - 장면의 성격에 따라 필요한 컨텍스트가 다름
 */
export type SceneType =
  | 'battle'      // 전투/액션 - 능력/무기/지형 중요
  | 'romance'     // 로맨스 - 캐릭터 관계/감정 중요
  | 'mystery'     // 미스터리 - 떡밥/복선 중요
  | 'political'   // 정치/음모 - 세력 관계 중요
  | 'daily'       // 일상/휴식 - 캐릭터 성격 중요
  | 'growth'      // 성장/수련 - 능력 체계 중요
  | 'exploration' // 탐험/여행 - 세계관 지리 중요
  | 'mixed';      // 혼합/불명확

/**
 * 에피소드 방향이나 최근 로그에서 장면 유형을 감지합니다.
 */
export function detectSceneType(
  episodeDirection?: EpisodeDirection | string,
  recentLogs?: EpisodeLog[]
): SceneType {
  // 1. 에피소드 방향에서 감지
  if (episodeDirection) {
    // 여러 필드 조합으로 방향 파악
    let direction = '';
    if (typeof episodeDirection === 'string') {
      direction = episodeDirection;
    } else {
      // EpisodeDirection 객체에서 텍스트 추출
      const parts: string[] = [];
      if (episodeDirection.primaryTone) parts.push(episodeDirection.primaryTone);
      if (episodeDirection.emotionArc) parts.push(episodeDirection.emotionArc);
      if (episodeDirection.freeDirectives) parts.push(...episodeDirection.freeDirectives);
      if (episodeDirection.forcedScenes) {
        for (const scene of episodeDirection.forcedScenes) {
          if (scene.description) parts.push(scene.description);
        }
      }
      direction = parts.join(' ');
    }

    const directionLower = direction.toLowerCase();

    // 키워드 기반 감지
    if (/전투|싸움|격투|대결|공격|방어|무기|검|도/.test(directionLower)) return 'battle';
    if (/로맨스|사랑|연애|고백|키스|데이트|마음/.test(directionLower)) return 'romance';
    if (/미스터리|비밀|진실|떡밥|복선|의문|수수께끼/.test(directionLower)) return 'mystery';
    if (/정치|음모|세력|파벌|동맹|배신|권력/.test(directionLower)) return 'political';
    if (/일상|휴식|식사|수면|대화|잡담/.test(directionLower)) return 'daily';
    if (/성장|수련|훈련|각성|능력|깨달음/.test(directionLower)) return 'growth';
    if (/탐험|여행|이동|지역|장소|던전/.test(directionLower)) return 'exploration';
  }

  // 2. 최근 로그에서 패턴 감지
  if (recentLogs && recentLogs.length > 0) {
    const lastLog = recentLogs[recentLogs.length - 1];
    const patterns = lastLog.narrativePatterns || [];
    const summary = lastLog.summary || '';

    // 패턴에서 감지
    for (const pattern of patterns) {
      if (/전투|싸움/.test(pattern)) return 'battle';
      if (/로맨스|감정/.test(pattern)) return 'romance';
    }

    // 요약에서 감지
    if (/전투|대결|싸움/.test(summary)) return 'battle';
    if (/감정|관계|사랑/.test(summary)) return 'romance';
    if (/비밀|발견|진실/.test(summary)) return 'mystery';
  }

  return 'mixed';
}

/**
 * 장면 유형에 따라 World Bible에서 관련 없는 정보를 가지치기합니다.
 */
export function pruneWorldBible(
  worldBible: WorldBible,
  sceneType: SceneType,
  relevantCharacters?: string[]
): WorldBible {
  // 캐릭터 가지치기 - 관련 캐릭터만 유지
  let prunedCharacters = worldBible.characters;

  if (relevantCharacters && relevantCharacters.length > 0) {
    prunedCharacters = {};
    for (const name of relevantCharacters) {
      if (worldBible.characters[name]) {
        prunedCharacters[name] = worldBible.characters[name];
      }
    }

    // 주인공은 항상 포함
    for (const [name, char] of Object.entries(worldBible.characters)) {
      if (char.core?.includes('주인공') || name.includes('주인공')) {
        prunedCharacters[name] = char;
      }
    }
  }

  // 규칙 가지치기 - 장면 유형에 따라
  let prunedRules = { ...worldBible.rules };

  switch (sceneType) {
    case 'battle':
    case 'growth':
      // 전투/성장 - 힘의 체계 유지, 사회 구조 축소
      prunedRules.socialStructure = prunedRules.socialStructure?.split('.')[0] || '';
      break;

    case 'romance':
    case 'daily':
      // 로맨스/일상 - 힘의 체계 축소
      prunedRules.powerSystem = prunedRules.powerSystem?.split('.')[0] || '';
      prunedRules.magicTypes = undefined;
      break;

    case 'political':
      // 정치 - 사회 구조 중요, 능력 체계 축소
      prunedRules.powerSystem = prunedRules.powerSystem?.split('.')[0] || '';
      break;

    case 'mystery':
      // 미스터리 - 모든 규칙 유지 (떡밥과 연관 가능)
      break;

    case 'exploration':
      // 탐험 - 지리/환경 중요 (있다면)
      break;
  }

  // 세력 가지치기 - 장면 유형에 따라
  let prunedFactions = worldBible.factions;

  if (sceneType === 'romance' || sceneType === 'daily') {
    // 로맨스/일상에서는 세력 정보 최소화
    const factionLines = prunedFactions.split('\n').slice(0, 2);
    prunedFactions = factionLines.join('\n') + (factionLines.length < prunedFactions.split('\n').length ? '\n...' : '');
  }

  return {
    ...worldBible,
    characters: prunedCharacters,
    rules: prunedRules,
    factions: prunedFactions,
  };
}

/**
 * 최근 로그에서 관련 캐릭터를 추출합니다.
 */
function extractRelevantCharacters(
  recentLogs: EpisodeLog[],
  episodeDirection?: EpisodeDirection
): string[] {
  const characters = new Set<string>();

  // 최근 로그에서 등장 캐릭터 추출
  for (const log of recentLogs) {
    for (const scene of log.scenes || []) {
      for (const char of scene.characters || []) {
        characters.add(char);
      }
    }
    // 캐릭터 변화에서도 추출
    for (const name of Object.keys(log.characterChanges || {})) {
      characters.add(name);
    }
  }

  // 에피소드 방향에서 지정된 캐릭터 추출
  if (episodeDirection && typeof episodeDirection !== 'string') {
    for (const directive of episodeDirection.characterDirectives || []) {
      characters.add(directive.characterName);
    }
    // ForcedScene의 description에서 캐릭터 이름 추출 (대략적)
    // 이미 characterDirectives에서 대부분 추출되므로 생략 가능
  }

  return Array.from(characters);
}

/**
 * 동적 가지치기가 적용된 Active Context를 생성합니다.
 * 장면 유형에 따라 불필요한 컨텍스트를 제거하여 토큰을 절약합니다.
 */
export function buildPrunedActiveContext(
  params: BuildActiveContextParams & {
    episodeDirection?: EpisodeDirection | string;
  }
): ActiveContext {
  const {
    worldBible,
    episodeLogs,
    episodes,
    feedbackHistory,
    currentEpisodeNumber,
    episodeDirection,
  } = params;

  // 1. 직전 3화 로그 추출
  const recentLogs = getRecentLogs(episodeLogs, currentEpisodeNumber, 3);

  // 2. 장면 유형 감지
  const sceneType = detectSceneType(episodeDirection, recentLogs);
  console.log(`[Dynamic Pruning] Detected scene type: ${sceneType}`);

  // 3. 관련 캐릭터 추출
  const relevantCharacters = extractRelevantCharacters(
    recentLogs,
    typeof episodeDirection !== 'string' ? episodeDirection : undefined
  );

  // 4. World Bible 가지치기
  const prunedWorldBible = pruneWorldBible(worldBible, sceneType, relevantCharacters);

  // 5. 나머지 컨텍스트 조립
  const previousEnding = getPreviousEnding(episodes, currentEpisodeNumber);
  const activeBreadcrumbs = getActiveBreadcrumbs(prunedWorldBible, currentEpisodeNumber);
  const unresolvedTensions = collectUnresolvedTensions(recentLogs);
  const characterStates = getCharacterStates(prunedWorldBible);
  const episodeMeta = calculateEpisodeMeta(currentEpisodeNumber, recentLogs, prunedWorldBible);
  const feedbackGuide = getRecurringFeedback(feedbackHistory);

  // 토큰 절감 로그
  const originalChars = Object.keys(worldBible.characters || {}).length;
  const prunedChars = Object.keys(prunedWorldBible.characters || {}).length;
  console.log(`[Dynamic Pruning] Characters: ${originalChars} → ${prunedChars} (${Math.round((1 - prunedChars/originalChars) * 100) || 0}% reduction)`);

  return {
    worldBible: prunedWorldBible,
    recentLogs,
    previousEnding,
    activeBreadcrumbs,
    unresolvedTensions,
    characterStates,
    episodeMeta,
    feedbackGuide,
  };
}

// ============================================
// 기존 함수들
// ============================================

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
