import {
  NPC,
  NPCAppearance,
  NPCInteraction,
  NPCLifecycle,
  NPCPool,
  NarrativeEvent,
} from '../types';

// lifecycle 전환 조건
const LIFECYCLE_THRESHOLDS: Record<NPCLifecycle, { minAppearances: number }> = {
  mention: { minAppearances: 0 },
  encounter: { minAppearances: 1 },
  recurring: { minAppearances: 2 },
  significant: { minAppearances: 4 },
  core: { minAppearances: 999 }, // Core는 수동 승격만
};

export class NPCDetector {
  private pool: NPCPool;
  private knownCharacterIds: Set<string>;

  constructor(pool: NPCPool, knownCharacterIds: string[]) {
    this.pool = { ...pool, npcs: pool.npcs.map(n => ({ ...n, appearances: [...n.appearances], relatedCharacters: [...n.relatedCharacters] })) };
    this.knownCharacterIds = new Set(knownCharacterIds);
  }

  /**
   * AI 응답의 npcInteractions를 처리한다.
   * 새 NPC 생성 또는 기존 NPC 업데이트.
   */
  processInteractions(
    interactions: NPCInteraction[],
    characterId: string,
    year: number,
    events: NarrativeEvent[]
  ): NPC[] {
    const updatedNPCs: NPC[] = [];

    for (const interaction of interactions) {
      const event = events[interaction.eventIndex] || events[0];
      if (!event) continue;

      if (interaction.isNew) {
        // 새 NPC
        const existingMatch = this.matchExisting(interaction.npcAlias, interaction.npcName);
        if (existingMatch) {
          // 별칭으로 이미 존재 → 업데이트
          this.updateNPC(existingMatch, interaction, characterId, year, event);
          updatedNPCs.push(existingMatch);
        } else {
          // 완전히 새로운 NPC
          const newNPC = this.createNPC(interaction, characterId, year, event);
          if (this.pool.npcs.length < this.pool.maxActive) {
            this.pool.npcs.push(newNPC);
            updatedNPCs.push(newNPC);
          }
        }
      } else {
        // 기존 NPC 재등장
        const existing = this.matchExisting(interaction.npcAlias, interaction.npcName);
        if (existing) {
          this.updateNPC(existing, interaction, characterId, year, event);
          updatedNPCs.push(existing);
        } else {
          // AI가 isNew=false로 표시했지만 실제로 없는 경우 → 새로 생성
          const newNPC = this.createNPC(interaction, characterId, year, event);
          if (this.pool.npcs.length < this.pool.maxActive) {
            this.pool.npcs.push(newNPC);
            updatedNPCs.push(newNPC);
          }
        }
      }
    }

    return updatedNPCs;
  }

  /**
   * 이벤트 텍스트에서 NPC 언급을 탐지한다 (보조 감지).
   * 이제 역할은 자유 문자열로 반환.
   */
  detectFromEvent(event: NarrativeEvent): { alias: string; role: string }[] {
    const detected: { alias: string; role: string }[] = [];
    const text = `${event.title} ${event.summary}`;

    // 일반적인 NPC 키워드 감지 (역할은 키워드 그대로 사용)
    const NPC_KEYWORDS = [
      '스승', '사부', '노인', '장로', '선인', '도사',
      '경쟁자', '라이벌', '적수',
      '동맹', '동료', '친구', '형제', '자매',
      '적', '마인', '두목', '교주', '원수',
      '수호자', '호위', '감시자',
      '전령', '밀사', '그림자', '암살자', '추적자',
      '상인', '약사', '대장장이',
      '정보원', '밀정',
      '도적', '검객', '무사',
    ];

    for (const keyword of NPC_KEYWORDS) {
      if (text.includes(keyword)) {
        const alreadyKnown = this.pool.npcs.some(n =>
          n.alias.includes(keyword) || (n.name && text.includes(n.name))
        );
        if (!alreadyKnown) {
          const idx = text.indexOf(keyword);
          const start = Math.max(0, idx - 5);
          const end = Math.min(text.length, idx + keyword.length + 5);
          const alias = text.slice(start, end).trim();

          if (!detected.some(d => d.alias === alias)) {
            detected.push({ alias, role: keyword });
          }
        }
      }
    }

    return detected;
  }

  /**
   * 기존 NPC와 매칭한다 (이름 또는 별칭으로).
   */
  matchExisting(alias: string, name?: string): NPC | null {
    // 이름 매칭 (가장 정확)
    if (name) {
      const byName = this.pool.npcs.find(n => n.name === name);
      if (byName) return byName;
    }

    // 별칭 매칭
    const byAlias = this.pool.npcs.find(n =>
      n.alias === alias ||
      n.alias.includes(alias) ||
      alias.includes(n.alias)
    );
    if (byAlias) return byAlias;

    return null;
  }

  /**
   * 새 NPC를 생성한다.
   */
  private createNPC(
    interaction: NPCInteraction,
    characterId: string,
    year: number,
    event: NarrativeEvent
  ): NPC {
    const appearance: NPCAppearance = {
      year,
      season: event.season,
      eventId: event.id,
      role: interaction.role,
      interaction: interaction.interaction,
    };

    return {
      id: `npc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      lifecycle: 'encounter',
      role: interaction.role,
      name: interaction.npcName || undefined,
      alias: interaction.npcAlias,
      description: interaction.interaction,
      appearances: [appearance],
      firstSeenYear: year,
      lastSeenYear: year,
      totalAppearances: 1,
      relatedCharacters: [{
        characterId,
        relationship: interaction.interaction,
        sentiment: this.inferSentiment(interaction.role),
      }],
    };
  }

  /**
   * 기존 NPC를 업데이트한다.
   */
  private updateNPC(
    npc: NPC,
    interaction: NPCInteraction,
    characterId: string,
    year: number,
    event: NarrativeEvent
  ): void {
    const appearance: NPCAppearance = {
      year,
      season: event.season,
      eventId: event.id,
      role: interaction.role,
      interaction: interaction.interaction,
    };

    npc.appearances.push(appearance);
    npc.lastSeenYear = year;
    npc.totalAppearances++;

    // 이름이 새로 밝혀진 경우
    if (interaction.npcName && !npc.name) {
      npc.name = interaction.npcName;
    }

    // 관계 업데이트
    const existingRel = npc.relatedCharacters.find(r => r.characterId === characterId);
    if (existingRel) {
      existingRel.relationship = interaction.interaction;
    } else {
      npc.relatedCharacters.push({
        characterId,
        relationship: interaction.interaction,
        sentiment: this.inferSentiment(interaction.role),
      });
    }

    // Lifecycle 자동 전환
    this.updateLifecycle(npc);
  }

  /**
   * NPC lifecycle을 등장 횟수에 따라 자동 전환한다.
   */
  private updateLifecycle(npc: NPC): void {
    if (npc.lifecycle === 'core') return; // Core는 변경 불가

    if (npc.totalAppearances >= LIFECYCLE_THRESHOLDS.significant.minAppearances) {
      npc.lifecycle = 'significant';
    } else if (npc.totalAppearances >= LIFECYCLE_THRESHOLDS.recurring.minAppearances) {
      npc.lifecycle = 'recurring';
    } else if (npc.totalAppearances >= LIFECYCLE_THRESHOLDS.encounter.minAppearances) {
      npc.lifecycle = 'encounter';
    }
  }

  /**
   * NPC role 텍스트에서 기본 감정(sentiment) 추론
   */
  private inferSentiment(role: string): number {
    const lower = role.toLowerCase();
    // 긍정적 역할
    if (/스승|사부|은사|동맹|동료|친구|수호|호위|치유/.test(lower)) return 40;
    // 부정적 역할
    if (/적|원수|마인|암살|추적|그림자/.test(lower)) return -40;
    // 경쟁/중립
    if (/경쟁|라이벌|적수/.test(lower)) return -10;
    // 상인/정보
    if (/상인|약사|정보|밀정/.test(lower)) return 10;
    return 0;
  }

  /**
   * 현재 NPC Pool을 반환한다.
   */
  getPool(): NPCPool {
    return this.pool;
  }

  /**
   * NPC 풀 요약을 프롬프트용 텍스트로 변환한다.
   */
  getPoolSummary(forCharacterId?: string): string {
    const activeNPCs = this.pool.npcs
      .filter(n => n.lifecycle !== 'mention')
      .sort((a, b) => b.totalAppearances - a.totalAppearances)
      .slice(0, 10); // 상위 10명만

    if (activeNPCs.length === 0) return '';

    const lines = activeNPCs.map(npc => {
      const displayName = npc.name || npc.alias;
      const rel = forCharacterId
        ? npc.relatedCharacters.find(r => r.characterId === forCharacterId)
        : null;
      const relStr = rel ? `, ${rel.relationship}` : '';
      const lastAppearance = npc.appearances[npc.appearances.length - 1];

      return `- ${displayName} (${npc.role}): ${npc.description.slice(0, 50)}${relStr}. 마지막 등장: ${lastAppearance?.year || '?'}년.`;
    });

    return lines.join('\n');
  }
}
