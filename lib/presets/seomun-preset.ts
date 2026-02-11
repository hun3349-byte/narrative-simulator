import { Character, CharacterSeed, WorldSettings, Relationship, StoryDirectorConfig } from '../types';
import { ProfileCalculator } from '../agents/profile-calculator';

// 하드코딩된 세계관 데이터 제거됨
// 세계관은 generate-project API에서 스토리라인을 기반으로 동적 생성됨
export const SEOMUN_WORLD: WorldSettings = {
  worldName: '',
  description: '',
  genre: '',
  coreRule: '',
  era: '',
  factions: [],
  timeline: {
    startYear: -3,
    currentYear: 0,
    majorEras: [],
    worldEvents: [],
  },
};

/**
 * 빈 캐릭터 목록을 반환한다.
 * 실제 캐릭터는 generate-project API에서 생성됨
 */
export function createSeomunCharacters(seeds: CharacterSeed[] = []): Character[] {
  return seeds.map(seed => ProfileCalculator.toCharacter(seed, [], seed.birthYear));
}

// 하드코딩된 씨앗 데이터 제거됨
export const SEOMUN_SEEDS: CharacterSeed[] = [];

// 하드코딩된 스토리 디렉터 설정 제거됨
export const SEOMUN_STORY_DIRECTOR: StoryDirectorConfig = {
  enabled: false,
  protagonistId: '',
  ratio: { protagonist: 60, antagonist: 20, neutral: 20 },
  logline: '',
  characterRoles: {},
};

// 하드코딩된 관계 데이터 제거됨
export const SEOMUN_RELATIONSHIPS: Relationship[] = [];
