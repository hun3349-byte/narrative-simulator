import Anthropic from '@anthropic-ai/sdk';
import type { PrehistoryEvent, WorldHistoryEra, HeroArcLayer, ProtagonistSimulationConfig, WorldBible } from '@/lib/types';

export const maxDuration = 60;

const client = new Anthropic();

interface SimulatePrehistoryRequest {
  protagonistConfig: ProtagonistSimulationConfig;
  heroArc: HeroArcLayer;
  worldHistoryEras: WorldHistoryEra[];
  worldBible?: WorldBible;  // 경량화된 세계관
  genre: string;
  tone: string;
  // 분할 실행용 파라미터
  chunkStart?: number;  // 시작 연도 (출생 N년 전)
  chunkEnd?: number;    // 종료 연도 (출생 N년 전)
  previousEvents?: PrehistoryEvent[];  // 이전 청크 결과
  retryLevel?: number;  // 재시도 레벨 (0: 일반, 1: 축소, 2: 최소)
}

// 세계관 압축 (토큰 예산 적용)
function compressWorldContext(
  worldHistoryEras: WorldHistoryEra[],
  worldBible?: WorldBible,
  retryLevel: number = 0
): string {
  // World Bible이 있으면 우선 사용 (이미 압축됨)
  if (worldBible && retryLevel < 2) {
    const sections = [];
    if (worldBible.worldSummary) sections.push(`세계: ${worldBible.worldSummary}`);
    if (worldBible.rules?.powerSystem) sections.push(`힘: ${worldBible.rules.powerSystem}`);
    if (worldBible.rules?.keyHistory) sections.push(`역사: ${worldBible.rules.keyHistory}`);
    if (worldBible.factions) sections.push(`세력: ${worldBible.factions}`);
    return sections.join('\n');
  }

  // retryLevel에 따른 압축 수준
  if (retryLevel >= 2) {
    // 최소 컨텍스트
    return worldHistoryEras.slice(-2).map(era => era.name).join(', ') || '(세계 역사)';
  }

  if (retryLevel >= 1) {
    // 20% 축소: 최근 3개 시대만
    return worldHistoryEras.slice(-3).map(era =>
      `${era.name}: ${era.description?.slice(0, 50) || ''}`
    ).join('\n');
  }

  // 일반: 모든 시대 (설명 100자 제한)
  return worldHistoryEras.map(era =>
    `${era.name} (${era.yearRange[0]}~${era.yearRange[1]}): ${era.description?.slice(0, 100) || ''}`
  ).join('\n');
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();

  try {
    const body: SimulatePrehistoryRequest = await req.json();
    const {
      protagonistConfig, heroArc, worldHistoryEras, worldBible,
      genre, tone, chunkStart, chunkEnd, previousEvents, retryLevel = 0
    } = body;

    if (!protagonistConfig || !heroArc) {
      return new Response(
        `data: ${JSON.stringify({ type: 'error', message: '필수 데이터가 누락되었습니다.' })}\n\n`,
        { headers: { 'Content-Type': 'text/event-stream' } }
      );
    }

    const { prehistoryStart, prehistoryUnit } = protagonistConfig;

    // 분할 실행: chunkStart/chunkEnd가 있으면 해당 구간만 시뮬레이션
    const actualStart = chunkStart ?? prehistoryStart;
    const actualEnd = chunkEnd ?? 0;
    const yearsToSimulate = actualStart - actualEnd;

    // 세계관 컨텍스트 압축
    const worldContext = compressWorldContext(worldHistoryEras, worldBible, retryLevel);

    // 이전 청크 결과 요약 (있으면)
    const previousContext = previousEvents && previousEvents.length > 0
      ? `\n## 이전 시뮬레이션 결과 (이어서 작성)\n${previousEvents.map(e =>
          `- ${e.yearsBefore}년 전: ${e.title}`
        ).join('\n')}`
      : '';

    // 프롬프트 경량화
    const systemPrompt = `웹소설 작가. 주인공 전사(前史) 시뮬레이션.

## 장르: ${genre} / 톤: ${tone}

## 주인공
- 이름: ${heroArc.name || '주인공'}
- 태생: ${heroArc.origin || '알 수 없음'}
- 환경: ${heroArc.environment || '알 수 없음'}
- 서사: ${heroArc.coreNarrative?.slice(0, 100) || ''}

## 시뮬레이션 범위
- 출생 ${actualStart}년 전 ~ ${actualEnd === 0 ? '출생' : `${actualEnd}년 전`}
- 단위: ${prehistoryUnit}년
${previousContext}

## 세계 배경
${worldContext}

## JSON 출력
{
  "events": [
    {
      "id": "pre-1",
      "yearsBefore": 30,
      "title": "이벤트 제목",
      "description": "상세 설명 (150자)",
      "relatedFigures": [{"name": "인물명", "role": "역할"}],
      "impact": "주인공에 미친 영향",
      "category": "family|world|mentor|fate"
    }
  ],
  "summary": "전사 요약 (300자)"
}

## 규칙
- ${prehistoryUnit}년당 1-2개 이벤트만
- 부모/스승 세대 이야기
- 복선 요소 삽입`;

    const userPrompt = `${heroArc.name || '주인공'}의 전사. 출생 ${actualStart}년 전 ~ ${actualEnd === 0 ? '출생' : `${actualEnd}년 전`}. ${yearsToSimulate}년 분량.`;

    // SSE 스트리밍
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 진행률 전송
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'progress',
              message: `전사 시뮬레이션 중 (${actualStart}년 전 ~ ${actualEnd === 0 ? '출생' : `${actualEnd}년 전`})...`
            })}\n\n`
          ));

          let fullText = '';
          const streamResponse = client.messages.stream({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: retryLevel >= 1 ? 2048 : 3000,  // 재시도 시 토큰 축소
            temperature: 0.7,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          });

          for await (const event of streamResponse) {
            if (event.type === 'content_block_delta') {
              const delta = event.delta;
              if ('text' in delta) {
                fullText += delta.text;
              }
            }
          }

          // JSON 파싱
          let cleanText = fullText;
          const codeBlockMatch = fullText.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (codeBlockMatch) {
            cleanText = codeBlockMatch[1].trim();
          }

          const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'error', message: 'JSON 파싱 실패', raw: fullText.slice(0, 500) })}\n\n`
            ));
            controller.close();
            return;
          }

          const parsed = JSON.parse(jsonMatch[0]);
          const events: PrehistoryEvent[] = (parsed.events || []).map((e: PrehistoryEvent, idx: number) => ({
            ...e,
            id: e.id || `pre-${actualStart}-${idx + 1}`,
          }));

          // 완료 전송
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'done',
              events,
              summary: parsed.summary || '',
              chunkRange: { start: actualStart, end: actualEnd },
              generatedAt: new Date().toISOString(),
            })}\n\n`
          ));

          controller.close();
        } catch (error) {
          console.error('simulate-prehistory stream error:', error);
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : '스트리밍 오류',
              retryable: true
            })}\n\n`
          ));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('simulate-prehistory error:', error);
    return new Response(
      `data: ${JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : '알 수 없는 오류' })}\n\n`,
      { headers: { 'Content-Type': 'text/event-stream' } }
    );
  }
}
