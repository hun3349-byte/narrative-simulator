import { Character } from '../types';

// 하드코딩된 캐릭터 데이터 제거됨
// 캐릭터는 generate-project API에서 스토리라인을 기반으로 동적 생성됨
export const CHARACTERS: Character[] = [];

// CHARACTER_COLORS removed — use getCharacterColor() from lib/utils/character-display.ts
// Colors are now sourced from CharacterSeed.color dynamically.
