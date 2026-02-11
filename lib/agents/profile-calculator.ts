import {
  Character,
  CharacterSeed,
  Memory,
  MemoryImprint,
  EmergentProfile,
  PersonalityTrait,
  Belief,
  Ability,
} from '../types';

export class ProfileCalculator {
  /**
   * Memory 스택에서 EmergentProfile을 계산
   */
  static computeProfile(seed: CharacterSeed, memories: Memory[]): EmergentProfile {
    const sorted = [...memories].sort((a, b) => a.year - b.year || this.seasonOrder(a.season) - this.seasonOrder(b.season));

    return {
      displayName: this.extractName(seed, sorted),
      currentAlias: this.extractAlias(seed, sorted),
      personality: this.extractPersonality(sorted),
      beliefs: this.extractBeliefs(sorted),
      abilities: this.extractAbilities(seed, sorted),
      speechPatterns: this.extractSpeechPatterns(sorted),
      innerConflicts: this.deriveConflicts(sorted),
      computedAt: sorted.length > 0 ? sorted[sorted.length - 1].year : seed.birthYear,
    };
  }

  /**
   * EmergentProfile을 기존 Character 타입으로 변환 (하위 호환 브릿지)
   */
  static toCharacter(seed: CharacterSeed, memories: Memory[], year: number): Character {
    const profile = this.computeProfile(seed, memories);

    // 성격 요약: 상위 3개 특성
    const personalitySummary = profile.personality
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 3)
      .map(p => p.trait)
      .join(', ') || seed.temperament;

    // 능력 목록
    const abilities = profile.abilities.length > 0
      ? profile.abilities.map(a => `${a.name} (${a.level === 'discovered' ? '발견' : a.level === 'practicing' ? '수련' : '숙달'})`)
      : [seed.latentAbility];

    // 동기: 최근 가장 강한 신념에서 추출
    const strongestBelief = profile.beliefs
      .sort((a, b) => b.conviction - a.conviction)[0];
    const motivation = strongestBelief?.content || '자아 탐색';

    // 감정 상태: 최근 기억의 감정 각인에서 추출
    const recentMemories = memories.filter(m => m.year === year || m.year === year - 1);
    const emotionImprints = recentMemories
      .flatMap(m => m.imprints)
      .filter(i => i.type === 'emotion');
    const primaryEmotion = emotionImprints.length > 0
      ? emotionImprints.sort((a, b) => b.intensity - a.intensity)[0]
      : null;

    // 스탯 계산: 기본값 + skill imprint 누적
    const stats = this.computeStats(seed, memories);

    // 상태 결정
    const age = year - seed.birthYear;
    const status = this.computeStatus(age, memories);

    return {
      id: seed.id,
      name: profile.displayName,
      alias: profile.currentAlias,
      age,
      birthYear: seed.birthYear,
      status,
      stats,
      emotionalState: {
        primary: primaryEmotion?.content || '평온',
        intensity: primaryEmotion?.intensity || 20,
        trigger: primaryEmotion?.source || '',
      },
      profile: {
        background: seed.initialCondition,
        personality: personalitySummary,
        motivation,
        abilities,
        weakness: seed.wound,
        secretGoal: '',
      },
    };
  }

  private static extractPersonality(memories: Memory[]): PersonalityTrait[] {
    const traitMap = new Map<string, PersonalityTrait>();

    for (const memory of memories) {
      const imprints = memory.imprints.filter(
        (i: MemoryImprint) => i.type === 'insight' || i.type === 'emotion'
      );
      for (const imprint of imprints) {
        const existing = traitMap.get(imprint.content);
        if (existing) {
          // 강화: 강도 누적 (최대 100)
          const change = Math.round(imprint.intensity * 0.3);
          existing.strength = Math.min(100, existing.strength + change);
          existing.history.push({
            year: memory.year,
            change,
            reason: imprint.source,
          });
        } else {
          traitMap.set(imprint.content, {
            trait: imprint.content,
            strength: imprint.intensity,
            origin: imprint.source,
            formedAtYear: memory.year,
            history: [],
          });
        }
      }
    }

    return Array.from(traitMap.values())
      .sort((a, b) => b.strength - a.strength);
  }

  private static extractBeliefs(memories: Memory[]): Belief[] {
    const beliefMap = new Map<string, Belief>();

    for (const memory of memories) {
      const imprints = memory.imprints.filter(
        (i: MemoryImprint) => i.type === 'belief'
      );
      for (const imprint of imprints) {
        const existing = beliefMap.get(imprint.content);
        if (existing) {
          existing.conviction = Math.min(100, existing.conviction + Math.round(imprint.intensity * 0.2));
        } else {
          beliefMap.set(imprint.content, {
            content: imprint.content,
            conviction: imprint.intensity,
            origin: imprint.source,
            formedAtYear: memory.year,
            challenged: false,
          });
        }
      }
    }

    // 상충하는 신념 감지: 이미 존재하는 신념과 반대되는 새 신념이 있으면 challenged
    const beliefs = Array.from(beliefMap.values());
    for (let i = 0; i < beliefs.length; i++) {
      for (let j = i + 1; j < beliefs.length; j++) {
        if (beliefs[i].conviction > 30 && beliefs[j].conviction > 30) {
          // 간단한 휴리스틱: 같은 주제의 상반 신념이면 둘 다 challenged
          if (this.areConflicting(beliefs[i].content, beliefs[j].content)) {
            beliefs[i].challenged = true;
            beliefs[j].challenged = true;
          }
        }
      }
    }

    return beliefs.sort((a, b) => b.conviction - a.conviction);
  }

  private static extractAbilities(seed: CharacterSeed, memories: Memory[]): Ability[] {
    const abilityMap = new Map<string, Ability>();

    // 잠재 능력은 항상 discovered 상태로 시작
    abilityMap.set(seed.latentAbility.split('—')[0].trim(), {
      name: seed.latentAbility.split('—')[0].trim(),
      level: 'discovered',
      origin: seed.initialCondition,
      milestones: [],
    });

    for (const memory of memories) {
      const imprints = memory.imprints.filter(
        (i: MemoryImprint) => i.type === 'skill'
      );
      for (const imprint of imprints) {
        const existing = abilityMap.get(imprint.content);
        if (existing) {
          // 레벨업: discovered→practicing→mastered
          const milestone = { year: memory.year, description: imprint.source };
          existing.milestones.push(milestone);
          if (existing.level === 'discovered' && imprint.intensity >= 40) {
            existing.level = 'practicing';
          } else if (existing.level === 'practicing' && imprint.intensity >= 70) {
            existing.level = 'mastered';
          }
        } else {
          abilityMap.set(imprint.content, {
            name: imprint.content,
            level: imprint.intensity >= 60 ? 'practicing' : 'discovered',
            origin: imprint.source,
            milestones: [{ year: memory.year, description: imprint.source }],
          });
        }
      }
    }

    return Array.from(abilityMap.values());
  }

  private static extractName(seed: CharacterSeed, memories: Memory[]): string {
    // 최신 name imprint가 현재 이름
    const nameImprints = memories
      .flatMap(m => m.imprints.filter((i: MemoryImprint) => i.type === 'name'))
      .reverse();

    // name 타입 중 "이름:" 접두사가 있는 것
    for (const imprint of nameImprints) {
      if (imprint.content.startsWith('이름:')) {
        return imprint.content.replace('이름:', '').trim();
      }
    }

    return seed.codename;
  }

  private static extractAlias(seed: CharacterSeed, memories: Memory[]): string {
    const nameImprints = memories
      .flatMap(m => m.imprints.filter((i: MemoryImprint) => i.type === 'name'))
      .reverse();

    for (const imprint of nameImprints) {
      if (imprint.content.startsWith('이명:')) {
        return imprint.content.replace('이명:', '').trim();
      }
    }

    return '';
  }

  private static extractSpeechPatterns(memories: Memory[]): string[] {
    const patterns = new Set<string>();

    for (const memory of memories) {
      const imprints = memory.imprints.filter(
        (i: MemoryImprint) => i.type === 'speech'
      );
      for (const imprint of imprints) {
        patterns.add(imprint.content);
      }
    }

    return Array.from(patterns);
  }

  private static deriveConflicts(memories: Memory[]): string[] {
    const conflicts: string[] = [];

    // 1. 상충 신념에서 갈등 도출
    const beliefs = this.extractBeliefs(memories);
    const challengedBeliefs = beliefs.filter(b => b.challenged);
    for (let i = 0; i < challengedBeliefs.length; i += 2) {
      if (i + 1 < challengedBeliefs.length) {
        conflicts.push(`"${challengedBeliefs[i].content}" vs "${challengedBeliefs[i + 1].content}"`);
      }
    }

    // 2. 트라우마와 현재 행동의 괴리
    const traumas = memories
      .flatMap(m => m.imprints.filter((i: MemoryImprint) => i.type === 'trauma'));
    for (const trauma of traumas) {
      if (trauma.intensity >= 60) {
        conflicts.push(`근원 상처: ${trauma.content}`);
      }
    }

    return conflicts;
  }

  private static computeStats(seed: CharacterSeed, memories: Memory[]) {
    // 기본값
    const stats = {
      combat: 1,
      intellect: 1,
      willpower: 1,
      social: 1,
      specialStat: { name: seed.latentAbility.split('—')[0].trim(), value: 0 },
    };

    // 기질에서 초기 편향 계산
    if (seed.temperament.includes('과묵') || seed.temperament.includes('관찰')) {
      stats.willpower += 2;
      stats.intellect += 1;
    }
    if (seed.temperament.includes('밝') || seed.temperament.includes('수다')) {
      stats.social += 2;
    }
    if (seed.temperament.includes('매력')) {
      stats.social += 2;
      stats.intellect += 1;
    }

    // skill imprint에서 스탯 변동 누적
    for (const memory of memories) {
      for (const imprint of memory.imprints) {
        if (imprint.type === 'skill') {
          const delta = Math.round(imprint.intensity * 0.05);
          // 능력 이름에 따라 스탯 분배
          const name = imprint.content.toLowerCase();
          if (name.includes('검') || name.includes('무') || name.includes('전투')) {
            stats.combat = Math.min(10, stats.combat + delta);
          } else if (name.includes('의') || name.includes('독') || name.includes('학')) {
            stats.intellect = Math.min(10, stats.intellect + delta);
          } else if (name.includes('의지') || name.includes('인내') || name.includes('수련')) {
            stats.willpower = Math.min(10, stats.willpower + delta);
          } else if (name.includes('협상') || name.includes('사교') || name.includes('설득')) {
            stats.social = Math.min(10, stats.social + delta);
          }
          // 고유 스탯은 항상 증가
          stats.specialStat.value = Math.min(10, stats.specialStat.value + Math.round(delta * 0.5));
        }
      }
    }

    return stats;
  }

  private static computeStatus(age: number, memories: Memory[]): Character['status'] {
    if (age < 6) return 'childhood';

    // 최근 기억의 태그와 각인에서 상태 추론
    const recent = memories.slice(-5);
    const tags = recent.flatMap(m => m.tags);
    const imprints = recent.flatMap(m => m.imprints);

    const hasConflict = tags.some(t => t.includes('전투') || t.includes('갈등') || t.includes('대립'));
    const hasTraining = tags.some(t => t.includes('수련') || t.includes('훈련') || t.includes('학습'));
    const hasTransform = imprints.some(i => i.type === 'trauma' && i.intensity >= 70);
    const hasConverge = tags.some(t => t.includes('합류') || t.includes('동맹') || t.includes('재회'));

    if (hasConverge) return 'convergence';
    if (hasTransform) return 'transformation';
    if (hasConflict) return 'conflict';
    if (hasTraining && age < 15) return 'training';
    if (age >= 6 && age < 12) return 'training';
    return 'wandering';
  }

  private static areConflicting(a: string, b: string): boolean {
    // 간단한 반대 개념 감지
    const opposites = [
      ['보호', '포기'], ['신뢰', '불신'], ['희망', '절망'],
      ['자유', '속박'], ['강함', '약함'], ['사랑', '증오'],
      ['진실', '거짓'], ['용서', '복수'], ['평화', '전쟁'],
    ];
    for (const [x, y] of opposites) {
      if ((a.includes(x) && b.includes(y)) || (a.includes(y) && b.includes(x))) {
        return true;
      }
    }
    return false;
  }

  private static seasonOrder(season: string): number {
    const order: Record<string, number> = { spring: 0, summer: 1, autumn: 2, winter: 3 };
    return order[season] ?? 0;
  }
}
