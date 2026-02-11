import {
  CharacterSeed,
  EmergentProfile,
  Memory,
  AuthorPersona,
  WorldSettings,
  AnchorEvent,
  AuthorNarrativeArc,
  ArcPhase,
  ArcRevision,
  AuthorDirection,
  NarrativeEvent,
} from '../types';
import { buildArcDesignPrompt } from '../prompts/author-direction-prompt';
import { generateStructure } from '../utils/api-client';

/**
 * AuthorAIEngine — 작가 AI 시스템.
 * 시뮬레이션 전에 서사 아크를 설계하고, 시뮬레이션 중에 아크를 동적으로 조정한다.
 */
export class AuthorAIEngine {
  private narrativeArcs: Record<string, AuthorNarrativeArc> = {};
  private authorDirections: Record<string, AuthorDirection[]> = {};

  constructor(existingArcs?: Record<string, AuthorNarrativeArc>) {
    if (existingArcs) {
      this.narrativeArcs = { ...existingArcs };
    }
  }

  /**
   * 시뮬레이션 시작 전, 모든 캐릭터의 서사 아크를 AI로 설계한다.
   */
  async designArcs(
    seeds: CharacterSeed[],
    persona: AuthorPersona,
    theme: string,
    worldSettings: WorldSettings,
    startYear: number,
    endYear: number,
  ): Promise<Record<string, AuthorNarrativeArc>> {
    const worldSummary = this.buildWorldSummary(worldSettings);

    for (const seed of seeds) {
      const prompt = buildArcDesignPrompt(
        seed,
        persona,
        theme,
        worldSummary,
        seeds,
        worldSettings.anchorEvents,
        startYear,
        endYear,
      );

      try {
        const raw = await generateStructure(prompt);
        const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned);

        const arc: AuthorNarrativeArc = {
          characterId: seed.id,
          phases: (parsed.phases || []).map((p: ArcPhase, idx: number) => ({
            id: p.id || `phase-${idx + 1}`,
            name: p.name,
            estimatedAgeRange: p.estimatedAgeRange,
            intent: p.intent,
            keyMoments: p.keyMoments || [],
            emotionalArc: p.emotionalArc,
            endCondition: p.endCondition,
          })),
          currentPhaseIndex: 0,
          revisions: [],
          designedAt: new Date().toISOString(),
        };

        this.narrativeArcs[seed.id] = arc;
      } catch (error) {
        console.error(`Arc design failed for ${seed.codename}:`, error);
        // 폴백: 기본 3페이즈 아크 생성
        this.narrativeArcs[seed.id] = this.createFallbackArc(seed, startYear, endYear);
      }
    }

    return { ...this.narrativeArcs };
  }

  /**
   * AI 호출 실패 시 사용하는 기본 아크.
   */
  private createFallbackArc(seed: CharacterSeed, startYear: number, endYear: number): AuthorNarrativeArc {
    const totalYears = endYear - startYear;
    const birthAge = startYear - seed.birthYear;
    const endAge = endYear - seed.birthYear;
    const thirdAge = Math.floor(birthAge + totalYears / 3);
    const twoThirdAge = Math.floor(birthAge + (totalYears * 2) / 3);

    return {
      characterId: seed.id,
      phases: [
        {
          id: 'phase-1',
          name: '발단 — 세계와의 첫 대면',
          estimatedAgeRange: `${birthAge}~${thirdAge}세`,
          intent: '캐릭터가 세계를 인식하고, 근원 상처와 마주하며, 첫 번째 도전에 직면한다.',
          keyMoments: ['세계 인식', '근원 상처 자각', '첫 번째 도전'],
          emotionalArc: '혼란 → 두려움 → 작은 결의',
          endCondition: '캐릭터가 자신만의 목표를 품게 되면',
        },
        {
          id: 'phase-2',
          name: '전개 — 성장과 시련의 교차',
          estimatedAgeRange: `${thirdAge}~${twoThirdAge}세`,
          intent: '성장과 좌절이 반복되며, 캐릭터의 본질이 시험받는다.',
          keyMoments: ['중요한 만남', '예상치 못한 좌절', '잠재력 부분 각성'],
          emotionalArc: '결의 → 성장 → 좌절 → 재기',
          endCondition: '캐릭터가 근본적인 선택의 갈림길에 서면',
        },
        {
          id: 'phase-3',
          name: '수렴 — 선택과 결실',
          estimatedAgeRange: `${twoThirdAge}~${endAge}세`,
          intent: '쌓인 경험이 결실을 맺고, 캐릭터가 자신의 길을 확립한다.',
          keyMoments: ['결정적 선택', '잠재력 완전 각성', '다른 캐릭터와의 수렴'],
          emotionalArc: '갈등 → 결단 → 변화',
          endCondition: '캐릭터의 이야기가 새로운 국면으로 접어들면',
        },
      ],
      currentPhaseIndex: 0,
      revisions: [],
      designedAt: new Date().toISOString(),
    };
  }

  /**
   * 시뮬레이션 결과를 바탕으로 아크를 동적으로 조정한다.
   * authorDirection의 phaseTransition 필드를 체크하여 페이즈 전환.
   */
  processDirection(
    characterId: string,
    direction: AuthorDirection,
    events: NarrativeEvent[],
  ): void {
    const arc = this.narrativeArcs[characterId];
    if (!arc) return;

    // 디렉션 기록
    if (!this.authorDirections[characterId]) {
      this.authorDirections[characterId] = [];
    }
    this.authorDirections[characterId].push(direction);

    // 페이즈 전환 처리
    if (direction.phaseTransition && arc.currentPhaseIndex < arc.phases.length - 1) {
      const revision: ArcRevision = {
        year: direction.year,
        reason: direction.phaseTransition.reason,
        changes: `페이즈 전환: "${direction.phaseTransition.from}" → "${direction.phaseTransition.to}"`,
      };
      arc.revisions.push(revision);
      arc.currentPhaseIndex++;
    }

    // 전환점 이벤트가 아크 수정을 유발할 수 있음
    const turningPoints = events.filter(e => e.importance === 'turning_point');
    if (turningPoints.length > 0) {
      const currentPhase = arc.phases[arc.currentPhaseIndex];
      if (currentPhase) {
        // 전환점이 종료 조건을 가속시킬 수 있음 - 기록만 남긴다
        arc.revisions.push({
          year: direction.year,
          reason: `전환점 이벤트 감지: ${turningPoints.map(e => e.title).join(', ')}`,
          changes: '아크 진행 가속 가능',
        });
      }
    }
  }

  /**
   * 다른 캐릭터 요약을 생성한다.
   */
  buildOtherCharactersSummary(
    seeds: CharacterSeed[],
    profiles: Record<string, EmergentProfile>,
    memoryStacks: Record<string, Memory[]>,
    excludeId: string,
    year: number,
  ): string {
    return seeds
      .filter(s => s.id !== excludeId && year >= s.birthYear)
      .map(s => {
        const profile = profiles[s.id];
        const age = year - s.birthYear;
        const arc = this.narrativeArcs[s.id];
        const currentPhase = arc?.phases[arc.currentPhaseIndex];
        const displayName = profile?.displayName || s.codename;
        const recentMemories = (memoryStacks[s.id] || []).slice(-2);
        const recentStr = recentMemories.map(m => m.content).join('; ');
        return `${displayName}(${s.id}): ${age}세${currentPhase ? `, 서사: ${currentPhase.name}` : ''}${recentStr ? `, 최근: ${recentStr}` : ''}`;
      }).join('\n');
  }

  /**
   * WorldSettings를 요약 텍스트로 변환.
   */
  private buildWorldSummary(ws: WorldSettings): string {
    let summary = `${ws.worldName}: ${ws.description}\n장르: ${ws.genre}\n핵심 법칙: ${ws.coreRule}`;

    if (ws.worldLayers) {
      summary += `\n세계 법칙: ${ws.worldLayers.coreRule.law} (대가: ${ws.worldLayers.coreRule.cost})`;
      summary += `\n역사적 상처: ${ws.worldLayers.historicalWound.event}`;
      summary += `\n현재 갈등: ${ws.worldLayers.currentTension.powerStructure}`;
    }

    if (ws.factions && ws.factions.length > 0) {
      summary += `\n세력: ${ws.factions.map(f => f.name).join(', ')}`;
    }

    return summary;
  }

  // ==================== Getters ====================

  getNarrativeArcs(): Record<string, AuthorNarrativeArc> {
    return { ...this.narrativeArcs };
  }

  getNarrativeArc(characterId: string): AuthorNarrativeArc | undefined {
    return this.narrativeArcs[characterId];
  }

  getAuthorDirections(): Record<string, AuthorDirection[]> {
    return { ...this.authorDirections };
  }

  setNarrativeArc(characterId: string, arc: AuthorNarrativeArc): void {
    this.narrativeArcs[characterId] = arc;
  }

  /**
   * "평온한 나날" 이벤트를 필터링한다. 품질 관리용.
   */
  static validateEvents(events: NarrativeEvent[]): NarrativeEvent[] {
    const boringPatterns = ['평온', '조용', '무사', '별일 없', '평화로', '특별한 일 없'];
    return events.filter(event => {
      return !boringPatterns.some(p =>
        event.title.includes(p) || event.summary.includes(p)
      );
    });
  }
}
