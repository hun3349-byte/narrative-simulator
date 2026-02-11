import { BaseAgent } from './base-agent';
import { Character, NarrativeEvent } from '../types';

// Phase 2에서 Claude API 연동으로 실제 구현
export class CharacterAgent extends BaseAgent {
  async generateEvents(
    year: number,
    worldContext: string,
    previousEvents: NarrativeEvent[]
  ): Promise<NarrativeEvent[]> {
    // Phase 2에서 구현
    return [];
  }
}

export function createCharacterAgents(characters: Character[]): CharacterAgent[] {
  return characters.map((c) => new CharacterAgent(c));
}
