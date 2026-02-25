import Anthropic from '@anthropic-ai/sdk';
import type { TimelineAdvance, Character, WorldHistoryEra, Episode, WorldBible } from '@/lib/types';

export const maxDuration = 60;

const client = new Anthropic();

interface AdvanceTimelineRequest {
  characterId: string;
  characterName: string;
  fromAge: number;
  toAge: number;
  duration: string;
  character: Character;
  worldHistoryEras: WorldHistoryEra[];
  worldBible?: WorldBible;  // 경량화된 세계관
  recentEpisodes: Episode[];
  worldContext?: string;
  genre: string;
  tone: string;
  // 분할 실행용
  chunkIndex?: number;
  totalChunks?: number;
  previousChanges?: TimelineAdvance[];
  retryLevel?: number;
}

// 세계관 압축
function compressWorldContext(
  worldHistoryEras: WorldHistoryEra[],
  worldBible?: WorldBible,
  retryLevel: number = 0
): string {
  if (worldBible && retryLevel < 2) {
    const sections = [];
    if (worldBible.worldSummary) sections.push(worldBible.worldSummary);
    if (worldBible.rules?.powerSystem) sections.push(`힘: ${worldBible.rules.powerSystem}`);
    return sections.join(' / ');
  }

  if (retryLevel >= 2) {
    return '(세계 상황 생략)';
  }

  if (retryLevel >= 1) {
    return worldHistoryEras.slice(-2).map(era => era.name).join(', ');
  }

  return worldHistoryEras.slice(-3).map(era =>
    `${era.name}: ${era.description?.slice(0, 50) || ''}`
  ).join('\n');
}

// 캐릭터 상태 압축
function compressCharacterState(character: Character, retryLevel: number = 0): string {
  if (retryLevel >= 2) {
    return `${character.name} (${character.status || '활동 중'})`;
  }

  const parts = [];
  parts.push(`이름: ${character.name}`);
  if (character.status) parts.push(`상태: ${character.status}`);
  if (character.emotionalState?.primary) {
    parts.push(`감정: ${character.emotionalState.primary}`);
  }
  if (retryLevel < 1 && character.profile?.personality) {
    parts.push(`성격: ${character.profile.personality.slice(0, 50)}`);
  }
  return parts.join('\n');
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();

  try {
    const body: AdvanceTimelineRequest = await req.json();
    const {
      characterId, characterName, fromAge, toAge, duration, character,
      worldHistoryEras, worldBible, recentEpisodes, worldContext,
      genre, tone, chunkIndex, totalChunks, previousChanges, retryLevel = 0
    } = body;

    if (!characterId || fromAge === undefined || toAge === undefined) {
      return new Response(
        `data: ${JSON.stringify({ type: 'error', message: '필수 데이터가 누락되었습니다.' })}\n\n`,
        { headers: { 'Content-Type': 'text/event-stream' } }
      );
    }

    // 세계관/캐릭터 컨텍스트 압축
    const compressedWorld = compressWorldContext(worldHistoryEras, worldBible, retryLevel);
    const compressedCharacter = compressCharacterState(character, retryLevel);

    // 최근 에피소드 요약 (최대 2개, 제목만)
    const recentEpisodeSummary = retryLevel < 2
      ? recentEpisodes.slice(-2).map(ep => `${ep.number}화: ${ep.title}`).join(', ')
      : '';

    // 이전 청크 결과 (있으면)
    const previousContext = previousChanges && previousChanges.length > 0
      ? `\n이전 변화: ${previousChanges.map(c => c.summary?.slice(0, 50) || '').join('; ')}`
      : '';

    // 프롬프트 경량화
    const systemPrompt = `웹소설 작가. 시간 점프 시뮬레이션.

## ${genre} / ${tone}

## 캐릭터
${compressedCharacter}

## 시간 점프: ${fromAge}세 → ${toAge}세 (${duration})
${previousContext}

${worldContext ? `## 상황\n${worldContext.slice(0, 200)}` : `## 세계\n${compressedWorld}`}

${recentEpisodeSummary ? `## 최근 에피소드\n${recentEpisodeSummary}` : ''}

## JSON 출력
{
  "changes": {
    "physical": "신체 변화 (있으면)",
    "mental": "심리 변화",
    "ability": "능력 변화",
    "relationship": "관계 변화",
    "worldEvent": "세계 사건"
  },
  "summary": "점프 요약 (200자)"
}

- 자연스러운 성장
- 변화 없으면 null`;

    const userPrompt = `${characterName}의 ${duration} 변화 시뮬레이션.`;

    // SSE 스트리밍
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 진행률 전송
          const progressMsg = totalChunks
            ? `성장 시뮬레이션 중... (${(chunkIndex || 0) + 1}/${totalChunks})`
            : `시간 점프 시뮬레이션 중...`;

          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'progress', message: progressMsg })}\n\n`
          ));

          let fullText = '';
          const streamResponse = client.messages.stream({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: retryLevel >= 1 ? 1024 : 1500,
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
              `data: ${JSON.stringify({ type: 'error', message: 'JSON 파싱 실패', retryable: true })}\n\n`
            ));
            controller.close();
            return;
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

          // 완료 전송
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'done',
              advance,
              chunkIndex,
              totalChunks,
            })}\n\n`
          ));

          controller.close();
        } catch (error) {
          console.error('advance-timeline stream error:', error);
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
    console.error('advance-timeline error:', error);
    return new Response(
      `data: ${JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : '알 수 없는 오류' })}\n\n`,
      { headers: { 'Content-Type': 'text/event-stream' } }
    );
  }
}
