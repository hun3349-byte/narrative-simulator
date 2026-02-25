import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { TimelineAdvance, Character, WorldHistoryEra, Episode } from '@/lib/types';

export const maxDuration = 60;

const client = new Anthropic();

interface AdvanceTimelineRequest {
  characterId: string;
  characterName: string;
  fromAge: number;
  toAge: number;
  duration: string;          // "3개월", "1년" 등
  character: Character;
  worldHistoryEras: WorldHistoryEra[];
  recentEpisodes: Episode[]; // 최근 3화
  worldContext?: string;     // 세계 상황
  genre: string;
  tone: string;
}

export async function POST(req: Request) {
  try {
    const body: AdvanceTimelineRequest = await req.json();
    const {
      characterId,
      characterName,
      fromAge,
      toAge,
      duration,
      character,
      worldHistoryEras,
      recentEpisodes,
      worldContext,
      genre,
      tone,
    } = body;

    if (!characterId || fromAge === undefined || toAge === undefined) {
      return NextResponse.json(
        { error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 최근 에피소드 요약
    const recentEpisodeSummary = recentEpisodes
      .slice(-3)
      .map(ep => `${ep.number}화: ${ep.title}`)
      .join('\n');

    // 캐릭터 현재 상태
    const characterState = character ? `
- 상태: ${character.status || '알 수 없음'}
- 감정: ${character.emotionalState?.primary || '평온'} (강도: ${character.emotionalState?.intensity || 50})
- 스탯: ${JSON.stringify(character.stats || {})}
` : '캐릭터 정보 없음';

    const systemPrompt = `당신은 웹소설 작가입니다. 시간 점프 기간 동안 캐릭터에게 일어난 변화를 시뮬레이션합니다.

## 장르: ${genre}
## 톤: ${tone}

## 캐릭터: ${characterName}
${characterState}

## 시간 점프
- 기간: ${duration}
- 나이: ${fromAge}세 → ${toAge}세

${worldContext ? `## 세계 상황\n${worldContext}` : ''}

${recentEpisodeSummary ? `## 최근 에피소드\n${recentEpisodeSummary}` : ''}

## 출력 형식 (JSON)
{
  "changes": {
    "physical": "신체 변화 (있으면)",
    "mental": "정신/심리 변화",
    "ability": "능력 변화",
    "relationship": "관계 변화",
    "worldEvent": "그 기간 세계에서 일어난 일"
  },
  "summary": "점프 기간 요약 (200~300자)"
}

## 주의사항
1. 극적인 변화보다는 자연스러운 성장
2. 세계 상황과 연결되는 변화
3. 다음 화 집필에 사용할 수 있는 구체적 정보
4. 변화가 없는 항목은 null로`;

    const userPrompt = `"${characterName}"의 ${duration} 동안의 변화를 시뮬레이션해주세요.

이 기간 동안 캐릭터에게 어떤 일이 있었고, 어떻게 변했는지 구체적으로 알려주세요.

다음 화 집필 시 이 변화가 자연스럽게 반영되어야 합니다.`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // JSON 파싱
    let cleanText = text;
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleanText = codeBlockMatch[1].trim();
    }

    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'JSON 파싱 실패', raw: text },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const advance: TimelineAdvance = {
      id: `adv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      fromAge,
      toAge,
      duration,
      changes: {
        physical: parsed.changes?.physical || undefined,
        mental: parsed.changes?.mental || undefined,
        ability: parsed.changes?.ability || undefined,
        relationship: parsed.changes?.relationship || undefined,
        worldEvent: parsed.changes?.worldEvent || undefined,
      },
      summary: parsed.summary || '',
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(advance);
  } catch (error) {
    console.error('advance-timeline error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류' },
      { status: 500 }
    );
  }
}
