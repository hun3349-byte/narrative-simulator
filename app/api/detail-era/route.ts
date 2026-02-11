import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AUTHOR_PERSONA_PRESETS } from '@/lib/presets/author-personas';
import type { WorldHistoryEra, WorldLayer, CoreRulesLayer, SeedsLayer, DetailedDecade } from '@/lib/types';

const client = new Anthropic();

interface DetailEraRequest {
  authorPersonaId: string;
  world: WorldLayer;
  coreRules: CoreRulesLayer;
  seeds: SeedsLayer;
  era: WorldHistoryEra;
  herobirthYear: number;  // 주인공 탄생 연도
}

export async function POST(req: NextRequest) {
  try {
    const body: DetailEraRequest = await req.json();
    const persona = AUTHOR_PERSONA_PRESETS.find(p => p.id === body.authorPersonaId);

    // 주인공 탄생 전후 50년을 10년 단위로 상세화
    const startYear = body.herobirthYear - 30;
    const endYear = body.herobirthYear + 20;

    const prompt = `당신은 "${persona?.name || '작가'}"입니다.

## 세계 정보
- 대륙: ${body.world.continentName}
- 도시들: ${body.world.cities.map(c => `${c.name}(${c.description})`).join(', ')}

## 힘의 체계
${body.coreRules.powerSystem}

## 현재 시대
- 이름: ${body.era.name}
- 설명: ${body.era.description}
- 분위기: ${body.era.mood}

## 세력들
${body.seeds.factions.map(f => `- ${f.name}: ${f.nature}, 거점: ${f.base}`).join('\n')}

## 주인공 탄생 연도
${body.herobirthYear}년

## 임무
${startYear}년부터 ${endYear}년까지 10년 단위로 상세하게 기록해.
총 5개 구간.

각 10년 동안:
1. 세력들의 상태와 영향력
2. 주요 도시들의 상황과 긴장도
3. 전체 세계의 긴장도
4. 이 10년의 주요 사건들
5. 깔린 복선들

JSON으로 응답:
{
  "decades": [
    {
      "id": "decade-1",
      "yearRange": [시작년, 끝년],
      "factionStates": [
        { "factionName": "세력명", "status": "상태 설명", "influence": 0-100 }
      ],
      "cityStates": [
        { "cityName": "도시명", "condition": "상태", "tension": 0-100 }
      ],
      "worldTension": 0-100,
      "majorEvents": ["사건1", "사건2"],
      "hints": ["복선1", "복선2"]
    }
  ],
  "message": "작가의 설명"
}`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json(parsed);
      }
    } catch {
      return NextResponse.json({
        decades: [],
        message: text,
      });
    }

    return NextResponse.json({
      decades: [],
      message: text,
    });
  } catch (error) {
    console.error('Era detail generation error:', error);
    return NextResponse.json(
      { error: '시대 상세화 실패' },
      { status: 500 }
    );
  }
}
