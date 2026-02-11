import { Character, NarrativeEvent } from '../types';

// Phase 2에서 실제 AI 에이전트로 구현
export abstract class BaseAgent {
  protected character: Character;

  constructor(character: Character) {
    this.character = character;
  }

  abstract generateEvents(year: number, worldContext: string, previousEvents: NarrativeEvent[]): Promise<NarrativeEvent[]>;

  getCharacter(): Character {
    return this.character;
  }

  updateCharacter(updates: Partial<Character>): void {
    this.character = { ...this.character, ...updates };
  }
}
