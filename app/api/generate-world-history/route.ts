import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AUTHOR_PERSONA_PRESETS } from '@/lib/presets/author-personas';
import type { WorldHistoryEra, WorldLayer, CoreRulesLayer, SeedsLayer, HeroArcLayer, UltimateMysteryLayer } from '@/lib/types';

const client = new Anthropic();

interface WorldHistoryRequest {
  genre: string;
  tone: string;
  authorPersonaId: string;
  world: WorldLayer;
  coreRules: CoreRulesLayer;
  seeds: SeedsLayer;
  heroArc: HeroArcLayer;
  ultimateMystery: UltimateMysteryLayer;
  totalYears?: number;  // 기본 1000년
}

export async function POST(req: NextRequest) {
  try {
    const body: WorldHistoryRequest = await req.json();
    const persona = AUTHOR_PERSONA_PRESETS.find(p => p.id === body.authorPersonaId);
    const totalYears = body.totalYears || 1000;

    const prompt = `당신은 "${persona?.name || '작가'}"입니다.

## 세계 정보
- 대륙: ${body.world.continentName}
- 지형: ${body.world.geography}
- 도시들: ${body.world.cities.map(c => c.name).join(', ')}

## 핵심 규칙
- 힘의 체계: ${body.coreRules.powerSystem}
- 역사: ${body.coreRules.history}
- 현재 상태: ${body.coreRules.currentState}

## 세력들
${body.seeds.factions.map(f => `- ${f.name}: ${f.nature}, ${f.goal}`).join('\n')}

## 주인공
- 이름: ${body.heroArc.name}
- 핵심 서사: ${body.heroArc.coreNarrative}

## 궁극의 떡밥
- 표면: ${body.ultimateMystery.surface}
- 진실: ${body.ultimateMystery.truth}
- 힌트들: ${body.ultimateMystery.hints.join(', ')}

## 임무
이 세계의 ${totalYears}년 역사를 4-6개 시대로 나누어 생성해.
각 시대는 50~200년 정도.

## 규칙
1. 각 시대는 고유한 이름과 분위기가 있어야 해
2. 시대마다 핵심 사건, 세력 변화, 주요 인물이 있어야 해
3. 궁극의 떡밥과 관련된 힌트를 시대마다 자연스럽게 뿌려
4. 마지막 시대는 주인공이 태어나기 직전이야

## 마크다운 금지
마크다운 서식 쓰지 마. 순수 텍스트만.

JSON으로 응답:
{
  "eras": [
    {
      "id": "era-1",
      "name": "시대 이름",
      "yearRange": [시작년, 끝년],
      "description": "시대 설명",
      "keyEvents": ["핵심 사건1", "핵심 사건2"],
      "factionChanges": "세력 변화",
      "notableFigures": ["주요 인물1", "주요 인물2"],
      "mysteryHints": ["떡밥 흔적1", "떡밥 흔적2"],
      "mood": "시대 분위기"
    }
  ],
  "message": "작가의 설명 (자연스러운 말투)"
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
        eras: [],
        message: text,
      });
    }

    return NextResponse.json({
      eras: [],
      message: text,
    });
  } catch (error) {
    console.error('World history generation error:', error);
    return NextResponse.json(
      { error: '세계 역사 생성 실패' },
      { status: 500 }
    );
  }
}
