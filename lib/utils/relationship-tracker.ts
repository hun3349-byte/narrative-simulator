import type { EpisodeLog } from '@/lib/types';

export interface RelationshipNode {
  id: string;
  name: string;
  isProtagonist?: boolean;
}

export interface RelationshipEdge {
  source: string;    // 캐릭터 이름
  target: string;    // 캐릭터 이름
  currentValue: number;  // -100 ~ +100 (적대 ~ 친밀)
  history: {
    episodeNumber: number;
    change: string;
    delta: number;  // 변화량
  }[];
  label?: string;   // 관계 레이블 (친구, 라이벌, 연인 등)
}

export interface RelationshipGraph {
  nodes: RelationshipNode[];
  edges: RelationshipEdge[];
  lastUpdated: number;  // 마지막 업데이트 에피소드
}

export interface RelationshipTrend {
  pair: string;        // "A-B" 형식
  trend: 'improving' | 'declining' | 'stable' | 'volatile';
  recentChanges: number[];  // 최근 5화 변화량
  prediction: string;  // 예측 코멘트
}

/**
 * 관계 변화 텍스트에서 수치 추출
 */
function parseRelationshipDelta(change: string): number {
  const lowerChange = change.toLowerCase();

  // 긍정적 변화
  const positivePatterns = [
    { pattern: /신뢰\s*\+?\s*(\d+)/, multiplier: 1 },
    { pattern: /친밀/, value: 15 },
    { pattern: /화해/, value: 20 },
    { pattern: /우정/, value: 15 },
    { pattern: /협력/, value: 10 },
    { pattern: /가까워/, value: 10 },
    { pattern: /호감/, value: 10 },
    { pattern: /구해/, value: 25 },
    { pattern: /도움/, value: 10 },
  ];

  // 부정적 변화
  const negativePatterns = [
    { pattern: /배신/, value: -30 },
    { pattern: /갈등/, value: -15 },
    { pattern: /불신/, value: -20 },
    { pattern: /멀어/, value: -10 },
    { pattern: /적대/, value: -25 },
    { pattern: /분노/, value: -15 },
    { pattern: /실망/, value: -10 },
    { pattern: /거리/, value: -10 },
  ];

  // 숫자로 명시된 경우 (예: "+20", "-15")
  const numMatch = change.match(/([+-])?\s*(\d+)/);
  if (numMatch) {
    const sign = numMatch[1] === '-' ? -1 : 1;
    return sign * parseInt(numMatch[2], 10);
  }

  // 패턴 매칭
  for (const { pattern, value } of positivePatterns) {
    if (pattern.test(lowerChange)) {
      return value || 10;
    }
  }

  for (const { pattern, value } of negativePatterns) {
    if (pattern.test(lowerChange)) {
      return value || -10;
    }
  }

  // 기본값: 언급만 되면 약한 긍정
  return 5;
}

/**
 * EpisodeLog에서 관계 그래프 빌드
 */
export function buildRelationshipGraph(
  episodeLogs: EpisodeLog[],
  protagonistName?: string
): RelationshipGraph {
  const nodesMap = new Map<string, RelationshipNode>();
  const edgesMap = new Map<string, RelationshipEdge>();

  for (const log of episodeLogs) {
    if (!log.relationshipChanges) continue;

    for (const rc of log.relationshipChanges) {
      const who = rc.who;
      const withWhom = rc.withWhom;
      const change = rc.change;

      // 노드 추가
      if (!nodesMap.has(who)) {
        nodesMap.set(who, {
          id: who,
          name: who,
          isProtagonist: protagonistName ? who === protagonistName : false,
        });
      }
      if (!nodesMap.has(withWhom)) {
        nodesMap.set(withWhom, {
          id: withWhom,
          name: withWhom,
          isProtagonist: protagonistName ? withWhom === protagonistName : false,
        });
      }

      // 엣지 키 (알파벳 순으로 정렬하여 일관성 유지)
      const edgeKey = [who, withWhom].sort().join('-');
      const delta = parseRelationshipDelta(change);

      if (!edgesMap.has(edgeKey)) {
        edgesMap.set(edgeKey, {
          source: who,
          target: withWhom,
          currentValue: delta,
          history: [{
            episodeNumber: log.episodeNumber,
            change,
            delta,
          }],
        });
      } else {
        const edge = edgesMap.get(edgeKey)!;
        edge.currentValue = Math.max(-100, Math.min(100, edge.currentValue + delta));
        edge.history.push({
          episodeNumber: log.episodeNumber,
          change,
          delta,
        });
      }
    }
  }

  // 관계 레이블 결정
  for (const edge of edgesMap.values()) {
    edge.label = getRelationshipLabel(edge.currentValue);
  }

  return {
    nodes: Array.from(nodesMap.values()),
    edges: Array.from(edgesMap.values()),
    lastUpdated: episodeLogs.length > 0 ? episodeLogs[episodeLogs.length - 1].episodeNumber : 0,
  };
}

/**
 * 관계 수치에 따른 레이블
 */
function getRelationshipLabel(value: number): string {
  if (value >= 80) return '절친/연인';
  if (value >= 50) return '친밀';
  if (value >= 20) return '우호적';
  if (value >= -20) return '중립';
  if (value >= -50) return '갈등';
  if (value >= -80) return '적대';
  return '숙적';
}

/**
 * 관계 트렌드 분석
 */
export function analyzeRelationshipTrends(
  graph: RelationshipGraph
): RelationshipTrend[] {
  const trends: RelationshipTrend[] = [];

  for (const edge of graph.edges) {
    const recentHistory = edge.history.slice(-5);
    const recentChanges = recentHistory.map(h => h.delta);

    // 트렌드 판단
    let trend: RelationshipTrend['trend'] = 'stable';
    const avg = recentChanges.reduce((a, b) => a + b, 0) / recentChanges.length;
    const variance = recentChanges.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / recentChanges.length;

    if (variance > 200) {
      trend = 'volatile';
    } else if (avg > 5) {
      trend = 'improving';
    } else if (avg < -5) {
      trend = 'declining';
    }

    // 예측
    let prediction = '';
    if (trend === 'improving') {
      prediction = `${edge.source}와 ${edge.target}의 관계가 좋아지고 있습니다.`;
    } else if (trend === 'declining') {
      prediction = `${edge.source}와 ${edge.target}의 관계가 악화되고 있습니다. 갈등 장면을 준비하세요.`;
    } else if (trend === 'volatile') {
      prediction = `${edge.source}와 ${edge.target}의 관계가 불안정합니다. 결정적인 사건이 필요합니다.`;
    } else {
      prediction = `${edge.source}와 ${edge.target}의 관계는 안정적입니다.`;
    }

    trends.push({
      pair: `${edge.source}-${edge.target}`,
      trend,
      recentChanges,
      prediction,
    });
  }

  return trends;
}

/**
 * 관계 변화 요약 생성
 */
export function getRelationshipSummary(
  graph: RelationshipGraph
): {
  totalRelationships: number;
  positiveRelationships: number;
  negativeRelationships: number;
  mostTense: RelationshipEdge | null;
  mostPositive: RelationshipEdge | null;
  volatileRelationships: string[];
} {
  const edges = graph.edges;

  const positiveRelationships = edges.filter(e => e.currentValue > 0).length;
  const negativeRelationships = edges.filter(e => e.currentValue < 0).length;

  const sortedByValue = [...edges].sort((a, b) => a.currentValue - b.currentValue);
  const mostTense = sortedByValue[0] || null;
  const mostPositive = sortedByValue[sortedByValue.length - 1] || null;

  // 변동성 분석
  const trends = analyzeRelationshipTrends(graph);
  const volatileRelationships = trends
    .filter(t => t.trend === 'volatile')
    .map(t => t.pair);

  return {
    totalRelationships: edges.length,
    positiveRelationships,
    negativeRelationships,
    mostTense,
    mostPositive,
    volatileRelationships,
  };
}

/**
 * 특정 캐릭터의 관계망 추출
 */
export function getCharacterRelationships(
  graph: RelationshipGraph,
  characterName: string
): {
  character: string;
  relationships: {
    with: string;
    value: number;
    label: string;
    trend: 'improving' | 'declining' | 'stable' | 'volatile';
    lastChange?: { episode: number; description: string };
  }[];
} {
  const relationships: {
    with: string;
    value: number;
    label: string;
    trend: 'improving' | 'declining' | 'stable' | 'volatile';
    lastChange?: { episode: number; description: string };
  }[] = [];

  const trends = analyzeRelationshipTrends(graph);
  const trendMap = new Map(trends.map(t => [t.pair, t.trend]));

  for (const edge of graph.edges) {
    if (edge.source === characterName || edge.target === characterName) {
      const other = edge.source === characterName ? edge.target : edge.source;
      const pair = [edge.source, edge.target].sort().join('-');
      const lastHistory = edge.history[edge.history.length - 1];

      relationships.push({
        with: other,
        value: edge.currentValue,
        label: edge.label || '중립',
        trend: trendMap.get(pair) || 'stable',
        lastChange: lastHistory ? {
          episode: lastHistory.episodeNumber,
          description: lastHistory.change,
        } : undefined,
      });
    }
  }

  // 친밀도 순 정렬
  relationships.sort((a, b) => b.value - a.value);

  return {
    character: characterName,
    relationships,
  };
}
