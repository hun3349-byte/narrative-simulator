/**
 * Token Budget System for Prompt Optimization
 *
 * 세계관이 방대해져도 프롬프트 토큰 폭발을 방지하는 계층적 컨텍스트 시스템.
 * 정보를 줄이지 않고 선택한다. 전체 데이터는 Supabase에 보존.
 */

// 토큰 예산 상수
export const TOKEN_BUDGET = {
  system: 3000,           // 시스템 프롬프트 (고정)
  worldBible: 2000,       // 세계관 압축 (고정)
  previousEnding: 200,    // 직전 화 엔딩 500자 (고정)
  recentLogs: 900,        // 직전 3화 로그 (고정)
  characters: 1000,       // 이번 화 등장 캐릭터 상세 (동적)
  breadcrumbs: 300,       // 활성 떡밥 + 미해결 긴장 (동적)
  episodeMeta: 300,       // 메타 지시 (동적)
  writingMemory: 500,     // 학습된 규칙 (동적)
  episodeDirection: 500,  // PD 디렉팅 (있으면)
  buffer: 300,            // 여유
  TOTAL_MAX: 9000         // 입력 토큰 상한
} as const;

// 축소 단계별 예산
export const REDUCTION_LEVELS = {
  normal: TOKEN_BUDGET,
  reduced30: {
    ...TOKEN_BUDGET,
    characters: 700,
    breadcrumbs: 200,
    episodeMeta: 200,
    writingMemory: 350,
    episodeDirection: 350,
    TOTAL_MAX: 6300
  },
  reduced50: {
    ...TOKEN_BUDGET,
    characters: 500,
    breadcrumbs: 150,
    episodeMeta: 150,
    writingMemory: 250,
    episodeDirection: 250,
    recentLogs: 300,
    TOTAL_MAX: 4500
  },
  minimum: {
    ...TOKEN_BUDGET,
    characters: 300,
    breadcrumbs: 100,
    episodeMeta: 100,
    writingMemory: 0,
    episodeDirection: 0,
    recentLogs: 300,
    TOTAL_MAX: 3000
  }
} as const;

export type ReductionLevel = keyof typeof REDUCTION_LEVELS;

/**
 * 텍스트의 토큰 수를 추정
 * 한글 1자 ≈ 2토큰, 영문 1단어 ≈ 1.5토큰
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  // 한글 문자 수
  const koreanChars = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g) || []).length;

  // 영문 단어 수
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;

  // 숫자
  const numbers = (text.match(/\d+/g) || []).length;

  // 특수문자/공백
  const others = text.length - koreanChars - (text.match(/[a-zA-Z\d]/g) || []).length;

  // 추정
  const koreanTokens = koreanChars * 2;
  const englishTokens = Math.ceil(englishWords * 1.5);
  const otherTokens = Math.ceil(others * 0.5);
  const numberTokens = Math.ceil(numbers * 0.5);

  return koreanTokens + englishTokens + otherTokens + numberTokens;
}

/**
 * 객체를 JSON 문자열로 변환 후 토큰 추정
 */
export function estimateObjectTokens(obj: unknown): number {
  if (!obj) return 0;
  const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
  return estimateTokens(str);
}

/**
 * 프롬프트 섹션별 토큰 사용량
 */
export interface TokenUsage {
  system: number;
  worldBible: number;
  previousEnding: number;
  recentLogs: number;
  characters: number;
  breadcrumbs: number;
  episodeMeta: number;
  writingMemory: number;
  episodeDirection: number;
  total: number;
}

/**
 * 현재 토큰 사용량 계산
 */
export function calculateTokenUsage(sections: {
  system?: string;
  worldBible?: string;
  previousEnding?: string;
  recentLogs?: string;
  characters?: string;
  breadcrumbs?: string;
  episodeMeta?: string;
  writingMemory?: string;
  episodeDirection?: string;
}): TokenUsage {
  const usage: TokenUsage = {
    system: estimateTokens(sections.system || ''),
    worldBible: estimateTokens(sections.worldBible || ''),
    previousEnding: estimateTokens(sections.previousEnding || ''),
    recentLogs: estimateTokens(sections.recentLogs || ''),
    characters: estimateTokens(sections.characters || ''),
    breadcrumbs: estimateTokens(sections.breadcrumbs || ''),
    episodeMeta: estimateTokens(sections.episodeMeta || ''),
    writingMemory: estimateTokens(sections.writingMemory || ''),
    episodeDirection: estimateTokens(sections.episodeDirection || ''),
    total: 0
  };

  usage.total = Object.values(usage).reduce((sum, val) => sum + val, 0);
  return usage;
}

/**
 * 예산 초과 여부 확인
 */
export function isOverBudget(usage: TokenUsage, level: ReductionLevel = 'normal'): boolean {
  const budget = REDUCTION_LEVELS[level];
  return usage.total > budget.TOTAL_MAX;
}

/**
 * 초과된 섹션 확인 (우선순위 낮은 것부터)
 */
export function getOverBudgetSections(usage: TokenUsage, level: ReductionLevel = 'normal'): string[] {
  const budget = REDUCTION_LEVELS[level];
  const overSections: string[] = [];

  // 낮은 우선순위부터 확인 (⑨→⑧→⑦→⑥→⑤ 순)
  if (usage.episodeDirection > budget.episodeDirection) overSections.push('episodeDirection');
  if (usage.writingMemory > budget.writingMemory) overSections.push('writingMemory');
  if (usage.episodeMeta > budget.episodeMeta) overSections.push('episodeMeta');
  if (usage.breadcrumbs > budget.breadcrumbs) overSections.push('breadcrumbs');
  if (usage.characters > budget.characters) overSections.push('characters');

  return overSections;
}

/**
 * 텍스트를 목표 토큰 수 이내로 자르기
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
  if (!text) return '';

  const currentTokens = estimateTokens(text);
  if (currentTokens <= maxTokens) return text;

  // 대략적인 비율로 자르기
  const ratio = maxTokens / currentTokens;
  const targetLength = Math.floor(text.length * ratio * 0.9); // 10% 여유

  // 문장 단위로 자르기 시도
  const sentences = text.split(/(?<=[.!?。])\s*/);
  let result = '';

  for (const sentence of sentences) {
    if ((result + sentence).length > targetLength) break;
    result += sentence + ' ';
  }

  // 문장 단위로 자르면 너무 짧을 경우 글자 단위로
  if (result.length < targetLength * 0.5) {
    result = text.slice(0, targetLength) + '...';
  }

  return result.trim();
}

/**
 * 캐릭터 목록을 요약 (이름 + 한 줄 역할만)
 */
export function summarizeCharacters(
  characters: Array<{ name: string; role?: string; core?: string }>,
  maxTokens: number = 500
): string {
  if (!characters || characters.length === 0) return '';

  // 먼저 전체 요약 시도
  const summaries = characters.map(c =>
    `${c.name}: ${c.role || c.core || '역할 미정'}`
  );

  let result = summaries.join('\n');

  // 토큰 초과 시 줄이기
  while (estimateTokens(result) > maxTokens && summaries.length > 0) {
    // 뒤에서부터 제거하고 "외 N명" 추가
    const remaining = Math.ceil(summaries.length * 0.7);
    const kept = summaries.slice(0, remaining);
    const removed = summaries.length - remaining;
    result = kept.join('\n') + `\n(외 ${removed}명)`;
    summaries.length = remaining;
  }

  return result;
}

/**
 * 세력 구도를 요약
 */
export function summarizeFactions(
  factions: Array<{ name: string; goal?: string; nature?: string }>,
  maxTokens: number = 300
): string {
  if (!factions || factions.length === 0) return '';

  const summaries = factions.map(f =>
    `${f.name}: ${f.goal || f.nature || '세력'}`
  );

  let result = summaries.join(' vs ');

  // 토큰 초과 시 핵심만
  if (estimateTokens(result) > maxTokens) {
    const mainFactions = factions.slice(0, 3);
    result = mainFactions.map(f => f.name).join(' vs ');
    if (factions.length > 3) {
      result += ` (외 ${factions.length - 3}세력)`;
    }
  }

  return result;
}

/**
 * 역사 이벤트를 요약 (핵심 3~5개만)
 */
export function summarizeHistory(
  events: Array<{ name?: string; event?: string; when?: string; description?: string }>,
  maxTokens: number = 200
): string {
  if (!events || events.length === 0) return '';

  // 중요도 또는 최근 순으로 정렬 후 5개만
  const topEvents = events.slice(0, 5);

  const summaries = topEvents.map(e =>
    `${e.when || ''} ${e.name || e.event || e.description || '사건'}`.trim()
  );

  let result = summaries.join(' → ');

  if (estimateTokens(result) > maxTokens) {
    // 더 줄이기
    const reduced = summaries.slice(0, 3);
    result = reduced.join(' → ');
    if (events.length > 3) {
      result += ' → ...';
    }
  }

  return result;
}

/**
 * 프롬프트 섹션 빌더 결과
 */
export interface PromptSections {
  system: string;
  worldBible: string;
  previousEnding: string;
  recentLogs: string;
  characters: string;
  breadcrumbs: string;
  episodeMeta: string;
  writingMemory: string;
  episodeDirection: string;
}

/**
 * 예산에 맞게 섹션 축소
 */
export function fitToBudget(
  sections: PromptSections,
  level: ReductionLevel = 'normal'
): PromptSections {
  const budget = REDUCTION_LEVELS[level];
  const result = { ...sections };

  // 낮은 우선순위부터 축소 (⑨→⑧→⑦→⑥→⑤)
  result.episodeDirection = truncateToTokenLimit(result.episodeDirection, budget.episodeDirection);
  result.writingMemory = truncateToTokenLimit(result.writingMemory, budget.writingMemory);
  result.episodeMeta = truncateToTokenLimit(result.episodeMeta, budget.episodeMeta);
  result.breadcrumbs = truncateToTokenLimit(result.breadcrumbs, budget.breadcrumbs);
  result.characters = truncateToTokenLimit(result.characters, budget.characters);

  // 고정 섹션도 필요 시 축소
  result.recentLogs = truncateToTokenLimit(result.recentLogs, budget.recentLogs);

  return result;
}

/**
 * 다음 축소 레벨 반환
 */
export function getNextReductionLevel(current: ReductionLevel): ReductionLevel | null {
  const levels: ReductionLevel[] = ['normal', 'reduced30', 'reduced50', 'minimum'];
  const currentIndex = levels.indexOf(current);

  if (currentIndex === -1 || currentIndex >= levels.length - 1) {
    return null;
  }

  return levels[currentIndex + 1];
}

/**
 * 축소 레벨에 따른 에러 메시지
 */
export function getReductionMessage(level: ReductionLevel): string {
  switch (level) {
    case 'reduced30':
      return '컨텍스트 30% 축소하여 재시도 중...';
    case 'reduced50':
      return '컨텍스트 50% 축소하여 재시도 중...';
    case 'minimum':
      return '최소 컨텍스트로 재시도 중...';
    default:
      return '';
  }
}

/**
 * 최종 실패 시 구체적 에러 메시지
 */
export function getFinalErrorMessage(usage: TokenUsage): string {
  const overSections = getOverBudgetSections(usage, 'minimum');

  if (overSections.includes('characters')) {
    return '세계관 캐릭터가 너무 많습니다. 이번 화에 필요한 핵심 인물을 PD 디렉팅에서 지정해주세요.';
  }

  if (overSections.includes('worldBible')) {
    return '세계관이 너무 방대합니다. World Bible 재생성이 필요합니다.';
  }

  return '프롬프트 토큰이 초과되었습니다. 이번 화에 필요한 핵심만 선택해주세요.';
}
