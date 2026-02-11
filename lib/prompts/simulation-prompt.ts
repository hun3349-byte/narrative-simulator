import { Character, NarrativeEvent } from '../types';

export function buildSimulationPrompt(
  character: Character,
  year: number,
  worldContext: string,
  previousEvents: NarrativeEvent[]
): string {

  // ① 이전 이벤트: 최근 5개만 + 1줄 요약으로 압축
  const recentEvents = previousEvents
    .slice(-5)
    .map(e => `[${e.year}/${e.season}] ${e.title}`)
    .join('\n');

  // ② 캐릭터 프로필: 핵심만 추출 (전체 JSON 대신)
  const charSummary = `${character.name}(${character.alias}), ${year - character.birthYear}세, ${character.status}
성격: ${character.profile.personality}
동기: ${character.profile.motivation}
약점: ${character.profile.weakness}
감정: ${character.emotionalState.primary}(${character.emotionalState.intensity}/100)
무공${character.stats.combat}/지력${character.stats.intellect}/의지${character.stats.willpower}/사교${character.stats.social}`;

  return `"${character.name}" 시점으로 ${year}년 이벤트 2~4개 생성.

[캐릭터]
${charSummary}

[세계 상황]
${worldContext}

[최근 서사]
${recentEvents || '(없음)'}

[규칙]
- 뻔한 전개 금지, 반전 필수
- 이전 서사의 인과관계 반영
- 능력치/감정 변화 명시
- 다른 캐릭터 교차 시 relatedCharacters에 ID 기입

[출력: JSON만]
{"events":[{"season":"spring|summer|autumn|winter","title":"","summary":"","importance":"major|minor|turning_point","tags":[],"relatedCharacters":[],"emotionalShift":{"primary":"","intensity":0,"trigger":""},"statsChange":{}}],"yearEndStatus":"childhood|training|wandering|conflict|transformation|convergence"}`;
}
