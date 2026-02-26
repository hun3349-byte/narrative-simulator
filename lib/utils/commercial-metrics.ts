/**
 * Commercial Metrics Dashboard (Task 3.1)
 * 에피소드의 상업성 지표를 분석하는 유틸리티
 */

import type {
  Episode,
  EpisodeLog,
  HookingScore,
  TensionPoint,
  TensionCurve,
  CommercialMetrics,
  CliffhangerType,
} from '@/lib/types';

// 클리프행어 타입별 점수 가중치
const CLIFFHANGER_SCORES: Record<CliffhangerType, number> = {
  crisis: 90,
  revelation: 85,
  choice: 80,
  reversal: 95,
  awakening: 75,
  past_connection: 70,
  character_entrance: 65,
};

// 오프닝 훅 키워드 (강한 시작 감지)
const STRONG_OPENING_PATTERNS = [
  /^["""]/, // 대사로 시작
  /죽/, /피/, /불/, /검/, /칼/, // 강렬한 단어
  /비명/, /폭발/, /추락/, /충격/,
  /\?$/, // 의문으로 끝나는 첫 문장
];

// 감정 절정 키워드
const EMOTIONAL_PEAK_KEYWORDS = [
  '울었다', '눈물', '분노', '격노', '환희', '절망',
  '소리쳤다', '외쳤다', '비명', '포효', '통곡',
];

// 주요 폭로 키워드
const REVEAL_KEYWORDS = [
  '진실', '비밀', '사실은', '알고 있었', '정체',
  '숨겨', '감춰', '밝혀', '드러나',
];

/**
 * 에피소드의 Hooking Score 계산
 */
export function calculateHookingScore(
  episode: Episode,
  episodeLog?: EpisodeLog
): HookingScore {
  const content = episode.editedContent || episode.content;
  const lines = content.split('\n').filter(l => l.trim());
  const firstLine = lines[0] || '';
  const lastLines = lines.slice(-5).join('\n');

  // 1. 오프닝 훅 점수
  let openingHook = 50;
  if (STRONG_OPENING_PATTERNS.some(p => p.test(firstLine))) {
    openingHook = 80;
  }
  if (firstLine.length < 30 && firstLine.length > 5) {
    openingHook += 10; // 짧고 강렬한 시작
  }

  // 2. 클리프행어 점수
  let cliffhanger = 50;
  if (episodeLog?.cliffhangerType) {
    cliffhanger = CLIFFHANGER_SCORES[episodeLog.cliffhangerType] || 70;
  } else {
    // 마지막 줄 분석
    if (lastLines.includes('?') || lastLines.includes('...')) {
      cliffhanger = 70;
    }
    if (/그[때는|리고|러나]|하지만|그런데/.test(lastLines)) {
      cliffhanger = 75;
    }
  }

  // 3. 긴장 유지도
  const tensionMaintenance = calculateTensionMaintenance(content);

  // 4. 보상 밀도 (정보/능력/감정/전개 보상)
  const rewardDensity = calculateRewardDensity(content, episodeLog);

  // 5. 캐릭터 모멘텀
  const characterMomentum = calculateCharacterMomentum(content, episodeLog);

  // 플래그 계산
  const hasStrongOpening = openingHook >= 75;
  const hasCliffhanger = cliffhanger >= 70;
  const hasMajorReveal = REVEAL_KEYWORDS.some(kw => content.includes(kw));
  const hasEmotionalPeak = EMOTIONAL_PEAK_KEYWORDS.some(kw => content.includes(kw));

  // 종합 점수 (가중 평균)
  const overall = Math.round(
    openingHook * 0.2 +
    cliffhanger * 0.25 +
    tensionMaintenance * 0.2 +
    rewardDensity * 0.2 +
    characterMomentum * 0.15
  );

  // 개선 제안
  const suggestions: string[] = [];
  if (openingHook < 70) {
    suggestions.push('첫 문장을 더 강렬하게 시작해보세요. 대사나 행동으로 시작하면 효과적입니다.');
  }
  if (cliffhanger < 70) {
    suggestions.push('화 끝에 궁금증이나 위기감을 더 강하게 남겨보세요.');
  }
  if (tensionMaintenance < 60) {
    suggestions.push('중간에 긴장이 풀어지는 구간이 있습니다. 작은 갈등이나 의문을 추가해보세요.');
  }
  if (rewardDensity < 60) {
    suggestions.push('독자에게 주는 보상(정보, 감정, 능력 발현)이 부족합니다.');
  }

  return {
    episodeNumber: episode.number,
    overall,
    breakdown: {
      openingHook,
      cliffhanger,
      tensionMaintenance,
      rewardDensity,
      characterMomentum,
    },
    flags: {
      hasStrongOpening,
      hasCliffhanger,
      hasMajorReveal,
      hasEmotionalPeak,
    },
    suggestions,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * 긴장 유지도 계산
 */
function calculateTensionMaintenance(content: string): number {
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
  if (paragraphs.length === 0) return 50;

  // 각 단락의 긴장 요소 분석
  let tensionParagraphs = 0;
  const tensionKeywords = [
    '갑자기', '순간', '하지만', '그러나', '위험', '긴장',
    '심장', '숨', '떨', '노려보', '경계', '불안',
  ];

  paragraphs.forEach(p => {
    if (tensionKeywords.some(kw => p.includes(kw))) {
      tensionParagraphs++;
    }
  });

  const ratio = tensionParagraphs / paragraphs.length;
  return Math.min(100, Math.round(30 + ratio * 70));
}

/**
 * 보상 밀도 계산
 */
function calculateRewardDensity(content: string, episodeLog?: EpisodeLog): number {
  let score = 40; // 기본 점수

  // 정보 보상 (비밀, 진실, 발견)
  if (REVEAL_KEYWORDS.some(kw => content.includes(kw))) score += 15;

  // 감정 보상
  if (EMOTIONAL_PEAK_KEYWORDS.some(kw => content.includes(kw))) score += 15;

  // 능력/성장 보상
  const abilityKeywords = ['깨달', '각성', '습득', '성공', '이겼', '물리쳤'];
  if (abilityKeywords.some(kw => content.includes(kw))) score += 15;

  // 관계 보상
  if (episodeLog?.relationshipChanges && episodeLog.relationshipChanges.length > 0) {
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * 캐릭터 모멘텀 계산
 */
function calculateCharacterMomentum(content: string, episodeLog?: EpisodeLog): number {
  let score = 50;

  // 캐릭터 변화가 있으면 점수 상승
  if (episodeLog?.characterChanges) {
    score += Object.keys(episodeLog.characterChanges).length * 10;
  }

  // 대사가 적절하게 있으면 점수 상승
  const dialogueCount = (content.match(/[""].*?[""]/g) || []).length;
  const contentLength = content.length;
  const dialogueRatio = dialogueCount / (contentLength / 500);

  if (dialogueRatio >= 0.5 && dialogueRatio <= 2) {
    score += 15; // 적절한 대사 비율
  }

  return Math.min(100, score);
}

/**
 * 긴장 커브 계산
 */
export function calculateTensionCurve(episode: Episode): TensionCurve {
  const content = episode.editedContent || episode.content;
  const totalLength = content.length;
  const sectionSize = Math.floor(totalLength / 10); // 10개 구간으로 나눔

  const points: TensionPoint[] = [];
  let prevLevel = 50;

  for (let i = 0; i < 10; i++) {
    const start = i * sectionSize;
    const end = (i + 1) * sectionSize;
    const section = content.substring(start, end);

    const level = analyzeSectionTension(section, prevLevel);
    const position = (i + 0.5) * 10; // 5%, 15%, 25%... 95%

    let type: 'rising' | 'peak' | 'falling' | 'valley';
    if (level > prevLevel + 10) {
      type = 'rising';
    } else if (level < prevLevel - 10) {
      type = 'falling';
    } else if (level >= 80) {
      type = 'peak';
    } else if (level <= 30) {
      type = 'valley';
    } else {
      type = level > prevLevel ? 'rising' : 'falling';
    }

    points.push({ position, level, type });
    prevLevel = level;
  }

  // 통계 계산
  const levels = points.map(p => p.level);
  const averageTension = Math.round(levels.reduce((a, b) => a + b, 0) / levels.length);
  const peakCount = points.filter(p => p.type === 'peak').length;
  const valleyCount = points.filter(p => p.type === 'valley').length;

  // 커브 타입 결정
  let curveType: TensionCurve['curveType'];
  const firstHalf = levels.slice(0, 5);
  const secondHalf = levels.slice(5);
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / 5;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / 5;

  if (peakCount >= 3) {
    curveType = 'roller_coaster';
  } else if (secondAvg > firstAvg + 15) {
    curveType = 'back_loaded';
  } else if (firstAvg > secondAvg + 15) {
    curveType = 'front_loaded';
  } else if (Math.max(...levels) - Math.min(...levels) < 20) {
    curveType = 'flat';
  } else if (secondAvg > firstAvg) {
    curveType = 'steady_rise';
  } else {
    curveType = 'slow_build';
  }

  // 개선 추천
  let recommendation: string | undefined;
  if (curveType === 'flat') {
    recommendation = '긴장의 고저가 부족합니다. 중간에 작은 위기나 발견을 추가해보세요.';
  } else if (curveType === 'front_loaded') {
    recommendation = '후반부 긴장이 낮습니다. 화 끝으로 갈수록 긴장을 높여보세요.';
  } else if (valleyCount > 2) {
    recommendation = '긴장이 너무 자주 풀립니다. 저점 구간에도 작은 긴장 요소를 넣어보세요.';
  }

  return {
    episodeNumber: episode.number,
    points,
    averageTension,
    peakCount,
    valleyCount,
    curveType,
    recommendation,
  };
}

/**
 * 섹션별 긴장도 분석
 */
function analyzeSectionTension(section: string, prevLevel: number): number {
  let level = prevLevel;

  // 긴장 상승 키워드
  const tensionUp = ['갑자기', '순간', '비명', '위험', '죽', '피', '검', '칼', '불'];
  const tensionDown = ['평온', '안도', '미소', '웃', '휴식', '잠'];

  tensionUp.forEach(kw => {
    if (section.includes(kw)) level += 8;
  });

  tensionDown.forEach(kw => {
    if (section.includes(kw)) level -= 5;
  });

  // 대화가 많으면 약간 긴장 낮춤 (평온한 대화 가정)
  const dialogueCount = (section.match(/[""].*?[""]/g) || []).length;
  if (dialogueCount > 3) level -= 5;

  // 느낌표가 있으면 긴장 상승
  const exclamationCount = (section.match(/!/g) || []).length;
  level += exclamationCount * 3;

  // 범위 제한
  return Math.max(10, Math.min(100, level));
}

/**
 * 종합 Commercial Metrics 계산
 */
export function calculateCommercialMetrics(
  episode: Episode,
  episodeLog?: EpisodeLog
): CommercialMetrics {
  const hookingScore = calculateHookingScore(episode, episodeLog);
  const tensionCurve = calculateTensionCurve(episode);

  // 잔존율 예측 (Hooking Score 기반)
  const readRetentionEstimate = Math.round(
    hookingScore.overall * 0.6 +
    tensionCurve.averageTension * 0.4
  );

  // 다음 화 클릭 확률 (클리프행어 + 후반 긴장)
  const lastThreePoints = tensionCurve.points.slice(-3);
  const endTension = lastThreePoints.reduce((a, p) => a + p.level, 0) / 3;
  const nextClickProbability = Math.round(
    hookingScore.breakdown.cliffhanger * 0.6 +
    endTension * 0.4
  );

  return {
    episodeNumber: episode.number,
    hookingScore,
    tensionCurve,
    readRetentionEstimate,
    nextClickProbability,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 여러 에피소드의 평균 메트릭 계산
 */
export function calculateAverageMetrics(metrics: CommercialMetrics[]): {
  avgHookingScore: number;
  avgTension: number;
  avgRetention: number;
  avgNextClick: number;
  trend: 'improving' | 'declining' | 'stable';
} {
  if (metrics.length === 0) {
    return {
      avgHookingScore: 0,
      avgTension: 0,
      avgRetention: 0,
      avgNextClick: 0,
      trend: 'stable',
    };
  }

  const avgHookingScore = Math.round(
    metrics.reduce((a, m) => a + m.hookingScore.overall, 0) / metrics.length
  );
  const avgTension = Math.round(
    metrics.reduce((a, m) => a + m.tensionCurve.averageTension, 0) / metrics.length
  );
  const avgRetention = Math.round(
    metrics.reduce((a, m) => a + m.readRetentionEstimate, 0) / metrics.length
  );
  const avgNextClick = Math.round(
    metrics.reduce((a, m) => a + m.nextClickProbability, 0) / metrics.length
  );

  // 트렌드 계산 (최근 3화 vs 이전 3화)
  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  if (metrics.length >= 6) {
    const recent = metrics.slice(-3);
    const earlier = metrics.slice(-6, -3);
    const recentAvg = recent.reduce((a, m) => a + m.hookingScore.overall, 0) / 3;
    const earlierAvg = earlier.reduce((a, m) => a + m.hookingScore.overall, 0) / 3;

    if (recentAvg > earlierAvg + 5) trend = 'improving';
    else if (recentAvg < earlierAvg - 5) trend = 'declining';
  }

  return { avgHookingScore, avgTension, avgRetention, avgNextClick, trend };
}
