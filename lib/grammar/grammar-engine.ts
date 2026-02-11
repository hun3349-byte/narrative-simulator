import {
  CharacterArc,
  MasterArc,
  NarrativeBeat,
  NarrativeEvent,
  NarrativePhase,
  BeatType,
} from '../types';

/**
 * 서사 지시문: 프롬프트에 삽입할 서사 문법 가이드
 */
export interface NarrativeDirective {
  characterId: string;
  phaseName: string;
  phaseDescription: string;
  tensionTarget: number;
  currentTension: number;
  tensionGuidance: string;        // "긴장 높여야 함" / "숨 돌릴 타이밍" 등
  requiredBeats: string[];        // 아직 미이행 필수 비트 설명
  beatTypeGuidance: string;       // 권장 이벤트 유형
  arcFulfillment: number;         // 아크 완성도 (%)
  masterActName: string;          // 현재 막 이름
}

// 이벤트 태그 → 비트 타입 매핑 (휴리스틱)
const TAG_TO_BEAT: Record<string, BeatType[]> = {
  '만남': ['inciting'],
  '발견': ['inciting'],
  '소명': ['inciting'],
  '운명': ['inciting'],
  '갈등': ['complication'],
  '시련': ['complication'],
  '배신': ['complication', 'reversal'],
  '상실': ['complication', 'crisis'],
  '반전': ['reversal'],
  '진실': ['reversal'],
  '폭로': ['reversal'],
  '변화': ['reversal'],
  '위기': ['crisis'],
  '절체절명': ['crisis'],
  '결단': ['crisis'],
  '대결': ['climax'],
  '전투': ['climax'],
  '결전': ['climax'],
  '승리': ['climax', 'resolution'],
  '극복': ['climax'],
  '해결': ['resolution'],
  '화해': ['resolution'],
  '귀환': ['resolution'],
  '깨달음': ['resolution'],
  '성장': ['resolution'],
  '죽음': ['climax', 'crisis'],
  '복수': ['climax'],
  '구원': ['resolution'],
  '타락': ['complication', 'crisis'],
  '유혹': ['complication'],
  '속죄': ['resolution'],
};

// importance → 비트 타입 가중치
const IMPORTANCE_BEAT_AFFINITY: Record<string, BeatType[]> = {
  turning_point: ['inciting', 'climax', 'reversal'],
  major: ['complication', 'crisis', 'reversal'],
  minor: ['complication'],
};

export class GrammarEngine {
  private masterArc: MasterArc;
  private characterArcs: Map<string, CharacterArc>;

  constructor(masterArc: MasterArc, characterArcs: CharacterArc[]) {
    this.masterArc = { ...masterArc, keyBeats: masterArc.keyBeats.map(b => ({ ...b })) };
    this.characterArcs = new Map();
    for (const arc of characterArcs) {
      this.characterArcs.set(arc.characterId, {
        ...arc,
        phases: arc.phases.map(p => ({
          ...p,
          requiredBeats: p.requiredBeats.map(b => ({ ...b })),
          optionalBeats: p.optionalBeats.map(b => ({ ...b })),
        })),
      });
    }
  }

  /**
   * 현재 연도/캐릭터에 대한 서사 지시문을 생성한다.
   */
  getCurrentDirective(characterId: string, year: number): NarrativeDirective | null {
    const arc = this.characterArcs.get(characterId);
    if (!arc) return null;

    // 현재 Phase 결정 (연도 기반)
    const phaseIdx = this.getPhaseIndex(arc, year);
    if (phaseIdx !== arc.currentPhase) {
      arc.currentPhase = phaseIdx;
    }
    const phase = arc.phases[phaseIdx];
    if (!phase) return null;

    // 현재 마스터 Act
    const actIdx = this.getMasterActIndex(year);
    if (actIdx !== this.masterArc.currentAct) {
      this.masterArc.currentAct = actIdx;
    }
    const currentAct = this.masterArc.acts[actIdx];

    // 미이행 필수 비트
    const pendingBeats = phase.requiredBeats
      .filter(b => !b.fulfilled)
      .map(b => b.description);

    // 긴장도 가이드
    const tensionDiff = phase.tensionTarget - arc.tension;
    let tensionGuidance: string;
    if (tensionDiff > 20) {
      tensionGuidance = '긴장을 크게 높여야 합니다. 위기/갈등/반전을 도입하세요.';
    } else if (tensionDiff > 5) {
      tensionGuidance = '긴장을 조금 높여야 합니다. 복잡화/시련을 추가하세요.';
    } else if (tensionDiff < -20) {
      tensionGuidance = '숨 돌릴 타이밍입니다. 성찰/회복/일상의 순간을 넣으세요.';
    } else if (tensionDiff < -5) {
      tensionGuidance = '약간 이완이 필요합니다. 짧은 평온 후 다음 전개로.';
    } else {
      tensionGuidance = '적절한 긴장 수준입니다. 현재 흐름을 유지하세요.';
    }

    // 비트 유형 가이드
    const beatTypeGuidance = this.suggestBeatType(phase, arc.tension);

    return {
      characterId,
      phaseName: phase.name,
      phaseDescription: phase.description,
      tensionTarget: phase.tensionTarget,
      currentTension: arc.tension,
      tensionGuidance,
      requiredBeats: pendingBeats,
      beatTypeGuidance,
      arcFulfillment: arc.fulfillment,
      masterActName: currentAct?.name || '알 수 없음',
    };
  }

  /**
   * 이벤트를 평가하여 비트 이행 여부를 판정한다. (태그/키워드 기반 휴리스틱)
   */
  evaluateEvent(event: NarrativeEvent): {
    fulfilledBeats: { characterId: string; beatDescription: string; beatType: BeatType }[];
    tensionChange: number;
  } {
    const fulfilledBeats: { characterId: string; beatDescription: string; beatType: BeatType }[] = [];
    let tensionChange = 0;

    // 이벤트에서 비트 타입 추정
    const detectedBeatTypes = this.detectBeatTypes(event);

    // 해당 캐릭터의 현재 Phase에서 비트 매칭
    const arc = this.characterArcs.get(event.characterId);
    if (arc) {
      const phase = arc.phases[arc.currentPhase];
      if (phase) {
        for (const beat of [...phase.requiredBeats, ...phase.optionalBeats]) {
          if (beat.fulfilled) continue;
          if (detectedBeatTypes.includes(beat.type)) {
            beat.fulfilled = true;
            beat.fulfillmentEventId = event.id;
            beat.fulfillmentYear = event.year;
            fulfilledBeats.push({
              characterId: event.characterId,
              beatDescription: beat.description,
              beatType: beat.type,
            });
          }
        }

        // 긴장도 업데이트
        tensionChange = this.calculateTensionChange(event, detectedBeatTypes);
        arc.tension = Math.max(0, Math.min(100, arc.tension + tensionChange));

        // 완성도 재계산
        arc.fulfillment = this.calculateFulfillment(arc);

        // Phase 자동 전진: 현재 Phase의 필수 비트가 모두 이행되면
        if (phase.requiredBeats.every(b => b.fulfilled) && arc.currentPhase < arc.phases.length - 1) {
          // yearRange 끝에 가까우면 자동 전진 허용
          const phaseEnd = phase.yearRange[1];
          if (event.year >= phaseEnd - 1) {
            arc.currentPhase++;
          }
        }
      }
    }

    // 마스터 아크 비트도 매칭
    for (const beat of this.masterArc.keyBeats) {
      if (beat.fulfilled) continue;
      if (detectedBeatTypes.includes(beat.type)) {
        beat.fulfilled = true;
        beat.fulfillmentEventId = event.id;
        beat.fulfillmentYear = event.year;
      }
    }

    // 마스터 긴장도 = 전체 캐릭터 평균
    this.updateMasterTension();

    return { fulfilledBeats, tensionChange };
  }

  /**
   * 캐릭터 간 교차 이벤트를 추천한다.
   */
  suggestCrossEvent(year: number): string | null {
    const arcs = Array.from(this.characterArcs.values());
    const activeArcs = arcs.filter(a => {
      const phase = a.phases[a.currentPhase];
      return phase && year >= phase.yearRange[0] && year <= phase.yearRange[1];
    });

    if (activeArcs.length < 2) return null;

    // 긴장도가 가장 높은 두 캐릭터 찾기
    const sorted = activeArcs.sort((a, b) => b.tension - a.tension);
    const a = sorted[0], b = sorted[1];

    const phaseA = a.phases[a.currentPhase];
    const phaseB = b.phases[b.currentPhase];

    if (a.tension > 60 && b.tension > 60) {
      return `${a.characterId}와 ${b.characterId}의 긴장이 모두 높습니다. 두 캐릭터의 갈등이 교차하는 대결/충돌 이벤트를 고려하세요.`;
    }

    if (phaseA && phaseB) {
      const aHasRelBeat = phaseA.requiredBeats.some(beat => !beat.fulfilled && beat.type === 'complication');
      const bHasRelBeat = phaseB.requiredBeats.some(beat => !beat.fulfilled && beat.type === 'complication');

      if (aHasRelBeat || bHasRelBeat) {
        return `${a.characterId}와 ${b.characterId}의 서사가 교차할 수 있는 시점입니다. 둘의 관계가 복잡해지는 이벤트를 고려하세요.`;
      }
    }

    return null;
  }

  // === Getters ===

  getCharacterArc(characterId: string): CharacterArc | undefined {
    return this.characterArcs.get(characterId);
  }

  getAllCharacterArcs(): CharacterArc[] {
    return Array.from(this.characterArcs.values());
  }

  getMasterArc(): MasterArc {
    return this.masterArc;
  }

  // === Internal ===

  private getPhaseIndex(arc: CharacterArc, year: number): number {
    for (let i = arc.phases.length - 1; i >= 0; i--) {
      if (year >= arc.phases[i].yearRange[0]) return i;
    }
    return 0;
  }

  private getMasterActIndex(year: number): number {
    for (let i = this.masterArc.acts.length - 1; i >= 0; i--) {
      if (year >= this.masterArc.acts[i].yearRange[0]) return i;
    }
    return 0;
  }

  private detectBeatTypes(event: NarrativeEvent): BeatType[] {
    const types = new Set<BeatType>();

    // 태그에서 비트 타입 추정
    for (const tag of event.tags) {
      const mapped = TAG_TO_BEAT[tag];
      if (mapped) mapped.forEach(t => types.add(t));
    }

    // importance에서 추정
    const importanceTypes = IMPORTANCE_BEAT_AFFINITY[event.importance];
    if (importanceTypes && types.size === 0) {
      importanceTypes.forEach(t => types.add(t));
    }

    // 제목/요약에서 키워드 검색
    const text = `${event.title} ${event.summary}`;
    for (const [keyword, beatTypes] of Object.entries(TAG_TO_BEAT)) {
      if (text.includes(keyword)) {
        beatTypes.forEach(t => types.add(t));
      }
    }

    // 아무것도 감지되지 않으면 complication으로 기본
    if (types.size === 0) {
      types.add('complication');
    }

    return Array.from(types);
  }

  private calculateTensionChange(event: NarrativeEvent, beatTypes: BeatType[]): number {
    let change = 0;

    // 비트 타입별 긴장도 변화
    const tensionMap: Record<BeatType, number> = {
      inciting: 10,
      complication: 8,
      reversal: 12,
      crisis: 15,
      climax: 20,
      resolution: -15,
    };

    for (const type of beatTypes) {
      change += tensionMap[type] || 0;
    }

    // importance 보정
    if (event.importance === 'turning_point') change *= 1.5;
    if (event.importance === 'minor') change *= 0.5;

    return Math.round(change);
  }

  private calculateFulfillment(arc: CharacterArc): number {
    const allRequired = arc.phases.flatMap(p => p.requiredBeats);
    if (allRequired.length === 0) return 100;
    const fulfilled = allRequired.filter(b => b.fulfilled).length;
    return Math.round((fulfilled / allRequired.length) * 100);
  }

  private suggestBeatType(phase: NarrativePhase, currentTension: number): string {
    const pending = phase.requiredBeats.filter(b => !b.fulfilled);
    if (pending.length > 0) {
      const nextBeat = pending[0];
      const beatLabels: Record<BeatType, string> = {
        inciting: '촉발 사건 (새로운 요소 도입)',
        complication: '복잡화 (장애물/갈등 추가)',
        reversal: '반전 (예상을 뒤엎는 전개)',
        crisis: '위기 (최대 긴장, 선택의 순간)',
        climax: '절정 (결정적 대결/시험)',
        resolution: '해결 (갈등 정리, 새 질서)',
      };
      return `권장: ${beatLabels[nextBeat.type]}`;
    }

    // 긴장도에 따른 일반 권장
    if (currentTension < 30) return '긴장을 쌓을 복잡화/촉발 이벤트 권장';
    if (currentTension < 60) return '반전이나 시련을 통한 긴장 상승 권장';
    if (currentTension < 80) return '위기 또는 절정으로 향하는 전개 권장';
    return '절정 후 해결/이완 단계 권장';
  }

  private updateMasterTension() {
    const arcs = Array.from(this.characterArcs.values());
    if (arcs.length === 0) return;
    this.masterArc.overallTension = Math.round(
      arcs.reduce((sum, a) => sum + a.tension, 0) / arcs.length
    );
  }
}
