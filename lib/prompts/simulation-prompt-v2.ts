import { CharacterSeed, EmergentProfile, Memory, ImprintType, AnchorEvent, AuthorDirection } from '../types';
import { NarrativeDirective } from '../grammar/grammar-engine';

export const IMPRINT_ICONS: Record<ImprintType, string> = {
  insight: '🧠',
  emotion: '💭',
  skill: '⚔️',
  speech: '💬',
  name: '📛',
  relationship: '🤝',
  trauma: '🩸',
  belief: '✨',
};

/**
 * 서사 문법 지시문을 프롬프트 텍스트로 변환한다.
 */
function formatGrammarDirective(directive: NarrativeDirective): string {
  const lines = [
    `\n[서사 문법 지시]`,
    `현재 서사 단계: ${directive.phaseName} — ${directive.phaseDescription}`,
    `현재 막: ${directive.masterActName}`,
    `목표 긴장도: ${directive.tensionTarget}/100 (현재: ${directive.currentTension}/100)`,
    `${directive.tensionGuidance}`,
  ];

  if (directive.requiredBeats.length > 0) {
    lines.push(`필수 비트(아직 미이행): ${directive.requiredBeats.join(', ')}`);
  }

  lines.push(`이벤트 유형 가이드: ${directive.beatTypeGuidance}`);
  lines.push(`아크 완성도: ${directive.arcFulfillment}%`);

  return lines.join('\n');
}

export function buildSimulationPromptV2(
  seed: CharacterSeed,
  profile: EmergentProfile,
  year: number,
  worldContext: string,
  recentMemories: Memory[],
  grammarDirective?: NarrativeDirective,
  npcPoolSummary?: string,
  anchorEvents?: AnchorEvent[]
): string {
  const age = year - seed.birthYear;

  // 씨앗 정보
  const seedSummary = `코드명: ${seed.codename}
초기조건: ${seed.initialCondition}
기질: ${seed.temperament}
잠재능력: ${seed.latentAbility}
근원상처: ${seed.wound}${seed.innateAppearance ? `\n선천외모: ${seed.innateAppearance}` : ''}`;

  // 발현된 프로필 요약
  const profileSummary = profile.personality.length > 0
    ? `현재이름: ${profile.displayName}${profile.currentAlias ? ` (${profile.currentAlias})` : ''}
성격: ${profile.personality.slice(0, 3).map(p => `${p.trait}(${p.strength})`).join(', ')}
신념: ${profile.beliefs.slice(0, 2).map(b => b.content).join('; ') || '(아직 형성 안됨)'}
능력: ${profile.abilities.map(a => `${a.name}[${a.level}]`).join(', ')}
말투: ${profile.speechPatterns.slice(0, 2).join(', ') || '(아직 특징 없음)'}
내적갈등: ${profile.innerConflicts.slice(0, 2).join('; ') || '(없음)'}`
    : '(아직 발현된 프로필 없음)';

  // 최근 기억 요약
  const memorySummary = recentMemories.length > 0
    ? recentMemories.slice(-5).map(m => {
        const imprintTypes = [...new Set(m.imprints.map(i => IMPRINT_ICONS[i.type]))].join('');
        return `[${m.year}/${m.season}] ${imprintTypes} ${m.content}`;
      }).join('\n')
    : '(기억 없음)';

  const grammarSection = grammarDirective ? formatGrammarDirective(grammarDirective) : '';

  const npcSection = npcPoolSummary
    ? `\n[등장 가능 NPC]
${npcPoolSummary}
이 NPC들을 자연스럽게 재등장시키거나, 새로운 인물을 소개할 수 있음.
새 NPC 등장 시 "npcInteractions" 필드에 기록.`
    : '';

  // Anchor Events section
  const anchorSection = anchorEvents && anchorEvents.length > 0
    ? `\n[필수 사건 — 이번 연도에 반드시 발생]
${anchorEvents.map(a => {
  const charSituation = a.characterSituations.find(s => s.characterId === seed.id);
  return `사건: ${a.event}
세계 영향: ${a.worldImpact}
이 캐릭터의 상황: ${charSituation?.situation || '직접 영향 없음'}`;
}).join('\n\n')}

위 사건은 세계에서 발생한 것입니다. 캐릭터는 이 상황에 놓이게 됩니다.
캐릭터가 이 사건에 어떻게 반응하는지는 축적된 성격과 경험에 따라 자연스럽게 결정하세요.
사건 자체는 변경할 수 없지만, 캐릭터의 반응/선택/감정은 자유입니다.`
    : '';

  return `캐릭터 시점으로 ${year}년 이벤트 2~4개와 기억 각인을 생성.
이 캐릭터는 "씨앗"에서 시작해 경험을 통해 성격, 이름, 능력이 발현된다.

[씨앗 정보]
${seedSummary}
나이: ${age}세

[현재 발현 프로필]
${profileSummary}

[세계 상황]
${worldContext}

[최근 기억]
${memorySummary}
${grammarSection}
${npcSection}
${anchorSection}

[관계 규칙]
캐릭터 간 관계가 변화할 때, 단순 호감도 외에 다음을 포함하세요:
- dynamic: 이 관계를 한 마디로 정의하면? (예: "경쟁적 동지", "무의식적 집착")
- frictionPoints: 두 캐릭터의 성격/가치관에서 충돌하는 지점은?
- resonancePoints: 두 캐릭터가 공명하는 지점은?
이 정보는 이후 시뮬레이션에서 두 캐릭터가 만날 때 자연스러운 갈등과 유대의 근거가 됩니다.

[각성/전환점 규칙]
캐릭터에게 강렬한 감정이 축적되거나 극한 상황에 놓였을 때, 평범한 성장이 아닌 극적인 전환이 발생할 수 있습니다.
전환점 조건 (자연스럽게 판단):
- 감정 잔여(emotionalWeight)가 높은 기억이 연속으로 쌓였을 때
- 가치관이 근본적으로 흔들리는 사건이 발생했을 때
- 생사의 갈림길에 섰을 때
- 중요한 관계가 급변했을 때 (배신, 상실, 각성)
전환점이 발생하면:
- 이벤트의 importance를 "turning_point"로
- 기억의 importance를 80 이상으로
- 성격, 능력, 가치관, 외형 중 2개 이상 동시 변화
주의: 전환점을 억지로 만들지 마세요. 축적된 경험이 자연스럽게 폭발하는 순간이어야 합니다.

[서술 규칙 — 모든 이벤트에 적용]
이벤트의 summary와 기억의 content, sensory 필드 작성 시:
1. Show, Don't Tell: "A가 슬펐다" → "A는 아무 말 없이 벽을 보고 있었다. 손가락이 미세하게 떨렸다."
2. 구체적 감각: "힘이 각성했다" → "손바닥이 뜨거워졌다. 돌에서 백 년 전의 불꽃이 올라왔다."
3. 짧고 강렬하게: 긴 설명 대신 짧은 묘사.
4. 행동으로 성격을 보여주기: "A는 착한 성격이다" → "A가 빵 반쪽을 내밀었다. 눈도 마주치지 않은 채."
5. sensory(오감 기억)는 반드시 감각 중심: "힘들었다" → "피 냄새와 새벽 찬 공기. 검에서 전해오는 진동."

[규칙]
- 뻔한 전개 금지, 반전 필수
- 이전 기억의 인과관계 반영
- 능력치/감정 변화 명시
- 다른 캐릭터 교차 시 relatedCharacters에 ID 기입
- 각 이벤트에 대한 "기억 각인(memories)"을 생성:
  - type: insight(깨달음), emotion(감정), skill(기술), speech(말투), name(이름획득), relationship(관계), trauma(트라우마), belief(신념)
  - "name" type은 누군가 이름을 지어주거나 이명을 얻는 특별한 순간에만 사용
    - content에 "이름:캐릭터이름" 또는 "이명:별칭" 형태로 기재
  - "speech" type은 특정 말투나 화법 패턴을 획득할 때 사용
  - 외모가 변하는 이벤트(흉터, 머리색 변화, 성장 등)가 있으면 imprint에 "appearanceChange" 필드 추가

[출력: JSON만]
{"events":[{"season":"spring|summer|autumn|winter","title":"","summary":"","importance":"major|minor|turning_point","tags":[],"relatedCharacters":[],"emotionalShift":{"primary":"","intensity":0,"trigger":""},"statsChange":{}}],"yearEndStatus":"childhood|training|wandering|conflict|transformation|convergence","memories":[{"eventIndex":0,"content":"기억 내용","imprints":[{"type":"insight|emotion|skill|speech|name|relationship|trauma|belief","content":"각인 내용","intensity":0,"source":"출처","appearanceChange":"(선택) 외모 변화 설명"}],"emotionalWeight":0}],"npcInteractions":[{"eventIndex":0,"npcAlias":"별칭","npcName":null,"role":"이 NPC의 역할 (자유 서술, 예: 수상한 노인, 거리의 약사)","interaction":"상호작용 설명","isNew":true}]}`;
}

export function buildBatchedPromptV2(
  seeds: CharacterSeed[],
  profiles: Record<string, EmergentProfile>,
  memoryStacks: Record<string, Memory[]>,
  year: number,
  worldContext: string,
  grammarDirectives?: Record<string, NarrativeDirective>,
  npcPoolSummary?: string,
  anchorEvents?: AnchorEvent[]
): string {
  const charSummaries = seeds
    .filter(s => year >= s.birthYear)
    .map(s => {
      const age = year - s.birthYear;
      const profile = profiles[s.id];
      const memories = (memoryStacks[s.id] || []).slice(-3);

      const profileStr = profile && profile.personality.length > 0
        ? `현재이름: ${profile.displayName}${profile.currentAlias ? ` (${profile.currentAlias})` : ''}
  성격: ${profile.personality.slice(0, 3).map(p => `${p.trait}(${p.strength})`).join(', ')}
  능력: ${profile.abilities.map(a => `${a.name}[${a.level}]`).join(', ')}`
        : '(발현 프로필 없음)';

      const recentStr = memories.length > 0
        ? memories.map(m => `[${m.year}/${m.season}] ${m.content}`).join('; ')
        : '없음';

      const grammarStr = grammarDirectives?.[s.id]
        ? `\n서사단계: ${grammarDirectives[s.id].phaseName} (${grammarDirectives[s.id].tensionGuidance})\n필수비트: ${grammarDirectives[s.id].requiredBeats.join(', ') || '없음'}\n이벤트가이드: ${grammarDirectives[s.id].beatTypeGuidance}`
        : '';

      return `## ${s.codename} (ID: ${s.id}), ${age}세
기질: ${s.temperament}
잠재능력: ${s.latentAbility}
상처: ${s.wound}
${profileStr}
최근기억: ${recentStr}${grammarStr}`;
    }).join('\n\n');

  // 마스터 아크 정보 (전체 서사 가이드)
  const masterGrammarSection = grammarDirectives
    ? `\n[서사 문법 - 전체 가이드]\n현재 막: ${Object.values(grammarDirectives)[0]?.masterActName || '알 수 없음'}\n각 캐릭터의 서사 단계와 필수 비트를 반드시 반영하여 이벤트를 생성하세요.\n`
    : '';

  const npcSection = npcPoolSummary
    ? `\n[등장 가능 NPC]\n${npcPoolSummary}\n자연스럽게 NPC를 재등장시키거나 새 인물을 소개. npcInteractions 필드에 기록.\n`
    : '';

  // Anchor Events section for batched
  const anchorSection = anchorEvents && anchorEvents.length > 0
    ? `\n[필수 사건 — ${year}년에 반드시 발생]\n${anchorEvents.map(a => {
        const situations = seeds
          .filter(s => year >= s.birthYear)
          .map(s => {
            const sit = a.characterSituations.find(cs => cs.characterId === s.id);
            return `  ${s.codename}: ${sit?.situation || '직접 영향 없음'}`;
          }).join('\n');
        return `사건: ${a.event}\n세계 영향: ${a.worldImpact}\n캐릭터별 상황:\n${situations}`;
      }).join('\n\n')}\n\n위 사건은 세계에서 발생한 것. 캐릭터의 반응/선택/감정은 축적된 성격과 경험에 따라 자유.\n`
    : '';

  const charIds = seeds
    .filter(s => year >= s.birthYear)
    .map(s => `"${s.id}":{...}`).join(',');

  return `${year}년. 아래 캐릭터 각각의 이벤트를 2~3개씩 + 기억 각인 생성.
같은 시간축 위에서 각자 독립적으로 행동하되, 자연스러운 교차가 있으면 반영.
각 캐릭터는 "씨앗"에서 시작해 경험을 통해 성격, 이름, 능력이 발현된다.

[세계 상황]
${worldContext}
${masterGrammarSection}${npcSection}${anchorSection}

${charSummaries}

[관계 규칙]
캐릭터 간 관계가 변화할 때:
- dynamic: 관계를 한 마디로 (예: "경쟁적 동지", "무의식적 집착")
- frictionPoints: 충돌 지점
- resonancePoints: 공명 지점

[각성/전환점 규칙]
강렬한 감정 축적/극한 상황 시 극적 전환 가능.
전환점 발생 시: importance="turning_point", 기억 importance 80+, 성격/능력/가치관/외형 중 2+ 동시 변화.
축적 없이 억지 전환점 금지.

[서술 규칙]
1. Show, Don't Tell (감정 직접 서술 금지, 행동/감각으로)
2. 구체적 감각 묘사
3. 짧고 강렬하게
4. sensory는 오감 중심

[기억 각인 규칙]
- type: insight/emotion/skill/speech/name/relationship/trauma/belief
- "name" type: "이름:실제이름" 또는 "이명:별칭" 형태
- 나이에 맞는 각인 type 사용

[출력: JSON만]
{"characters":{${charIds}}}
각 캐릭터: {"events":[{"season":"","title":"","summary":"","importance":"","tags":[],"relatedCharacters":[],"emotionalShift":{"primary":"","intensity":0,"trigger":""},"statsChange":{}}],"yearEndStatus":"","memories":[{"eventIndex":0,"content":"","imprints":[{"type":"","content":"","intensity":0,"source":""}],"emotionalWeight":0}],"npcInteractions":[{"eventIndex":0,"npcAlias":"","npcName":null,"role":"","interaction":"","isNew":true}]}`;
}

export function buildYearRangePromptV2(
  seeds: CharacterSeed[],
  profiles: Record<string, EmergentProfile>,
  memoryStacks: Record<string, Memory[]>,
  startYear: number,
  endYear: number,
  worldContext: string,
  grammarDirectives?: Record<string, NarrativeDirective>,
  npcPoolSummary?: string
): string {
  const charSummaries = seeds
    .filter(s => startYear >= s.birthYear)
    .map(s => {
      const profile = profiles[s.id];
      const memories = (memoryStacks[s.id] || []).slice(-3);

      const recentStr = memories.length > 0
        ? memories.map(m => `[${m.year}/${m.season}] ${m.content}`).join('; ')
        : '없음';

      const grammarStr = grammarDirectives?.[s.id]
        ? `\n서사단계: ${grammarDirectives[s.id].phaseName}`
        : '';

      return `## ${s.codename} (ID: ${s.id}), ${startYear - s.birthYear}~${endYear - s.birthYear}세
기질: ${s.temperament}
잠재능력: ${s.latentAbility}
상처: ${s.wound}
${profile ? `현재이름: ${profile.displayName}` : '(이름 미발현)'}
최근기억: ${recentStr}${grammarStr}`;
    }).join('\n\n');

  const masterGrammarSection = grammarDirectives
    ? `\n[서사 문법]\n현재 막: ${Object.values(grammarDirectives)[0]?.masterActName || '발단'}\n`
    : '';

  const npcSection = npcPoolSummary
    ? `\n[등장 가능 NPC]\n${npcPoolSummary}\n`
    : '';

  return `${startYear}~${endYear}년(유년기). 아래 캐릭터의 유년기 이벤트를 각 1~2개씩 + 기억 각인 생성.
유년기이므로 성장, 발견, 운명의 조짐 위주로. 순수한 감정과 원초적 경험 중심.

[세계 상황]
${worldContext}
${masterGrammarSection}${npcSection}

${charSummaries}

[서술 규칙]
Show, Don't Tell. 감정 직접 서술 금지, 행동/감각으로 보여주기.
구체적 감각 묘사. sensory는 오감 중심.

[유년기 기억 각인 규칙]
- 주로 emotion, trauma, insight 위주
- "name" type: 누군가 이름을 지어주는 순간에만 사용
- skill type은 아주 초보적 발견만 가능

[출력: JSON만]
{"characters":{"캐릭터ID":{"events":[{"year":숫자,"season":"","title":"","summary":"","importance":"minor","tags":[],"relatedCharacters":[],"emotionalShift":{"primary":"","intensity":0,"trigger":""},"statsChange":{}}],"yearEndStatus":"childhood","memories":[{"eventIndex":0,"content":"","imprints":[{"type":"","content":"","intensity":0,"source":""}],"emotionalWeight":0}]}}}`;
}
