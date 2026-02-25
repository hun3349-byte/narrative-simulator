import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { PrehistoryEvent, WorldHistoryEra, HeroArcLayer, ProtagonistSimulationConfig } from '@/lib/types';

export const maxDuration = 60;

const client = new Anthropic();

interface SimulatePrehistoryRequest {
  protagonistConfig: ProtagonistSimulationConfig;
  heroArc: HeroArcLayer;
  worldHistoryEras: WorldHistoryEra[];
  genre: string;
  tone: string;
}

export async function POST(req: Request) {
  try {
    const body: SimulatePrehistoryRequest = await req.json();
    const { protagonistConfig, heroArc, worldHistoryEras, genre, tone } = body;

    if (!protagonistConfig || !heroArc) {
      return NextResponse.json(
        { error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const { prehistoryStart, novelStartAge, prehistoryUnit } = protagonistConfig;

    // 주인공 출생 기준으로 관련 세계 역사 필터링
    const relevantEras = worldHistoryEras.filter(era => {
      // 세계 역사 연도를 주인공 출생 기준으로 변환해서 필터
      // (실제 세계관 연도 체계에 맞게 조정 필요)
      return true; // 일단 모든 시대 참조
    });

    const systemPrompt = `당신은 웹소설 작가입니다. 주인공의 전사(前史)를 시뮬레이션합니다.

전사란 주인공이 태어나기 전의 이야기입니다:
- 부모/스승 세대의 이야기
- 주인공 출생에 영향을 준 사건들
- 주인공이 자랄 환경이 형성되는 과정

## 장르: ${genre}
## 톤: ${tone}

## 주인공 정보
- 이름: ${heroArc.name || '주인공'}
- 태생: ${heroArc.origin || '알 수 없음'}
- 소속: ${heroArc.faction || '없음'}
- 환경: ${heroArc.environment || '알 수 없음'}
- 핵심 서사: ${heroArc.coreNarrative || ''}

## 시뮬레이션 범위
- 시작: 주인공 출생 ${prehistoryStart}년 전
- 종료: 주인공 출생
- 단위: ${prehistoryUnit}년

## 세계 역사 배경
${relevantEras.map(era => `- ${era.name} (${era.yearRange[0]}~${era.yearRange[1]}): ${era.description}`).join('\n')}

## 출력 형식 (JSON)
{
  "events": [
    {
      "id": "pre-1",
      "yearsBefore": 30,  // 출생 30년 전
      "title": "이벤트 제목",
      "description": "이벤트 상세 설명 (200자 내외)",
      "worldContext": "이 시점의 세계 상황",
      "relatedFigures": [
        { "name": "아버지 이름", "role": "아버지", "event": "이 인물에게 일어난 일" }
      ],
      "impact": "이 사건이 주인공 출생/성장에 미친 영향",
      "category": "family|world|mentor|fate"
    }
  ],
  "summary": "전사 전체 요약 (500자 내외, 집필 프롬프트용)"
}

## 카테고리 설명
- family: 가족 관련 사건 (부모 만남, 가문 사건 등)
- world: 세계 사건이 가족에게 영향 (전쟁, 재난 등)
- mentor: 스승/조력자 관련 사건
- fate: 운명적 사건 (예언, 저주, 축복 등)

## 주의사항
1. 세계 역사 배경과 연결되는 사건을 만들어라
2. 주인공 출생 환경이 자연스럽게 형성되도록
3. 부모/스승의 과거가 주인공에게 영향을 미치도록
4. 복선이 될 만한 요소를 심어라
5. 너무 많은 사건을 넣지 마라 (${prehistoryUnit}년 단위로 2-3개)`;

    const userPrompt = `주인공 "${heroArc.name || '주인공'}"의 전사를 시뮬레이션해주세요.

출생 ${prehistoryStart}년 전부터 출생까지, ${prehistoryUnit}년 단위로 주요 사건을 생성해주세요.

부모/스승 세대의 이야기와 주인공 출생 환경 형성에 집중해주세요.`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      temperature: 0.8,
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
    const events: PrehistoryEvent[] = parsed.events.map((e: PrehistoryEvent, idx: number) => ({
      ...e,
      id: e.id || `pre-${idx + 1}`,
    }));

    const result = {
      events,
      generatedAt: new Date().toISOString(),
      worldHistoryEraIds: relevantEras.map(e => e.id),
      summary: parsed.summary || '',
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('simulate-prehistory error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류' },
      { status: 500 }
    );
  }
}
