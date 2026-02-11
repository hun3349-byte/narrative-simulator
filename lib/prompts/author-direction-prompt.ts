import {
  CharacterSeed,
  EmergentProfile,
  Memory,
  AuthorPersona,
  WorldSettings,
  AnchorEvent,
  AuthorNarrativeArc,
  ArcPhase,
} from '../types';
import { IMPRINT_ICONS } from './simulation-prompt-v2';

/**
 * 시뮬레이션 시작 전, 각 캐릭터의 서사 아크를 설계하는 프롬프트.
 * Haiku로 1회 호출.
 */
export function buildArcDesignPrompt(
  seed: CharacterSeed,
  persona: AuthorPersona,
  theme: string,
  worldSummary: string,
  otherSeeds: CharacterSeed[],
  anchorEvents?: AnchorEvent[],
  startYear?: number,
  endYear?: number,
): string {
  const otherSeedsSummary = otherSeeds
    .filter(s => s.id !== seed.id)
    .map(s => `${s.codename}: ${s.initialCondition}, 기질: ${s.temperament}`)
    .join('\n');

  const anchorSummary = anchorEvents && anchorEvents.length > 0
    ? anchorEvents.map(a => {
        const charSit = a.characterSituations.find(cs => cs.characterId === seed.id);
        return `${a.triggerYear}년: ${a.event}${charSit ? ` (이 캐릭터: ${charSit.situation})` : ''}`;
      }).join('\n')
    : '없음';

  const yearRange = startYear && endYear
    ? `시뮬레이션 기간: ${startYear}~${endYear}년 (${seed.birthYear ? `이 캐릭터: ${startYear - seed.birthYear}~${endYear - seed.birthYear}세` : ''})`
    : '';

  return `당신은 웹소설 작가 "${persona.style.signature}"입니다.
지금부터 아래 캐릭터의 인생을 설계합니다.

[당신의 창작 철학]
강점: ${persona.strengths.join(', ')}
피하는 것: ${persona.style.avoidance.join(', ')}

[프로젝트 주제]
${theme}

[세계관]
${worldSummary}
${yearRange}

[캐릭터 씨앗]
코드명: ${seed.codename}
출생연도: ${seed.birthYear}
초기조건: ${seed.initialCondition}
기질: ${seed.temperament}
잠재능력: ${seed.latentAbility}
근원상처: ${seed.wound}
${seed.innateAppearance ? `선천외모: ${seed.innateAppearance}` : ''}
신체특성: ${seed.physicalTrait}

[다른 캐릭터]
${otherSeedsSummary || '없음'}

[마일스톤]
${anchorSummary}

[요청]
이 캐릭터의 서사 아크를 설계하세요.
재미있는 이야기, 조회수를 올릴 수 있는 전개를 만드세요.

1. 이 캐릭터의 인생을 3~6개의 페이즈로 나누세요.
2. 각 페이즈에 이름과 의도를 부여하세요.
3. 올리고 → 떨어뜨리고 → 다시 올리는 리듬이 있어야 합니다.
4. 캐릭터의 잠재력이 서사를 통해 자연스럽게 개화하도록 설계하세요.
5. 다른 캐릭터와의 만남/충돌 시점도 고려하세요.
6. 이 캐릭터만의 고유한 서사가 있어야 합니다 — 다른 캐릭터와 겹치지 않게.
7. 시련→성장→시련→성장 단순 반복 금지. 패턴을 깨세요.

주의: 이것은 "계획"이지 "확정"이 아닙니다.
시뮬레이션 중에 캐릭터가 예상과 다르게 반응하면 아크를 수정할 수 있습니다.

[출력 형식 — JSON만]
{"phases":[{"id":"phase-1","name":"페이즈 이름","estimatedAgeRange":"0~5세","intent":"이 시기의 의도","keyMoments":["핵심 순간 1","핵심 순간 2"],"emotionalArc":"감정 흐름","endCondition":"이 페이즈가 끝나는 조건"}]}`;
}

/**
 * 매 연도 시뮬레이션에서 작가 디렉션 + 이벤트를 합쳐서 1회 호출하는 프롬프트.
 * 기존 하드코딩된 이벤트 유형/나이별 가이드를 제거하고, 작가 AI의 동적 디렉션으로 교체.
 */
export function buildCombinedDirectionSimulationPrompt(
  seed: CharacterSeed,
  profile: EmergentProfile,
  year: number,
  worldContext: string,
  recentMemories: Memory[],
  narrativeArc: AuthorNarrativeArc,
  persona: AuthorPersona,
  theme: string,
  otherCharactersSummary: string,
  npcPoolSummary?: string,
  anchorEvents?: AnchorEvent[],
): string {
  const age = year - seed.birthYear;

  // 현재 아크 페이즈
  const currentPhase = narrativeArc.phases[narrativeArc.currentPhaseIndex];
  const nextPhase = narrativeArc.phases[narrativeArc.currentPhaseIndex + 1];

  // 씨앗 정보
  const seedSummary = `코드명: ${seed.codename}
초기조건: ${seed.initialCondition}
기질: ${seed.temperament}
잠재능력: ${seed.latentAbility}
근원상처: ${seed.wound}${seed.innateAppearance ? `\n선천외모: ${seed.innateAppearance}` : ''}`;

  // 발현 프로필
  const profileSummary = profile.personality.length > 0
    ? `현재이름: ${profile.displayName}${profile.currentAlias ? ` (${profile.currentAlias})` : ''}
성격: ${profile.personality.slice(0, 3).map(p => `${p.trait}(${p.strength})`).join(', ')}
신념: ${profile.beliefs.slice(0, 2).map(b => b.content).join('; ') || '(아직 형성 안됨)'}
능력: ${profile.abilities.map(a => `${a.name}[${a.level}]`).join(', ') || '없음'}
말투: ${profile.speechPatterns.slice(0, 2).join(', ') || '(아직 특징 없음)'}
내적갈등: ${profile.innerConflicts.slice(0, 2).join('; ') || '(없음)'}`
    : '(아직 발현된 프로필 없음)';

  // 최근 기억
  const memorySummary = recentMemories.length > 0
    ? recentMemories.slice(-5).map(m => {
        const imprintTypes = [...new Set(m.imprints.map(i => IMPRINT_ICONS[i.type]))].join('');
        return `[${m.year}/${m.season}] ${imprintTypes} ${m.content}`;
      }).join('\n')
    : '(기억 없음)';

  // 아크 요약
  const arcSummary = `현재 페이즈: ${currentPhase.name} (${currentPhase.estimatedAgeRange})
페이즈 의도: ${currentPhase.intent}
핵심 순간: ${currentPhase.keyMoments.join(', ')}
감정 흐름: ${currentPhase.emotionalArc}
종료 조건: ${currentPhase.endCondition}
다음 페이즈: ${nextPhase ? `${nextPhase.name} (${nextPhase.estimatedAgeRange})` : '마지막 페이즈'}`;

  // 아크 수정 이력 (최근 2개)
  const revisionSummary = narrativeArc.revisions.length > 0
    ? narrativeArc.revisions.slice(-2).map(r => `[${r.year}년] ${r.reason}: ${r.changes}`).join('\n')
    : '';

  // NPC 섹션
  const npcSection = npcPoolSummary
    ? `\n[등장 가능 NPC]\n${npcPoolSummary}\n자연스럽게 NPC를 재등장시키거나 새 인물을 소개. npcInteractions 필드에 기록.`
    : '';

  // Anchor Events
  const anchorSection = anchorEvents && anchorEvents.length > 0
    ? `\n[필수 사건 — 이번 연도에 반드시 발생]
${anchorEvents.map(a => {
  const charSituation = a.characterSituations.find(s => s.characterId === seed.id);
  return `사건: ${a.event}
세계 영향: ${a.worldImpact}
이 캐릭터의 상황: ${charSituation?.situation || '직접 영향 없음'}`;
}).join('\n\n')}
위 사건은 세계에서 발생한 것. 캐릭터의 반응/선택/감정은 자유.`
    : '';

  return `당신은 두 가지 역할을 순서대로 수행합니다.

[역할 1: 작가 — "${persona.style.signature}"]
당신은 이 시뮬레이션의 신(God)입니다. 캐릭터의 인생에 어떤 상황이 일어날지 당신이 결정합니다.

당신의 강점: ${persona.strengths.join(', ')}
피하는 것: ${persona.style.avoidance.join(', ')}

주제: ${theme}

[캐릭터의 서사 아크]
${arcSummary}
${revisionSummary ? `\n[아크 수정 이력]\n${revisionSummary}` : ''}

[캐릭터 현재 상태]
${seedSummary}
나이: ${age}세
${profileSummary}

[최근 기억]
${memorySummary}

[세계 상황]
${worldContext}

[다른 캐릭터]
${otherCharactersSummary || '없음'}
${npcSection}${anchorSection}

서사 아크의 현재 페이즈를 참고하여, 이 캐릭터의 ${age}세에 필요한 것을 판단하세요.
올려줄 때인가? 떨어뜨릴 때인가? 만남을 줄 때인가? 상실을 줄 때인가?
현재 페이즈의 종료 조건이 충족되었다면, 다음 페이즈로 전환하세요.
재미있는 이야기를 만드는 것이 최우선 목표입니다.
시련→성장→시련→성장 단순 반복 금지. 패턴을 깨세요.

먼저 "authorDirection" 필드에 당신의 판단을 기록하세요.

[역할 2: 시뮬레이션 엔진]
작가의 판단(authorDirection)에 따라, 이 캐릭터의 ${age}세 이벤트를 2~4개 생성하세요.
작가가 설정한 상황 안에서 캐릭터가 자연스럽게 반응하게 하세요.
캐릭터의 반응은 축적된 성격과 경험에 따라 자율적으로 결정하세요.
작가가 "좌절이 필요하다"고 했어도, 캐릭터가 좌절 대신 분노할 수 있습니다.
작가는 상황을 만들지만, 캐릭터의 반응은 캐릭터의 것입니다.

[관계 규칙]
캐릭터 간 관계 변화 시:
- dynamic: 관계를 한 마디로 (예: "경쟁적 동지")
- frictionPoints: 충돌 지점
- resonancePoints: 공명 지점

[각성/전환점 규칙]
강렬한 감정 축적/극한 상황 시 극적 전환 가능.
전환점 발생 시: importance="turning_point", 기억 importance 80+, 성격/능력/가치관/외형 중 2+ 동시 변화.
축적 없이 억지 전환점 금지.

[서술 규칙]
1. Show, Don't Tell (감정 직접 서술 금지)
2. 구체적 감각 묘사
3. 짧고 강렬하게
4. 행동으로 성격을 보여주기
5. sensory는 오감 중심

[기억 각인 규칙]
- type: insight/emotion/skill/speech/name/relationship/trauma/belief
- "name" type: "이름:실제이름" 또는 "이명:별칭" 형태
- 외모 변화 이벤트 시 imprint에 "appearanceChange" 필드 추가

[출력: JSON만]
{"authorDirection":{"arcPosition":"서사 아크에서 현재 위치","narrativeIntent":"이 캐릭터에게 지금 필요한 것","worldPressure":"이번 연도 상황","avoid":"피해야 할 것","desiredEffect":"독자에게 주고 싶은 효과","phaseTransition":null},"events":[{"season":"spring|summer|autumn|winter","title":"","summary":"","importance":"major|minor|turning_point","tags":[],"relatedCharacters":[],"emotionalShift":{"primary":"","intensity":0,"trigger":""},"statsChange":{}}],"yearEndStatus":"childhood|training|wandering|conflict|transformation|convergence","memories":[{"eventIndex":0,"content":"","imprints":[{"type":"","content":"","intensity":0,"source":"","appearanceChange":""}],"emotionalWeight":0}],"npcInteractions":[{"eventIndex":0,"npcAlias":"","npcName":null,"role":"","interaction":"","isNew":true}]}`;
}

/**
 * 묶음 모드 (Batched) — 작가 디렉션 + 시뮬레이션 합친 버전.
 */
export function buildBatchedCombinedPrompt(
  seeds: CharacterSeed[],
  profiles: Record<string, EmergentProfile>,
  memoryStacks: Record<string, Memory[]>,
  year: number,
  worldContext: string,
  narrativeArcs: Record<string, AuthorNarrativeArc>,
  persona: AuthorPersona,
  theme: string,
  npcPoolSummary?: string,
  anchorEvents?: AnchorEvent[],
): string {
  const charSummaries = seeds
    .filter(s => year >= s.birthYear)
    .map(s => {
      const age = year - s.birthYear;
      const profile = profiles[s.id];
      const memories = (memoryStacks[s.id] || []).slice(-3);
      const arc = narrativeArcs[s.id];

      const profileStr = profile && profile.personality.length > 0
        ? `현재이름: ${profile.displayName}${profile.currentAlias ? ` (${profile.currentAlias})` : ''}
  성격: ${profile.personality.slice(0, 3).map(p => `${p.trait}(${p.strength})`).join(', ')}
  능력: ${profile.abilities.map(a => `${a.name}[${a.level}]`).join(', ') || '없음'}`
        : '(발현 프로필 없음)';

      const recentStr = memories.length > 0
        ? memories.map(m => `[${m.year}/${m.season}] ${m.content}`).join('; ')
        : '없음';

      const currentPhase = arc?.phases[arc.currentPhaseIndex];
      const arcStr = currentPhase
        ? `서사 페이즈: ${currentPhase.name} (${currentPhase.estimatedAgeRange})
  페이즈 의도: ${currentPhase.intent}
  감정 흐름: ${currentPhase.emotionalArc}`
        : '(아크 미설계)';

      return `## ${s.codename} (ID: ${s.id}), ${age}세
기질: ${s.temperament}
잠재능력: ${s.latentAbility}
상처: ${s.wound}
${profileStr}
최근기억: ${recentStr}
${arcStr}`;
    }).join('\n\n');

  const npcSection = npcPoolSummary
    ? `\n[등장 가능 NPC]\n${npcPoolSummary}\n`
    : '';

  const anchorSection = anchorEvents && anchorEvents.length > 0
    ? `\n[필수 사건 — ${year}년에 반드시 발생]\n${anchorEvents.map(a => {
        const situations = seeds
          .filter(s => year >= s.birthYear)
          .map(s => {
            const sit = a.characterSituations.find(cs => cs.characterId === s.id);
            return `  ${s.codename}: ${sit?.situation || '직접 영향 없음'}`;
          }).join('\n');
        return `사건: ${a.event}\n세계 영향: ${a.worldImpact}\n캐릭터별 상황:\n${situations}`;
      }).join('\n\n')}\n캐릭터의 반응/선택/감정은 축적된 성격과 경험에 따라 자유.\n`
    : '';

  const charIds = seeds
    .filter(s => year >= s.birthYear)
    .map(s => `"${s.id}":{...}`).join(',');

  return `당신은 두 가지 역할을 순서대로 수행합니다.

[역할 1: 작가 — "${persona.style.signature}"]
당신은 이 시뮬레이션의 신(God)입니다.
강점: ${persona.strengths.join(', ')}
피하는 것: ${persona.style.avoidance.join(', ')}

주제: ${theme}

[세계 상황]
${worldContext}
${npcSection}${anchorSection}

${charSummaries}

각 캐릭터의 서사 아크를 참고하여 ${year}년에 필요한 것을 판단하세요.
재미가 최우선. 시련→성장→시련→성장 단순 반복 금지.
먼저 각 캐릭터별 "authorDirection"을 기록하세요.

[역할 2: 시뮬레이션 엔진]
작가의 판단에 따라 각 캐릭터의 이벤트를 2~3개씩 생성하세요.
캐릭터의 반응은 자율적입니다.

[관계 규칙]
관계 변화 시 dynamic, frictionPoints, resonancePoints 포함.

[각성/전환점 규칙]
축적된 감정 폭발 시 importance="turning_point", 기억 importance 80+.

[서술 규칙]
Show, Don't Tell. 감각 묘사. 짧고 강렬하게. sensory는 오감.

[기억 각인 규칙]
type: insight/emotion/skill/speech/name/relationship/trauma/belief
"name" type: "이름:실제이름" 형태.

[출력: JSON만]
{"characters":{${charIds}}}
각 캐릭터: {"authorDirection":{"arcPosition":"","narrativeIntent":"","worldPressure":"","avoid":"","desiredEffect":"","phaseTransition":null},"events":[{"season":"","title":"","summary":"","importance":"","tags":[],"relatedCharacters":[],"emotionalShift":{"primary":"","intensity":0,"trigger":""},"statsChange":{}}],"yearEndStatus":"","memories":[{"eventIndex":0,"content":"","imprints":[{"type":"","content":"","intensity":0,"source":""}],"emotionalWeight":0}],"npcInteractions":[{"eventIndex":0,"npcAlias":"","npcName":null,"role":"","interaction":"","isNew":true}]}`;
}

/**
 * 유년기 묶음 — 작가 디렉션 + 시뮬레이션 합친 버전.
 */
export function buildYearRangeCombinedPrompt(
  seeds: CharacterSeed[],
  profiles: Record<string, EmergentProfile>,
  memoryStacks: Record<string, Memory[]>,
  startYear: number,
  endYear: number,
  worldContext: string,
  narrativeArcs: Record<string, AuthorNarrativeArc>,
  persona: AuthorPersona,
  theme: string,
  npcPoolSummary?: string,
): string {
  const charSummaries = seeds
    .filter(s => startYear >= s.birthYear)
    .map(s => {
      const profile = profiles[s.id];
      const memories = (memoryStacks[s.id] || []).slice(-3);
      const arc = narrativeArcs[s.id];

      const recentStr = memories.length > 0
        ? memories.map(m => `[${m.year}/${m.season}] ${m.content}`).join('; ')
        : '없음';

      const currentPhase = arc?.phases[arc.currentPhaseIndex];
      const arcStr = currentPhase
        ? `서사 페이즈: ${currentPhase.name} — ${currentPhase.intent}`
        : '';

      return `## ${s.codename} (ID: ${s.id}), ${startYear - s.birthYear}~${endYear - s.birthYear}세
기질: ${s.temperament}
잠재능력: ${s.latentAbility}
상처: ${s.wound}
${profile ? `현재이름: ${profile.displayName}` : '(이름 미발현)'}
최근기억: ${recentStr}
${arcStr}`;
    }).join('\n\n');

  const npcSection = npcPoolSummary
    ? `\n[등장 가능 NPC]\n${npcPoolSummary}\n`
    : '';

  return `당신은 두 역할을 수행합니다.

[역할 1: 작가 — "${persona.style.signature}"]
주제: ${theme}
유년기(${startYear}~${endYear}년)를 디렉션하세요.

[세계 상황]
${worldContext}
${npcSection}

${charSummaries}

각 캐릭터의 유년기에 필요한 것을 판단하세요.

[역할 2: 시뮬레이션]
유년기 이벤트를 각 1~2개씩 생성. 순수한 감정과 원초적 경험 중심.
Show, Don't Tell. 감각 묘사. sensory는 오감.

[기억 각인]
주로 emotion, trauma, insight 위주. "name" type: 이름 부여 순간에만.

[출력: JSON만]
{"characters":{"캐릭터ID":{"authorDirection":{"arcPosition":"","narrativeIntent":"","worldPressure":"","avoid":"","desiredEffect":"","phaseTransition":null},"events":[{"year":숫자,"season":"","title":"","summary":"","importance":"minor","tags":[],"relatedCharacters":[],"emotionalShift":{"primary":"","intensity":0,"trigger":""},"statsChange":{}}],"yearEndStatus":"childhood","memories":[{"eventIndex":0,"content":"","imprints":[{"type":"","content":"","intensity":0,"source":""}],"emotionalWeight":0}]}}}`;
}
