import { Character, CharacterSeed } from '../types';

const DEFAULT_COLOR = '#888888';

/**
 * Get character display name from store characters array.
 */
export function getCharacterName(id: string, characters: Character[]): string {
  const char = characters.find(c => c.id === id);
  return char?.name ?? id;
}

/**
 * Get character color from seeds (preferred) or fallback.
 */
export function getCharacterColor(id: string, characters: Character[], seeds: CharacterSeed[]): string {
  const seed = seeds.find(s => s.id === id);
  if (seed?.color) return seed.color;
  return DEFAULT_COLOR;
}

/**
 * Build a full color map for all known characters.
 */
export function buildColorMap(characters: Character[], seeds: CharacterSeed[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const char of characters) {
    map[char.id] = getCharacterColor(char.id, characters, seeds);
  }
  return map;
}

/**
 * Build a tint map (very low opacity background colors) for novel preview.
 */
export function buildTintMap(characters: Character[], seeds: CharacterSeed[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const char of characters) {
    const color = getCharacterColor(char.id, characters, seeds);
    // Convert hex to rgba with low opacity
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    map[char.id] = `rgba(${r}, ${g}, ${b}, 0.04)`;
  }
  return map;
}
