import {
  NarrativeEvent,
  StoryDirectorConfig,
  StoryOutline,
  StoryEpisode,
  PlotThread,
  ARelevanceType,
  ARelevanceCheck,
  AuthorPersona,
  WorldSettings,
} from '../types';

/**
 * StoryDirector — 시뮬레이션 이벤트를 A 중심 스토리로 재배열하는 에이전트
 *
 * 핵심 기능:
 * 1. A 중심 스토리라인 구성
 * 2. B, C 이벤트의 A 연관도 평가
 * 3. 정보 공개 순서 결정
 * 4. 화 단위 분할
 */
export class StoryDirector {
  private config: StoryDirectorConfig;

  constructor(config: StoryDirectorConfig) {
    this.config = config;
  }

  /**
   * 시뮬레이션 이벤트를 스토리 순서로 재배열
   */
  composeStory(events: NarrativeEvent[]): StoryOutline {
    // 1단계: 캐릭터별 이벤트 분류
    const aEvents = events.filter(e => e.characterId === this.config.protagonistId);
    const otherEvents = events.filter(e => e.characterId !== this.config.protagonistId);

    // 2단계: B, C 이벤트의 A 연관도 체크
    const relevanceChecks = otherEvents.map(e => this.checkARelevance(e, aEvents));

    // 3단계: 연관 있는 이벤트만 선별
    const relevantOtherEvents = otherEvents.filter((_, idx) => relevanceChecks[idx].score > 0);

    // 4단계: 화 단위 분할 (시간순 기반, A 비중 6:2:2)
    const episodes = this.splitIntoEpisodes(aEvents, relevantOtherEvents, relevanceChecks.filter(r => r.score > 0));

    // 5단계: 떡밥 추적
    const plotThreads = this.detectPlotThreads(events);

    // A 비중 계산
    const totalEvents = episodes.reduce((sum, ep) => sum + ep.events.length, 0);
    const aCount = episodes.reduce((sum, ep) =>
      sum + ep.events.filter(eid => aEvents.some(e => e.id === eid)).length, 0);
    const aScreenTime = totalEvents > 0 ? Math.round((aCount / totalEvents) * 100) : 0;

    return { episodes, plotThreads, aScreenTime };
  }

  /**
   * B/C 이벤트의 A 연관도를 체크
   */
  checkARelevance(event: NarrativeEvent, aEvents: NarrativeEvent[]): ARelevanceCheck {
    const types: ARelevanceType[] = [];

    // 1. A와 직접 관련 (relatedCharacters에 A가 포함)
    if (event.relatedCharacters?.includes(this.config.protagonistId)) {
      types.push('direct_impact');
    }

    // 2. A의 이벤트와 같은 시간대 + 장소 태그 공유
    const samePeriodAEvents = aEvents.filter(ae =>
      ae.year === event.year && ae.season === event.season
    );
    if (samePeriodAEvents.some(ae =>
      ae.tags.some(t => event.tags.includes(t))
    )) {
      types.push('foreshadow');
    }

    // 3. A의 주요 테마 태그와 겹침 (거울 효과)
    const aThemeTags = new Set(aEvents.flatMap(e => e.tags));
    const sharedThemes = event.tags.filter(t => aThemeTags.has(t));
    if (sharedThemes.length > 0 && !types.includes('foreshadow')) {
      types.push('theme_mirror');
    }

    // 4. A에게 숨겨진 정보를 독자에게 공개하는 이벤트
    const aKnownRelated = new Set(aEvents.flatMap(e => e.relatedCharacters || []));
    if (event.importance === 'turning_point' && !aKnownRelated.has(event.characterId)) {
      types.push('hidden_truth');
    }

    return {
      eventId: event.id,
      relevanceTypes: types,
      score: types.length,
    };
  }

  /**
   * 이벤트를 화 단위로 분할
   */
  private splitIntoEpisodes(
    aEvents: NarrativeEvent[],
    otherEvents: NarrativeEvent[],
    relevanceChecks: ARelevanceCheck[]
  ): StoryEpisode[] {
    const allEvents = [...aEvents, ...otherEvents].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      const seasonOrder = { spring: 0, summer: 1, autumn: 2, winter: 3 };
      return seasonOrder[a.season] - seasonOrder[b.season];
    });

    const episodes: StoryEpisode[] = [];
    const eventsPerEpisode = 3; // 기본 3개 이벤트 per 화
    let episodeNum = 1;

    for (let i = 0; i < allEvents.length; i += eventsPerEpisode) {
      const chunk = allEvents.slice(i, i + eventsPerEpisode);
      const aCount = chunk.filter(e => e.characterId === this.config.protagonistId).length;
      const mainPerspective = aCount >= chunk.length / 2 ? 'protagonist' : 'neutral';

      const lastEvent = chunk[chunk.length - 1];
      const hookEnd = lastEvent.importance === 'turning_point'
        ? lastEvent.summary
        : `${lastEvent.title}의 여파가 아직 끝나지 않았다...`;

      const episodeRelevance: ARelevanceType[] = [];
      for (const e of chunk) {
        const rc = relevanceChecks.find(r => r.eventId === e.id);
        if (rc) episodeRelevance.push(...rc.relevanceTypes);
      }

      episodes.push({
        episodeNumber: episodeNum++,
        title: chunk[0].title,
        perspective: mainPerspective,
        events: chunk.map(e => e.id),
        hookEnd,
        aRelevance: [...new Set(episodeRelevance)],
      });
    }

    return episodes;
  }

  /**
   * 이벤트에서 떡밥 패턴 감지
   */
  private detectPlotThreads(events: NarrativeEvent[]): PlotThread[] {
    const threads: PlotThread[] = [];
    const MYSTERY_TAGS = ['비밀', '과거', '기억', '진실', '정체', '숨겨진', '미스터리'];
    const FORESHADOW_TAGS = ['조짐', '복선', '예감', '그림자', '떡밥'];

    for (const event of events) {
      const isMystery = event.tags.some(t => MYSTERY_TAGS.some(mt => t.includes(mt)));
      const isForeshadow = event.tags.some(t => FORESHADOW_TAGS.some(ft => t.includes(ft)));

      if (isMystery && event.importance !== 'minor') {
        threads.push({
          id: `thread-${event.id}`,
          type: 'mystery',
          title: event.title,
          description: event.summary,
          plantedInYear: event.year,
          visibility: event.importance === 'turning_point' ? 'obvious' : 'subtle',
          relatedCharacterId: event.characterId,
        });
      } else if (isForeshadow) {
        threads.push({
          id: `thread-${event.id}`,
          type: 'foreshadow',
          title: event.title,
          description: event.summary,
          plantedInYear: event.year,
          visibility: 'subtle',
          relatedCharacterId: event.characterId,
        });
      }
    }

    return threads;
  }

  /**
   * A 중심 시뮬레이션 프롬프트 지시문 생성
   */
  static buildADirective(config: StoryDirectorConfig): string {
    if (!config.enabled) return '';

    const lines: string[] = [
      `\n[서사 구조 규칙 — A 중심]`,
      `주인공 A(${config.protagonistId})가 이야기의 중심이다.`,
      `A:B:C 비중 = ${config.ratio.protagonist}:${config.ratio.antagonist}:${config.ratio.neutral}`,
    ];

    if (config.logline) {
      lines.push(`로그라인: "${config.logline}"`);
    }

    lines.push(
      `B, C의 이벤트를 생성할 때 반드시 다음 중 하나 이상을 충족:`,
      `  1. A의 과거/현재/미래에 직접적 영향을 미친다`,
      `  2. A와의 만남/충돌의 복선이 된다`,
      `  3. A의 테마를 다른 각도에서 비춘다`,
      `  4. A가 아직 모르는 세계의 진실을 독자에게 보여준다`,
      `B, C만의 독립적인 서사는 최소화. 모든 서브플롯은 결국 A의 메인 플롯과 합류해야 한다.`,
    );

    return lines.join('\n');
  }

  /**
   * 작가 페르소나 프롬프트 (세밀 장면용)
   */
  static buildPersonaDirective(persona: AuthorPersona): string {
    return `
[작가 페르소나]
당신은 아래의 문체 규칙을 가진 웹소설 작가입니다.
이 규칙은 절대 어기지 마세요.

문체:
- ${persona.style.rhythm}
- 시그니처: ${persona.style.signature}
- 절대 금지: ${persona.style.avoidance.join(', ')}

서술 원칙:
- ${persona.narrative.showDontTell}
- ${persona.narrative.dialogueStyle}
- ${persona.narrative.descriptionStyle}
- ${persona.narrative.pacing}

개성:
- ${persona.deliberateQuirks.join('\n- ')}

참고 톤: ${persona.references.join(', ')} 스타일을 참고하되 모방하지 말 것.`;
  }

  /**
   * 세계관 4레이어 프롬프트 압축
   */
  static buildWorldLayerContext(world: WorldSettings): string {
    if (!world.worldLayers) return '';

    const layers = world.worldLayers;
    const lines = [
      `[세계 법칙] ${layers.coreRule.law} 대가: ${layers.coreRule.cost} 함의: ${layers.coreRule.implication}`,
    ];

    if (layers.historicalWound.event) {
      lines.push(`[역사적 상처] ${layers.historicalWound.event} — 근본갈등: ${layers.historicalWound.underlyingConflict}`);
    }

    if (layers.currentTension.powerStructure) {
      lines.push(`[현재 상황] ${layers.currentTension.powerStructure}. ${layers.currentTension.oppressionDetail}. ${layers.currentTension.emergingThreat}`);
    }

    if (layers.sensoryDetails.length > 0) {
      lines.push(`[감각] ${layers.sensoryDetails.slice(0, 3).join('. ')}`);
    }

    return lines.join('\n');
  }
}
