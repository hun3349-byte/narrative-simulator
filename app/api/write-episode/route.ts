import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, TextBlockParam } from '@anthropic-ai/sdk/resources/messages';
import { AUTHOR_PERSONA_PRESETS } from '@/lib/presets/author-personas';
import { buildAuthorPersonaPrompt, ensureAuthorConfig } from '@/lib/presets/genre-personas';

// Prompt Caching을 위한 시스템 메시지 타입
type CacheControlBlock = {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
};

type CachedSystemMessage = CacheControlBlock[];
import type {
  AuthorConfig,
  Episode,
  Feedback,
  FeedbackType,
  MonologueTone,
  ActiveContext,
  WritingMemory,
  WorldLayer,
  SeedsLayer,
  RegionDetail,
  SensoryPalette,
  NPCSeedInfo,
  EpisodeDirection,
  ForcedScene,
  CharacterDirective,
  BreadcrumbDirective,
  CliffhangerType,
  EpisodeLog,
  WorldBible,
  SimulationDerivedProfile,
} from '@/lib/types';
import { getEpisodeFinalContent } from '@/lib/types';
import { activeContextToPrompt } from '@/lib/utils/active-context';
import { buildWritingMemoryPrompt } from '@/lib/utils/writing-memory';
import {
  TOKEN_BUDGET,
  estimateTokens,
  calculateTokenUsage,
  isOverBudget,
  fitToBudget,
  getNextReductionLevel,
  getReductionMessage,
  getFinalErrorMessage,
  truncateToTokenLimit,
  type ReductionLevel,
  type PromptSections,
} from '@/lib/utils/token-budget';
import {
  selectCharactersForEpisode,
  buildDetailedCharacterPrompt,
  buildSummaryCharacterPrompt,
  normalizeToCharacterDetail,
  worldBibleCharactersToSummary,
  type CharacterDetail,
} from '@/lib/utils/character-selector';

// 세계관 세부 정보를 프롬프트용 문자열로 변환
function buildWorldDetailSection(worldLayer?: WorldLayer): string {
  if (!worldLayer) return '';

  let result = '';

  // 지역 상세 정보
  if (worldLayer.regions && worldLayer.regions.length > 0) {
    result += '\n### 지역별 감각 묘사 가이드\n';
    for (const region of worldLayer.regions) {
      result += `\n**${region.name}** (${region.type}):\n`;
      if (region.atmosphere) {
        result += `- 분위기: ${region.atmosphere}\n`;
      }
      if (region.sensoryDescription) {
        const sensory = region.sensoryDescription;
        if (sensory.sight) result += `- 시각: ${sensory.sight}\n`;
        if (sensory.sound) result += `- 청각: ${sensory.sound}\n`;
        if (sensory.smell) result += `- 후각: ${sensory.smell}\n`;
        if (sensory.temperature) result += `- 촉감/온도: ${sensory.temperature}\n`;
      }
      if (region.hazards) {
        result += `- 위험 요소: ${region.hazards}\n`;
      }
    }
  }

  // 기후 정보
  if (worldLayer.climate) {
    result += '\n### 기후 특성\n';
    result += `- 전반적 기후: ${worldLayer.climate.general}\n`;
    if (worldLayer.climate.seasons) {
      result += `- 계절 변화: ${worldLayer.climate.seasons}\n`;
    }
    if (worldLayer.climate.extremes) {
      result += `- 극단적 날씨: ${worldLayer.climate.extremes}\n`;
    }
  }

  // 환경 정보
  if (worldLayer.environment) {
    const env = worldLayer.environment;
    result += '\n### 환경 특성\n';
    if (env.dayNightCycle) result += `- 낮/밤: ${env.dayNightCycle}\n`;
    if (env.celestialBodies) result += `- 천체: ${env.celestialBodies}\n`;
    if (env.magicalInfluence) result += `- 초자연적 영향: ${env.magicalInfluence}\n`;
  }

  // 감각 팔레트
  if (worldLayer.sensoryPalette) {
    const palette = worldLayer.sensoryPalette;
    result += '\n### 세계관 감각 팔레트 (묘사 시 참고)\n';
    if (palette.colors && palette.colors.length > 0) {
      result += `- 주요 색감: ${palette.colors.join(', ')}\n`;
    }
    if (palette.sounds && palette.sounds.length > 0) {
      result += `- 배경음: ${palette.sounds.join(', ')}\n`;
    }
    if (palette.smells && palette.smells.length > 0) {
      result += `- 냄새: ${palette.smells.join(', ')}\n`;
    }
    if (palette.textures && palette.textures.length > 0) {
      result += `- 질감: ${palette.textures.join(', ')}\n`;
    }
    if (palette.atmosphericKeywords && palette.atmosphericKeywords.length > 0) {
      result += `- 분위기 키워드: ${palette.atmosphericKeywords.join(', ')}\n`;
    }
  }

  if (result) {
    result = '\n=== 세계관 감각 디테일 ===\n' + result + '\n※ 장면 묘사 시 이 감각 정보를 자연스럽게 활용하세요.\n=== 세계관 감각 디테일 끝 ===\n';
  }

  return result;
}

// 캐릭터 세부 정보를 프롬프트용 문자열로 변환
function buildCharacterDetailSection(seedsLayer?: SeedsLayer): string {
  if (!seedsLayer || !seedsLayer.npcs || seedsLayer.npcs.length === 0) return '';

  const majorNPCs = seedsLayer.npcs.filter(npc =>
    npc.importance === 'major' || npc.importance === 'supporting'
  );

  if (majorNPCs.length === 0) return '';

  let result = '\n=== 주요 인물 말투/배경 ===\n';

  for (const npc of majorNPCs) {
    result += `\n**${npc.name}** (${npc.role}):\n`;

    if (npc.speechPattern) {
      result += `- 말투: ${npc.speechPattern}\n`;
    }
    if (npc.backstory) {
      result += `- 배경: ${npc.backstory}\n`;
    }
    if (npc.relationships) {
      result += `- 관계: ${npc.relationships}\n`;
    }
    if (npc.arc) {
      result += `- 서사 아크: ${npc.arc}\n`;
    }
  }

  result += '\n※ 이 인물들의 대사 작성 시 말투와 배경을 반영하세요.\n=== 주요 인물 말투/배경 끝 ===\n';

  return result;
}

// 시뮬레이션 파생 프로필 → 캐릭터 행동 규칙 프롬프트
interface CharacterSimProfile {
  characterName: string;
  profile: SimulationDerivedProfile;
}

function buildCharacterBehaviorRulesSection(profiles?: CharacterSimProfile[]): string {
  if (!profiles || profiles.length === 0) return '';

  let result = '\n=== 캐릭터 행동 규칙 (시뮬레이션 기반 - 절대 준수) ===\n';
  result += '아래 프로필은 시뮬레이션에서 형성된 캐릭터의 진짜 모습입니다.\n';
  result += '이 프로필에 맞지 않는 행동/대사는 절대 쓰지 마세요.\n\n';

  for (const { characterName, profile } of profiles) {
    result += `【${characterName} 프로필】\n`;

    if (profile.personality) {
      result += `성격: ${profile.personality}\n`;
    }

    if (profile.trauma && profile.trauma.length > 0) {
      result += `트라우마: ${profile.trauma.join(', ')}\n`;
    }

    if (profile.behaviorPatterns && profile.behaviorPatterns.length > 0) {
      result += `행동 패턴:\n`;
      for (const pattern of profile.behaviorPatterns) {
        result += `  - ${pattern}\n`;
      }
    }

    if (profile.speechStyle) {
      result += `말투: ${profile.speechStyle}\n`;
    }

    if (profile.relationshipPatterns && profile.relationshipPatterns.length > 0) {
      result += `관계 패턴: ${profile.relationshipPatterns.join(', ')}\n`;
    }

    if (profile.growthLevel) {
      result += `능력 수준: ${profile.growthLevel}\n`;
    }

    if (profile.keyMemories && profile.keyMemories.length > 0) {
      result += `핵심 기억:\n`;
      for (const memory of profile.keyMemories.slice(0, 3)) {
        result += `  - ${memory}\n`;
      }
    }

    if (profile.simulationSummary) {
      result += `\n[${characterName}의 인생 요약]\n${profile.simulationSummary}\n`;
    }

    result += '\n';
  }

  result += `## 행동 검증 규칙

이 캐릭터가 어떻게 반응할지는 위 프로필에서 나와야 합니다.

❌ 장르 클리셰 자동 반응 금지:
- 여자가 위험 → 주인공이 바로 구함 (무협 템플릿)
- 적이 나타남 → 주인공이 차분하게 대응 (먼치킨 템플릿)
- 사부 단서 → 주인공이 진지하게 추적 (성장물 템플릿)

✅ 프로필 기반 반응:
- 사람을 안 믿는 캐릭터 → 여자 비명에 의심부터
- 트라우마 있는 캐릭터 → 시체 보고 과거 회상
- 혼자 해결하는 캐릭터 → 도움 요청을 거부
- 경계심 강한 캐릭터 → 친절한 제안에 경계

※ 캐릭터가 "왜 이렇게 행동하는가"를 프로필로 설명할 수 없으면
  그 행동은 쓰면 안 됩니다.

=== 캐릭터 행동 규칙 끝 ===\n`;

  return result;
}

// 감정 톤 한글 변환
const TONE_LABELS: Record<string, string> = {
  tension: '긴장감',
  relief: '해소/안도',
  excitement: '흥분/고조',
  melancholy: '우울/슬픔',
  warmth: '따뜻함/감동',
  fear: '공포/두려움',
  anger: '분노',
  mystery: '미스터리/의문',
  romance: '로맨스/설렘',
  comedy: '코믹/유머',
  epic: '서사적/웅장함',
  dark: '어둠/암울함',
};

// 페이스 한글 변환
const PACING_LABELS: Record<string, string> = {
  fast: '빠르게 (사건 위주, 짧은 장면)',
  normal: '보통 (균형잡힌 전개)',
  slow: '느리게 (감정/묘사 깊이 파기)',
};

// 클리프행어 유형 한글 변환
const CLIFFHANGER_LABELS: Record<string, string> = {
  crisis: '위기 직전 ("그 순간, 문이 열렸다.")',
  revelation: '비밀 폭로 ("그녀의 이름은 진짜가 아니었다.")',
  choice: '선택 강요 ("죽이거나, 죽거나.")',
  reversal: '예상 뒤집기 ("하지만 그는 웃고 있었다.")',
  awakening: '능력 각성 힌트 ("손끝에서 뭔가가 일렁였다.")',
  past_connection: '과거 연결 ("10년 전, 바로 이 자리였다.")',
  character_entrance: '인물 등장 ("그리고 그가 나타났다.")',
};

// 에피소드 디렉션을 프롬프트용 문자열로 변환
function buildEpisodeDirectionSection(direction?: EpisodeDirection): string {
  if (!direction) return '';

  let result = '\n=== PD 디렉팅 지시 (최우선 적용) ===\n';

  // 감정/분위기
  result += '\n### 감정/분위기\n';
  result += `- 주요 톤: ${TONE_LABELS[direction.primaryTone] || direction.primaryTone}\n`;
  if (direction.secondaryTone) {
    result += `- 보조 톤: ${TONE_LABELS[direction.secondaryTone] || direction.secondaryTone}\n`;
  }
  if (direction.emotionArc) {
    result += `- 감정 흐름: ${direction.emotionArc}\n`;
  }

  // 페이스
  if (direction.pacing) {
    result += '\n### 전개 속도\n';
    result += `- ${PACING_LABELS[direction.pacing]}\n`;
  }

  // 강제 장면
  if (direction.forcedScenes && direction.forcedScenes.length > 0) {
    result += '\n### 반드시 포함할 장면 (필수!)\n';
    for (let i = 0; i < direction.forcedScenes.length; i++) {
      const scene = direction.forcedScenes[i];
      result += `${i + 1}. [${scene.type}] ${scene.description}\n`;
      if (scene.location) result += `   - 장소: ${scene.location}\n`;
      if (scene.timing) {
        const timingLabel = { opening: '오프닝', middle: '중반', climax: '클라이맥스', ending: '엔딩' }[scene.timing];
        result += `   - 위치: ${timingLabel}\n`;
      }
      if (scene.mustIncludeDialogue) {
        result += `   - 포함할 대사: "${scene.mustIncludeDialogue}"\n`;
      }
    }
  }

  // 등장인물 지시
  if (direction.characterDirectives && direction.characterDirectives.length > 0) {
    result += '\n### 등장인물 지시\n';
    for (const cd of direction.characterDirectives) {
      let directiveText = '';
      switch (cd.directive) {
        case 'must_appear':
          directiveText = '반드시 등장';
          break;
        case 'must_not_appear':
          directiveText = '등장 금지';
          break;
        case 'spotlight':
          directiveText = '주요 인물로 부각';
          break;
        case 'background':
          directiveText = '배경/언급만';
          break;
      }
      result += `- ${cd.characterName}: ${directiveText}\n`;
      if (cd.emotionalState) {
        result += `  (감정 상태: ${cd.emotionalState})\n`;
      }
      if (cd.interactWith && cd.interactWith.length > 0) {
        result += `  (상호작용 대상: ${cd.interactWith.join(', ')})\n`;
      }
    }
  }

  // 떡밥 지시
  if (direction.breadcrumbDirectives && direction.breadcrumbDirectives.length > 0) {
    result += '\n### 떡밥 지시\n';
    for (const bd of direction.breadcrumbDirectives) {
      let actionText = '';
      switch (bd.action) {
        case 'plant':
          actionText = '새로 심기';
          break;
        case 'hint':
          actionText = '힌트 주기';
          break;
        case 'advance':
          actionText = '진전시키기';
          break;
        case 'collect':
          actionText = '회수하기';
          break;
      }
      result += `- [${bd.breadcrumbName}] → ${actionText}\n`;
      if (bd.description) {
        result += `  방법: ${bd.description}\n`;
      }
    }
  }

  // 클리프행어 지시
  if (direction.cliffhangerType || direction.cliffhangerHint) {
    result += '\n### 클리프행어 지시 (이 지시가 기본 추천보다 우선)\n';
    if (direction.cliffhangerType) {
      result += `- 유형: ${CLIFFHANGER_LABELS[direction.cliffhangerType] || direction.cliffhangerType}\n`;
    }
    if (direction.cliffhangerHint) {
      result += `- 힌트: ${direction.cliffhangerHint}\n`;
    }
  }

  // 시점 지시
  if (direction.viewpointCharacter) {
    result += '\n### 시점 지시\n';
    result += `- 이 화의 시점 인물: ${direction.viewpointCharacter}\n`;
    if (direction.viewpointShift !== undefined) {
      result += `- 시점 전환: ${direction.viewpointShift ? '허용' : '금지'}\n`;
    }
  }

  // 자유 지시
  if (direction.freeDirectives && direction.freeDirectives.length > 0) {
    result += '\n### 추가 지시사항\n';
    for (const fd of direction.freeDirectives) {
      result += `- ${fd}\n`;
    }
  }

  // 피해야 할 것
  if (direction.avoid && direction.avoid.length > 0) {
    result += '\n### 피해야 할 것 (금지!)\n';
    for (const avoid of direction.avoid) {
      result += `- ❌ ${avoid}\n`;
    }
  }

  result += '\n※ 위 PD 디렉팅은 기본 규칙보다 우선합니다. 반드시 지켜주세요.\n=== PD 디렉팅 지시 끝 ===\n';

  return result;
}

export const maxDuration = 60; // Vercel Fluid Compute 활성화

/**
 * 계층적 캐릭터 컨텍스트 빌드 (토큰 예산 적용)
 * Tier 2: World Bible의 요약 (항상 포함)
 * Tier 3: 이번 화 등장 캐릭터 상세 (선택적 로드)
 */
function buildHierarchicalCharacterContext(params: {
  allCharacters: NPCSeedInfo[];
  episodeDirection?: EpisodeDirection;
  recentLogs?: EpisodeLog[];
  worldBible?: WorldBible;
  unresolvedTensions?: string[];
  reductionLevel?: ReductionLevel;
}): { detailed: string; summary: string; selectedNames: string[] } {
  const {
    allCharacters,
    episodeDirection,
    recentLogs,
    worldBible,
    unresolvedTensions,
    reductionLevel = 'normal'
  } = params;

  // 최대 캐릭터 수 (축소 레벨에 따라 조정)
  const maxDetailedCount = reductionLevel === 'normal' ? 10 :
                           reductionLevel === 'reduced30' ? 7 :
                           reductionLevel === 'reduced50' ? 5 : 3;

  // 캐릭터 선택
  const normalizedCharacters = normalizeToCharacterDetail(allCharacters);
  const selection = selectCharactersForEpisode({
    pdDirection: episodeDirection,
    recentLogs,
    worldBible,
    unresolvedTensions,
    allCharacters: normalizedCharacters,
    maxDetailedCount,
  });

  // 상세 캐릭터 정보 빌드
  const detailedCharacters = normalizedCharacters.filter(c =>
    selection.detailed.includes(c.name)
  );
  const detailedPrompt = buildDetailedCharacterPrompt(
    detailedCharacters,
    TOKEN_BUDGET.characters
  );

  // 요약 캐릭터 정보 빌드
  const summaryCharacters = worldBible
    ? worldBibleCharactersToSummary(worldBible).filter(c =>
        selection.summary.includes(c.name)
      )
    : normalizedCharacters
        .filter(c => selection.summary.includes(c.name))
        .map(c => ({ name: c.name, oneLine: c.role || c.core || '역할 미정' }));

  const summaryPrompt = buildSummaryCharacterPrompt(summaryCharacters, 500);

  return {
    detailed: detailedPrompt,
    summary: summaryPrompt,
    selectedNames: selection.detailed,
  };
}

/**
 * 프롬프트 섹션을 예산에 맞게 조립
 */
function assemblePromptWithBudget(
  sections: PromptSections,
  reductionLevel: ReductionLevel = 'normal'
): { prompt: string; tokenUsage: ReturnType<typeof calculateTokenUsage>; truncated: boolean } {
  // 예산에 맞게 섹션 축소
  const fittedSections = fitToBudget(sections, reductionLevel);

  // 토큰 사용량 계산
  const tokenUsage = calculateTokenUsage(fittedSections);

  // 최종 프롬프트 조립 (우선순위 순서)
  const parts: string[] = [];

  // ① 시스템은 별도 (user prompt에 포함 안 함)

  // ② World Bible
  if (fittedSections.worldBible) {
    parts.push('=== 세계관 성경 (World Bible) ===');
    parts.push(fittedSections.worldBible);
    parts.push('=== 세계관 성경 끝 ===\n');
  }

  // ③ 직전 화 엔딩
  if (fittedSections.previousEnding) {
    parts.push('### 직전 화 마지막 장면');
    parts.push(fittedSections.previousEnding);
    parts.push('');
  }

  // ④ 직전 3화 로그
  if (fittedSections.recentLogs) {
    parts.push('### 최근 화 요약');
    parts.push(fittedSections.recentLogs);
    parts.push('');
  }

  // ⑤ 등장 캐릭터 상세
  if (fittedSections.characters) {
    parts.push(fittedSections.characters);
    parts.push('');
  }

  // ⑥ 떡밥 + 미해결 긴장
  if (fittedSections.breadcrumbs) {
    parts.push('### 활성 떡밥 & 미해결 긴장');
    parts.push(fittedSections.breadcrumbs);
    parts.push('');
  }

  // ⑦ 메타 지시
  if (fittedSections.episodeMeta) {
    parts.push('### 이번 화 메타 지시');
    parts.push(fittedSections.episodeMeta);
    parts.push('');
  }

  // ⑧ Writing Memory
  if (fittedSections.writingMemory) {
    parts.push('=== 학습된 문체 규칙 ===');
    parts.push(fittedSections.writingMemory);
    parts.push('=== 학습된 문체 규칙 끝 ===\n');
  }

  // ⑨ PD 디렉팅
  if (fittedSections.episodeDirection) {
    parts.push(fittedSections.episodeDirection);
    parts.push('');
  }

  const prompt = parts.join('\n');
  const truncated = isOverBudget(tokenUsage, reductionLevel);

  return { prompt, tokenUsage, truncated };
}

// 누적 피드백을 프롬프트용 문자열로 변환
function buildFeedbackSection(recurringFeedback?: Feedback[]): string {
  if (!recurringFeedback || recurringFeedback.length === 0) {
    return '';
  }

  // 유형별로 그룹화
  const byType: Record<FeedbackType, string[]> = {
    style: [],
    character: [],
    plot: [],
    pacing: [],
    general: [],
  };

  for (const fb of recurringFeedback) {
    byType[fb.type].push(fb.content);
  }

  let result = '\n### 환님 피드백 (누적 - 반드시 반영)\n';

  if (byType.style.length > 0) {
    result += '\n[문체/스타일]\n' + byType.style.map(c => `- ${c}`).join('\n');
  }
  if (byType.character.length > 0) {
    result += '\n[캐릭터]\n' + byType.character.map(c => `- ${c}`).join('\n');
  }
  if (byType.plot.length > 0) {
    result += '\n[전개]\n' + byType.plot.map(c => `- ${c}`).join('\n');
  }
  if (byType.pacing.length > 0) {
    result += '\n[페이스]\n' + byType.pacing.map(c => `- ${c}`).join('\n');
  }
  if (byType.general.length > 0) {
    result += '\n[기타]\n' + byType.general.map(c => `- ${c}`).join('\n');
  }

  return result + '\n※ 위 피드백은 환님이 이전 화에서 요청한 수정사항입니다. 이번 화에도 반드시 반영하세요.\n';
}

const client = new Anthropic();

// 설정 상수
// Railway 배포 - Sonnet 모델 사용 (타임아웃 300초)
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 12000;
const TEMPERATURE = 0.8;   // 창작용 온도

const MIN_CHAR_COUNT = 4000;
const TARGET_MIN_CHAR = 5000;
const TARGET_MAX_CHAR = 7000;
const MAX_RETRY = 2;

// 독백 톤 5가지 (같은 톤 2화 연속 금지)
const MONOLOGUE_TONES: MonologueTone[] = ['자조', '관찰', '냉정', '감각', '메타'];

// 클리프행어 7유형 (돌려쓰기)
const CLIFFHANGER_TYPES = [
  '위기 직전',      // "그 순간, 문이 열렸다."
  '비밀 폭로',      // "그녀의 이름은 진짜가 아니었다."
  '선택 강요',      // "죽이거나, 죽거나."
  '예상 뒤집기',    // "하지만 그는 웃고 있었다."
  '능력 각성 힌트', // "손끝에서 뭔가가 일렁였다."
  '과거 연결',      // "10년 전, 바로 이 자리였다."
  '인물 등장',      // "그리고 그가 나타났다."
] as const;

// MUST-2: 능력 공개 속도 제한 (에피소드 번호 기반)
function getAbilityConstraint(episodeNumber: number): string {
  if (episodeNumber <= 3) {
    return `[${episodeNumber}화] 능력/정체/비밀 관련 장면 금지.
- 주인공 본인도 모르는 미세한 이상 징후만 허용 (예: "상처가 빨리 낫는 것 같다?" 정도)
- 주변 인물이 "이 아이 뭐지?"라고 말하면 안 된다
- 능력 발현, 기운 폭발, 부적 반응 같은 초자연적 이벤트 일체 금지`;
  }
  if (episodeNumber <= 5) {
    return `[${episodeNumber}화] 능력 힌트 최대 1회.
- "확실히 뭔가 있다"가 아니라 "우연인가?" 수준의 모호한 힌트만
- 주변 인물이 놀라거나 의심하면 안 된다. 본인만 살짝 의아한 정도
- 능력 발현/폭발/각성 장면 금지`;
  }
  if (episodeNumber <= 10) {
    return `[${episodeNumber}화] 능력 편린 1회 허용.
- "확실히 뭔가 있다" 수준까지 가능하지만, 정체는 모른다 (본인도 주변도)
- 폭주/각성/대규모 발현은 금지. 소규모 이상 현상 수준`;
  }
  return `[${episodeNumber}화] 능력 사용 1회 허용.
- 대가가 반드시 따른다 (기절/출혈/기억 혼란/아군 피해 중 택1)
- "깨끗한 승리" 금지`;
}

// MUST-3: 패턴 반복 금지 (이전 화 로그 기반)
function getPatternBanList(recentLogs?: EpisodeLog[]): string {
  if (!recentLogs || recentLogs.length === 0) {
    return '(첫 화이므로 제한 없음. 단, 매 화 새로운 요소를 1개 이상 도입할 것.)';
  }

  const lines: string[] = [];
  const lastLog = recentLogs[recentLogs.length - 1];

  // 직전 화 클리프행어 유형
  if (lastLog.cliffhangerType) {
    lines.push(`- 클리프행어: "${lastLog.cliffhangerType}" 금지 (직전 화 사용)`);
  }

  // 직전 화 독백 톤
  if (lastLog.dominantMonologueTone) {
    lines.push(`- 독백 톤: "${lastLog.dominantMonologueTone}" 금지 (직전 화 사용)`);
  }

  // 최근 2화에서 보여준 능력
  const recentAbilities: string[] = [];
  for (const log of recentLogs.slice(-2)) {
    if (log.abilitiesShown) {
      recentAbilities.push(...log.abilitiesShown);
    }
  }
  if (recentAbilities.length > 0) {
    lines.push(`- 최근 2화 능력 (같은 효과 금지): ${recentAbilities.join(', ')}`);
  }

  // 최근 2화 캐릭터 변화 패턴
  const recentReactions: string[] = [];
  for (const log of recentLogs.slice(-2)) {
    for (const [name, change] of Object.entries(log.characterChanges || {})) {
      recentReactions.push(`${name}: ${change}`);
    }
  }
  if (recentReactions.length > 0) {
    lines.push(`- 최근 캐릭터 변화 (같은 변화 반복 금지):\n  ${recentReactions.slice(0, 4).join('\n  ')}`);
  }

  // 최근 서사 패턴
  const recentPatterns: string[] = [];
  for (const log of recentLogs.slice(-2)) {
    if (log.narrativePatterns) {
      recentPatterns.push(...log.narrativePatterns);
    }
  }
  if (recentPatterns.length > 0) {
    lines.push(`- 최근 서사 패턴 (같은 패턴 금지): ${recentPatterns.join(', ')}`);
  }

  // 미해결 긴장 (진전시킬 것)
  if (lastLog.unresolvedTensions && lastLog.unresolvedTensions.length > 0) {
    lines.push(`- 미해결 긴장 (이번 화에서 최소 1개 진전):\n  ${lastLog.unresolvedTensions.slice(0, 3).join('\n  ')}`);
  }

  return lines.length > 0 ? lines.join('\n') : '(제한 없음)';
}

// ============================================
// 압축된 시스템 프롬프트 (토큰 30%+ 절감)
// ============================================

// 시스템 프롬프트 (압축 버전)
function buildSystemPrompt(
  persona: typeof AUTHOR_PERSONA_PRESETS[0] | undefined,
  viewpoint: string,
  episodeNumber: number,
  previousMonologueTone?: MonologueTone,
  authorConfig?: AuthorConfig,
  recentLogs?: EpisodeLog[],
  previousCliffhangerType?: string
): string {
  const genrePersonaSection = authorConfig ? buildAuthorPersonaPrompt(authorConfig) : '';

  // 외래어 금지 (무협/동양판타지만)
  const genre = authorConfig?.genre;
  const isOrientalGenre = genre === 'martial_arts' || (genre === 'fantasy' && authorConfig?.customGenre?.includes('동양'));
  const forbiddenVocab = isOrientalGenre ? `
[외래어 금지] 팁→가르침, 스킬→무공, 레벨→경지, 마스터→사부, 타이밍→틈/찰나, 리듬→박자, 스트레스→심화` : '';

  const viewpointRule = viewpoint === 'first_person' ? '1인칭 "나"' : '3인칭';

  // 톤/클리프행어 (직전 것 제외)
  const tones = previousMonologueTone ? MONOLOGUE_TONES.filter(t => t !== previousMonologueTone) : MONOLOGUE_TONES;
  const suggestedTone = tones[episodeNumber % tones.length];
  const cliffs = previousCliffhangerType ? CLIFFHANGER_TYPES.filter(t => t !== previousCliffhangerType) : CLIFFHANGER_TYPES;
  const suggestedCliff = cliffs[(episodeNumber - 1) % cliffs.length];

  // 구간별 속도
  const pacing = episodeNumber <= 10 ? '빠르게' : episodeNumber <= 50 ? '깊게' : '폭풍';

  // 동적 제약
  const abilityConstraint = getAbilityConstraint(episodeNumber);
  const patternBan = getPatternBanList(recentLogs);

  return `═══ 절대 규칙 (MUST) ═══
[M1] 설명 대사 금지. "이건 ~이야" 패턴 0개. 행동/감각으로만.
[M2] 능력 제한: ${abilityConstraint}
[M3] 패턴 금지: ${patternBan}

═══ ${episodeNumber}화 설정 ═══
시점:${viewpointRule} | 톤:"${suggestedTone}" | 클리프:"${suggestedCliff}" | 속도:${pacing}
${forbiddenVocab}
═══ 작가 DNA ═══
${persona?.name || '웹소설 작가'}${genrePersonaSection ? '\n' + genrePersonaSection : ''}

═══ 문체 (핵심만) ═══
• 첫문장=어그로(감각/상황/의문) • 감정→신체 • 리듬:짧중길짧
• 대사≤3줄, 핵심1줄, 뒤에 행동 • 사건 후 1~3문장 고요
• 독백=자조/유머 • 16세≠8세 말투 • 고수=짧고 단정
• 전환시 감정브릿지 • "그때였다" 2회↑금지

═══ 필수 규칙 ═══
• 타임라인: 이전화 숫자 그대로(17년전→17년전). 확신없으면 "오래전"
• 전환: "---"만 긋고 점프 금지. 감각트리거로 오버랩
• 문체: 건조한 단문 금지. 모든 행동에 감각1개↑
• 힘숨찐: 궁색변명 금지. 짧은 너스레로 흘려라
• 반복: 같은 위기→구출 2회↑금지. 같은 능력 2회시 변주
• 엑스트라: 그냥 지나감 금지. 마이크로 텐션 부여
• 빌드업: 미완의 긴장으로 끝. 정보 한꺼풀씩
• 적: 말적게, 경고없이 실행, 한번은 적이 이겨야

═══ 출력 ═══
JSON: {"episode":{"title":"","content":"(\\n)","endHook":""},"authorComment":"","nextEpisodePreview":"","monologueTone":"${suggestedTone}"}
분량:${TARGET_MIN_CHAR}~${TARGET_MAX_CHAR}자`;
}

// 정적 시스템 규칙 (압축 버전 - 캐시용)
function buildStaticSystemRules(
  persona: typeof AUTHOR_PERSONA_PRESETS[0] | undefined,
  viewpoint: string,
  authorConfig?: AuthorConfig
): string {
  const genrePersona = authorConfig ? buildAuthorPersonaPrompt(authorConfig) : '';
  const vp = viewpoint === 'first_person' ? '1인칭 "나"' : '3인칭';

  return `═══ 정적 규칙 (캐시됨) ═══
[작가] ${persona?.name || '웹소설 작가'}
${genrePersona}
[시점] ${vp}
[문체] 첫문장=어그로 | 감정→신체 | 리듬:짧중길짧 | 대사≤3줄→행동 | 사건후 고요
[대화] 나이맞춤(16세≠8세) | 고수=짧고단정 | 상대따라 변화
[연결] 전환시 감정브릿지 | "그때였다"2회↑금지
[빌드업] 미완으로끝 | 3겹긴장 | 정보한꺼풀
[캐릭터] 주인공:결핍/비밀2↑ | 적:말적게,경고없이실행
[출력] JSON:{"episode":{"title":"","content":"(\\n)","endHook":""},"authorComment":"","nextEpisodePreview":"","monologueTone":""}`;
}

// 동적 시스템 규칙 (압축 버전)
function buildDynamicSystemRules(
  episodeNumber: number,
  previousMonologueTone?: MonologueTone,
  recentLogs?: EpisodeLog[],
  previousCliffhangerType?: string
): string {
  const tones = previousMonologueTone ? MONOLOGUE_TONES.filter(t => t !== previousMonologueTone) : MONOLOGUE_TONES;
  const suggestedTone = tones[episodeNumber % tones.length];
  const cliffs = previousCliffhangerType ? CLIFFHANGER_TYPES.filter(t => t !== previousCliffhangerType) : CLIFFHANGER_TYPES;
  const suggestedCliff = cliffs[(episodeNumber - 1) % cliffs.length];
  const pacing = episodeNumber <= 10 ? '빠르게' : episodeNumber <= 50 ? '깊게' : '폭풍';

  return `═══ ${episodeNumber}화 규칙 ═══
[M1] 설명대사 0개 [M2] ${getAbilityConstraint(episodeNumber)} [M3] ${getPatternBanList(recentLogs)}
톤:"${suggestedTone}" 클리프:"${suggestedCliff}" 속도:${pacing} 분량:${TARGET_MIN_CHAR}~${TARGET_MAX_CHAR}자`;
}

// 캐시된 시스템 프롬프트 생성 (Anthropic Prompt Caching용)
function buildCachedSystemPrompt(
  persona: typeof AUTHOR_PERSONA_PRESETS[0] | undefined,
  viewpoint: string,
  episodeNumber: number,
  previousMonologueTone?: MonologueTone,
  authorConfig?: AuthorConfig,
  recentLogs?: EpisodeLog[],
  previousCliffhangerType?: string
): CachedSystemMessage {
  // 정적 규칙 (캐시됨 - 최소 1024 토큰 필요, TTL 5분)
  const staticRules = buildStaticSystemRules(persona, viewpoint, authorConfig);

  // 동적 규칙 (매번 변경)
  const dynamicRules = buildDynamicSystemRules(
    episodeNumber,
    previousMonologueTone,
    recentLogs,
    previousCliffhangerType
  );

  return [
    {
      type: 'text',
      text: staticRules,
      cache_control: { type: 'ephemeral' }  // 5분간 캐시
    },
    {
      type: 'text',
      text: dynamicRules
      // 캐시 안 함 - 에피소드마다 변경
    }
  ];
}

// 유저 프롬프트 (가변 - 세계관 + 캐릭터 + 이전 화 + 방향 + Active Context + Writing Memory + PD 디렉팅 + 시뮬레이션 프로필)
function buildUserPrompt(params: {
  episodeNumber: number;
  confirmedLayers?: {
    world?: string;
    coreRules?: string;
    seeds?: string;
    heroArc?: string;
    villainArc?: string;
    ultimateMystery?: string;
  };
  // 세계관 세부 정보 (PD 디렉팅)
  worldLayer?: WorldLayer;
  seedsLayer?: SeedsLayer;
  characterProfiles?: string;
  characterMemories?: string;
  previousEpisodes?: Episode[];
  authorDirection?: string;
  // 에피소드 레벨 디렉팅 (PD)
  episodeDirection?: EpisodeDirection;
  isRetry?: boolean;
  previousContent?: string;
  previousCharCount?: number;
  recurringFeedback?: Feedback[];
  activeContext?: ActiveContext;
  writingMemory?: WritingMemory;
  // 시뮬레이션 파생 프로필 (캐릭터 행동 규칙)
  simulationProfiles?: CharacterSimProfile[];
  // 프로젝트 기본 방향 (환님 설정)
  projectDirection?: string;
}): string {
  const {
    episodeNumber,
    confirmedLayers,
    worldLayer,
    seedsLayer,
    characterProfiles,
    characterMemories,
    previousEpisodes,
    authorDirection,
    episodeDirection,
    isRetry,
    previousContent,
    previousCharCount,
    recurringFeedback,
    activeContext,
    writingMemory,
    simulationProfiles,
    projectDirection
  } = params;

  // 세계관 세부 정보 섹션
  const worldDetailSection = buildWorldDetailSection(worldLayer);
  // 캐릭터 세부 정보 섹션
  const characterDetailSection = buildCharacterDetailSection(seedsLayer);
  // 에피소드 디렉팅 섹션 (PD 지시)
  const episodeDirectionSection = buildEpisodeDirectionSection(episodeDirection);
  // 캐릭터 행동 규칙 섹션 (시뮬레이션 기반)
  const characterBehaviorRulesSection = buildCharacterBehaviorRulesSection(simulationProfiles);

  const lastEpisode = previousEpisodes?.[previousEpisodes.length - 1];
  const lastEpisodeFinalContent = lastEpisode ? getEpisodeFinalContent(lastEpisode) : null;
  const wasEdited = lastEpisode?.editedContent ? true : false;

  const retryInstruction = isRetry ? `
⚠️ 이전 작성본이 ${previousCharCount}자로 분량 부족!
반드시 ${TARGET_MIN_CHAR}자 이상으로 다시 작성하세요.
- 장면 묘사를 구체적으로 (공간, 빛, 냄새, 온도)
- 인물 내면을 깊이 파고들기
- 동작을 섬세하게 풀어쓰기
같은 정보 반복으로 늘리지 마세요.
` : '';

  // 누적 피드백 섹션
  const feedbackSection = buildFeedbackSection(recurringFeedback);

  // Writing Memory 섹션 (자가진화 피드백 루프)
  const writingMemorySection = writingMemory
    ? `\n=== 학습된 문체 규칙 ===\n${buildWritingMemoryPrompt(writingMemory)}\n=== 학습된 문체 규칙 끝 ===\n`
    : '';

  // Active Context가 있으면 사용, 없으면 기존 방식
  const activeContextSection = activeContext
    ? activeContextToPrompt(activeContext)
    : '';

  // Active Context가 있으면 중복 섹션 제거
  const hasActiveContext = !!activeContext;

  // 프로젝트 기본 방향 섹션
  const projectDirectionSection = projectDirection ? `
### 이 소설의 기본 전제 (환님 설정)
${projectDirection}
※ 이 전제를 매 화 유지하세요. 모든 전개는 이 전제 위에서 이루어져야 합니다.
` : '';

  // Active Context 모드: 압축된 정보 사용
  if (hasActiveContext) {
    return `${retryInstruction}${feedbackSection}${writingMemorySection}${episodeDirectionSection}
## 제${episodeNumber}화 작성 요청
${projectDirectionSection}
=== 일관성 엔진 (Active Context) ===
${activeContextSection}
=== 일관성 엔진 끝 ===
${characterBehaviorRulesSection}
### 이 화 방향
${authorDirection || '자유롭게 전개'}

${episodeNumber <= 5 ? `
### 초반 5화 주의사항
- 주인공의 목표/강점/결핍이 드러나야 함
- 세계 규칙이 자연스럽게 노출되어야 함
- 다음 화 클릭할 궁금증 필수
` : ''}

---
지금 ${episodeNumber}화를 ${TARGET_MIN_CHAR}자 이상으로 작성하세요.`;
  }

  // 레거시 모드: Active Context 없이 기존 방식 사용
  return `${retryInstruction}${feedbackSection}${writingMemorySection}${episodeDirectionSection}
## 제${episodeNumber}화 작성 요청
${projectDirectionSection}
### 세계관
${confirmedLayers?.world || '(미설정)'}

### 핵심 규칙
${confirmedLayers?.coreRules || '(미설정)'}
${worldDetailSection}
### 주요 인물
${confirmedLayers?.seeds || characterProfiles || '(미설정)'}
${characterDetailSection}
### 주인공 서사
${confirmedLayers?.heroArc || '(미설정)'}

### 빌런 서사
${confirmedLayers?.villainArc || '(미설정)'}

### 숨겨진 떡밥
${confirmedLayers?.ultimateMystery || '(미설정)'}
이 떡밥의 흔적을 본문에 자연스럽게 깔되, 독자가 알아채지 못하게.
${characterBehaviorRulesSection}

### 이전 화 (문체 참고)
${lastEpisodeFinalContent ? `
${lastEpisodeFinalContent.slice(0, 3000)}${lastEpisodeFinalContent.length > 3000 ? '\n... (이하 생략)' : ''}
${wasEdited ? '※ 환님이 수정한 버전입니다. 이 문체와 방향성을 유지하세요.' : ''}
` : '(첫 화입니다)'}

### 이 화 방향
${authorDirection || '자유롭게 전개'}

${episodeNumber <= 5 ? `
### 초반 5화 주의사항
- 주인공의 목표/강점/결핍이 드러나야 함
- 세계 규칙이 자연스럽게 노출되어야 함
- 다음 화 클릭할 궁금증 필수
` : ''}

---
지금 ${episodeNumber}화를 ${TARGET_MIN_CHAR}자 이상으로 작성하세요.`;
}

// API 호출 및 파싱
async function generateEpisode(
  systemPrompt: string,
  userPrompt: string,
  episodeNumber: number
): Promise<{
  episode: Episode | null;
  authorComment: string;
  nextEpisodePreview: string;
  rawText: string;
}> {
  // 상세 디버그 로그
  console.log('\n========================================');
  console.log('=== WRITE EPISODE API CALL DEBUG ===');
  console.log('========================================');
  console.log('Model:', MODEL);
  console.log('Max tokens:', MAX_TOKENS);
  console.log('Temperature:', TEMPERATURE);
  console.log('');
  console.log('=== SYSTEM PROMPT LENGTH ===', systemPrompt.length);
  console.log('=== USER PROMPT LENGTH ===', userPrompt.length);
  console.log('');
  console.log('=== SYSTEM PROMPT FIRST 500 ===');
  console.log(systemPrompt.substring(0, 500));
  console.log('');
  console.log('=== SYSTEM PROMPT KEYWORDS CHECK ===');
  console.log('Contains "6단계":', systemPrompt.includes('6단계'));
  console.log('Contains "3인 검토":', systemPrompt.includes('3인 검토'));
  console.log('Contains "페르소나 장착":', systemPrompt.includes('페르소나 장착'));
  console.log('Contains "설계관":', systemPrompt.includes('설계관'));
  console.log('Contains "연출관":', systemPrompt.includes('연출관'));
  console.log('Contains "시장관":', systemPrompt.includes('시장관'));
  console.log('');
  console.log('=== USER PROMPT FIRST 500 ===');
  console.log(userPrompt.substring(0, 500));
  console.log('');
  console.log('=== CALLING CLAUDE API NOW ===');
  console.log('========================================\n');

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  console.log('\n=== RESPONSE DEBUG ===');
  console.log('Response length:', text.length);
  console.log('Response preview:', text.slice(0, 300));
  console.log('=== END ===\n');

  try {
    // 마크다운 코드 블록 제거
    let cleanText = text;
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleanText = codeBlockMatch[1].trim();
    }

    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed.episode) {
        const content = parsed.episode.content || '';
        return {
          episode: {
            id: `ep-${Date.now()}`,
            number: episodeNumber,
            title: parsed.episode.title || `제${episodeNumber}화`,
            content: content,
            charCount: content.length,
            status: 'drafted',
            pov: '',
            sourceEventIds: [],
            authorNote: parsed.authorComment || '',
            endHook: parsed.episode.endHook || '',
            monologueTone: parsed.monologueTone || undefined, // 독백 톤 저장
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as Episode & { monologueTone?: string },
          authorComment: parsed.authorComment || '',
          nextEpisodePreview: parsed.nextEpisodePreview || '',
          rawText: text,
        };
      }
    }
  } catch (e) {
    console.error('Episode parsing error:', e);
  }

  return {
    episode: null,
    authorComment: '',
    nextEpisodePreview: '',
    rawText: text,
  };
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = await req.json();
    const {
      episodeNumber,
      projectConfig,
      confirmedLayers,
      worldLayer,        // 세계관 세부 정보 (PD 디렉팅)
      seedsLayer,        // 캐릭터 세부 정보 (PD 디렉팅)
      characterProfiles,
      characterMemories,
      previousEpisodes,
      authorDirection,
      episodeDirection,  // 에피소드 레벨 디렉팅 (PD)
      seeds,
      recurringFeedback,
      activeContext,
      writingMemory,
      simulationProfiles,  // 시뮬레이션 파생 캐릭터 프로필
      authorConfig,        // 새로운 작가 설정 (다중 작가 시스템)
    } = body;

    // 에피소드 번호 유효성 검사
    if (typeof episodeNumber !== 'number' || episodeNumber < 1 || !Number.isInteger(episodeNumber)) {
      const errorData = JSON.stringify({
        type: 'error',
        message: '유효하지 않은 에피소드 번호입니다.',
      });
      return new Response(`data: ${errorData}\n\n`, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // 이전 에피소드들과 번호 충돌 체크
    if (previousEpisodes && Array.isArray(previousEpisodes)) {
      const existingNumbers = previousEpisodes.map((ep: { number: number }) => ep.number);
      if (existingNumbers.includes(episodeNumber)) {
        const errorData = JSON.stringify({
          type: 'error',
          message: `${episodeNumber}화는 이미 존재합니다.`,
        });
        return new Response(`data: ${errorData}\n\n`, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        });
      }
    }

    const persona = AUTHOR_PERSONA_PRESETS.find(
      p => p.id === projectConfig?.authorPersonaId
    );
    const viewpoint = (projectConfig?.viewpoint as string) || 'third_person';

    // 이전 화의 독백 톤 추출 (같은 톤 2화 연속 금지)
    const lastEpisode = previousEpisodes?.[previousEpisodes.length - 1];
    const previousMonologueTone = (lastEpisode as Episode & { monologueTone?: MonologueTone })?.monologueTone;

    // 이전 화의 클리프행어 유형 추출 (같은 유형 2화 연속 금지)
    const previousCliffhangerType = (lastEpisode as Episode & { cliffhangerType?: string })?.cliffhangerType;

    // AuthorConfig 확인 (없으면 authorPersonaId에서 변환 - 하위 호환)
    const resolvedAuthorConfig = ensureAuthorConfig(
      authorConfig as AuthorConfig | undefined,
      projectConfig?.authorPersonaId as string | undefined
    );

    // 최근 에피소드 로그 추출 (패턴 반복 방지용)
    const { episodeLogs = [] } = body;
    const recentLogs = episodeLogs.slice(-3) as EpisodeLog[]; // 최근 3화

    // 캐시된 시스템 프롬프트 (정적 규칙 캐시 + 동적 규칙)
    const cachedSystemPrompt = buildCachedSystemPrompt(
      persona,
      viewpoint,
      episodeNumber,
      previousMonologueTone,
      resolvedAuthorConfig,
      recentLogs,
      previousCliffhangerType
    );

    // 레거시 호환용 문자열 시스템 프롬프트 (토큰 계산용)
    const systemPromptString = cachedSystemPrompt.map(block => block.text).join('\n\n');

    // 토큰 예산 모니터링
    const systemTokens = estimateTokens(systemPromptString);
    const staticTokens = estimateTokens(cachedSystemPrompt[0].text);
    const dynamicTokens = estimateTokens(cachedSystemPrompt[1].text);
    console.log('\n=== TOKEN BUDGET MONITORING (with Caching) ===');
    console.log(`시스템 프롬프트 총: ${systemTokens} 토큰 (예산: ${TOKEN_BUDGET.system})`);
    console.log(`  - 정적 규칙 (캐시됨): ${staticTokens} 토큰`);
    console.log(`  - 동적 규칙: ${dynamicTokens} 토큰`);

    // 유저 프롬프트 (가변)
    const userPrompt = buildUserPrompt({
      episodeNumber,
      confirmedLayers,
      worldLayer,        // 세계관 세부 정보
      seedsLayer,        // 캐릭터 세부 정보
      characterProfiles,
      characterMemories,
      previousEpisodes,
      authorDirection,
      episodeDirection,  // 에피소드 레벨 디렉팅
      recurringFeedback,
      activeContext,
      writingMemory,
      simulationProfiles,  // 시뮬레이션 파생 캐릭터 프로필
      projectDirection: projectConfig?.direction as string | undefined,  // 프로젝트 기본 방향
    });

    // 토큰 예산 최종 확인
    const userTokens = estimateTokens(userPrompt);
    const totalTokens = systemTokens + userTokens;
    console.log(`유저 프롬프트: ${userTokens} 토큰`);
    console.log(`총 입력 토큰: ${totalTokens} (예산: ${TOKEN_BUDGET.TOTAL_MAX})`);
    console.log(`캐시 절감 예상: 반복 호출 시 ${staticTokens} 토큰 절감 (정적 규칙 캐시)`);

    if (totalTokens > TOKEN_BUDGET.TOTAL_MAX) {
      console.warn(`⚠️ 토큰 예산 초과! ${totalTokens} > ${TOKEN_BUDGET.TOTAL_MAX}`);
      // 경고만 기록하고 계속 진행 (API가 자체적으로 처리)
    } else {
      console.log(`✅ 토큰 예산 내: ${((totalTokens / TOKEN_BUDGET.TOTAL_MAX) * 100).toFixed(1)}% 사용`);
    }
    console.log('=== TOKEN BUDGET MONITORING END ===\n');

    // 스트리밍 응답 생성 (강화된 연결 유지 + 에러 처리)
    const stream = new ReadableStream({
      async start(controller) {
        let heartbeat: ReturnType<typeof setInterval> | null = null;
        let streamClosed = false;

        const safeEnqueue = (data: Uint8Array) => {
          if (!streamClosed) {
            try {
              controller.enqueue(data);
            } catch {
              streamClosed = true;
            }
          }
        };

        const cleanup = () => {
          if (heartbeat) {
            clearInterval(heartbeat);
            heartbeat = null;
          }
        };

        const safeClose = () => {
          cleanup();
          if (!streamClosed) {
            streamClosed = true;
            try {
              controller.close();
            } catch { /* already closed */ }
          }
        };

        try {
          // ============================================
          // 즉시 플러시 (Immediate Flush) - 타임아웃 방지
          // ============================================

          // 1. 연결 확인 즉시 전송
          safeEnqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

          // 2. 다중 heartbeat 버스트 (프록시 버퍼 강제 플러시)
          safeEnqueue(encoder.encode(': heartbeat\n\n'));
          safeEnqueue(encoder.encode(': heartbeat\n\n'));

          // 3. 상태 메시지 전송 (사용자에게 진행 알림)
          safeEnqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', message: '프롬프트 준비 중...' })}\n\n`));

          // 4. 3초 간격 heartbeat (더 공격적)
          heartbeat = setInterval(() => {
            safeEnqueue(encoder.encode(': heartbeat\n\n'));
          }, 3000);

          let fullText = '';

          // 5. API 호출 직전 상태 + heartbeat
          safeEnqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', message: 'AI 집필 시작...' })}\n\n`));
          safeEnqueue(encoder.encode(': heartbeat\n\n'));

          // Anthropic Prompt Caching 적용 - 정적 규칙은 캐시됨
          const streamResponse = client.messages.stream({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            temperature: TEMPERATURE,
            system: cachedSystemPrompt as unknown as Anthropic.TextBlockParam[],
            messages: [{ role: 'user', content: userPrompt }],
          });

          // API 응답 타임아웃 (55초 - maxDuration보다 약간 짧게)
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('AI_RESPONSE_TIMEOUT')), 55000);
          });

          // 스트리밍 처리
          const streamPromise = (async () => {
            for await (const event of streamResponse) {
              if (streamClosed) break;
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                fullText += event.delta.text;
                // 실시간 텍스트 전송
                const chunk = JSON.stringify({ type: 'text', content: event.delta.text });
                safeEnqueue(encoder.encode(`data: ${chunk}\n\n`));
              }
            }
            return fullText;
          })();

          // 타임아웃 또는 완료 중 먼저 오는 것
          try {
            fullText = await Promise.race([streamPromise, timeoutPromise]);
          } catch (raceError) {
            if (raceError instanceof Error && raceError.message === 'AI_RESPONSE_TIMEOUT') {
              const timeoutData = JSON.stringify({
                type: 'error',
                message: 'AI 응답이 지연되고 있어. 잠시 후 다시 시도해줘.',
                suggestion: '프롬프트가 길어 AI가 처리하는 데 시간이 걸리고 있습니다.',
                retryable: true,
              });
              safeEnqueue(encoder.encode(`data: ${timeoutData}\n\n`));
              safeClose();
              return;
            }
            throw raceError;
          }

          // 파싱
          let cleanText = fullText;
          const codeBlockMatch = fullText.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (codeBlockMatch) {
            cleanText = codeBlockMatch[1].trim();
          }

          const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);

              if (parsed.episode) {
                const content = parsed.episode.content || '';
                const episode = {
                  id: `ep-${Date.now()}`,
                  number: episodeNumber,
                  title: parsed.episode.title || `제${episodeNumber}화`,
                  content: content,
                  charCount: content.length,
                  status: 'drafted',
                  pov: seeds?.[0]?.id || '',
                  sourceEventIds: [],
                  authorNote: parsed.authorComment || '',
                  endHook: parsed.episode.endHook || '',
                  monologueTone: parsed.monologueTone || undefined,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                // 분량 경고
                let authorComment = parsed.authorComment || '';
                if (content.length < MIN_CHAR_COUNT) {
                  authorComment = `[분량 ${content.length}자 - 목표 ${TARGET_MIN_CHAR}자 미달]\n\n${authorComment}`;
                }

                const finalData = JSON.stringify({
                  type: 'done',
                  episode,
                  authorComment,
                  nextEpisodePreview: parsed.nextEpisodePreview || '',
                });
                safeEnqueue(encoder.encode(`data: ${finalData}\n\n`));
              } else {
                // episode 키 없음 - raw 텍스트 사용
                const episode = {
                  id: `ep-${Date.now()}`,
                  number: episodeNumber,
                  title: `제${episodeNumber}화`,
                  content: fullText.slice(0, 10000),
                  charCount: fullText.length,
                  status: 'drafted',
                  pov: seeds?.[0]?.id || '',
                  sourceEventIds: [],
                  authorNote: '',
                  endHook: '',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                const finalData = JSON.stringify({
                  type: 'done',
                  episode,
                  authorComment: '파싱 부분 실패 - 원본 텍스트 사용',
                  nextEpisodePreview: '',
                });
                safeEnqueue(encoder.encode(`data: ${finalData}\n\n`));
              }
            } catch {
              // JSON 파싱 실패 - raw 텍스트 사용
              const episode = {
                id: `ep-${Date.now()}`,
                number: episodeNumber,
                title: `제${episodeNumber}화`,
                content: fullText.slice(0, 10000),
                charCount: fullText.length,
                status: 'drafted',
                pov: seeds?.[0]?.id || '',
                sourceEventIds: [],
                authorNote: '',
                endHook: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              const finalData = JSON.stringify({
                type: 'done',
                episode,
                authorComment: '파싱 실패 - 원본 텍스트 사용',
                nextEpisodePreview: '',
              });
              safeEnqueue(encoder.encode(`data: ${finalData}\n\n`));
            }
          } else {
            // JSON 없음 - raw 텍스트 사용
            const episode = {
              id: `ep-${Date.now()}`,
              number: episodeNumber,
              title: `제${episodeNumber}화`,
              content: fullText.slice(0, 10000),
              charCount: fullText.length,
              status: 'drafted',
              pov: seeds?.[0]?.id || '',
              sourceEventIds: [],
              authorNote: '',
              endHook: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const finalData = JSON.stringify({
              type: 'done',
              episode,
              authorComment: 'JSON 없음 - 원본 텍스트 사용',
              nextEpisodePreview: '',
            });
            safeEnqueue(encoder.encode(`data: ${finalData}\n\n`));
          }

          // heartbeat 정리 후 스트림 종료
          safeClose();
        } catch (error) {
          console.error('Write episode streaming error:', error);

          // 에러 유형에 따른 구체적 메시지
          let errorMessage = '에피소드 작성 오류';
          let suggestion = '';

          if (error instanceof Error) {
            const errMsg = error.message.toLowerCase();

            // API 토큰 초과 에러
            if (errMsg.includes('token') || errMsg.includes('context') || errMsg.includes('length')) {
              errorMessage = '프롬프트 토큰이 초과되었습니다.';
              suggestion = '세계관/캐릭터 데이터를 줄이거나, PD 디렉팅에서 이번 화에 필요한 핵심 인물만 지정해주세요.';
            }
            // 타임아웃
            else if (errMsg.includes('timeout') || errMsg.includes('timed out')) {
              errorMessage = '요청 시간이 초과되었습니다.';
              suggestion = '네트워크 상태를 확인하고 다시 시도해주세요.';
            }
            // API 키 문제
            else if (errMsg.includes('api') || errMsg.includes('key') || errMsg.includes('auth')) {
              errorMessage = 'API 인증 오류가 발생했습니다.';
              suggestion = '관리자에게 문의해주세요.';
            }
            // 기타
            else {
              errorMessage = error.message;
            }
          }

          const errorData = JSON.stringify({
            type: 'error',
            message: errorMessage,
            suggestion,
            tokenInfo: {
              systemTokens,
              userTokens,
              totalTokens,
              budget: TOKEN_BUDGET.TOTAL_MAX,
              overBudget: totalTokens > TOKEN_BUDGET.TOTAL_MAX,
            },
          });
          safeEnqueue(encoder.encode(`data: ${errorData}\n\n`));
          // heartbeat 정리 후 스트림 종료
          safeClose();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Write episode error:', error);
    const encoder = new TextEncoder();

    // 에러 유형에 따른 구체적 메시지
    let errorMessage = '에피소드 작성 실패';
    let suggestion = '다시 시도해 주세요.';

    if (error instanceof Error) {
      const errMsg = error.message.toLowerCase();

      if (errMsg.includes('timeout') || errMsg.includes('ai_response_timeout')) {
        errorMessage = 'AI 서버 응답 지연';
        suggestion = 'AI가 응답하는 데 시간이 오래 걸리고 있습니다. 다시 시도해 주세요.';
      } else if (errMsg.includes('token') || errMsg.includes('context') || errMsg.includes('length')) {
        errorMessage = '프롬프트 토큰 초과';
        suggestion = '세계관/캐릭터 데이터를 줄여주세요.';
      } else if (errMsg.includes('api') || errMsg.includes('key') || errMsg.includes('auth')) {
        errorMessage = 'API 인증 오류';
        suggestion = '관리자에게 문의해 주세요.';
      } else if (errMsg.includes('network') || errMsg.includes('fetch') || errMsg.includes('connect')) {
        errorMessage = '네트워크 연결 오류';
        suggestion = '인터넷 연결을 확인하고 다시 시도해 주세요.';
      }
    }

    const errorData = JSON.stringify({
      type: 'error',
      message: errorMessage,
      suggestion,
      retryable: true,
    });
    return new Response(`data: ${errorData}\n\n`, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  }
}
