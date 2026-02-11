import { NextRequest } from 'next/server';
import { SimulationEngine } from '@/lib/agents/simulation-engine';
import { SimulationConfig } from '@/lib/types';
import { activeSessions } from '@/lib/utils/simulation-sessions';

export const maxDuration = 300; // 5분 타임아웃

export async function POST(req: NextRequest) {
  // API 키 체크
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ type: 'error', message: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const body = await req.json();
  const config: SimulationConfig = body.config;
  const existingEvents = body.existingEvents;
  const existingCharacters = body.existingCharacters;
  const seeds = body.seeds;
  const memoryStacks = body.memoryStacks;
  const grammarConfig = body.grammarConfig;
  const characterArcs = body.characterArcs;
  const masterArc = body.masterArc;
  const npcPool = body.npcPool;
  const storyDirectorConfig = body.storyDirectorConfig;
  const worldSettingsFull = body.worldSettingsFull;
  const monitorConfig = body.monitorConfig;
  const narrativeArcs = body.narrativeArcs;

  // 세션 생성
  const sessionId = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const abortController = new AbortController();
  const pauseFlag = { paused: false };
  activeSessions.set(sessionId, { pauseFlag, abortController });

  // 테마(로그라인) 추출
  const theme = storyDirectorConfig?.logline || '';

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // 세션 ID 전송
      const initData = JSON.stringify({
        type: 'session_init',
        message: '세션 초기화',
        sessionId,
      });
      controller.enqueue(encoder.encode(`data: ${initData}\n\n`));

      const engine = new SimulationEngine(
        config,
        existingEvents,
        existingCharacters,
        seeds,
        memoryStacks,
        grammarConfig,
        characterArcs,
        masterArc,
        npcPool,
        storyDirectorConfig,
        worldSettingsFull,
        abortController.signal,
        pauseFlag,
        monitorConfig,
        theme,
        narrativeArcs
      );

      try {
        const result = await engine.runFullSimulation(config, (update) => {
          const data = JSON.stringify(update);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        });

        // 최종 캐릭터 상태도 전송
        const finalData = JSON.stringify({
          type: 'final_state',
          message: '최종 상태',
          characters: result.characters,
          ...(result.memoryStacks ? { memoryStacks: result.memoryStacks } : {}),
          ...(result.profiles ? { profiles: result.profiles } : {}),
          ...(result.characterArcs ? { characterArcs: result.characterArcs } : {}),
          ...(result.masterArc ? { masterArc: result.masterArc } : {}),
          ...(result.npcPool ? { npcPool: result.npcPool } : {}),
          ...(result.storylinePreviews ? { storylinePreviews: result.storylinePreviews } : {}),
          ...(result.integratedStoryline ? { integratedStoryline: result.integratedStoryline } : {}),
          ...(result.narrativeArcs ? { narrativeArcs: result.narrativeArcs } : {}),
        });
        controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));

        controller.close();
      } catch (error) {
        const errorMsg = JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        controller.enqueue(encoder.encode(`data: ${errorMsg}\n\n`));
        controller.close();
      } finally {
        activeSessions.delete(sessionId);
      }
    },
    cancel() {
      abortController.abort();
      activeSessions.delete(sessionId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
