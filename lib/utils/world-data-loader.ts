/**
 * 세계관 데이터 로더
 * data/ 폴더의 JSON 파일들을 프로젝트 레이어 구조로 변환
 */

import type {
  WorldLayer,
  CoreRulesLayer,
  SeedsLayer,
  FactionSeedInfo,
  NPCSeedInfo,
  CityInfo,
} from '@/lib/types';

// 세계관 데이터 파일 타입
export interface WorldDataIndex {
  worldName: string;
  files: {
    core: Record<string, string>;
    factions: Record<string, string>;
    antagonist: Record<string, string>;
  };
  powerHierarchy: Record<string, { title: string; count: number }>;
  protagonists: {
    cheonchuddan: {
      name: string;
      fourGuardians: Array<{ symbol: string; name: string }>;
    };
  };
}

export interface WorldConfigData {
  worldName: string;
  worldNameChinese: string;
  genre: string;
  era: string;
  description: string;
  mainStoryline: {
    protagonist: string;
    organization: string;
    theme: string;
    fourGuardians: string[];
  };
  powerRankingSystem: {
    tiers: Array<{
      rank: number;
      title: string;
      count: number;
      description: string;
    }>;
  };
  majorFactions: Array<{
    id: string;
    name: string;
    nameChinese: string;
    type: string;
    description: string;
  }>;
}

export interface CharacterData {
  protagonists: Array<{
    id: string;
    name: string;
    nameChinese: string;
    symbol: string;
    role: string;
    organization: string;
    age: string;
    gender: string;
    personality: string[];
    appearance: string;
    weapon: string;
    martialArts: string[];
    combatStyle: string;
    backstory: string;
    philosophy: string;
  }>;
  legends: Record<string, Array<Record<string, unknown>>>;
  currentPowers: Record<string, Array<Record<string, unknown>>>;
}

export interface LocationData {
  factionTerritories: Record<string, {
    name: string;
    headquarters?: string;
    territories?: Array<{ name: string; region: string }>;
  }>;
  conflictZones: Array<{
    region: string;
    factions: string[];
  }>;
}

export interface FactionData {
  factionId: string;
  name: string;
  nameChinese: string;
  type: string;
  description: string;
  leader?: { title: string; name: string; rank?: string };
  characteristics?: string[];
}

/**
 * 세계관 데이터를 WorldLayer로 변환
 */
export function convertToWorldLayer(
  worldConfig: WorldConfigData,
  locations: LocationData
): WorldLayer {
  // 세력 영토에서 도시 정보 추출
  const cities: CityInfo[] = [];

  Object.values(locations.factionTerritories).forEach(territory => {
    if (territory.headquarters) {
      cities.push({
        name: territory.name,
        description: territory.headquarters,
        location: '본산',
        significance: `${territory.name}의 중심지`,
      });
    }
    if (territory.territories) {
      territory.territories.forEach(t => {
        cities.push({
          name: t.name,
          description: t.region,
          location: t.region,
          significance: `${territory.name} 소속`,
        });
      });
    }
  });

  // 충돌지대에서 랜드마크 추출
  const landmarks = locations.conflictZones.map(
    zone => `${zone.region} (${zone.factions.join(' vs ')})`
  );

  return {
    continentName: worldConfig.worldName,
    geography: worldConfig.description,
    cities: cities.slice(0, 10), // 상위 10개만
    landmarks,
    mapDescription: `${worldConfig.worldName}(${worldConfig.worldNameChinese}) - ${worldConfig.era}. ${worldConfig.description}`,
  };
}

/**
 * 세계관 데이터를 CoreRulesLayer로 변환
 */
export function convertToCoreRulesLayer(
  worldConfig: WorldConfigData
): CoreRulesLayer {
  // 등급 체계를 힘의 체계로 변환
  const powerTiers = worldConfig.powerRankingSystem.tiers
    .map(t => `${t.rank}${t.title}(${t.count}인): ${t.description}`)
    .join('\n');

  return {
    powerSystem: `무림 등급 체계\n${powerTiers}`,
    powerSource: '내공(內功)과 무공(武功)의 수련',
    powerLimits: '1신은 절대적 경지, 현존 최강은 2황급',
    legends: {
      creationMyth: '천극무신이 무림 등급 체계의 정점에 서며 1신의 경지를 열었다',
      keyLegends: [
        '2황(마황, 빙황)의 전설적 대결',
        '3제의 시대를 연 검제의 등장',
      ],
      legendVsHistory: '전설의 1신은 실존 여부가 불확실하나, 2황 이하는 역사적 기록으로 검증됨',
    },
    races: '무림인 (무공 수련자), 관인 (황실/관료), 민초 (일반 백성)',
    history: `${worldConfig.mainStoryline.theme}. 5대 세력이 각축하는 가운데 배후세력의 음모가 진행 중.`,
    currentState: '5대 세력(정도맹, 팔가회, 흑도련, 마교, 세외세력)이 각축하며 배후세력 현기원이 암약 중',
    rules: [
      '무공 등급: 1신 > 2황 > 3제 > 4존 > 5왕 > 6괴 > 7귀 > 8성 > 9마 > 10선',
      '정파는 의리와 정도, 사파는 실리와 패도를 추구',
      '마교는 힘 숭상, 세외세력은 독자적 질서 유지',
    ],
  };
}

/**
 * 세계관 데이터를 SeedsLayer로 변환
 */
export function convertToSeedsLayer(
  worldConfig: WorldConfigData,
  characters: CharacterData,
  factionDataList: FactionData[]
): SeedsLayer {
  // 세력 정보 - FactionSeedInfo 타입에 맞춤
  const factions: FactionSeedInfo[] = factionDataList.map(f => ({
    name: f.name,
    nature: f.type,
    base: f.leader?.title || '본산',
    goal: f.description,
    relationship: f.characteristics?.join(', ') || '독자적 세력',
  }));

  // 주인공들을 NPC 씨앗으로 변환 - NPCSeedInfo 타입에 맞춤
  const npcs: NPCSeedInfo[] = characters.protagonists.map(p => ({
    name: p.name,
    role: p.role,
    location: p.organization || '강호',
    personality: p.personality.join(', '),
    hiddenMotivation: p.backstory,
  }));

  return {
    factions,
    races: [{
      name: '무림인',
      traits: '무공 수련',
      territory: '강호',
      culture: '의리와 명예',
    }],
    threats: [{
      name: '배후세력',
      region: '상경',
      nature: '황실의 비밀 조직 현기원',
      dangerLevel: '극상',
    }],
    npcs,
  };
}

/**
 * 여러 JSON 파일을 읽어서 통합된 세계관 데이터 반환
 */
export interface ParsedWorldData {
  worldConfig: WorldConfigData;
  characters: CharacterData;
  locations: LocationData;
  factions: FactionData[];
}

export function parseWorldDataFiles(files: File[]): Promise<ParsedWorldData> {
  return new Promise((resolve, reject) => {
    const results: Record<string, unknown> = {};
    let completed = 0;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          const fileName = file.name.replace('.json', '');
          results[fileName] = data;
          completed++;

          if (completed === files.length) {
            // 모든 파일 파싱 완료
            resolve({
              worldConfig: (results['world-config'] || results['worldConfig']) as WorldConfigData,
              characters: results['characters'] as CharacterData,
              locations: results['locations'] as LocationData,
              factions: Object.entries(results)
                .filter(([key]) => key.startsWith('factions-'))
                .map(([, value]) => value as FactionData),
            });
          }
        } catch (error) {
          reject(new Error(`파일 파싱 실패: ${file.name}`));
        }
      };
      reader.onerror = () => reject(new Error(`파일 읽기 실패: ${file.name}`));
      reader.readAsText(file);
    });
  });
}

/**
 * 단일 index.json 파일로 세계관 식별
 */
export function isWorldDataIndex(data: unknown): data is WorldDataIndex {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return 'worldName' in d && 'files' in d && 'powerHierarchy' in d;
}

/**
 * world-config.json 형식 확인
 */
export function isWorldConfig(data: unknown): data is WorldConfigData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return 'worldName' in d && 'powerRankingSystem' in d && 'majorFactions' in d;
}
