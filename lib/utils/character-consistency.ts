import type { WorldBible, EpisodeLog } from '@/lib/types';

export interface CharacterConsistencyWarning {
  characterName: string;
  warningType: 'sudden_change' | 'contradicts_core' | 'out_of_character';
  severity: 'minor' | 'major' | 'critical';
  episodeNumber: number;
  description: string;
  coreValue: string;      // World Bible에 정의된 값
  episodeValue: string;   // 에피소드에서 보인 행동
  suggestion: string;
}

export interface CharacterTrajectory {
  characterName: string;
  core: string;
  desire: string;
  weakness: string;
  stateHistory: {
    episodeNumber: number;
    state: string;
    change?: string;
  }[];
  currentState: string;
  consistencyScore: number; // 0-100
  warnings: CharacterConsistencyWarning[];
}

/**
 * 캐릭터 일관성을 추적하고 경고를 생성합니다.
 */
export function trackCharacterConsistency(
  worldBible: WorldBible,
  episodeLogs: EpisodeLog[],
  currentEpisodeNumber: number
): CharacterConsistencyWarning[] {
  const warnings: CharacterConsistencyWarning[] = [];
  const characters = worldBible.characters || {};

  for (const [name, character] of Object.entries(characters)) {
    // 캐릭터의 에피소드별 변화 수집
    const changes: { ep: number; change: string }[] = [];

    for (const log of episodeLogs) {
      if (log.characterChanges && log.characterChanges[name]) {
        changes.push({
          ep: log.episodeNumber,
          change: log.characterChanges[name],
        });
      }
    }

    // 급격한 성격 변화 감지 (연속 2화 이상에서 상반된 변화)
    if (changes.length >= 2) {
      const recentChanges = changes.slice(-3);
      const contradictions = detectContradictingChanges(recentChanges);

      for (const contradiction of contradictions) {
        warnings.push({
          characterName: name,
          warningType: 'sudden_change',
          severity: 'major',
          episodeNumber: contradiction.ep,
          description: `${name}의 행동/성격이 급격하게 변화했습니다.`,
          coreValue: character.core,
          episodeValue: contradiction.change,
          suggestion: `이전 변화와의 연결점을 만들거나, 변화의 계기를 명확히 해주세요.`,
        });
      }
    }

    // 핵심 성격(core)과의 모순 감지
    const lastChange = changes[changes.length - 1];
    if (lastChange) {
      const coreContradiction = detectCoreContradiction(
        character.core,
        character.weakness,
        lastChange.change
      );

      if (coreContradiction) {
        warnings.push({
          characterName: name,
          warningType: 'contradicts_core',
          severity: coreContradiction.severity,
          episodeNumber: lastChange.ep,
          description: `${name}의 행동이 설정된 핵심 성격과 모순됩니다.`,
          coreValue: character.core,
          episodeValue: lastChange.change,
          suggestion: coreContradiction.suggestion,
        });
      }
    }
  }

  // 우선순위 정렬
  warnings.sort((a, b) => {
    const severityOrder = { critical: 0, major: 1, minor: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return warnings;
}

/**
 * 연속 변화에서 상반되는 패턴 감지
 */
function detectContradictingChanges(
  changes: { ep: number; change: string }[]
): { ep: number; change: string }[] {
  const contradictions: { ep: number; change: string }[] = [];

  // 상반되는 키워드 쌍
  const opposites: [string[], string[]][] = [
    [['강해', '성장', '자신감'], ['약해', '좌절', '불안']],
    [['친밀', '신뢰', '가까워'], ['멀어', '불신', '갈등']],
    [['밝아', '희망', '긍정'], ['어두워', '절망', '부정']],
    [['열린', '개방'], ['닫힌', '폐쇄']],
  ];

  for (let i = 1; i < changes.length; i++) {
    const prev = changes[i - 1].change.toLowerCase();
    const curr = changes[i].change.toLowerCase();

    for (const [group1, group2] of opposites) {
      const prevInG1 = group1.some(k => prev.includes(k));
      const prevInG2 = group2.some(k => prev.includes(k));
      const currInG1 = group1.some(k => curr.includes(k));
      const currInG2 = group2.some(k => curr.includes(k));

      // 이전과 현재가 상반되는 그룹에 속하면 모순
      if ((prevInG1 && currInG2) || (prevInG2 && currInG1)) {
        contradictions.push(changes[i]);
        break;
      }
    }
  }

  return contradictions;
}

/**
 * 핵심 성격과의 모순 감지
 */
function detectCoreContradiction(
  core: string,
  weakness: string,
  recentChange: string
): { severity: 'minor' | 'major' | 'critical'; suggestion: string } | null {
  const coreLower = core.toLowerCase();
  const changeLower = recentChange.toLowerCase();

  // 핵심 성격과 상반되는 행동 패턴
  const coreTraits = extractTraits(coreLower);
  const changeTraits = extractTraits(changeLower);

  // 완전히 상반되는 특성이 있으면 critical
  const oppositeMap: Record<string, string[]> = {
    '냉정': ['충동적', '감정적', '격앙'],
    '신중': ['경솔', '무모'],
    '과묵': ['수다', '말이 많'],
    '용감': ['비겁', '겁쟁이'],
    '정직': ['거짓', '사기'],
    '이타적': ['이기적', '자기중심'],
    '차분': ['격앙', '분노'],
  };

  for (const trait of coreTraits) {
    const opposites = oppositeMap[trait];
    if (opposites && changeTraits.some(ct => opposites.includes(ct))) {
      return {
        severity: 'critical',
        suggestion: `${trait}한 성격의 캐릭터가 갑자기 상반된 모습을 보입니다. 점진적 변화 과정이 필요합니다.`,
      };
    }
  }

  // 약점과 완전히 반대되는 행동이면 주의 (성장 가능성)
  const weaknessLower = weakness.toLowerCase();
  if (changeLower.includes('극복') || changeLower.includes('성장')) {
    return {
      severity: 'minor',
      suggestion: `약점 극복은 좋지만, 너무 급격한 변화는 독자에게 어색할 수 있습니다.`,
    };
  }

  return null;
}

/**
 * 텍스트에서 성격 특성 추출
 */
function extractTraits(text: string): string[] {
  const traits: string[] = [];
  const keywords = [
    '냉정', '신중', '과묵', '용감', '정직', '이타적', '차분',
    '충동적', '감정적', '격앙', '경솔', '무모', '비겁', '거짓',
    '이기적', '분노', '수다', '말이 많',
  ];

  for (const kw of keywords) {
    if (text.includes(kw)) {
      traits.push(kw);
    }
  }

  return traits;
}

/**
 * 캐릭터의 전체 궤적을 생성합니다.
 */
export function buildCharacterTrajectory(
  worldBible: WorldBible,
  episodeLogs: EpisodeLog[]
): CharacterTrajectory[] {
  const trajectories: CharacterTrajectory[] = [];
  const characters = worldBible.characters || {};

  for (const [name, character] of Object.entries(characters)) {
    const stateHistory: CharacterTrajectory['stateHistory'] = [];

    // 에피소드별 상태 변화 수집
    for (const log of episodeLogs) {
      if (log.characterChanges && log.characterChanges[name]) {
        stateHistory.push({
          episodeNumber: log.episodeNumber,
          state: character.currentState,
          change: log.characterChanges[name],
        });
      }
    }

    // 경고 수집
    const warnings = trackCharacterConsistency(
      worldBible,
      episodeLogs,
      episodeLogs.length
    ).filter(w => w.characterName === name);

    // 일관성 점수 계산 (100에서 경고당 감점)
    const deductions = warnings.reduce((sum, w) => {
      if (w.severity === 'critical') return sum + 30;
      if (w.severity === 'major') return sum + 15;
      return sum + 5;
    }, 0);
    const consistencyScore = Math.max(0, 100 - deductions);

    trajectories.push({
      characterName: name,
      core: character.core,
      desire: character.desire,
      weakness: character.weakness,
      stateHistory,
      currentState: character.currentState,
      consistencyScore,
      warnings,
    });
  }

  return trajectories;
}

/**
 * 일관성 추적 대시보드용 데이터
 */
export function getCharacterConsistencyDashboard(
  worldBible: WorldBible,
  episodeLogs: EpisodeLog[]
): {
  trajectories: CharacterTrajectory[];
  overallScore: number;
  criticalWarnings: CharacterConsistencyWarning[];
  summary: string;
} {
  const trajectories = buildCharacterTrajectory(worldBible, episodeLogs);

  // 전체 평균 점수
  const overallScore = trajectories.length > 0
    ? Math.round(
        trajectories.reduce((sum, t) => sum + t.consistencyScore, 0) /
        trajectories.length
      )
    : 100;

  // critical 경고만 추출
  const criticalWarnings = trajectories
    .flatMap(t => t.warnings)
    .filter(w => w.severity === 'critical');

  // 요약 생성
  let summary = '';
  if (criticalWarnings.length > 0) {
    summary = `${criticalWarnings.length}개의 심각한 캐릭터 일관성 문제가 있습니다.`;
  } else if (overallScore >= 90) {
    summary = '캐릭터들의 일관성이 잘 유지되고 있습니다.';
  } else if (overallScore >= 70) {
    summary = '일부 캐릭터에서 약간의 불일치가 감지됩니다.';
  } else {
    summary = '캐릭터 일관성에 주의가 필요합니다.';
  }

  return {
    trajectories,
    overallScore,
    criticalWarnings,
    summary,
  };
}
