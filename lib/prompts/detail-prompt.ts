import { Character, NarrativeEvent, AuthorPersona, WorldSettings } from '../types';
import { StoryDirector } from '../agents/story-director';

export function buildDetailPrompt(
  character: Character,
  event: NarrativeEvent,
  worldContext: string,
  persona?: AuthorPersona,
  worldSettings?: WorldSettings,
  allCharacters?: Character[]
): string {
  const relatedInfo = event.relatedCharacters?.length
    ? `\n## 이 장면에 등장하는 다른 인물\n${event.relatedCharacters.map(id => {
        const c = allCharacters?.find(ch => ch.id === id);
        return c ? `- ${c.name} (${c.alias}): ${c.profile.personality}` : `- ${id}`;
      }).join('\n')}`
    : '';

  // 페르소나 섹션
  const personaSection = persona
    ? StoryDirector.buildPersonaDirective(persona)
    : '';

  // 세계관 감각 디테일 섹션
  const sensorySection = worldSettings?.worldLayers?.sensoryDetails?.length
    ? `\n## 세계의 감각 (장면에 자연스럽게 녹여넣을 것)\n${worldSettings.worldLayers.sensoryDetails.map(s => `- ${s}`).join('\n')}`
    : '';

  return `
당신은 한국 웹소설 작가입니다.
아래 이벤트를 하나의 완결된 장면(씬)으로 확장하세요.
${personaSection}

## 캐릭터
- 이름: ${character.name} (${character.alias})
- 나이: ${event.year - character.birthYear}세
- 현재 감정: ${character.emotionalState.primary} (강도: ${character.emotionalState.intensity}/100)
- 성격: ${character.profile.personality}

## 이벤트 정보
- 시점: ${event.year}년 ${event.season}
- 제목: ${event.title}
- 요약: ${event.summary}
- 중요도: ${event.importance}
- 태그: ${event.tags.join(', ')}
${relatedInfo}

## 세계관 배경
${worldContext}
${sensorySection}

## 작성 규칙 (절대 준수)
1. **나레이션 중심**: 전체 분량의 80% 이상이 서술/묘사. 대화는 20% 미만.
2. **대화 형식**: 짧은 왕복 대화 절대 금지. 한 인물이 긴 대사를 하면 상대도 길게 응답하는 형식.
3. **반전 필수**: 뻔하거나 예상 가능한 전개 금지. 독자가 예측하지 못한 요소를 최소 1개 포함.
4. **오감 묘사**: 시각, 청각, 촉각, 후각 중 최소 3가지를 활용.
5. **내면 깊이**: 캐릭터의 내면 독백을 통해 감정의 층위를 드러낼 것.
6. **분량**: 2000~3500자 (한국어 기준).
7. **문체**: 웹소설 특유의 몰입감 있는 3인칭 시점. 간결하되 깊이 있는 문장.

## 출력 퀄리티 — 절대 규칙
1. 감정은 설명하지 않는다. 행동과 감각으로 보여준다.
   "그는 분노했다." → "주먹이 하얘질 때까지 쥐었다. 이가 갈리는 소리가 났다."
2. 설명적 서술 금지. 묘사적 서술만.
   "A는 B를 존경하게 되었다." → "A는 B가 떠난 자리를 한참 바라보았다."
3. 대사는 짧게. 설명 대사 금지.
   "나는 너를 용서할 수 없어. 왜냐하면..." → "...용서? 네가?"
4. 독자가 행간을 읽게 만든다. 70%만 보여주고 30%는 독자의 상상에 맡긴다.

## 출력 형식 (JSON만, 다른 텍스트 절대 없이)
{
  "content": "본문 전체 서술 (2000~3500자, \\n으로 단락 구분)",
  "dialogues": [
    { "speaker": "이름", "text": "대사 전문", "emotion": "감정 상태" }
  ],
  "atmosphere": "이 장면의 분위기를 한 문장으로",
  "innerThought": "캐릭터의 핵심 내면 독백 한 문단 (3~5문장)"
}

주의: content에 대화문도 포함되어야 합니다. dialogues 배열은 별도 참조용입니다.
`;
}

export function buildBridgePrompt(
  prevContent: string,
  nextContent: string,
  prevEvent: NarrativeEvent,
  nextEvent: NarrativeEvent
): string {
  return `
두 장면 사이를 자연스럽게 연결하는 전환 서술을 작성하세요.

## 앞 장면 (${prevEvent.year}년 ${prevEvent.season})
${prevContent.slice(-500)}

## 뒷 장면 (${nextEvent.year}년 ${nextEvent.season})
${nextContent.slice(0, 500)}

## 규칙
- 200~500자
- 시간 경과나 장소 이동을 자연스럽게 처리
- 나레이션 중심
- 앞 장면의 여운을 살리면서 뒷 장면으로의 기대감 조성

## 출력
전환 서술 텍스트만 출력 (JSON 아님, 순수 텍스트)
`;
}
