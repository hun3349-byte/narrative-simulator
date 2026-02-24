/**
 * Character Selector for Hierarchical Context
 *
 * 이번 화에 등장할 캐릭터를 판단하고, 상세 정보를 선택적으로 로드.
 * 판단 기준 (우선순위):
 * 1순위: PD 디렉팅에서 직접 지정한 캐릭터
 * 2순위: 직전 3화 로그에 등장한 캐릭터
 * 3순위: 활성 떡밥과 연결된 캐릭터
 * 4순위: 미해결 긴장에 관련된 캐릭터
 */

import type { EpisodeLog, WorldBible, EpisodeDirection, NPCSeedInfo } from '@/lib/types';
import { estimateTokens, truncateToTokenLimit, TOKEN_BUDGET } from './token-budget';

/**
 * 캐릭터 상세 정보 (Tier 1 원본)
 */
export interface CharacterDetail {
  name: string;
  role?: string;
  core?: string;
  desire?: string;
  deficiency?: string;
  weakness?: string;
  currentState?: string;
  personality?: string;
  appearance?: string;
  speechPattern?: string;
  backstory?: string;
  relationships?: string;
  arc?: string;
  faction?: string;
  location?: string;
  importance?: 'major' | 'supporting' | 'minor';
}

/**
 * 캐릭터 요약 (Tier 2)
 */
export interface CharacterSummary {
  name: string;
  oneLine: string;  // 한 줄 역할
}

/**
 * 등장 캐릭터 판단 결과
 */
export interface CharacterSelection {
  detailed: string[];      // 상세 로드할 캐릭터 이름
  summary: string[];       // 요약으로 커버할 캐릭터 이름
  sources: {               // 선택 근거
    pdDirected: string[];
    recentlyAppeared: string[];
    breadcrumbRelated: string[];
    tensionRelated: string[];
  };
}

/**
 * PD 디렉팅에서 지정된 캐릭터 추출
 */
export function extractPDDirectedCharacters(direction?: EpisodeDirection): string[] {
  if (!direction) return [];

  const characters: string[] = [];

  // characterDirectives에서 추출
  if (direction.characterDirectives) {
    for (const directive of direction.characterDirectives) {
      // characterName 또는 characterId 사용
      const name = (directive as { characterName?: string }).characterName ||
                   directive.characterId;
      if (name) {
        characters.push(name);
      }
    }
  }

  // forcedScenes에서 description에서 캐릭터 이름 추출은 어려우므로 스킵
  // (PD가 characterDirectives를 사용하도록 유도)

  return [...new Set(characters)]; // 중복 제거
}

/**
 * 직전 3화 로그에서 등장한 캐릭터 추출
 */
export function extractRecentCharacters(logs: EpisodeLog[]): string[] {
  if (!logs || logs.length === 0) return [];

  const characters: string[] = [];

  for (const log of logs) {
    // scenes에서 추출
    if (log.scenes) {
      for (const scene of log.scenes) {
        if (scene.characters) {
          characters.push(...scene.characters);
        }
      }
    }

    // characterChanges에서 추출
    if (log.characterChanges) {
      characters.push(...Object.keys(log.characterChanges));
    }

    // relationshipChanges에서 추출
    if (log.relationshipChanges) {
      for (const change of log.relationshipChanges) {
        if (change.who) characters.push(change.who);
        if (change.withWhom) characters.push(change.withWhom);
      }
    }
  }

  return [...new Set(characters)];
}

/**
 * 활성 떡밥과 연결된 캐릭터 추출
 */
export function extractBreadcrumbRelatedCharacters(worldBible?: WorldBible): string[] {
  if (!worldBible?.breadcrumbs) return [];

  const characters: string[] = [];

  // 떡밥 이름이 캐릭터 이름인 경우
  for (const [name, breadcrumb] of Object.entries(worldBible.breadcrumbs)) {
    // revealed가 아닌 활성 떡밥만
    if (breadcrumb.status !== 'revealed') {
      // 떡밥 내용에서 캐릭터 이름 추출 시도
      // 간단히 떡밥 이름 자체가 캐릭터일 수 있음
      if (worldBible.characters && worldBible.characters[name]) {
        characters.push(name);
      }

      // truth 문자열에서 캐릭터 이름 검색
      if (breadcrumb.truth && worldBible.characters) {
        for (const charName of Object.keys(worldBible.characters)) {
          if (breadcrumb.truth.includes(charName)) {
            characters.push(charName);
          }
        }
      }
    }
  }

  return [...new Set(characters)];
}

/**
 * 미해결 긴장에 관련된 캐릭터 추출
 */
export function extractTensionRelatedCharacters(
  unresolvedTensions: string[],
  worldBible?: WorldBible
): string[] {
  if (!unresolvedTensions || unresolvedTensions.length === 0 || !worldBible?.characters) {
    return [];
  }

  const characters: string[] = [];
  const charNames = Object.keys(worldBible.characters);

  for (const tension of unresolvedTensions) {
    // 긴장 텍스트에서 캐릭터 이름 검색
    for (const charName of charNames) {
      if (tension.includes(charName)) {
        characters.push(charName);
      }
    }
  }

  return [...new Set(characters)];
}

/**
 * 등장 캐릭터 판단 (통합)
 */
export function selectCharactersForEpisode(params: {
  pdDirection?: EpisodeDirection;
  recentLogs?: EpisodeLog[];
  worldBible?: WorldBible;
  unresolvedTensions?: string[];
  allCharacters: CharacterDetail[];
  maxDetailedCount?: number;  // 상세 로드할 최대 인원 (기본 10)
}): CharacterSelection {
  const {
    pdDirection,
    recentLogs,
    worldBible,
    unresolvedTensions,
    allCharacters,
    maxDetailedCount = 10
  } = params;

  // 각 소스에서 캐릭터 추출
  const pdDirected = extractPDDirectedCharacters(pdDirection);
  const recentlyAppeared = extractRecentCharacters(recentLogs || []);
  const breadcrumbRelated = extractBreadcrumbRelatedCharacters(worldBible);
  const tensionRelated = extractTensionRelatedCharacters(unresolvedTensions || [], worldBible);

  // 우선순위대로 합치기 (중복 제거)
  const priorityOrder = [
    ...pdDirected,
    ...recentlyAppeared,
    ...breadcrumbRelated,
    ...tensionRelated
  ];

  // 중복 제거하며 순서 유지
  const seen = new Set<string>();
  const orderedCharacters: string[] = [];
  for (const name of priorityOrder) {
    if (!seen.has(name)) {
      seen.add(name);
      orderedCharacters.push(name);
    }
  }

  // 상세 로드할 캐릭터 선택 (최대 인원 제한)
  const detailed = orderedCharacters.slice(0, maxDetailedCount);

  // 나머지는 요약으로
  const allNames = allCharacters.map(c => c.name);
  const summary = allNames.filter(name => !detailed.includes(name));

  return {
    detailed,
    summary,
    sources: {
      pdDirected,
      recentlyAppeared,
      breadcrumbRelated,
      tensionRelated
    }
  };
}

/**
 * 상세 캐릭터 정보를 프롬프트 문자열로 변환
 */
export function buildDetailedCharacterPrompt(
  characters: CharacterDetail[],
  maxTokens: number = TOKEN_BUDGET.characters
): string {
  if (!characters || characters.length === 0) return '';

  const lines: string[] = ['=== 이번 화 등장 캐릭터 (상세) ==='];

  for (const char of characters) {
    const parts: string[] = [`【${char.name}】`];

    if (char.role) parts.push(`역할: ${char.role}`);
    if (char.core) parts.push(`핵심: ${char.core}`);
    if (char.desire) parts.push(`욕망: ${char.desire}`);
    if (char.deficiency) parts.push(`결핍: ${char.deficiency}`);
    if (char.weakness) parts.push(`약점: ${char.weakness}`);
    if (char.currentState) parts.push(`현재: ${char.currentState}`);
    if (char.personality) parts.push(`성격: ${char.personality}`);
    if (char.speechPattern) parts.push(`말투: ${char.speechPattern}`);
    if (char.faction) parts.push(`소속: ${char.faction}`);
    if (char.relationships) parts.push(`관계: ${char.relationships}`);

    lines.push(parts.join('\n'));
    lines.push('');
  }

  let result = lines.join('\n');

  // 토큰 초과 시 축소
  if (estimateTokens(result) > maxTokens) {
    // 덜 중요한 필드 제거하며 재구성
    const reducedLines: string[] = ['=== 이번 화 등장 캐릭터 ==='];

    for (const char of characters) {
      const parts: string[] = [`【${char.name}】`];
      if (char.core) parts.push(`핵심: ${char.core}`);
      if (char.currentState) parts.push(`현재: ${char.currentState}`);
      if (char.weakness) parts.push(`약점: ${char.weakness}`);
      reducedLines.push(parts.join(' / '));
    }

    result = reducedLines.join('\n');

    // 여전히 초과면 잘라내기
    result = truncateToTokenLimit(result, maxTokens);
  }

  return result;
}

/**
 * 요약 캐릭터 목록을 프롬프트 문자열로 변환
 */
export function buildSummaryCharacterPrompt(
  characters: CharacterSummary[],
  maxTokens: number = 500
): string {
  if (!characters || characters.length === 0) return '';

  const lines: string[] = ['=== 기타 인물 (참고) ==='];

  for (const char of characters) {
    lines.push(`${char.name}: ${char.oneLine}`);
  }

  let result = lines.join('\n');

  // 토큰 초과 시 이름만
  if (estimateTokens(result) > maxTokens) {
    const names = characters.slice(0, 20).map(c => c.name).join(', ');
    result = `=== 기타 인물 ===\n${names}${characters.length > 20 ? ` 외 ${characters.length - 20}명` : ''}`;
  }

  return truncateToTokenLimit(result, maxTokens);
}

/**
 * WorldBible의 캐릭터를 CharacterSummary로 변환
 */
export function worldBibleCharactersToSummary(worldBible?: WorldBible): CharacterSummary[] {
  if (!worldBible?.characters) return [];

  return Object.entries(worldBible.characters).map(([name, info]) => ({
    name,
    oneLine: info.core || info.currentState || '정보 없음'
  }));
}

/**
 * 캐릭터 배열을 CharacterDetail로 변환 (NPCSeedInfo 등 다양한 소스 지원)
 */
export function normalizeToCharacterDetail(characters: Array<NPCSeedInfo | CharacterDetail | Record<string, unknown>>): CharacterDetail[] {
  return characters.map(char => {
    const c = char as Record<string, unknown>;
    return {
      name: (c.name as string) || '이름 없음',
      role: c.role as string | undefined,
      core: c.core as string | undefined,
      desire: c.desire as string | undefined,
      deficiency: c.deficiency as string | undefined,
      weakness: (c.weakness || c.fatalWeakness) as string | undefined,
      currentState: c.currentState as string | undefined,
      personality: c.personality as string | undefined,
      appearance: c.appearance as string | undefined,
      speechPattern: c.speechPattern as string | undefined,
      backstory: c.backstory as string | undefined,
      relationships: c.relationships as string | undefined,
      arc: c.arc as string | undefined,
      faction: c.faction as string | undefined,
      location: c.location as string | undefined,
      importance: c.importance as 'major' | 'supporting' | 'minor' | undefined
    };
  });
}
