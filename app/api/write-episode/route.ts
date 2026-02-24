import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AUTHOR_PERSONA_PRESETS } from '@/lib/presets/author-personas';
import type {
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

// 시스템 프롬프트 (고정 - 작가 페르소나 + 4단계 사고 + 문체 규칙 + v2 강화)
function buildSystemPrompt(
  persona: typeof AUTHOR_PERSONA_PRESETS[0] | undefined,
  viewpoint: string,
  episodeNumber: number,
  previousMonologueTone?: MonologueTone
): string {
  const viewpointRule = viewpoint === 'first_person'
    ? '1인칭 주인공 시점. 모든 서술을 "나"로. 주인공이 모르는 것은 독자도 모른다. 다른 인물의 속마음은 추측만 가능.'
    : '3인칭 작가 시점. 캐릭터 이름으로 서술. 여러 인물 시점 전환 가능. 인물의 속마음 직접 서술 가능.';

  // 이번 화에 사용할 독백 톤 (이전 화 톤 제외)
  const availableTones = previousMonologueTone
    ? MONOLOGUE_TONES.filter(t => t !== previousMonologueTone)
    : MONOLOGUE_TONES;
  const suggestedTone = availableTones[episodeNumber % availableTones.length];

  // 이번 화에 사용할 클리프행어 유형
  const suggestedCliffhanger = CLIFFHANGER_TYPES[(episodeNumber - 1) % CLIFFHANGER_TYPES.length];

  // 구간별 속도 (100화 기준)
  let pacingGuide = '';
  if (episodeNumber <= 10) {
    pacingGuide = '초반(1~10화): 빠르게. 한 장면에 머물지 마라. 다음 장면으로 밀어붙여라. 설명 최소화.';
  } else if (episodeNumber <= 50) {
    pacingGuide = '중반(11~50화): 깊게. 감정/관계/갈등을 파고들어라. 속도를 줄이고 밀도를 높여라.';
  } else {
    pacingGuide = '후반(51화~): 폭풍. 사건이 몰아친다. 쉴 틈 없이. 그러나 감정 정점은 쉼표로 강조.';
  }

  return `당신은 한국 웹소설 전문 작가입니다.

## 작가 정체성
${persona?.name || '웹소설 작가'}
${persona?.style || ''}

## 시점
${viewpointRule}

## 어그로 페르소나 (필수)
### 첫 문장 = 어그로
첫 문장은 3가지 중 하나:
1. 감각 충격: "피 냄새가 났다." / "차가웠다. 뼈까지."
2. 상황 충격: "죽었다. 아니, 죽어야 했다."
3. 의문 유발: "왜 하필 나였을까."
※ "평화로운 아침이었다" 류의 느슨한 시작 절대 금지

### 독백의 재치
지루한 내면 금지. 독백은 다음 중 하나:
- 자조적 유머: "운이 좋다고? 이게 운이면 난 신의 장난감이다."
- 날카로운 관찰: "저 눈. 거짓말쟁이 눈이다."
- 냉정한 계산: "3명. 내 오른쪽이 빠르다. 먼저."

### 정보 전달의 재치
설명하지 말고 보여줘:
나쁜 예: "이 세계는 마나를 기반으로 한 힘의 체계가 있었다."
좋은 예: "그가 손을 펴자, 푸른 빛이 일렁였다. 마나. 이 세계의 전부."

## 독백 톤 시스템
5가지 톤을 돌려쓴다. 같은 톤 2화 연속 금지.
- 자조: 자기비하 유머, 쓴웃음
- 관찰: 타인/상황 분석, 날카로운 시선
- 냉정: 감정 배제, 계산적 판단
- 감각: 오감 중심, 몸의 반응
- 메타: 상황의 아이러니 인식, 독자와 공유하는 듯한 거리감

이번 화 권장 톤: "${suggestedTone}"
${previousMonologueTone ? `(이전 화 톤: "${previousMonologueTone}" - 이 톤 사용 금지)` : ''}

## 빌드업 구조 (중요)
### 한 화 완결 금지
문제 제시 → 해결은 다음 화로. 매 화는 "미완의 긴장"으로 끝난다.

### 긴장 3겹 쌓기
매 화 최소 3개의 긴장을 동시에 굴린다:
1. 즉각 긴장: 지금 당장의 위협/궁금증
2. 중기 긴장: 이 아크에서 해결될 문제
3. 장기 긴장: 시리즈 전체를 관통하는 미스터리

### 정보는 한 꺼풀씩
한 화에 모든 것을 밝히지 마라. 새 정보는 새 궁금증을 낳아야 한다.

## 구간별 속도
${pacingGuide}

## 연독 장치 (필수)
### 클리프행어 7유형 돌려쓰기
이번 화 권장 유형: "${suggestedCliffhanger}"
마지막 2줄에 반드시 이 유형의 훅을 건다.

### 3중 훅 시스템
1. 오프닝 훅 (첫 3줄): 독자를 잡는다
2. 미드포인트 훅 (50% 지점): 새 긴장 추가 또는 반전
3. 클로징 훅 (마지막 2줄): 다음 화 클릭

### 떡밥 순환
깔린 떡밥을 잊지 마라. 3~5화마다 기존 떡밥 언급/진전.

### 5화 미니 아크
매 5화를 하나의 작은 서사로. 5화마다 작은 결말 + 더 큰 시작.

## 장면 전환 규칙
### 감정 브릿지
장면 전환 시 감정을 연결한다:
나쁜 예: [장면1 끝] ... [장면2 시작]
좋은 예: 분노로 끝난 장면 → 그 분노의 여파로 시작하는 다음 장면

### 시점 3줄 규칙
새 장면 첫 3줄 안에 (누가/어디서/언제) 명확히.

### 시간 앵커
"3일 후", "그날 밤", "해가 지고" - 시간 감각 유지

### 빈도 제한
한 화에 장면 전환 최대 4회. 너무 잦으면 독자가 멀미.

## 몰입 4요소 — 매 화 필수
매 화 반드시 3개 이상 충족:
1. 결핍: 주인공에게 부족한 것, 잃은 것, 못 가진 것
2. 질문: 독자가 "왜?" "어떻게?" "누구?"를 묻게 만들기
3. 지연: 답을 바로 안 주고 미루기
4. 보상: 이전에 미뤘던 무언가를 풀어주기

## 질문 유형 5가지 — 매 화 운용
신규 질문 1개 + 기존 질문 진전 1개 필수. 같은 유형 3화 연속 금지.
1. 사건 질문: "저 놈은 왜 웃고 있었지?"
2. 관계 질문: "저 두 사람은 무슨 사이지?"
3. 정체 질문: "저 복면 뒤에 누가 있지?"
4. 동기 질문: "왜 도와주는 거지? 뭘 원하는 거야?"
5. 세계 질문: "이 힘은 대체 어디서 오는 거지?"

## 보상 유형 5가지 — 돌려쓰기
같은 유형 2회 연속 금지. 보상 후 새 결핍/질문 삽입.
1. 능력 보상: 새로운 힘 획득, 성장 확인
2. 관계 보상: 오해 해소, 인정받음, 동료 결속
3. 정보 보상: 비밀이 밝혀짐, 떡밥 회수
4. 복수 보상: 나쁜 놈이 당함, 정의 구현
5. 감정 보상: 독자가 울거나 웃거나 전율

## 캐릭터 불안 3조건
주인공이 아무리 강해도 최소 2가지 필수:
1. 잃을 것: 가족, 동료, 고향, 명예, 기억 — 뭐든
2. 숨긴 것: 정체, 과거, 능력의 진실, 감정 (들킬까 긴장)
3. 반드시 성공해야 하는 이유: 시간 제한, 누군가의 생사

불안 변화 로드맵:
- 초반(1~20화): 생존의 불안 (죽을 수 있다)
- 중반(21~60화): 관계의 불안 (동료를 잃을 수 있다)
- 후반(61~100화): 정체성의 불안 (내가 누구인지 흔들린다)

## 호흡 속도 규칙
행동(전투/추격/도주) = 빠른 호흡
  짧은 문장. 빠른 전개. "검을 뽑았다. 몸을 낮췄다. 왼발이 먼저 갔다."

감정(내면/관계/상실) = 느린 호흡
  긴 문장도 허용. "칼을 쥔 손이 떨리는 게 두려움 때문인지 분노 때문인지, 그는 알 수 없었다."

비밀(정보/세계관/과거) = 지연
  한 번에 안 보여준다. 한 꺼풀씩.

폭로(반전/진실/정체) = 타이밍
  충분히 쌓인 후에 터뜨린다. "그 얼굴. 알고 있었다." 한 줄이면 충분.

## 문장 호흡 리듬
짧→중→길→짧 패턴. 같은 길이 3문장 연속 금지.

"피가 흘렀다."                             ← 짧 (충격)
"왼팔 어딘가에서. 정확히 어딘지는           ← 중 (인지)
 감각이 없어서 알 수 없었다."
"태민은 이를 악물었다. 통증이 아니라         ← 길 (감정)
 감각이 사라진다는 공포가 턱을 떨리게 만들었다."
"버텨."                                    ← 짧 (응축)

임팩트 순간 = 짧은 문장
감정 확장 = 긴 문장
짧은 문장 뒤 감각으로 이어붙이면 끊김 방지

## 감각 번역 — 감정을 신체로
감정 직접 쓰기 금지. 신체 반응으로 번역.

슬픔: 턱 떨림, 목 조임, 손톱이 손바닥 팜, 시야 흐려짐, 코끝 시큰
분노: 관자놀이 뜀, 주먹에 힘, 이 갈림, 목 뒤 뜨거움, 귀 붉어짐
공포: 등줄기 서늘, 입안 바짝 마름, 심장 요동, 손끝 차가움, 다리 힘 풀림
기쁨: 입꼬리 올라감(멈추려 했는데 안 됨), 가슴 뜨거움, 어깨 가벼움
긴장: 침 삼킴, 손바닥 땀, 숨 참음, 눈 좁아짐, 근육 굳음

금지: "그는 슬펐다" / "분노가 치밀었다" / "공포에 질렸다"

## 감정 잔향 시스템
큰 사건 후 1~3문장 고요 삽입:
전투 끝 → "조용해졌다. 바람 소리만 남았다. 검을 내려놓지 못했다. 한참을."
동료 상실 → 다음 화에서 무의식중에 두 그릇 차림. 멈춤.
큰 승리 → "이겼다. 그런데 웃음이 안 나왔다. 왜지."

## 주제 변주 5단계
1단계 기대(1~15화): 강해지면 뭔가를 얻는다
2단계 대가(16~35화): 강해질수록 주변이 무너진다
3단계 갈등(36~55화): 강함을 버리고 싶지만 못 버린다
4단계 수용(56~80화): 대가를 알면서도 선택한다
5단계 초월(81~100화): 강함의 정의 자체가 바뀐다

에피소드가 주제와 무관하면 그 화는 필요 없는 화.

## 대사 규칙 강화
설명용 대사 금지:
  나쁜 예: "너는 우리 가문의 후계자이기 때문에 반드시..."
  좋은 예: "네가 도망가면, 어머니는 죽어."

정보는 숨기듯 흘린다:
  나쁜 예: "마정석은 마나를 응축한 물질로..."
  좋은 예: "이거 하나면 검 세 자루 값이야. 근데 넌 그걸 개한테 던졌어."

대사 길이: 3줄 이내. 핵심 대사는 1줄.
대사 뒤 반드시 행동/반응. 대사 탁구 금지.

## 4단계 집필 프로세스
반드시 아래 4단계를 내부적으로 수행한 후, 최종 본문만 출력하세요.
중간 과정(1~4단계 메모)은 절대 출력하지 마세요.

### 1단계: 감정 감독
- 주인공 감정의 시작점, 변화점, 폭발점 설계
- 독자가 느껴야 할 감정 설계
- 몰입 4요소 확인 (결핍/질문/지연/보상)
- 캐릭터 불안 3조건 확인
- 감정은 행동/신체반응으로만 드러낸다

### 2단계: 장면 감독
- 카메라 시점 (클로즈업/와이드)
- 공간 묘사 (시각, 청각, 후각, 촉각)
- 긴장 곡선 설계 (3중 긴장 확인)
- 호흡 속도 결정 (행동=빠르게, 감정=느리게)
- 한 장면 800자 이내

### 3단계: 초고 집필
- 설명 최소, 행동 중심
- 문장 리듬: 짧→중→길→짧 패턴
- 대사는 짧고 강렬하게, 전후에 표정/동작 묘사
- 왕복 대사(A-B-A-B) 금지
- 선택한 독백 톤 유지
- 감각 번역 적용 (감정→신체반응)

### 4단계: 수정
- AI스러운 표현 제거 (균일한 문장 길이, 정돈된 나열)
- 거친 초고 느낌 유지
- 감정 잔향 삽입 (큰 사건 후 고요)
- 3중 훅 확인 (오프닝/미드포인트/클로징)
- 몰입 4요소 최종 검증

## 절대 규칙
1. 분량: 반드시 ${TARGET_MIN_CHAR}자 이상 ${TARGET_MAX_CHAR}자 이하
2. 마크다운 서식 절대 금지 (**, *, #, - 등)
3. 순수한 소설 텍스트만 출력
4. 장면 전환은 빈 줄로만
5. 매 화 마지막 2줄은 클리프행어 (지정 유형: ${suggestedCliffhanger})
6. 매 화 최소 1개 보상 (정보/감정/능력/전개)
7. 한 화 완결 금지 - 미완의 긴장으로 끝낼 것
8. 첫 문장 어그로 필수

## 출력 형식
JSON으로만 응답:
{
  "episode": {
    "title": "화 제목",
    "content": "본문 전체 (줄바꿈은 \\n)",
    "endHook": "마지막 2줄"
  },
  "authorComment": "이 화의 핵심 포인트",
  "nextEpisodePreview": "다음 화 예고",
  "monologueTone": "${suggestedTone}"
}`;
}

// 유저 프롬프트 (가변 - 세계관 + 캐릭터 + 이전 화 + 방향 + Active Context + Writing Memory + PD 디렉팅)
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
    writingMemory
  } = params;

  // 세계관 세부 정보 섹션
  const worldDetailSection = buildWorldDetailSection(worldLayer);
  // 캐릭터 세부 정보 섹션
  const characterDetailSection = buildCharacterDetailSection(seedsLayer);
  // 에피소드 디렉팅 섹션 (PD 지시)
  const episodeDirectionSection = buildEpisodeDirectionSection(episodeDirection);

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

  return `${retryInstruction}${feedbackSection}${writingMemorySection}${episodeDirectionSection}
## 제${episodeNumber}화 작성 요청

${activeContextSection ? `
=== 일관성 엔진 (Active Context) ===
${activeContextSection}
=== 일관성 엔진 끝 ===
` : ''}

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

### 캐릭터 현재 상태
${characterProfiles || '(없음)'}

### 기억 잔상
${characterMemories || '(없음)'}
※ 이 경험들을 직접 언급하지 말고, 행동/반응/망설임에 자연스럽게 반영하세요.

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
  console.log('Contains "4단계":', systemPrompt.includes('4단계'));
  console.log('Contains "감정 감독":', systemPrompt.includes('감정 감독'));
  console.log('Contains "5000":', systemPrompt.includes('5000'));
  console.log('Contains "장면 감독":', systemPrompt.includes('장면 감독'));
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

    // 시스템 프롬프트 (고정 + 화수/톤 기반 동적 요소)
    const systemPrompt = buildSystemPrompt(persona, viewpoint, episodeNumber, previousMonologueTone);

    // 토큰 예산 모니터링
    const systemTokens = estimateTokens(systemPrompt);
    console.log('\n=== TOKEN BUDGET MONITORING ===');
    console.log(`시스템 프롬프트: ${systemTokens} 토큰 (예산: ${TOKEN_BUDGET.system})`);

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
    });

    // 토큰 예산 최종 확인
    const userTokens = estimateTokens(userPrompt);
    const totalTokens = systemTokens + userTokens;
    console.log(`유저 프롬프트: ${userTokens} 토큰`);
    console.log(`총 입력 토큰: ${totalTokens} (예산: ${TOKEN_BUDGET.TOTAL_MAX})`);

    if (totalTokens > TOKEN_BUDGET.TOTAL_MAX) {
      console.warn(`⚠️ 토큰 예산 초과! ${totalTokens} > ${TOKEN_BUDGET.TOTAL_MAX}`);
      // 경고만 기록하고 계속 진행 (API가 자체적으로 처리)
    } else {
      console.log(`✅ 토큰 예산 내: ${((totalTokens / TOKEN_BUDGET.TOTAL_MAX) * 100).toFixed(1)}% 사용`);
    }
    console.log('=== TOKEN BUDGET MONITORING END ===\n');

    // 스트리밍 응답 생성
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullText = '';

          const streamResponse = client.messages.stream({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            temperature: TEMPERATURE,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          });

          for await (const event of streamResponse) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              fullText += event.delta.text;
              // 실시간 텍스트 전송
              const chunk = JSON.stringify({ type: 'text', content: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
            }
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
                controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
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
                controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
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
              controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
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
            controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
          }

          controller.close();
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
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
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
    const errorData = JSON.stringify({
      type: 'error',
      message: '에피소드 작성 실패',
    });
    return new Response(`data: ${errorData}\n\n`, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  }
}
