/**
 * 자가진화 피드백 루프 시스템 - Writing Memory
 *
 * AI가 학습하는 것들:
 * 1. 환님의 문체 선호 (styleRules)
 * 2. 자주 수정하는 패턴 (editPatterns)
 * 3. 품질 추적 (qualityTracker)
 * 4. 자주 하는 실수 (commonMistakes)
 */

// 피드백 카테고리 (기존 FeedbackType 확장)
export type FeedbackCategory = 'style' | 'character' | 'pacing' | 'tone' | 'structure' | 'dialogue' | 'description';

// 스타일 규칙
export interface StyleRule {
  id: string;
  category: FeedbackCategory;
  rule: string;               // "대사는 3줄 이내로"
  source: 'feedback' | 'edit_analysis';  // 어디서 추출했는지
  confidence: number;         // 0-100 (2회 반복 시 50, 3회 시 75, 4회+ 시 100)
  examples?: string[];        // 좋은 예시
  counterExamples?: string[]; // 나쁜 예시
  createdAt: string;
  lastAppliedAt?: string;
}

// 편집 패턴
export interface EditPattern {
  id: string;
  patternType: 'deletion' | 'replacement' | 'addition' | 'restructure';
  description: string;        // "감정 직접 서술 삭제"
  originalPattern: string;    // 원본에서 자주 보이는 패턴 (정규식 또는 설명)
  correctedPattern: string;   // 수정 후 패턴
  frequency: number;          // 발생 횟수
  examples: {
    original: string;
    edited: string;
    episodeNumber: number;
  }[];
  createdAt: string;
}

// 에피소드 품질 지표
export interface EpisodeQuality {
  episodeNumber: number;
  originalCharCount: number;
  finalCharCount: number;
  editAmount: number;         // 편집량 (%)
  adoptedDirectly: boolean;   // 직접 채택 여부
  feedbackCount: number;      // 피드백 횟수
  revisionCount: number;      // 수정 횟수
  status: 'drafted' | 'reviewed' | 'final';
  createdAt: string;
}

// 자주 하는 실수
export interface CommonMistake {
  id: string;
  category: FeedbackCategory;
  description: string;        // "긴 대화 핑퐁"
  frequency: number;          // 발생 횟수
  lastOccurred: number;       // 마지막 발생 에피소드
  severity: 'minor' | 'major';
  avoidanceRule: string;      // 회피 규칙
  createdAt: string;
}

// Writing Memory 전체 구조
export interface WritingMemory {
  styleRules: StyleRule[];
  editPatterns: EditPattern[];
  qualityTracker: EpisodeQuality[];
  commonMistakes: CommonMistake[];
  lastUpdatedAt: string;
  totalEpisodes: number;
  averageEditAmount: number;  // 평균 편집량 (%)
  directAdoptionRate: number; // 직접 채택률 (%)
}

/**
 * 빈 Writing Memory 생성
 */
export function createEmptyWritingMemory(): WritingMemory {
  return {
    styleRules: [],
    editPatterns: [],
    qualityTracker: [],
    commonMistakes: [],
    lastUpdatedAt: new Date().toISOString(),
    totalEpisodes: 0,
    averageEditAmount: 0,
    directAdoptionRate: 0,
  };
}

/**
 * 피드백에서 카테고리 자동 분류
 */
export function classifyFeedbackCategory(content: string): FeedbackCategory {
  const lowerContent = content.toLowerCase();

  // 구조 관련
  if (/구조|장면|전환|흐름|배치|순서/.test(lowerContent)) {
    return 'structure';
  }

  // 대화 관련
  if (/대사|대화|말|핑퐁|화법/.test(lowerContent)) {
    return 'dialogue';
  }

  // 묘사 관련
  if (/묘사|설명|서술|감각|풍경/.test(lowerContent)) {
    return 'description';
  }

  // 톤 관련
  if (/톤|분위기|무드|밝|어두|무거|가벼/.test(lowerContent)) {
    return 'tone';
  }

  // 페이스 관련
  if (/속도|빠르|느리|페이스|템포|급/.test(lowerContent)) {
    return 'pacing';
  }

  // 캐릭터 관련
  if (/캐릭터|인물|성격|말투|행동|반응/.test(lowerContent)) {
    return 'character';
  }

  // 기본: 스타일
  return 'style';
}

/**
 * 피드백이 패턴인지 판단 (유사 피드백 검색)
 */
export function findSimilarFeedback(
  newFeedback: string,
  existingRules: StyleRule[]
): StyleRule | null {
  const newLower = newFeedback.toLowerCase();
  const newKeywords = extractKeywords(newLower);

  for (const rule of existingRules) {
    const ruleKeywords = extractKeywords(rule.rule.toLowerCase());
    const overlap = newKeywords.filter(k => ruleKeywords.includes(k)).length;
    const similarity = overlap / Math.max(newKeywords.length, ruleKeywords.length);

    if (similarity > 0.5) {
      return rule;
    }
  }

  return null;
}

/**
 * 키워드 추출
 */
function extractKeywords(text: string): string[] {
  // 불용어 제거 후 키워드 추출
  const stopwords = ['이', '가', '을', '를', '의', '에', '에서', '으로', '로', '와', '과', '도', '는', '은', '해', '해줘', '좀', '더', '너무', '많이', '적게'];
  return text
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopwords.includes(w));
}

/**
 * 피드백을 StyleRule로 변환 (또는 기존 규칙 강화)
 */
export function processFeedback(
  memory: WritingMemory,
  feedback: string,
  episodeNumber: number
): WritingMemory {
  const category = classifyFeedbackCategory(feedback);
  const existingRule = findSimilarFeedback(feedback, memory.styleRules);

  if (existingRule) {
    // 기존 규칙 강화
    const updatedRules = memory.styleRules.map(rule => {
      if (rule.id === existingRule.id) {
        const newConfidence = Math.min(100, rule.confidence + 25);
        return {
          ...rule,
          confidence: newConfidence,
          lastAppliedAt: new Date().toISOString(),
        };
      }
      return rule;
    });

    return {
      ...memory,
      styleRules: updatedRules,
      lastUpdatedAt: new Date().toISOString(),
    };
  } else {
    // 새 규칙 생성 (초기 confidence: 25)
    const newRule: StyleRule = {
      id: `rule-${Date.now()}`,
      category,
      rule: feedback,
      source: 'feedback',
      confidence: 25,
      createdAt: new Date().toISOString(),
    };

    return {
      ...memory,
      styleRules: [...memory.styleRules, newRule],
      lastUpdatedAt: new Date().toISOString(),
    };
  }
}

/**
 * 직접 편집 분석 - 원본 vs 수정본 비교
 */
export function analyzeEdit(
  original: string,
  edited: string,
  episodeNumber: number
): {
  editAmount: number;
  patterns: Omit<EditPattern, 'id' | 'createdAt'>[];
} {
  const originalChars = original.length;
  const editedChars = edited.length;

  // 편집량 계산 (Levenshtein distance 기반 근사)
  const commonLength = Math.min(originalChars, editedChars);
  let sameChars = 0;
  for (let i = 0; i < commonLength; i++) {
    if (original[i] === edited[i]) sameChars++;
  }
  const editAmount = Math.round((1 - sameChars / Math.max(originalChars, editedChars)) * 100);

  // 패턴 추출
  const patterns: Omit<EditPattern, 'id' | 'createdAt'>[] = [];

  // 1. 삭제 패턴 감지 (원본에 있고 수정본에 없는 것)
  const deletedPhrases = findDeletedPhrases(original, edited);
  for (const phrase of deletedPhrases) {
    const description = inferDeletionReason(phrase);
    if (description) {
      patterns.push({
        patternType: 'deletion',
        description,
        originalPattern: phrase,
        correctedPattern: '',
        frequency: 1,
        examples: [{ original: phrase, edited: '', episodeNumber }],
      });
    }
  }

  // 2. 교체 패턴 감지
  const replacements = findReplacements(original, edited);
  for (const { from, to } of replacements) {
    const description = inferReplacementReason(from, to);
    if (description) {
      patterns.push({
        patternType: 'replacement',
        description,
        originalPattern: from,
        correctedPattern: to,
        frequency: 1,
        examples: [{ original: from, edited: to, episodeNumber }],
      });
    }
  }

  return { editAmount, patterns };
}

/**
 * 삭제된 구문 찾기 (간단한 휴리스틱)
 */
function findDeletedPhrases(original: string, edited: string): string[] {
  const deleted: string[] = [];
  const originalSentences = original.split(/[.!?]\s+/);
  const editedLower = edited.toLowerCase();

  for (const sentence of originalSentences) {
    if (sentence.length > 10 && !editedLower.includes(sentence.toLowerCase().slice(0, 20))) {
      deleted.push(sentence.slice(0, 50) + (sentence.length > 50 ? '...' : ''));
    }
  }

  return deleted.slice(0, 3);  // 최대 3개
}

/**
 * 교체된 표현 찾기
 */
function findReplacements(original: string, edited: string): { from: string; to: string }[] {
  const replacements: { from: string; to: string }[] = [];

  // 감정 직접 서술 → 행동 묘사 패턴
  const emotionPatterns = [
    /슬펐다|기뻤다|화가 났다|두려웠다|행복했다/g,
    /그는 느꼈다|그녀는 생각했다/g,
  ];

  for (const pattern of emotionPatterns) {
    const matches = original.match(pattern);
    if (matches && !edited.match(pattern)) {
      replacements.push({
        from: matches[0],
        to: '(행동/감각 묘사로 교체됨)',
      });
    }
  }

  return replacements.slice(0, 3);
}

/**
 * 삭제 이유 추론
 */
function inferDeletionReason(phrase: string): string | null {
  const lowerPhrase = phrase.toLowerCase();

  if (/슬펐다|기뻤다|느꼈다|생각했다/.test(lowerPhrase)) {
    return '감정 직접 서술 삭제';
  }
  if (/그리고|그래서|그러나|하지만/.test(lowerPhrase) && phrase.length < 20) {
    return '불필요한 접속사 삭제';
  }
  if (/매우|정말|너무|아주|굉장히/.test(lowerPhrase)) {
    return '과도한 수식어 삭제';
  }

  return null;
}

/**
 * 교체 이유 추론
 */
function inferReplacementReason(from: string, to: string): string | null {
  if (/슬펐다|기뻤다|느꼈다/.test(from)) {
    return '감정 직접 서술 → 행동/감각 묘사';
  }
  if (from.length > to.length * 1.5) {
    return '장황한 표현 → 간결한 표현';
  }

  return null;
}

/**
 * 편집 패턴을 Writing Memory에 통합
 */
export function integrateEditPatterns(
  memory: WritingMemory,
  patterns: Omit<EditPattern, 'id' | 'createdAt'>[]
): WritingMemory {
  const updatedPatterns = [...memory.editPatterns];

  for (const pattern of patterns) {
    // 유사 패턴 찾기
    const existingIndex = updatedPatterns.findIndex(
      p => p.description === pattern.description
    );

    if (existingIndex >= 0) {
      // 기존 패턴 강화
      updatedPatterns[existingIndex] = {
        ...updatedPatterns[existingIndex],
        frequency: updatedPatterns[existingIndex].frequency + 1,
        examples: [
          ...updatedPatterns[existingIndex].examples.slice(-2),
          ...pattern.examples,
        ],
      };
    } else {
      // 새 패턴 추가
      updatedPatterns.push({
        ...pattern,
        id: `pattern-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // 패턴에서 CommonMistake로 승격 (frequency >= 2)
  const newMistakes: CommonMistake[] = [];
  for (const pattern of updatedPatterns) {
    if (pattern.frequency >= 2) {
      const existingMistake = memory.commonMistakes.find(
        m => m.description === pattern.description
      );

      if (!existingMistake) {
        newMistakes.push({
          id: `mistake-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          category: inferCategoryFromPattern(pattern),
          description: pattern.description,
          frequency: pattern.frequency,
          lastOccurred: pattern.examples[pattern.examples.length - 1]?.episodeNumber || 0,
          severity: pattern.frequency >= 3 ? 'major' : 'minor',
          avoidanceRule: `${pattern.description} 금지. ${pattern.originalPattern} 대신 ${pattern.correctedPattern || '다른 표현'} 사용.`,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  // StyleRule로도 승격 (frequency >= 2)
  const newRules: StyleRule[] = [];
  for (const pattern of updatedPatterns) {
    if (pattern.frequency >= 2) {
      const existingRule = memory.styleRules.find(
        r => r.rule.includes(pattern.description)
      );

      if (!existingRule) {
        newRules.push({
          id: `rule-edit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          category: inferCategoryFromPattern(pattern),
          rule: `${pattern.description}하지 말 것`,
          source: 'edit_analysis',
          confidence: Math.min(100, 25 + pattern.frequency * 25),
          examples: pattern.examples.map(e => e.edited).filter(Boolean),
          counterExamples: pattern.examples.map(e => e.original),
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return {
    ...memory,
    editPatterns: updatedPatterns,
    commonMistakes: [...memory.commonMistakes, ...newMistakes],
    styleRules: [...memory.styleRules, ...newRules],
    lastUpdatedAt: new Date().toISOString(),
  };
}

/**
 * 패턴에서 카테고리 추론
 */
function inferCategoryFromPattern(pattern: EditPattern): FeedbackCategory {
  const desc = pattern.description.toLowerCase();

  if (/대사|대화/.test(desc)) return 'dialogue';
  if (/묘사|서술|감정/.test(desc)) return 'description';
  if (/구조|장면|전환/.test(desc)) return 'structure';
  if (/톤|분위기/.test(desc)) return 'tone';

  return 'style';
}

/**
 * 품질 지표 업데이트
 */
export function updateQualityTracker(
  memory: WritingMemory,
  quality: Omit<EpisodeQuality, 'createdAt'>
): WritingMemory {
  const newQuality: EpisodeQuality = {
    ...quality,
    createdAt: new Date().toISOString(),
  };

  const updatedTracker = [
    ...memory.qualityTracker.filter(q => q.episodeNumber !== quality.episodeNumber),
    newQuality,
  ].sort((a, b) => a.episodeNumber - b.episodeNumber);

  // 평균값 계산
  const totalEpisodes = updatedTracker.length;
  const averageEditAmount = totalEpisodes > 0
    ? Math.round(updatedTracker.reduce((sum, q) => sum + q.editAmount, 0) / totalEpisodes)
    : 0;
  const directAdoptions = updatedTracker.filter(q => q.adoptedDirectly).length;
  const directAdoptionRate = totalEpisodes > 0
    ? Math.round((directAdoptions / totalEpisodes) * 100)
    : 0;

  return {
    ...memory,
    qualityTracker: updatedTracker,
    totalEpisodes,
    averageEditAmount,
    directAdoptionRate,
    lastUpdatedAt: new Date().toISOString(),
  };
}

/**
 * 프롬프트용 Writing Memory 문자열 생성 (500토큰 이내)
 */
export function buildWritingMemoryPrompt(memory: WritingMemory): string {
  const sections: string[] = [];

  // 1. 필수 스타일 규칙 (confidence >= 50)
  const mustRules = memory.styleRules
    .filter(r => r.confidence >= 50)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  if (mustRules.length > 0) {
    sections.push(`### 필수 스타일 규칙 (환님이 반복 요청)
${mustRules.map(r => `- ${r.rule}`).join('\n')}`);
  }

  // 2. 자주 하는 실수 (frequency >= 2)
  const mistakes = memory.commonMistakes
    .filter(m => m.frequency >= 2)
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 3);

  if (mistakes.length > 0) {
    sections.push(`### 주의: 자주 하는 실수 (절대 금지)
${mistakes.map(m => `- ${m.avoidanceRule}`).join('\n')}`);
  }

  // 3. 최근 편집 패턴 (상위 3개)
  const recentPatterns = memory.editPatterns
    .filter(p => p.frequency >= 2)
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 3);

  if (recentPatterns.length > 0) {
    sections.push(`### 편집 시 자주 수정되는 패턴
${recentPatterns.map(p => `- "${p.originalPattern}" 대신 "${p.correctedPattern || '다른 표현'}"`).join('\n')}`);
  }

  // 4. 품질 피드백
  if (memory.totalEpisodes >= 3) {
    const trend = memory.averageEditAmount > 30
      ? '편집량이 높습니다. 더 정제된 초안을 작성하세요.'
      : memory.directAdoptionRate > 70
      ? '좋은 퀄리티를 유지하고 있습니다.'
      : '평균적인 수준입니다.';

    sections.push(`### 품질 현황
- 직접 채택률: ${memory.directAdoptionRate}%
- 평균 편집량: ${memory.averageEditAmount}%
- ${trend}`);
  }

  const result = sections.join('\n\n');

  // 500토큰 제한 (대략 1000자)
  if (result.length > 1000) {
    return result.slice(0, 1000) + '\n...(생략)';
  }

  return result;
}

/**
 * Writing Memory 통계 요약
 */
export function getWritingMemoryStats(memory: WritingMemory): {
  totalRules: number;
  highConfidenceRules: number;
  totalPatterns: number;
  totalMistakes: number;
  directAdoptionRate: number;
  averageEditAmount: number;
  recentTrend: 'improving' | 'stable' | 'declining';
} {
  // 최근 5화 트렌드
  const recent = memory.qualityTracker.slice(-5);
  const older = memory.qualityTracker.slice(-10, -5);

  let recentTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (recent.length >= 3 && older.length >= 3) {
    const recentAvg = recent.reduce((s, q) => s + q.editAmount, 0) / recent.length;
    const olderAvg = older.reduce((s, q) => s + q.editAmount, 0) / older.length;

    if (recentAvg < olderAvg - 5) {
      recentTrend = 'improving';
    } else if (recentAvg > olderAvg + 5) {
      recentTrend = 'declining';
    }
  }

  return {
    totalRules: memory.styleRules.length,
    highConfidenceRules: memory.styleRules.filter(r => r.confidence >= 75).length,
    totalPatterns: memory.editPatterns.length,
    totalMistakes: memory.commonMistakes.length,
    directAdoptionRate: memory.directAdoptionRate,
    averageEditAmount: memory.averageEditAmount,
    recentTrend,
  };
}
