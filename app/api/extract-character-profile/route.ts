import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { SimulationDerivedProfile, SimulationEvent, Memory } from '@/lib/types';

export const maxDuration = 60;

const client = new Anthropic();

interface ExtractProfileRequest {
  characterId: string;
  characterName: string;
  events: SimulationEvent[];
  memories?: Memory[];
  novelStartAge: number;        // 소설 시작 시점 나이
  birthYear: number;            // 태어난 해
}

export async function POST(req: NextRequest) {
  try {
    const body: ExtractProfileRequest = await req.json();
    const { characterId, characterName, events, memories, novelStartAge, birthYear } = body;

    console.log('[Extract Profile] Character:', characterName, 'Age:', novelStartAge);

    // 소설 시작 시점까지의 이벤트만 필터링
    const novelStartYear = birthYear + novelStartAge;
    const relevantEvents = events.filter(e => e.age <= novelStartAge);
    const relevantMemories = memories?.filter(m => {
      // Memory에는 year가 있으므로 직접 비교
      return m.year <= novelStartYear;
    }) || [];

    if (relevantEvents.length === 0) {
      return NextResponse.json({
        error: '추출할 시뮬레이션 이벤트가 없습니다.',
      }, { status: 400 });
    }

    // 이벤트 요약 생성 (최대 20개)
    const eventSummaries = relevantEvents
      .slice(-20)
      .map(e => `[${birthYear + e.age}년, ${e.age}세] ${e.event}${e.consequences?.length ? ` → ${e.consequences.join(', ')}` : ''}`)
      .join('\n');

    // 기억 요약 생성 (최대 10개)
    const memorySummaries = relevantMemories
      .slice(-10)
      .map(m => {
        const imprintTypes = m.imprints?.map(i => i.type).join('/') || '기억';
        return `- ${m.content} (${imprintTypes}, 감정강도: ${m.emotionalWeight || '?'})`;
      })
      .join('\n');

    const prompt = `당신은 캐릭터 심리 분석 전문가입니다.
아래 시뮬레이션 로그를 분석하여 캐릭터 프로필을 추출하세요.

## 캐릭터 정보
이름: ${characterName}
현재 나이: ${novelStartAge}세 (소설 시작 시점)

## 시뮬레이션 이벤트 (0~${novelStartAge}세)
${eventSummaries}

${memorySummaries ? `## 핵심 기억\n${memorySummaries}` : ''}

## 추출할 정보

1. **personality**: 시뮬레이션 경험으로 형성된 성격 (2~3문장)
   - 경험이 어떻게 성격을 만들었는지 구체적으로

2. **trauma**: 트라우마/상처 목록 (최대 5개)
   - 형식: ["7세 사부 이별", "15세 첫 살인"]

3. **behaviorPatterns**: 행동 패턴 (최대 5개)
   - 형식: ["사람을 쉽게 안 믿음", "혼자 해결하려는 습관"]

4. **speechStyle**: 말투 특성 (1문장)
   - 예: "짧고 건조. 감정을 드러내지 않으려 함."

5. **relationshipPatterns**: 관계 패턴 (최대 3개)
   - 형식: ["경계심 강함", "한번 믿으면 끝까지"]

6. **growthLevel**: 현재 능력 수준 (1문장)
   - 예: "기초 무공 숙달, 실전 경험 부족"

7. **keyMemories**: 성격에 영향 준 핵심 기억 (최대 5개)
   - 형식: ["사부가 떠난 아침의 빈 방", "첫 번째 적의 눈빛"]

8. **simulationSummary**: 시뮬레이션 핵심 요약 (300~500자)
   - 0세부터 현재까지 어떤 인생을 살았는지
   - 어떤 사람이 되었는지

## 중요 규칙
- 시뮬레이션 이벤트에서 직접 추론할 수 있는 것만 작성
- 추측이나 일반적 클리셰 금지
- 구체적인 사건/나이를 언급
- ${novelStartAge}세 이후의 미래는 모르는 상태

JSON으로 응답:
{
  "personality": "...",
  "trauma": ["...", "..."],
  "behaviorPatterns": ["...", "..."],
  "speechStyle": "...",
  "relationshipPatterns": ["...", "..."],
  "growthLevel": "...",
  "keyMemories": ["...", "..."],
  "simulationSummary": "..."
}`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // JSON 파싱
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[Extract Profile] JSON not found in response');
      return NextResponse.json({ error: 'JSON 파싱 실패' }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const profile: SimulationDerivedProfile = {
      personality: parsed.personality || '',
      trauma: parsed.trauma || [],
      behaviorPatterns: parsed.behaviorPatterns || [],
      speechStyle: parsed.speechStyle || '',
      relationshipPatterns: parsed.relationshipPatterns || [],
      growthLevel: parsed.growthLevel || '',
      keyMemories: parsed.keyMemories || [],
      novelStartAge,
      simulationSummary: parsed.simulationSummary || '',
      extractedAt: new Date().toISOString(),
      simulatedYearRange: {
        start: birthYear,
        end: novelStartYear,
      },
    };

    console.log('[Extract Profile] Success:', characterName);

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('[Extract Profile] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '프로필 추출 실패' },
      { status: 500 }
    );
  }
}
