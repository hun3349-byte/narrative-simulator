import type { EpisodeLog, Episode, CliffhangerType } from '@/lib/types';

// 감정 타입
export type EmotionType =
  | 'excitement'    // 흥분/기대
  | 'tension'       // 긴장
  | 'relief'        // 안도
  | 'sadness'       // 슬픔
  | 'anger'         // 분노
  | 'joy'           // 기쁨
  | 'fear'          // 공포
  | 'curiosity'     // 호기심
  | 'satisfaction'  // 만족
  | 'frustration';  // 좌절

// 감정 강도 (0-100)
export interface EmotionPoint {
  episodeNumber: number;
  emotion: EmotionType;
  intensity: number;  // 0-100
  reason?: string;
}

// 계획된 감정 로드맵
export interface PlannedEmotionRoadmap {
  totalEpisodes: number;
  milestones: {
    episode: number;
    targetEmotion: EmotionType;
    intensity: number;
    description: string;
  }[];
  arcs: {
    name: string;
    startEpisode: number;
    endEpisode: number;
    emotionCurve: EmotionType[];  // 아크 내 감정 흐름
  }[];
}

// 실제 진행 데이터
export interface ActualEmotionProgress {
  points: EmotionPoint[];
  currentEpisode: number;
}

// 비교 결과
export interface EmotionComparison {
  episodeNumber: number;
  planned: { emotion: EmotionType; intensity: number } | null;
  actual: { emotion: EmotionType; intensity: number } | null;
  deviation: number;  // 이탈도 (-100 ~ +100)
  status: 'on_track' | 'minor_deviation' | 'major_deviation' | 'off_track';
  suggestion?: string;
}

/**
 * 클리프행어 타입에서 주요 감정 추론
 */
function inferEmotionFromCliffhanger(cliffhangerType: CliffhangerType): EmotionType {
  const mapping: Record<CliffhangerType, EmotionType> = {
    'crisis': 'tension',
    'revelation': 'curiosity',
    'choice': 'tension',
    'reversal': 'excitement',
    'awakening': 'excitement',
    'past_connection': 'curiosity',
    'character_entrance': 'curiosity',
  };
  return mapping[cliffhangerType] || 'curiosity';
}

/**
 * 에피소드 로그에서 감정 추론
 */
function inferEmotionFromLog(log: EpisodeLog): EmotionPoint {
  // 클리프행어 타입 기반
  const emotion = inferEmotionFromCliffhanger(log.cliffhangerType);

  // 강도 계산 (빌드업 페이즈와 미니아크 위치 기반)
  let intensity = 50;

  if (log.buildupPhase === 'late') {
    intensity += 20;
  } else if (log.buildupPhase === 'middle') {
    intensity += 10;
  }

  // 미니아크의 절정(5화)에 가까울수록 강도 증가
  intensity += (log.miniArcPosition - 1) * 5;

  // 미해결 긴장 수에 따라 조정
  intensity += Math.min(15, (log.unresolvedTensions?.length || 0) * 3);

  return {
    episodeNumber: log.episodeNumber,
    emotion,
    intensity: Math.min(100, intensity),
    reason: `클리프행어: ${log.cliffhangerType}, 빌드업: ${log.buildupPhase}`,
  };
}

/**
 * 에피소드 로그에서 실제 감정 진행 추출
 */
export function extractActualEmotionProgress(
  episodeLogs: EpisodeLog[]
): ActualEmotionProgress {
  const points = episodeLogs.map(log => inferEmotionFromLog(log));

  return {
    points,
    currentEpisode: episodeLogs.length > 0 ? episodeLogs[episodeLogs.length - 1].episodeNumber : 0,
  };
}

/**
 * 기본 감정 로드맵 템플릿 생성 (100화 기준)
 */
export function generateDefaultEmotionRoadmap(totalEpisodes: number = 100): PlannedEmotionRoadmap {
  const milestones: PlannedEmotionRoadmap['milestones'] = [];
  const arcs: PlannedEmotionRoadmap['arcs'] = [];

  // 1~5화: 도입부 - 호기심 + 기대
  milestones.push({
    episode: 1,
    targetEmotion: 'curiosity',
    intensity: 60,
    description: '세계관과 주인공 소개, 호기심 유발',
  });
  milestones.push({
    episode: 5,
    targetEmotion: 'excitement',
    intensity: 75,
    description: '첫 번째 미니 클라이맥스, 독자 중독 포인트',
  });

  // 6~20화: 성장과 모험 - 흥분 + 긴장
  milestones.push({
    episode: 10,
    targetEmotion: 'tension',
    intensity: 65,
    description: '첫 번째 위기, 능력 힌트',
  });
  milestones.push({
    episode: 20,
    targetEmotion: 'satisfaction',
    intensity: 70,
    description: '첫 번째 아크 완료, 성장 확인',
  });

  // 21~40화: 심화 - 긴장 + 슬픔/분노
  milestones.push({
    episode: 30,
    targetEmotion: 'sadness',
    intensity: 80,
    description: '중요한 상실 또는 배신',
  });
  milestones.push({
    episode: 40,
    targetEmotion: 'anger',
    intensity: 75,
    description: '복수/결의 다짐',
  });

  // 41~60화: 반전 - 긴장 + 호기심
  milestones.push({
    episode: 50,
    targetEmotion: 'curiosity',
    intensity: 85,
    description: '중반부 대반전, 떡밥 회수 시작',
  });
  milestones.push({
    episode: 60,
    targetEmotion: 'tension',
    intensity: 80,
    description: '중요 진실 폭로',
  });

  // 61~80화: 클라이맥스 준비 - 긴장 + 공포
  milestones.push({
    episode: 70,
    targetEmotion: 'fear',
    intensity: 85,
    description: '최대 위기, 모든 것을 잃을 위험',
  });
  milestones.push({
    episode: 80,
    targetEmotion: 'tension',
    intensity: 90,
    description: '최종 결전 직전',
  });

  // 81~100화: 최종 클라이맥스 - 모든 감정 폭발
  milestones.push({
    episode: 90,
    targetEmotion: 'excitement',
    intensity: 95,
    description: '최종 결전 진행',
  });
  milestones.push({
    episode: 100,
    targetEmotion: 'satisfaction',
    intensity: 90,
    description: '대단원, 모든 떡밥 회수',
  });

  // 아크 정의
  arcs.push({
    name: '도입부',
    startEpisode: 1,
    endEpisode: 10,
    emotionCurve: ['curiosity', 'excitement', 'tension'],
  });
  arcs.push({
    name: '성장기',
    startEpisode: 11,
    endEpisode: 30,
    emotionCurve: ['excitement', 'tension', 'satisfaction', 'sadness'],
  });
  arcs.push({
    name: '시련기',
    startEpisode: 31,
    endEpisode: 50,
    emotionCurve: ['anger', 'tension', 'curiosity'],
  });
  arcs.push({
    name: '반전기',
    startEpisode: 51,
    endEpisode: 70,
    emotionCurve: ['curiosity', 'excitement', 'fear'],
  });
  arcs.push({
    name: '결전기',
    startEpisode: 71,
    endEpisode: 100,
    emotionCurve: ['tension', 'fear', 'excitement', 'satisfaction'],
  });

  return {
    totalEpisodes,
    milestones,
    arcs,
  };
}

/**
 * 계획된 로드맵과 실제 진행 비교
 */
export function compareEmotionProgress(
  planned: PlannedEmotionRoadmap,
  actual: ActualEmotionProgress
): EmotionComparison[] {
  const comparisons: EmotionComparison[] = [];

  for (const point of actual.points) {
    // 가장 가까운 마일스톤 찾기
    const milestone = planned.milestones.find(m => m.episode === point.episodeNumber);
    const nearestMilestone = planned.milestones.reduce((prev, curr) =>
      Math.abs(curr.episode - point.episodeNumber) < Math.abs(prev.episode - point.episodeNumber)
        ? curr
        : prev
    );

    // 이탈도 계산
    const plannedIntensity = milestone?.intensity || nearestMilestone?.intensity || 50;
    const intensityDiff = point.intensity - plannedIntensity;

    // 감정 일치 여부
    const emotionMatch = milestone?.targetEmotion === point.emotion ||
                        nearestMilestone?.targetEmotion === point.emotion;

    // 종합 이탈도
    let deviation = intensityDiff;
    if (!emotionMatch) {
      deviation += (deviation > 0 ? 20 : -20);  // 감정 불일치 시 페널티
    }

    // 상태 판정
    let status: EmotionComparison['status'];
    if (Math.abs(deviation) <= 10 && emotionMatch) {
      status = 'on_track';
    } else if (Math.abs(deviation) <= 25) {
      status = 'minor_deviation';
    } else if (Math.abs(deviation) <= 40) {
      status = 'major_deviation';
    } else {
      status = 'off_track';
    }

    // 제안
    let suggestion: string | undefined;
    if (status === 'major_deviation' || status === 'off_track') {
      if (deviation > 0) {
        suggestion = '감정 강도가 너무 높습니다. 호흡을 조절해 독자 피로를 방지하세요.';
      } else {
        suggestion = '감정 강도가 낮습니다. 긴장감을 높이는 장면이 필요합니다.';
      }
    }

    comparisons.push({
      episodeNumber: point.episodeNumber,
      planned: milestone ? {
        emotion: milestone.targetEmotion,
        intensity: milestone.intensity,
      } : null,
      actual: {
        emotion: point.emotion,
        intensity: point.intensity,
      },
      deviation,
      status,
      suggestion,
    });
  }

  return comparisons;
}

/**
 * 감정 로드맵 대시보드 데이터
 */
export function getEmotionRoadmapDashboard(
  episodeLogs: EpisodeLog[],
  plannedRoadmap?: PlannedEmotionRoadmap
): {
  actual: ActualEmotionProgress;
  planned: PlannedEmotionRoadmap;
  comparisons: EmotionComparison[];
  overallStatus: 'on_track' | 'minor_deviation' | 'major_deviation' | 'off_track';
  currentArc: string;
  nextMilestone: { episode: number; targetEmotion: EmotionType; description: string } | null;
  suggestions: string[];
} {
  const actual = extractActualEmotionProgress(episodeLogs);
  const planned = plannedRoadmap || generateDefaultEmotionRoadmap();
  const comparisons = compareEmotionProgress(planned, actual);

  // 전체 상태 (최근 5화 기준)
  const recentComparisons = comparisons.slice(-5);
  const statusCounts = { on_track: 0, minor_deviation: 0, major_deviation: 0, off_track: 0 };
  for (const c of recentComparisons) {
    statusCounts[c.status]++;
  }

  let overallStatus: EmotionComparison['status'];
  if (statusCounts.off_track >= 2) {
    overallStatus = 'off_track';
  } else if (statusCounts.major_deviation >= 2) {
    overallStatus = 'major_deviation';
  } else if (statusCounts.minor_deviation >= 3) {
    overallStatus = 'minor_deviation';
  } else {
    overallStatus = 'on_track';
  }

  // 현재 아크
  const currentEp = actual.currentEpisode;
  const currentArc = planned.arcs.find(a =>
    currentEp >= a.startEpisode && currentEp <= a.endEpisode
  )?.name || '도입부';

  // 다음 마일스톤
  const nextMilestone = planned.milestones.find(m => m.episode > currentEp) || null;

  // 제안 수집
  const suggestions = comparisons
    .filter(c => c.suggestion)
    .map(c => `${c.episodeNumber}화: ${c.suggestion}`);

  return {
    actual,
    planned,
    comparisons,
    overallStatus,
    currentArc,
    nextMilestone,
    suggestions: suggestions.slice(-3),  // 최근 3개만
  };
}

/**
 * 감정 곡선 시각화용 데이터
 */
export function getEmotionCurveData(
  episodeLogs: EpisodeLog[],
  plannedRoadmap?: PlannedEmotionRoadmap
): {
  labels: number[];  // 에피소드 번호
  actualIntensities: number[];
  plannedIntensities: number[];
  emotions: EmotionType[];
} {
  const planned = plannedRoadmap || generateDefaultEmotionRoadmap();
  const actual = extractActualEmotionProgress(episodeLogs);

  const labels = actual.points.map(p => p.episodeNumber);
  const actualIntensities = actual.points.map(p => p.intensity);
  const emotions = actual.points.map(p => p.emotion);

  // 계획된 강도 보간
  const plannedIntensities = labels.map(ep => {
    const milestone = planned.milestones.find(m => m.episode === ep);
    if (milestone) return milestone.intensity;

    // 보간
    const before = planned.milestones.filter(m => m.episode < ep).pop();
    const after = planned.milestones.find(m => m.episode > ep);

    if (!before && after) return after.intensity;
    if (before && !after) return before.intensity;
    if (before && after) {
      const ratio = (ep - before.episode) / (after.episode - before.episode);
      return before.intensity + ratio * (after.intensity - before.intensity);
    }
    return 50;
  });

  return {
    labels,
    actualIntensities,
    plannedIntensities,
    emotions,
  };
}
