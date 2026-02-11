import {
  CharacterSeed,
  EmergentProfile,
  Memory,
  NarrativeEvent,
  StorylinePreview,
  StorylineMetrics,
  StorylineWarning,
  IntegratedStoryline,
  StoryHealth,
  PreviewFrequency,
} from '../types';
import { generateStructure } from '../utils/api-client';

export class StorylineAnalyzer {
  /**
   * 프리뷰 생성 조건 확인
   */
  static shouldGeneratePreview(
    frequency: PreviewFrequency,
    year: number,
    startYear: number,
    events: NarrativeEvent[]
  ): boolean {
    if (frequency === 'off' || frequency === 'manual') return false;

    if (frequency === 'auto') {
      // turning_point 이벤트가 이번 연도에 존재할 때
      return events.some(e => e.year === year && e.importance === 'turning_point');
    }

    if (frequency === 'semi_auto') {
      // 5년마다
      return (year - startYear) % 5 === 0 && year !== startYear;
    }

    return false;
  }

  /**
   * 개별 캐릭터 스토리라인 프리뷰 생성
   */
  static async generatePreview(
    characterId: string,
    year: number,
    events: NarrativeEvent[],
    memories: Memory[],
    profile: EmergentProfile | undefined,
    seed: CharacterSeed,
    theme: string
  ): Promise<StorylinePreview> {
    const charEvents = events.filter(e => e.characterId === characterId);
    const recentEvents = charEvents.slice(-10);
    const recentMemories = memories.slice(-8);

    const eventsSummary = recentEvents
      .map(e => `[${e.year}/${e.season}] ${e.title}: ${e.summary} (${e.importance})`)
      .join('\n');

    const memoriesSummary = recentMemories
      .map(m => `[${m.year}] ${m.content} (감정: ${m.emotionalWeight}/100)`)
      .join('\n');

    const profileSummary = profile
      ? `이름: ${profile.displayName}, 성격: ${profile.personality.map(p => p.trait).join(', ')}, 신념: ${profile.beliefs.map(b => b.content).join(', ')}, 내적갈등: ${profile.innerConflicts.join(', ')}`
      : `코드명: ${seed.codename}, 기질: ${seed.temperament}`;

    const prompt = `당신은 서사 분석가입니다. 아래 캐릭터의 스토리라인을 분석하세요.

[주제/로그라인]
${theme || '(미설정)'}

[캐릭터 씨앗]
코드명: ${seed.codename}
초기상황: ${seed.initialCondition}
기질: ${seed.temperament}
근원상처: ${seed.wound}

[현재 프로필]
${profileSummary}

[최근 이벤트]
${eventsSummary || '(없음)'}

[기억 요약]
${memoriesSummary || '(없음)'}

[현재 연도] ${year}년, 나이: ${year - seed.birthYear}세

아래 JSON 형식으로 분석 결과를 출력하세요:
{
  "narrativeSoFar": "지금까지의 서사 흐름 1~2줄 요약",
  "characterSnapshot": "현재 캐릭터 상태 1줄",
  "projectedDirection": "앞으로 예상되는 방향 1~2줄",
  "metrics": {
    "themeAlignment": 0~100,
    "coherence": 0~100,
    "interest": 0~100,
    "characterDepth": 0~100,
    "awakeningPotential": 0~100
  },
  "warnings": [
    {"type": "theme_drift|flat_character|no_conflict|repetitive|dead_end|pacing", "severity": "low|medium|high|critical", "message": "경고 메시지", "detectedAtAge": 숫자}
  ]
}

awakeningPotential: "곧 전환점이 올 것 같은 긴장감". 높을수록 감정/갈등이 임계점에 가까움.

warnings는 실제 문제가 감지된 경우에만 포함하세요. 없으면 빈 배열.
JSON만 출력하세요.`;

    try {
      const raw = await generateStructure(prompt);
      const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        characterId,
        year,
        narrativeSoFar: parsed.narrativeSoFar || '',
        characterSnapshot: parsed.characterSnapshot || '',
        projectedDirection: parsed.projectedDirection || '',
        metrics: {
          themeAlignment: clamp(parsed.metrics?.themeAlignment ?? 50),
          coherence: clamp(parsed.metrics?.coherence ?? 50),
          interest: clamp(parsed.metrics?.interest ?? 50),
          characterDepth: clamp(parsed.metrics?.characterDepth ?? 50),
          awakeningPotential: clamp(parsed.metrics?.awakeningPotential ?? 30),
        },
        warnings: (parsed.warnings || []).map((w: StorylineWarning) => ({
          type: w.type,
          severity: w.severity || 'low',
          message: w.message || '',
          detectedAtAge: w.detectedAtAge || (year - seed.birthYear),
        })),
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('StorylineAnalyzer.generatePreview failed:', error);
      return {
        characterId,
        year,
        narrativeSoFar: '분석 실패',
        characterSnapshot: '분석 실패',
        projectedDirection: '분석 실패',
        metrics: { themeAlignment: 50, coherence: 50, interest: 50, characterDepth: 50, awakeningPotential: 30 },
        warnings: [],
        generatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * 통합 스토리라인 분석
   */
  static async generateIntegrated(
    previews: StorylinePreview[],
    theme: string
  ): Promise<IntegratedStoryline> {
    const previewsSummary = previews.map(p =>
      `[${p.characterId}] 서사: ${p.narrativeSoFar} | 상태: ${p.characterSnapshot} | 방향: ${p.projectedDirection} | 지표: 주제${p.metrics.themeAlignment} 일관${p.metrics.coherence} 흥미${p.metrics.interest} 깊이${p.metrics.characterDepth} | 경고: ${p.warnings.length}건`
    ).join('\n');

    const prompt = `당신은 서사 총괄 분석가입니다. 아래 캐릭터들의 스토리라인을 통합 분석하세요.

[주제/로그라인]
${theme || '(미설정)'}

[캐릭터별 프리뷰]
${previewsSummary}

아래 JSON 형식으로 분석하세요:
{
  "convergenceStatus": "캐릭터들의 서사 수렴/발산 현황 1줄",
  "betrayalPrediction": "배신/반전 가능성 분석 1줄",
  "overallThemeAlignment": 0~100,
  "overallInterest": 0~100,
  "storyHealth": "excellent|good|concerning|critical",
  "recommendation": "작가에게 권장하는 조치 1~2줄"
}

JSON만 출력하세요.`;

    try {
      const raw = await generateStructure(prompt);
      const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        characters: previews,
        convergenceStatus: parsed.convergenceStatus || '',
        betrayalPrediction: parsed.betrayalPrediction || '',
        overallThemeAlignment: clamp(parsed.overallThemeAlignment ?? 50),
        overallInterest: clamp(parsed.overallInterest ?? 50),
        storyHealth: validateHealth(parsed.storyHealth),
        recommendation: parsed.recommendation || '',
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('StorylineAnalyzer.generateIntegrated failed:', error);
      return {
        characters: previews,
        convergenceStatus: '분석 실패',
        betrayalPrediction: '분석 실패',
        overallThemeAlignment: 50,
        overallInterest: 50,
        storyHealth: 'good',
        recommendation: '분석에 실패했습니다.',
        generatedAt: new Date().toISOString(),
      };
    }
  }
}

function clamp(val: number): number {
  return Math.max(0, Math.min(100, Math.round(val)));
}

function validateHealth(val: string): StoryHealth {
  if (['excellent', 'good', 'concerning', 'critical'].includes(val)) return val as StoryHealth;
  return 'good';
}
