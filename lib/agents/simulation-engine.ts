import {
  Character,
  CharacterStats,
  CharacterSeed,
  CharacterArc,
  MasterArc,
  NarrativeEvent,
  NarrativeGrammarConfig,
  NPCPool,
  SimulationResponseV3,
  WorldEvent,
  SimulationConfig,
  SimulationResponse,
  SimulationResponseV2,
  ProgressUpdate,
  Memory,
  EmergentProfile,
  StoryDirectorConfig,
  WorldSettings,
  StorylineMonitorConfig,
  StorylinePreview,
  IntegratedStoryline,
  AnchorEvent,
  AuthorNarrativeArc,
  AuthorDirection,
  AuthorPersona,
} from '../types';
import { StorylineAnalyzer } from './storyline-analyzer';
import { AuthorAIEngine } from './author-ai-engine';
import { buildSimulationPrompt } from '../prompts/simulation-prompt';
import { buildSimulationPromptV2, buildBatchedPromptV2, buildYearRangePromptV2 } from '../prompts/simulation-prompt-v2';
import {
  buildCombinedDirectionSimulationPrompt,
  buildBatchedCombinedPrompt,
  buildYearRangeCombinedPrompt,
} from '../prompts/author-direction-prompt';
import { ProfileCalculator } from './profile-calculator';
import { GrammarEngine } from '../grammar/grammar-engine';
import { createArcsFromConfig } from '../grammar/arc-templates';
import { NPCDetector } from './npc-detector';
import { StoryDirector } from './story-director';
import { generateSimulation } from '../utils/api-client';
import worldSettings from '../../data/world-settings.json';

export class SimulationEngine {
  private characters: Character[];
  private worldEvents: WorldEvent[];
  private allEvents: NarrativeEvent[];
  private currentYear: number;
  private selectedCharacters: string[];

  // V2 fields
  private seeds?: CharacterSeed[];
  private memoryStacks: Record<string, Memory[]>;
  private profiles: Record<string, EmergentProfile>;

  // Grammar Engine
  private grammarEngine?: GrammarEngine;
  private grammarConfig?: NarrativeGrammarConfig;

  // NPC System
  private npcDetector?: NPCDetector;
  private npcPool: NPCPool;

  // Story Director
  private storyDirectorConfig?: StoryDirectorConfig;
  private worldSettingsFull?: WorldSettings;

  // Author AI (God mode)
  private authorAI?: AuthorAIEngine;
  private narrativeArcs: Record<string, AuthorNarrativeArc> = {};
  private authorPersona?: AuthorPersona;

  // Storyline Monitor
  private abortSignal?: AbortSignal;
  private pauseFlag: { paused: boolean };
  private monitorConfig?: StorylineMonitorConfig;
  private theme: string;
  private storylinePreviews: Record<string, StorylinePreview> = {};
  private integratedStoryline: IntegratedStoryline | null = null;

  constructor(
    config: SimulationConfig,
    existingEvents?: NarrativeEvent[],
    existingCharacters?: Character[],
    seeds?: CharacterSeed[],
    memoryStacks?: Record<string, Memory[]>,
    grammarConfig?: NarrativeGrammarConfig,
    existingCharacterArcs?: CharacterArc[],
    existingMasterArc?: MasterArc,
    npcPool?: NPCPool,
    storyDirectorConfig?: StoryDirectorConfig,
    worldSettingsFull?: WorldSettings,
    abortSignal?: AbortSignal,
    pauseFlag?: { paused: boolean },
    monitorConfig?: StorylineMonitorConfig,
    theme?: string,
    existingNarrativeArcs?: Record<string, AuthorNarrativeArc>,
  ) {
    this.seeds = seeds;
    this.memoryStacks = memoryStacks ? { ...memoryStacks } : {};
    this.profiles = {};

    this.characters = existingCharacters
      ? existingCharacters.map(c => ({ ...c, stats: { ...c.stats, specialStat: { ...c.stats.specialStat } }, emotionalState: { ...c.emotionalState }, profile: { ...c.profile, abilities: [...c.profile.abilities] } }))
      : [];  // 새 플로우에서는 항상 existingCharacters 또는 seeds가 전달됨
    this.worldEvents = config.worldEvents;
    this.allEvents = existingEvents ? [...existingEvents] : [];
    this.currentYear = config.startYear;
    this.selectedCharacters = config.selectedCharacters ?? this.characters.map(c => c.id);

    // V2: Initialize memory stacks for seeds
    if (this.seeds) {
      for (const seed of this.seeds) {
        if (!this.memoryStacks[seed.id]) {
          this.memoryStacks[seed.id] = [];
        }
      }
      // Compute initial profiles
      this.recomputeAllProfiles();
    }

    // NPC System initialization
    this.npcPool = npcPool || { npcs: [], maxActive: 20 };
    const knownIds = this.seeds
      ? this.seeds.map(s => s.id)
      : this.characters.map(c => c.id);
    this.npcDetector = new NPCDetector(this.npcPool, knownIds);

    // Story Director initialization
    this.storyDirectorConfig = storyDirectorConfig;
    this.worldSettingsFull = worldSettingsFull;

    // Storyline Monitor initialization
    this.abortSignal = abortSignal;
    this.pauseFlag = pauseFlag || { paused: false };
    this.monitorConfig = monitorConfig;
    this.theme = theme || '';

    // Author AI initialization
    this.authorPersona = storyDirectorConfig?.authorPersona;
    if (existingNarrativeArcs) {
      this.narrativeArcs = { ...existingNarrativeArcs };
      this.authorAI = new AuthorAIEngine(existingNarrativeArcs);
    } else if (this.isV2 && this.authorPersona) {
      this.authorAI = new AuthorAIEngine();
    }

    // Grammar Engine initialization
    this.grammarConfig = grammarConfig;
    if (grammarConfig?.enabled) {
      if (existingCharacterArcs && existingMasterArc) {
        // Restore from existing arcs
        this.grammarEngine = new GrammarEngine(existingMasterArc, existingCharacterArcs);
      } else {
        // Create new arcs from config
        const charIds = this.seeds
          ? this.seeds.map(s => s.id)
          : this.characters.map(c => c.id);
        const { characterArcs, masterArc } = createArcsFromConfig(
          grammarConfig,
          charIds,
          config.startYear,
          config.endYear
        );
        this.grammarEngine = new GrammarEngine(masterArc, characterArcs);
      }
    }
  }

  private get isV2(): boolean {
    return !!this.seeds && this.seeds.length > 0;
  }

  private recomputeAllProfiles() {
    if (!this.seeds) return;
    for (const seed of this.seeds) {
      this.profiles[seed.id] = ProfileCalculator.computeProfile(
        seed,
        this.memoryStacks[seed.id] || []
      );
    }
  }

  async runFullSimulation(
    config: SimulationConfig,
    onProgress: (update: ProgressUpdate) => void
  ): Promise<{ events: NarrativeEvent[]; characters: Character[]; memoryStacks?: Record<string, Memory[]>; profiles?: Record<string, EmergentProfile>; characterArcs?: CharacterArc[]; masterArc?: MasterArc; npcPool?: NPCPool; storylinePreviews?: Record<string, StorylinePreview>; integratedStoryline?: IntegratedStoryline | null; narrativeArcs?: Record<string, AuthorNarrativeArc> }> {
    let year = config.startYear;
    let aborted = false;

    // ★ Author AI: 시뮬레이션 전 서사 아크 설계
    if (this.authorAI && this.isV2 && this.seeds && this.authorPersona && Object.keys(this.narrativeArcs).length === 0) {
      onProgress({
        type: 'generating',
        message: '작가 AI가 서사 아크를 설계하고 있습니다...',
      });

      try {
        const arcs = await this.authorAI.designArcs(
          this.seeds,
          this.authorPersona,
          this.theme,
          this.worldSettingsFull || { worldName: '', description: '', genre: '', coreRule: '', era: '', factions: [], timeline: { startYear: config.startYear, currentYear: config.startYear, majorEras: [], worldEvents: [] } },
          config.startYear,
          config.endYear,
        );
        this.narrativeArcs = arcs;

        onProgress({
          type: 'arc_designed',
          message: `서사 아크 설계 완료 — ${Object.keys(arcs).length}명`,
          narrativeArcs: Object.values(arcs),
        });
      } catch (error) {
        console.error('Arc design failed:', error);
        onProgress({
          type: 'error',
          message: `서사 아크 설계 실패: ${error instanceof Error ? error.message : 'Unknown'}`,
        });
      }

      // 아크 설계 후 rate limit 방지
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    while (year <= config.endYear) {
      // Abort check
      if (this.abortSignal?.aborted) {
        aborted = true;
        break;
      }

      // Pause polling
      while (this.pauseFlag.paused && !this.abortSignal?.aborted) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (this.abortSignal?.aborted) {
        aborted = true;
        break;
      }

      const activeCharacters = this.isV2
        ? this.seeds!.filter(s => this.selectedCharacters.includes(s.id))
        : this.characters.filter(c => this.selectedCharacters.includes(c.id));

      const allChildhood = this.isV2
        ? (activeCharacters as CharacterSeed[]).every(s => (year - s.birthYear) < 6 && (year - s.birthYear) >= 0)
        : (activeCharacters as Character[]).every(c => (year - c.birthYear) < 6 && (year - c.birthYear) >= 0);

      if (allChildhood && year + 2 <= config.endYear) {
        const progress = Math.round(((year - config.startYear) / (config.endYear - config.startYear)) * 100);
        onProgress({
          type: 'year_start',
          year,
          message: `━━━ ${year}~${year + 2}년 (유년기 묶음) ━━━`,
          progress,
        });

        if (this.isV2) {
          await this.runYearRangeV2(year, year + 2, onProgress);
        } else {
          await this.runYearRange(year, year + 2, onProgress);
        }
        year += 3;
      } else {
        const progress = Math.round(((year - config.startYear) / (config.endYear - config.startYear)) * 100);
        onProgress({
          type: 'year_start',
          year,
          message: `━━━ ${year}년 시뮬레이션 시작 ━━━`,
          progress,
        });

        if (this.isV2) {
          if (config.batchMode) {
            await this.runYearBatchedV2(year, onProgress);
          } else {
            await this.runYearV2(year, onProgress);
          }
        } else {
          if (config.batchMode) {
            await this.runYearBatched(year, onProgress);
          } else {
            await this.runYear(year, onProgress);
          }
        }
        year += 1;
      }

      // Storyline preview generation
      if (this.monitorConfig && this.monitorConfig.previewFrequency !== 'off') {
        const shouldPreview = StorylineAnalyzer.shouldGeneratePreview(
          this.monitorConfig.previewFrequency,
          this.currentYear,
          config.startYear,
          this.allEvents
        );

        if (shouldPreview && this.isV2 && this.seeds) {
          try {
            const previews: StorylinePreview[] = [];
            for (const seed of this.seeds.filter(s => this.selectedCharacters.includes(s.id))) {
              const preview = await StorylineAnalyzer.generatePreview(
                seed.id,
                this.currentYear,
                this.allEvents,
                this.memoryStacks[seed.id] || [],
                this.profiles[seed.id],
                seed,
                this.theme
              );
              this.storylinePreviews[seed.id] = preview;
              previews.push(preview);
              onProgress({
                type: 'storyline_preview',
                message: `스토리라인 프리뷰: ${seed.codename}`,
                storylinePreview: preview,
              });
            }

            // Integrated analysis
            if (this.monitorConfig.integratedAnalysisEnabled && previews.length > 1) {
              const integrated = await StorylineAnalyzer.generateIntegrated(previews, this.theme);
              this.integratedStoryline = integrated;
              onProgress({
                type: 'integrated_storyline',
                message: `통합 스토리라인 분석: ${integrated.storyHealth}`,
                integratedStoryline: integrated,
              });

              // Auto-pause on critical
              if (integrated.storyHealth === 'critical' && this.monitorConfig.autoPauseOnCritical) {
                this.pauseFlag.paused = true;
                onProgress({
                  type: 'auto_paused',
                  message: '스토리라인 위험 감지 — 자동 일시정지',
                  integratedStoryline: integrated,
                  pauseReason: integrated.recommendation,
                });
              }
            }
          } catch (err) {
            console.error('Storyline preview generation failed:', err);
          }
        }
      }

      // API 레이트 리밋 방지
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    onProgress({
      type: aborted ? 'done' : 'done',
      message: aborted ? '시뮬레이션 중단됨' : '시뮬레이션 완료',
      progress: 100,
    });

    // V2: Convert seeds to characters for final state
    if (this.isV2) {
      this.recomputeAllProfiles();
      this.characters = this.seeds!.map(seed =>
        ProfileCalculator.toCharacter(seed, this.memoryStacks[seed.id] || [], this.currentYear)
      );
    }

    return {
      events: this.allEvents,
      characters: this.characters,
      ...(this.isV2 ? { memoryStacks: this.memoryStacks, profiles: this.profiles } : {}),
      ...(this.grammarEngine ? {
        characterArcs: this.grammarEngine.getAllCharacterArcs(),
        masterArc: this.grammarEngine.getMasterArc(),
      } : {}),
      npcPool: this.npcDetector?.getPool() || this.npcPool,
      storylinePreviews: this.storylinePreviews,
      integratedStoryline: this.integratedStoryline,
      narrativeArcs: Object.keys(this.narrativeArcs).length > 0 ? this.narrativeArcs : undefined,
    };
  }

  // ==================== V1 Methods (unchanged) ====================

  private async runYear(
    year: number,
    onProgress: (update: ProgressUpdate) => void
  ): Promise<NarrativeEvent[]> {
    const yearEvents: NarrativeEvent[] = [];
    const worldContext = this.getWorldContext(year);

    const activeCharacters = this.characters.filter(c =>
      this.selectedCharacters.includes(c.id)
    );

    const characterPromises = activeCharacters.map(async (character) => {
      if (year < character.birthYear) {
        return [];
      }

      const previousEvents = this.allEvents
        .filter(e => e.characterId === character.id)
        .slice(-5);

      const prompt = buildSimulationPrompt(character, year, worldContext, previousEvents);

      onProgress({
        type: 'generating',
        characterId: character.id,
        characterName: character.name,
        year,
        message: `${character.name}의 ${year}년 서사 생성 중...`,
      });

      try {
        const rawResponse = await generateSimulation(prompt);
        const parsed = this.parseResponse(rawResponse);

        this.updateCharacterState(character, parsed, year);

        const events: NarrativeEvent[] = parsed.events.map((e, idx) => ({
          id: `${character.id}-${year}-${idx}`,
          characterId: character.id,
          year,
          season: e.season,
          title: e.title,
          summary: e.summary,
          importance: e.importance,
          tags: e.tags,
          relatedCharacters: e.relatedCharacters || [],
          emotionalShift: e.emotionalShift ?? undefined,
          statsChange: e.statsChange ?? undefined,
          adopted: false,
          detailScene: undefined,
        }));

        onProgress({
          type: 'completed',
          characterId: character.id,
          characterName: character.name,
          year,
          message: `${character.name}의 ${year}년: ${events.length}개 이벤트 생성`,
          events,
        });

        return events;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        onProgress({
          type: 'error',
          characterId: character.id,
          characterName: character.name,
          year,
          message: `${character.name} ${year}년 생성 실패: ${msg}`,
        });
        return [];
      }
    });

    const results = await Promise.all(characterPromises);
    results.forEach(events => yearEvents.push(...events));

    const crossEvents = yearEvents.filter(
      e => e.relatedCharacters && e.relatedCharacters.length > 0
    );
    if (crossEvents.length > 0) {
      onProgress({
        type: 'cross_event',
        message: `교차 이벤트 ${crossEvents.length}건 감지`,
        events: crossEvents,
      });
    }

    this.allEvents.push(...yearEvents);
    this.currentYear = year;

    return yearEvents;
  }

  private async runYearBatched(
    year: number,
    onProgress: (update: ProgressUpdate) => void
  ): Promise<NarrativeEvent[]> {
    const worldContext = this.getWorldContext(year);
    const activeCharacters = this.characters.filter(c =>
      this.selectedCharacters.includes(c.id) && year >= c.birthYear
    );

    if (activeCharacters.length === 0) return [];

    const charSummaries = activeCharacters.map(c => {
      const recent = this.allEvents
        .filter(e => e.characterId === c.id)
        .slice(-3)
        .map(e => `[${e.year}/${e.season}] ${e.title}`)
        .join('; ');

      return `## ${c.name}(${c.alias}), ${year - c.birthYear}세, ${c.status}
성격: ${c.profile.personality}
동기: ${c.profile.motivation}
감정: ${c.emotionalState.primary}(${c.emotionalState.intensity}/100)
최근: ${recent || '없음'}`;
    }).join('\n\n');

    const charIds = activeCharacters.map(c => `"${c.id}":{...}`).join(',');

    const prompt = `판타지/무협 세계관 ${year}년. 아래 ${activeCharacters.length}캐릭터 각각의 이벤트를 2~3개씩 생성.
같은 시간축 위에서 각자 독립적으로 행동하되, 자연스러운 교차가 있으면 반영.

[세계 상황]
${worldContext}

${charSummaries}

[규칙]
- 뻔한 전개 금지, 반전 필수
- 캐릭터 간 교차 시 양쪽 모두에 반영
- 능력치/감정 변화 명시

[출력: JSON만]
{"characters":{${charIds}}}
각 캐릭터: {"events":[{"season":"","title":"","summary":"","importance":"","tags":[],"relatedCharacters":[],"emotionalShift":{"primary":"","intensity":0,"trigger":""},"statsChange":{}}],"yearEndStatus":""}`;

    onProgress({
      type: 'generating',
      characterId: 'all',
      characterName: '전체',
      year,
      message: `${year}년 ${activeCharacters.length}캐릭터 통합 서사 생성 중...`,
    });

    try {
      const rawResponse = await generateSimulation(prompt);
      const parsed = this.parseBatchedResponse(rawResponse);

      const yearEvents: NarrativeEvent[] = [];

      for (const character of activeCharacters) {
        const charData = parsed.characters[character.id];
        if (!charData) continue;

        this.updateCharacterState(character, charData, year);

        const events: NarrativeEvent[] = charData.events.map((e: SimulationResponse['events'][0], idx: number) => ({
          id: `${character.id}-${year}-${idx}`,
          characterId: character.id,
          year,
          season: e.season,
          title: e.title,
          summary: e.summary,
          importance: e.importance,
          tags: e.tags || [],
          relatedCharacters: e.relatedCharacters || [],
          emotionalShift: e.emotionalShift ?? undefined,
          statsChange: e.statsChange ?? undefined,
          adopted: false,
          detailScene: undefined,
        }));

        yearEvents.push(...events);

        onProgress({
          type: 'completed',
          characterId: character.id,
          characterName: character.name,
          year,
          message: `${character.name}: ${events.length}개 이벤트`,
          events,
        });
      }

      this.allEvents.push(...yearEvents);
      this.currentYear = year;
      return yearEvents;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      onProgress({
        type: 'error',
        year,
        message: `${year}년 통합 생성 실패: ${msg}`,
      });
      return [];
    }
  }

  private async runYearRange(
    startYear: number,
    endYear: number,
    onProgress: (update: ProgressUpdate) => void
  ): Promise<NarrativeEvent[]> {
    const worldContext = this.getWorldContext(startYear);
    const activeCharacters = this.characters.filter(c =>
      this.selectedCharacters.includes(c.id) && startYear >= c.birthYear
    );

    if (activeCharacters.length === 0) return [];

    const charSummaries = activeCharacters.map(c => {
      const recent = this.allEvents
        .filter(e => e.characterId === c.id)
        .slice(-3)
        .map(e => `[${e.year}/${e.season}] ${e.title}`)
        .join('; ');

      return `## ${c.name}(${c.alias}), ${startYear - c.birthYear}~${endYear - c.birthYear}세, ${c.status}
성격: ${c.profile.personality}
동기: ${c.profile.motivation}
최근: ${recent || '없음'}`;
    }).join('\n\n');

    const prompt = `판타지/무협 세계관 ${startYear}~${endYear}년(유년기). 아래 ${activeCharacters.length}캐릭터의 유년기 이벤트를 각 1~2개씩 생성.
유년기이므로 성장, 발견, 운명의 조짐 위주로.

[세계 상황]
${worldContext}

${charSummaries}

[규칙]
- 유년기 특유의 순수함과 운명의 복선
- 캐릭터별 1~2개 이벤트 (간결하게)

[출력: JSON만]
{"characters":{"캐릭터ID":{"events":[{"year":숫자,"season":"","title":"","summary":"","importance":"minor","tags":[],"relatedCharacters":[],"emotionalShift":{"primary":"","intensity":0,"trigger":""},"statsChange":{}}],"yearEndStatus":"childhood"}}}`;

    onProgress({
      type: 'generating',
      characterId: 'all',
      characterName: '전체',
      year: startYear,
      message: `${startYear}~${endYear}년 유년기 묶음 생성 중...`,
    });

    try {
      const rawResponse = await generateSimulation(prompt);
      const parsed = this.parseBatchedResponse(rawResponse);

      const rangeEvents: NarrativeEvent[] = [];

      for (const character of activeCharacters) {
        const charData = parsed.characters[character.id];
        if (!charData) continue;

        this.updateCharacterState(character, charData, endYear);

        const events: NarrativeEvent[] = charData.events.map((e: SimulationResponse['events'][0] & { year?: number }, idx: number) => ({
          id: `${character.id}-${e.year || startYear}-${idx}`,
          characterId: character.id,
          year: e.year || startYear + idx,
          season: e.season,
          title: e.title,
          summary: e.summary,
          importance: e.importance || 'minor',
          tags: e.tags || [],
          relatedCharacters: e.relatedCharacters || [],
          emotionalShift: e.emotionalShift ?? undefined,
          statsChange: e.statsChange ?? undefined,
          adopted: false,
          detailScene: undefined,
        }));

        rangeEvents.push(...events);

        onProgress({
          type: 'completed',
          characterId: character.id,
          characterName: character.name,
          year: startYear,
          message: `${character.name}: ${events.length}개 유년기 이벤트`,
          events,
        });
      }

      this.allEvents.push(...rangeEvents);
      this.currentYear = endYear;
      return rangeEvents;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      onProgress({
        type: 'error',
        year: startYear,
        message: `${startYear}~${endYear}년 유년기 생성 실패: ${msg}`,
      });
      return [];
    }
  }

  // ==================== V2 Methods ====================

  private async runYearV2(
    year: number,
    onProgress: (update: ProgressUpdate) => void
  ): Promise<NarrativeEvent[]> {
    const yearEvents: NarrativeEvent[] = [];
    const worldContext = this.getWorldContext(year);

    const activeSeeds = this.seeds!.filter(s =>
      this.selectedCharacters.includes(s.id) && year >= s.birthYear
    );

    const seedPromises = activeSeeds.map(async (seed) => {
      const profile = this.profiles[seed.id] || ProfileCalculator.computeProfile(seed, []);
      const recentMemories = (this.memoryStacks[seed.id] || []).slice(-5);
      const displayName = profile.displayName || seed.codename;

      // NPC pool summary
      const npcPoolSummary = this.npcDetector?.getPoolSummary(seed.id) || undefined;
      const anchorEvents = this.getAnchorEventsForYear(year);

      // ★ Author AI combined prompt (디렉션 + 시뮬레이션 1회 호출)
      const hasArc = this.authorAI && this.narrativeArcs[seed.id] && this.authorPersona;
      let prompt: string;

      if (hasArc) {
        const otherSummary = this.authorAI!.buildOtherCharactersSummary(
          this.seeds!, this.profiles, this.memoryStacks, seed.id, year
        );
        prompt = buildCombinedDirectionSimulationPrompt(
          seed, profile, year, worldContext, recentMemories,
          this.narrativeArcs[seed.id], this.authorPersona!, this.theme,
          otherSummary, npcPoolSummary,
          anchorEvents.length > 0 ? anchorEvents : undefined,
        );
      } else {
        // Fallback: 기존 프롬프트 (아크 미설계 시)
        const grammarDirective = this.grammarEngine?.getCurrentDirective(seed.id, year) ?? undefined;
        prompt = buildSimulationPromptV2(seed, profile, year, worldContext, recentMemories, grammarDirective, npcPoolSummary, anchorEvents.length > 0 ? anchorEvents : undefined);
      }

      onProgress({
        type: 'generating',
        characterId: seed.id,
        characterName: displayName,
        year,
        message: `${displayName}의 ${year}년 서사 생성 중...`,
      });

      try {
        const rawResponse = await generateSimulation(prompt);
        const parsed = this.parseResponseV3WithDirection(rawResponse);

        // ★ Author Direction 처리
        if (hasArc && parsed.authorDirection) {
          this.authorAI!.processDirection(seed.id, parsed.authorDirection, []);
          onProgress({
            type: 'author_direction',
            characterId: seed.id,
            characterName: displayName,
            year,
            message: `작가 디렉션: ${parsed.authorDirection.narrativeIntent}`,
            authorDirection: parsed.authorDirection,
          });
        }

        // Memory 생성 및 추가
        const newMemories = this.createMemories(seed.id, year, parsed);
        this.memoryStacks[seed.id] = [...(this.memoryStacks[seed.id] || []), ...newMemories];

        // 프로필 재계산
        this.profiles[seed.id] = ProfileCalculator.computeProfile(seed, this.memoryStacks[seed.id]);

        // NarrativeEvent 생성
        let events: NarrativeEvent[] = parsed.events.map((e, idx) => ({
          id: `${seed.id}-${year}-${idx}`,
          characterId: seed.id,
          year,
          season: e.season,
          title: e.title,
          summary: e.summary,
          importance: e.importance,
          tags: e.tags,
          relatedCharacters: e.relatedCharacters || [],
          emotionalShift: e.emotionalShift ?? undefined,
          statsChange: e.statsChange ?? undefined,
          adopted: false,
          detailScene: undefined,
        }));

        // ★ validateEvents: 평온한 나날 필터
        events = AuthorAIEngine.validateEvents(events);

        // Grammar: 이벤트별 비트 이행 추적
        if (this.grammarEngine) {
          for (const event of events) {
            this.grammarEngine.evaluateEvent(event);
          }
        }

        // NPC: 인터랙션 처리
        if (this.npcDetector && parsed.npcInteractions && parsed.npcInteractions.length > 0) {
          this.npcDetector.processInteractions(parsed.npcInteractions, seed.id, year, events);
        }

        // ★ Author Direction 후처리 (이벤트 결과 반영)
        if (hasArc && parsed.authorDirection) {
          this.authorAI!.processDirection(seed.id, parsed.authorDirection, events);
          // 아크 상태 동기화
          this.narrativeArcs = this.authorAI!.getNarrativeArcs();
        }

        const updatedName = this.profiles[seed.id].displayName || displayName;

        onProgress({
          type: 'completed',
          characterId: seed.id,
          characterName: updatedName,
          year,
          message: `${updatedName}의 ${year}년: ${events.length}개 이벤트, ${newMemories.length}개 기억`,
          events,
        });

        return events;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        onProgress({
          type: 'error',
          characterId: seed.id,
          characterName: displayName,
          year,
          message: `${displayName} ${year}년 생성 실패: ${msg}`,
        });
        return [];
      }
    });

    const results = await Promise.all(seedPromises);
    results.forEach(events => yearEvents.push(...events));

    const crossEvents = yearEvents.filter(
      e => e.relatedCharacters && e.relatedCharacters.length > 0
    );
    if (crossEvents.length > 0) {
      onProgress({
        type: 'cross_event',
        message: `교차 이벤트 ${crossEvents.length}건 감지`,
        events: crossEvents,
      });
    }

    this.allEvents.push(...yearEvents);
    this.currentYear = year;

    return yearEvents;
  }

  private async runYearBatchedV2(
    year: number,
    onProgress: (update: ProgressUpdate) => void
  ): Promise<NarrativeEvent[]> {
    const worldContext = this.getWorldContext(year);
    const activeSeeds = this.seeds!.filter(s =>
      this.selectedCharacters.includes(s.id) && year >= s.birthYear
    );

    if (activeSeeds.length === 0) return [];

    // NPC pool summary
    const npcPoolSummary = this.npcDetector?.getPoolSummary() || undefined;
    const anchorEvents = this.getAnchorEventsForYear(year);

    // ★ Author AI combined prompt or fallback
    const hasArcs = this.authorAI && this.authorPersona &&
      activeSeeds.every(s => !!this.narrativeArcs[s.id]);

    let prompt: string;
    if (hasArcs) {
      prompt = buildBatchedCombinedPrompt(
        activeSeeds, this.profiles, this.memoryStacks, year, worldContext,
        this.narrativeArcs, this.authorPersona!, this.theme,
        npcPoolSummary,
        anchorEvents.length > 0 ? anchorEvents : undefined,
      );
    } else {
      const grammarDirectives = this.grammarEngine
        ? Object.fromEntries(
            activeSeeds
              .map(s => [s.id, this.grammarEngine!.getCurrentDirective(s.id, year)])
              .filter(([, d]) => d !== null) as [string, NonNullable<ReturnType<GrammarEngine['getCurrentDirective']>>][]
          )
        : undefined;
      prompt = buildBatchedPromptV2(
        activeSeeds, this.profiles, this.memoryStacks, year, worldContext,
        grammarDirectives, npcPoolSummary,
        anchorEvents.length > 0 ? anchorEvents : undefined,
      );
    }

    onProgress({
      type: 'generating',
      characterId: 'all',
      characterName: '전체',
      year,
      message: `${year}년 ${activeSeeds.length}캐릭터 통합 서사+기억 생성 중...`,
    });

    try {
      const rawResponse = await generateSimulation(prompt);
      const parsed = this.parseBatchedResponseV3WithDirection(rawResponse);

      const yearEvents: NarrativeEvent[] = [];

      for (const seed of activeSeeds) {
        const charData = parsed.characters[seed.id];
        if (!charData) continue;

        // ★ Author Direction 처리
        if (hasArcs && charData.authorDirection) {
          this.authorAI!.processDirection(seed.id, charData.authorDirection, []);
        }

        // Memory 생성 및 추가
        const newMemories = this.createMemories(seed.id, year, charData);
        this.memoryStacks[seed.id] = [...(this.memoryStacks[seed.id] || []), ...newMemories];

        // 프로필 재계산
        this.profiles[seed.id] = ProfileCalculator.computeProfile(seed, this.memoryStacks[seed.id]);
        const displayName = this.profiles[seed.id].displayName || seed.codename;

        let events: NarrativeEvent[] = charData.events.map((e: SimulationResponse['events'][0], idx: number) => ({
          id: `${seed.id}-${year}-${idx}`,
          characterId: seed.id,
          year,
          season: e.season,
          title: e.title,
          summary: e.summary,
          importance: e.importance,
          tags: e.tags || [],
          relatedCharacters: e.relatedCharacters || [],
          emotionalShift: e.emotionalShift ?? undefined,
          statsChange: e.statsChange ?? undefined,
          adopted: false,
          detailScene: undefined,
        }));

        // ★ validateEvents: 평온한 나날 필터
        events = AuthorAIEngine.validateEvents(events);

        // Grammar: 이벤트별 비트 이행 추적
        if (this.grammarEngine) {
          for (const event of events) {
            this.grammarEngine.evaluateEvent(event);
          }
        }

        // NPC: 인터랙션 처리
        if (this.npcDetector && charData.npcInteractions && charData.npcInteractions.length > 0) {
          this.npcDetector.processInteractions(charData.npcInteractions, seed.id, year, events);
        }

        // ★ Author Direction 후처리
        if (hasArcs && charData.authorDirection) {
          this.authorAI!.processDirection(seed.id, charData.authorDirection, events);
        }

        yearEvents.push(...events);

        onProgress({
          type: 'completed',
          characterId: seed.id,
          characterName: displayName,
          year,
          message: `${displayName}: ${events.length}개 이벤트, ${newMemories.length}개 기억`,
          events,
        });
      }

      // ★ 아크 상태 동기화
      if (hasArcs) {
        this.narrativeArcs = this.authorAI!.getNarrativeArcs();
      }

      this.allEvents.push(...yearEvents);
      this.currentYear = year;
      return yearEvents;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      onProgress({
        type: 'error',
        year,
        message: `${year}년 통합 생성 실패: ${msg}`,
      });
      return [];
    }
  }

  private async runYearRangeV2(
    startYear: number,
    endYear: number,
    onProgress: (update: ProgressUpdate) => void
  ): Promise<NarrativeEvent[]> {
    const worldContext = this.getWorldContext(startYear);
    const activeSeeds = this.seeds!.filter(s =>
      this.selectedCharacters.includes(s.id) && startYear >= s.birthYear
    );

    if (activeSeeds.length === 0) return [];

    // NPC pool summary
    const npcPoolSummary = this.npcDetector?.getPoolSummary() || undefined;

    // ★ Author AI combined prompt or fallback
    const hasArcs = this.authorAI && this.authorPersona &&
      activeSeeds.every(s => !!this.narrativeArcs[s.id]);

    let prompt: string;
    if (hasArcs) {
      prompt = buildYearRangeCombinedPrompt(
        activeSeeds, this.profiles, this.memoryStacks, startYear, endYear,
        worldContext, this.narrativeArcs, this.authorPersona!, this.theme,
        npcPoolSummary,
      );
    } else {
      const grammarDirectives = this.grammarEngine
        ? Object.fromEntries(
            activeSeeds
              .map(s => [s.id, this.grammarEngine!.getCurrentDirective(s.id, startYear)])
              .filter(([, d]) => d !== null) as [string, NonNullable<ReturnType<GrammarEngine['getCurrentDirective']>>][]
          )
        : undefined;
      prompt = buildYearRangePromptV2(
        activeSeeds, this.profiles, this.memoryStacks, startYear, endYear,
        worldContext, grammarDirectives, npcPoolSummary,
      );
    }

    onProgress({
      type: 'generating',
      characterId: 'all',
      characterName: '전체',
      year: startYear,
      message: `${startYear}~${endYear}년 유년기 묶음 생성 중...`,
    });

    try {
      const rawResponse = await generateSimulation(prompt);
      const parsed = this.parseBatchedResponseV2(rawResponse);

      const rangeEvents: NarrativeEvent[] = [];

      for (const seed of activeSeeds) {
        const charData = parsed.characters[seed.id];
        if (!charData) continue;

        // Memory 생성 (연도 범위 이벤트)
        const newMemories = this.createMemoriesFromRange(seed.id, startYear, charData);
        this.memoryStacks[seed.id] = [...(this.memoryStacks[seed.id] || []), ...newMemories];

        // 프로필 재계산
        this.profiles[seed.id] = ProfileCalculator.computeProfile(seed, this.memoryStacks[seed.id]);
        const displayName = this.profiles[seed.id].displayName || seed.codename;

        const events: NarrativeEvent[] = charData.events.map((e: SimulationResponse['events'][0] & { year?: number }, idx: number) => ({
          id: `${seed.id}-${e.year || startYear}-${idx}`,
          characterId: seed.id,
          year: e.year || startYear + idx,
          season: e.season,
          title: e.title,
          summary: e.summary,
          importance: e.importance || 'minor',
          tags: e.tags || [],
          relatedCharacters: e.relatedCharacters || [],
          emotionalShift: e.emotionalShift ?? undefined,
          statsChange: e.statsChange ?? undefined,
          adopted: false,
          detailScene: undefined,
        }));

        // Grammar: 이벤트별 비트 이행 추적
        if (this.grammarEngine) {
          for (const event of events) {
            this.grammarEngine.evaluateEvent(event);
          }
        }

        rangeEvents.push(...events);

        onProgress({
          type: 'completed',
          characterId: seed.id,
          characterName: displayName,
          year: startYear,
          message: `${displayName}: ${events.length}개 유년기 이벤트, ${newMemories.length}개 기억`,
          events,
        });
      }

      this.allEvents.push(...rangeEvents);
      this.currentYear = endYear;
      return rangeEvents;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      onProgress({
        type: 'error',
        year: startYear,
        message: `${startYear}~${endYear}년 유년기 생성 실패: ${msg}`,
      });
      return [];
    }
  }

  // ==================== Parsing ====================

  /**
   * AI 응답에서 JSON을 추출하는 헬퍼.
   * - ```json ... ``` 블록 추출
   * - 첫 번째 { 와 마지막 } 사이 추출
   * - 불필요한 텍스트 제거
   */
  private extractJson(raw: string): string {
    // 1) ```json ... ``` 블록이 있으면 추출
    const jsonBlockMatch = raw.match(/```json\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      return jsonBlockMatch[1].trim();
    }

    // 2) ``` ... ``` 블록이 있으면 추출
    const codeBlockMatch = raw.match(/```\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      const inner = codeBlockMatch[1].trim();
      if (inner.startsWith('{') || inner.startsWith('[')) {
        return inner;
      }
    }

    // 3) 첫 번째 { 와 마지막 } 사이 추출
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return raw.slice(firstBrace, lastBrace + 1);
    }

    // 4) 그대로 반환 (파싱 시도)
    return raw.trim();
  }

  /**
   * 손상된 JSON 복구 시도
   */
  private tryRepairJson(broken: string): string {
    let repaired = broken;

    // 흔한 문제들 수정
    // 1) trailing comma 제거: ,] 또는 ,}
    repaired = repaired.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');

    // 2) 따옴표 없는 키 수정 시도 (간단한 케이스만)
    repaired = repaired.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');

    // 3) 단일 따옴표를 이중 따옴표로
    // (이미 이중 따옴표 안에 있는 건 건드리지 않음 - 복잡해서 생략)

    return repaired;
  }

  private parseResponse(raw: string): SimulationResponse {
    try {
      const extracted = this.extractJson(raw);
      return JSON.parse(extracted);
    } catch (e1) {
      // 복구 시도
      try {
        const repaired = this.tryRepairJson(this.extractJson(raw));
        return JSON.parse(repaired);
      } catch {
        console.error('JSON 파싱 실패:', (e1 as Error).message);
        console.error('원본 응답 (처음 500자):', raw.slice(0, 500));
        return {
          events: [{
            season: 'spring' as const,
            title: '평온한 나날',
            summary: '특별한 사건 없이 수련과 일상을 보냈다.',
            importance: 'minor' as const,
            tags: ['일상'],
            relatedCharacters: [],
            emotionalShift: null,
            statsChange: null,
          }],
          yearEndStatus: 'wandering' as const,
        };
      }
    }
  }

  private parseResponseV2(raw: string): SimulationResponseV2 {
    try {
      const extracted = this.extractJson(raw);
      const parsed = JSON.parse(extracted);
      return {
        events: parsed.events || [],
        yearEndStatus: parsed.yearEndStatus || 'wandering',
        memories: parsed.memories || [],
      };
    } catch (e1) {
      try {
        const repaired = this.tryRepairJson(this.extractJson(raw));
        const parsed = JSON.parse(repaired);
        return {
          events: parsed.events || [],
          yearEndStatus: parsed.yearEndStatus || 'wandering',
          memories: parsed.memories || [],
        };
      } catch {
        console.error('V2 JSON 파싱 실패:', (e1 as Error).message);
        console.error('원본 응답 (처음 500자):', raw.slice(0, 500));
        return {
          events: [{
            season: 'spring' as const,
            title: '평온한 나날',
            summary: '특별한 사건 없이 보냈다.',
            importance: 'minor' as const,
            tags: ['일상'],
            relatedCharacters: [],
            emotionalShift: null,
            statsChange: null,
          }],
          yearEndStatus: 'wandering' as const,
          memories: [{
            eventIndex: 0,
            content: '평온한 하루를 보냈다.',
            imprints: [{ type: 'emotion', content: '평온', intensity: 20, source: '일상' }],
            emotionalWeight: 20,
          }],
        };
      }
    }
  }

  private parseBatchedResponse(raw: string): { characters: Record<string, SimulationResponse> } {
    try {
      const extracted = this.extractJson(raw);
      return JSON.parse(extracted);
    } catch (e1) {
      try {
        const repaired = this.tryRepairJson(this.extractJson(raw));
        return JSON.parse(repaired);
      } catch {
        console.error('Batched JSON 파싱 실패:', (e1 as Error).message);
        console.error('원본 응답 (처음 500자):', raw.slice(0, 500));
        const fallback: { characters: Record<string, SimulationResponse> } = { characters: {} };
        this.characters.forEach(c => {
          fallback.characters[c.id] = {
            events: [{
              season: 'spring' as const,
              title: '평온한 나날',
              summary: '특별한 사건 없이 보냈다.',
              importance: 'minor' as const,
              tags: ['일상'],
              relatedCharacters: [],
              emotionalShift: null,
              statsChange: null,
            }],
            yearEndStatus: c.status,
          };
        });
        return fallback;
      }
    }
  }

  private parseResponseV3(raw: string): SimulationResponseV3 {
    try {
      const extracted = this.extractJson(raw);
      const parsed = JSON.parse(extracted);
      return {
        events: parsed.events || [],
        yearEndStatus: parsed.yearEndStatus || 'wandering',
        memories: parsed.memories || [],
        npcInteractions: parsed.npcInteractions || [],
      };
    } catch (e1) {
      try {
        const repaired = this.tryRepairJson(this.extractJson(raw));
        const parsed = JSON.parse(repaired);
        return {
          events: parsed.events || [],
          yearEndStatus: parsed.yearEndStatus || 'wandering',
          memories: parsed.memories || [],
          npcInteractions: parsed.npcInteractions || [],
        };
      } catch {
        console.error('V3 JSON 파싱 실패:', (e1 as Error).message);
        console.error('원본 응답 (처음 500자):', raw.slice(0, 500));
        return {
          events: [{
            season: 'spring' as const,
            title: '평온한 나날',
            summary: '특별한 사건 없이 보냈다.',
            importance: 'minor' as const,
            tags: ['일상'],
            relatedCharacters: [],
            emotionalShift: null,
            statsChange: null,
          }],
          yearEndStatus: 'wandering' as const,
          memories: [{
            eventIndex: 0,
            content: '평온한 하루를 보냈다.',
            imprints: [{ type: 'emotion', content: '평온', intensity: 20, source: '일상' }],
            emotionalWeight: 20,
          }],
          npcInteractions: [],
        };
      }
    }
  }

  /**
   * AuthorDirection이 포함된 V3 응답을 파싱한다.
   */
  private parseResponseV3WithDirection(raw: string): SimulationResponseV3 & { authorDirection?: AuthorDirection } {
    try {
      const extracted = this.extractJson(raw);
      const parsed = JSON.parse(extracted);
      return {
        events: parsed.events || [],
        yearEndStatus: parsed.yearEndStatus || 'wandering',
        memories: parsed.memories || [],
        npcInteractions: parsed.npcInteractions || [],
        authorDirection: parsed.authorDirection || undefined,
      };
    } catch (e1) {
      try {
        const repaired = this.tryRepairJson(this.extractJson(raw));
        const parsed = JSON.parse(repaired);
        return {
          events: parsed.events || [],
          yearEndStatus: parsed.yearEndStatus || 'wandering',
          memories: parsed.memories || [],
          npcInteractions: parsed.npcInteractions || [],
          authorDirection: parsed.authorDirection || undefined,
        };
      } catch {
        console.error('V3+Direction JSON 파싱 실패:', (e1 as Error).message);
        console.error('원본 응답 (처음 500자):', raw.slice(0, 500));
        return {
          events: [{
            season: 'spring' as const,
            title: '시뮬레이션 파싱 오류',
            summary: '이 연도의 시뮬레이션 결과를 파싱할 수 없었습니다.',
            importance: 'minor' as const,
            tags: ['오류'],
            relatedCharacters: [],
            emotionalShift: null,
            statsChange: null,
          }],
          yearEndStatus: 'wandering' as const,
          memories: [],
          npcInteractions: [],
        };
      }
    }
  }

  /**
   * AuthorDirection이 포함된 Batched V3 응답을 파싱한다.
   */
  private parseBatchedResponseV3WithDirection(raw: string): { characters: Record<string, SimulationResponseV3 & { authorDirection?: AuthorDirection }> } {
    try {
      const extracted = this.extractJson(raw);
      const parsed = JSON.parse(extracted);
      for (const id of Object.keys(parsed.characters || {})) {
        if (!parsed.characters[id].memories) parsed.characters[id].memories = [];
        if (!parsed.characters[id].npcInteractions) parsed.characters[id].npcInteractions = [];
      }
      return parsed;
    } catch (e1) {
      try {
        const repaired = this.tryRepairJson(this.extractJson(raw));
        const parsed = JSON.parse(repaired);
        for (const id of Object.keys(parsed.characters || {})) {
          if (!parsed.characters[id].memories) parsed.characters[id].memories = [];
          if (!parsed.characters[id].npcInteractions) parsed.characters[id].npcInteractions = [];
        }
        return parsed;
      } catch {
        console.error('Batched V3+Direction JSON 파싱 실패:', (e1 as Error).message);
        console.error('원본 응답 (처음 500자):', raw.slice(0, 500));
        const fallback: { characters: Record<string, SimulationResponseV3 & { authorDirection?: AuthorDirection }> } = { characters: {} };
        if (this.seeds) {
          this.seeds.forEach(s => {
            fallback.characters[s.id] = {
              events: [{
                season: 'spring' as const,
                title: '시뮬레이션 파싱 오류',
                summary: '통합 시뮬레이션 결과를 파싱할 수 없었습니다.',
                importance: 'minor' as const,
                tags: ['오류'],
                relatedCharacters: [],
                emotionalShift: null,
                statsChange: null,
              }],
              yearEndStatus: 'childhood' as const,
              memories: [],
              npcInteractions: [],
            };
          });
        }
        return fallback;
      }
    }
  }

  private parseBatchedResponseV3(raw: string): { characters: Record<string, SimulationResponseV3> } {
    try {
      const extracted = this.extractJson(raw);
      const parsed = JSON.parse(extracted);
      for (const id of Object.keys(parsed.characters || {})) {
        if (!parsed.characters[id].memories) parsed.characters[id].memories = [];
        if (!parsed.characters[id].npcInteractions) parsed.characters[id].npcInteractions = [];
      }
      return parsed;
    } catch (e1) {
      try {
        const repaired = this.tryRepairJson(this.extractJson(raw));
        const parsed = JSON.parse(repaired);
        for (const id of Object.keys(parsed.characters || {})) {
          if (!parsed.characters[id].memories) parsed.characters[id].memories = [];
          if (!parsed.characters[id].npcInteractions) parsed.characters[id].npcInteractions = [];
        }
        return parsed;
      } catch {
        console.error('Batched V3 JSON 파싱 실패:', (e1 as Error).message);
        console.error('원본 응답 (처음 500자):', raw.slice(0, 500));
        const fallback: { characters: Record<string, SimulationResponseV3> } = { characters: {} };
        if (this.seeds) {
          this.seeds.forEach(s => {
            fallback.characters[s.id] = {
              events: [{
                season: 'spring' as const,
                title: '평온한 나날',
                summary: '특별한 사건 없이 보냈다.',
                importance: 'minor' as const,
                tags: ['일상'],
                relatedCharacters: [],
                emotionalShift: null,
                statsChange: null,
              }],
              yearEndStatus: 'childhood' as const,
              memories: [{
                eventIndex: 0,
                content: '평온한 하루를 보냈다.',
                imprints: [{ type: 'emotion', content: '평온', intensity: 20, source: '일상' }],
                emotionalWeight: 20,
              }],
              npcInteractions: [],
            };
          });
        }
        return fallback;
      }
    }
  }

  private parseBatchedResponseV2(raw: string): { characters: Record<string, SimulationResponseV2> } {
    try {
      const extracted = this.extractJson(raw);
      const parsed = JSON.parse(extracted);
      // Ensure memories field exists for each character
      for (const id of Object.keys(parsed.characters || {})) {
        if (!parsed.characters[id].memories) {
          parsed.characters[id].memories = [];
        }
      }
      return parsed;
    } catch (e1) {
      try {
        const repaired = this.tryRepairJson(this.extractJson(raw));
        const parsed = JSON.parse(repaired);
        for (const id of Object.keys(parsed.characters || {})) {
          if (!parsed.characters[id].memories) {
            parsed.characters[id].memories = [];
          }
        }
        return parsed;
      } catch {
        console.error('Batched V2 JSON 파싱 실패:', (e1 as Error).message);
        console.error('원본 응답 (처음 500자):', raw.slice(0, 500));
        const fallback: { characters: Record<string, SimulationResponseV2> } = { characters: {} };
        if (this.seeds) {
          this.seeds.forEach(s => {
            fallback.characters[s.id] = {
              events: [{
                season: 'spring' as const,
                title: '평온한 나날',
                summary: '특별한 사건 없이 보냈다.',
                importance: 'minor' as const,
                tags: ['일상'],
                relatedCharacters: [],
                emotionalShift: null,
                statsChange: null,
              }],
              yearEndStatus: 'childhood' as const,
              memories: [{
                eventIndex: 0,
                content: '평온한 하루를 보냈다.',
                imprints: [{ type: 'emotion', content: '평온', intensity: 20, source: '일상' }],
                emotionalWeight: 20,
              }],
            };
          });
        }
        return fallback;
      }
    }
  }

  // ==================== Memory Helpers ====================

  private createMemories(
    characterId: string,
    year: number,
    response: SimulationResponseV2
  ): Memory[] {
    return (response.memories || []).map((mem, idx) => {
      const event = response.events[mem.eventIndex] || response.events[0];
      const eventId = `${characterId}-${year}-${mem.eventIndex ?? idx}`;
      return {
        id: `mem-${characterId}-${year}-${idx}`,
        characterId,
        year,
        season: event?.season || 'spring',
        eventId,
        content: mem.content,
        imprints: (mem.imprints || []).map(imp => ({
          type: imp.type as Memory['imprints'][0]['type'],
          content: imp.content,
          intensity: imp.intensity || 30,
          source: imp.source || '',
        })),
        emotionalWeight: mem.emotionalWeight || 30,
        tags: event?.tags || [],
      };
    });
  }

  private createMemoriesFromRange(
    characterId: string,
    startYear: number,
    response: SimulationResponseV2
  ): Memory[] {
    return (response.memories || []).map((mem, idx) => {
      const event = response.events[mem.eventIndex] || response.events[0];
      const eventYear = (event as SimulationResponse['events'][0] & { year?: number }).year || startYear + idx;
      const eventId = `${characterId}-${eventYear}-${mem.eventIndex ?? idx}`;
      return {
        id: `mem-${characterId}-${eventYear}-${idx}`,
        characterId,
        year: eventYear,
        season: event?.season || 'spring',
        eventId,
        content: mem.content,
        imprints: (mem.imprints || []).map(imp => ({
          type: imp.type as Memory['imprints'][0]['type'],
          content: imp.content,
          intensity: imp.intensity || 30,
          source: imp.source || '',
        })),
        emotionalWeight: mem.emotionalWeight || 30,
        tags: event?.tags || [],
      };
    });
  }

  // ==================== State Update (V1) ====================

  private updateCharacterState(character: Character, response: SimulationResponse, year: number) {
    character.status = response.yearEndStatus;
    character.age = year - character.birthYear;

    const lastEvent = response.events[response.events.length - 1];
    if (lastEvent?.emotionalShift) {
      character.emotionalState = lastEvent.emotionalShift;
    }

    response.events.forEach(event => {
      if (event.statsChange) {
        Object.entries(event.statsChange).forEach(([key, value]) => {
          if (key === 'specialStat' && typeof value === 'object' && value !== null) {
            const sv = value as { name?: string; value?: number };
            if (typeof sv.value === 'number') {
              character.stats.specialStat.value = Math.max(0, Math.min(10,
                character.stats.specialStat.value + sv.value
              ));
            }
          } else if (key in character.stats && typeof value === 'number') {
            const statKey = key as keyof Omit<CharacterStats, 'specialStat'>;
            (character.stats as unknown as Record<string, number>)[statKey] = Math.max(0, Math.min(10,
              (character.stats[statKey] as number) + value
            ));
          }
        });
      }
    });
  }

  // ==================== Utility ====================

  private getWorldContext(year: number): string {
    const activeWorldEvents = this.worldEvents
      .filter(we => we.year <= year)
      .slice(-5);

    const era = (worldSettings.timeline.majorEras as { name: string; years: number[]; description: string }[]).find(
      e => year >= e.years[0] && year <= e.years[1]
    );

    const currentEra = era ? `${era.name} (${era.description})` : '알 수 없는 시대';

    let base = `현재 시대: ${currentEra}\n최근 세계 사건:\n${activeWorldEvents.map(we => `- [${we.year}년] ${we.event}: ${we.impact}`).join('\n')}`.trim();

    // 4레이어 세계관 컨텍스트 추가
    if (this.worldSettingsFull?.worldLayers) {
      const layerContext = StoryDirector.buildWorldLayerContext(this.worldSettingsFull);
      if (layerContext) {
        base += '\n' + layerContext;
      }
    }

    // 연대기 컨텍스트 추가
    if (this.worldSettingsFull?.chronology) {
      const chron = this.worldSettingsFull.chronology;

      // 현재 시대 (연대기 기준)
      const chronEra = chron.eras.find(e => year >= e.years[0] && year <= e.years[1]);
      if (chronEra) {
        base += `\n[연대기 시대] ${chronEra.name}: ${chronEra.description} (분위기: ${chronEra.mood})`;
      }

      // worldState 요약
      if (chron.worldState) {
        base += `\n[세계 현황] ${chron.worldState}`;
      }

      // 직전 50년 사건 (최대 8건)
      const recentChronEvents = chron.events
        .filter(e => e.year <= year && e.year >= year - 50)
        .sort((a, b) => b.year - a.year)
        .slice(0, 8);
      if (recentChronEvents.length > 0) {
        base += '\n[연대기 근접 사건]\n' + recentChronEvents
          .map(e => `- [${e.year}년] ${e.title}: ${e.impact}${e.isMystery ? ' (미스터리)' : ''}`)
          .join('\n');
      }
    }

    return base;
  }

  /**
   * 해당 연도의 mandatory anchor events를 반환
   */
  private getAnchorEventsForYear(year: number): AnchorEvent[] {
    if (!this.worldSettingsFull?.anchorEvents) return [];
    return this.worldSettingsFull.anchorEvents.filter(a =>
      a.triggerYear === year && a.mandatory
    );
  }

  getCharacters(): Character[] {
    return this.characters;
  }

  getMemoryStacks(): Record<string, Memory[]> {
    return this.memoryStacks;
  }

  getProfiles(): Record<string, EmergentProfile> {
    return this.profiles;
  }

  getNPCPool(): NPCPool {
    return this.npcDetector?.getPool() || this.npcPool;
  }

  getCharacterArcs(): CharacterArc[] | undefined {
    return this.grammarEngine?.getAllCharacterArcs();
  }

  getMasterArc(): MasterArc | undefined {
    return this.grammarEngine?.getMasterArc();
  }

  setPaused(paused: boolean) {
    this.pauseFlag.paused = paused;
  }

  isPaused(): boolean {
    return this.pauseFlag.paused;
  }

  getStorylinePreviews(): Record<string, StorylinePreview> {
    return this.storylinePreviews;
  }

  getIntegratedStoryline(): IntegratedStoryline | null {
    return this.integratedStoryline;
  }

  getNarrativeArcs(): Record<string, AuthorNarrativeArc> {
    return this.narrativeArcs;
  }

  setNarrativeArc(characterId: string, arc: AuthorNarrativeArc): void {
    this.narrativeArcs[characterId] = arc;
    if (this.authorAI) {
      this.authorAI.setNarrativeArc(characterId, arc);
    }
  }
}
