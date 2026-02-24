import Anthropic from '@anthropic-ai/sdk';
import type {
  WorldBible,
  WorldLayer,
  CoreRulesLayer,
  SeedsLayer,
  HeroArcLayer,
  VillainArcLayer,
  UltimateMysteryLayer
} from '@/lib/types';
import { estimateTokens, TOKEN_BUDGET } from '@/lib/utils/token-budget';

export const maxDuration = 60; // Vercel Fluid Compute 활성화

const client = new Anthropic();

// World Bible 토큰 상한
const WORLD_BIBLE_TOKEN_LIMIT = TOKEN_BUDGET.worldBible; // 2,000

interface GenerateWorldBibleRequest {
  layers: {
    world: WorldLayer | null;
    coreRules: CoreRulesLayer | null;
    seeds: SeedsLayer | null;
    heroArc: HeroArcLayer | null;
    villainArc: VillainArcLayer | null;
    ultimateMystery: UltimateMysteryLayer | null;
  };
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  try {
    const body: GenerateWorldBibleRequest = await request.json();
    const { layers } = body;

    // 레이어 데이터 검증
    if (!layers.world || !layers.coreRules || !layers.heroArc) {
      const errorData = JSON.stringify({
        type: 'error',
        message: '필수 레이어(world, coreRules, heroArc)가 없습니다.',
      });
      return new Response(`data: ${errorData}\n\n`, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }

    const prompt = buildWorldBiblePrompt(layers);

    // 스트리밍 응답 생성
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullText = '';

          const streamResponse = client.messages.stream({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 4000,
            temperature: 0.3,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ]
          });

          for await (const event of streamResponse) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              fullText += event.delta.text;
              // 진행 상황 전송
              const chunk = JSON.stringify({ type: 'text', content: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
            }
          }

          // 파싱
          let cleanText = fullText;
          const codeBlockMatch = fullText.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (codeBlockMatch) {
            cleanText = codeBlockMatch[1].trim();
          }

          const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);

              // 토큰 수 추정
              const tokenCount = estimateTokens(JSON.stringify(parsed));

              // 토큰 초과 시 캐릭터/떡밥 축소
              let worldBible: WorldBible = {
                ...parsed,
                generatedAt: new Date().toISOString(),
                lastUpdatedAt: new Date().toISOString(),
                tokenCount,
              };

              // 2,000 토큰 초과 시 자동 축소
              if (tokenCount > WORLD_BIBLE_TOKEN_LIMIT) {
                console.log(`World Bible 토큰 초과: ${tokenCount} > ${WORLD_BIBLE_TOKEN_LIMIT}, 축소 중...`);
                worldBible = compressWorldBible(worldBible, WORLD_BIBLE_TOKEN_LIMIT);
              }

              const finalData = JSON.stringify({
                type: 'done',
                worldBible,
                tokenInfo: {
                  original: tokenCount,
                  final: estimateTokens(JSON.stringify(worldBible)),
                  limit: WORLD_BIBLE_TOKEN_LIMIT,
                  compressed: tokenCount > WORLD_BIBLE_TOKEN_LIMIT,
                }
              });
              controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
            } catch {
              const errorData = JSON.stringify({
                type: 'error',
                message: 'World Bible 파싱 실패',
                raw: fullText.slice(0, 500),
              });
              controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            }
          } else {
            const errorData = JSON.stringify({
              type: 'error',
              message: 'JSON not found in response',
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          }

          controller.close();
        } catch (error) {
          console.error('World Bible streaming error:', error);
          const errorData = JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'World Bible 생성 오류',
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
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
    console.error('World Bible generation error:', error);
    const errorData = JSON.stringify({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(`data: ${errorData}\n\n`, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  }
}

/**
 * World Bible이 토큰 초과 시 자동 압축
 */
function compressWorldBible(wb: WorldBible, targetTokens: number): WorldBible {
  const result = { ...wb };

  // 1단계: 캐릭터 수 줄이기 (10명 → 5명)
  if (result.characters && Object.keys(result.characters).length > 5) {
    const entries = Object.entries(result.characters);
    // major importance 또는 앞의 5명만 유지
    const kept = entries.slice(0, 5);
    result.characters = Object.fromEntries(kept);

    if (estimateTokens(JSON.stringify(result)) <= targetTokens) {
      result.tokenCount = estimateTokens(JSON.stringify(result));
      return result;
    }
  }

  // 2단계: 캐릭터 정보 축소 (core + currentState만)
  if (result.characters) {
    for (const [name, info] of Object.entries(result.characters)) {
      result.characters[name] = {
        core: info.core,
        currentState: info.currentState,
      } as typeof info;
    }

    if (estimateTokens(JSON.stringify(result)) <= targetTokens) {
      result.tokenCount = estimateTokens(JSON.stringify(result));
      return result;
    }
  }

  // 3단계: 떡밥 수 줄이기 (핵심 3개만)
  if (result.breadcrumbs && Object.keys(result.breadcrumbs).length > 3) {
    const entries = Object.entries(result.breadcrumbs);
    const kept = entries.slice(0, 3);
    result.breadcrumbs = Object.fromEntries(kept);

    if (estimateTokens(JSON.stringify(result)) <= targetTokens) {
      result.tokenCount = estimateTokens(JSON.stringify(result));
      return result;
    }
  }

  // 4단계: 긴 텍스트 필드 축소
  if (result.rules) {
    if (result.rules.keyHistory && result.rules.keyHistory.length > 200) {
      result.rules.keyHistory = result.rules.keyHistory.slice(0, 200) + '...';
    }
    if (result.rules.powerSystem && result.rules.powerSystem.length > 150) {
      result.rules.powerSystem = result.rules.powerSystem.slice(0, 150) + '...';
    }
  }

  if (result.worldSummary && result.worldSummary.length > 100) {
    result.worldSummary = result.worldSummary.slice(0, 100) + '...';
  }

  if (result.factions && result.factions.length > 150) {
    result.factions = result.factions.slice(0, 150) + '...';
  }

  // 5단계: 전설 제거
  if (result.legends) {
    delete result.legends;
  }

  result.tokenCount = estimateTokens(JSON.stringify(result));
  return result;
}

function buildWorldBiblePrompt(layers: GenerateWorldBibleRequest['layers']): string {
  const { world, coreRules, seeds, heroArc, villainArc, ultimateMystery } = layers;

  return `당신은 웹소설의 세계관을 압축하는 전문가입니다.
아래 7개 레이어 데이터를 읽고, **World Bible (세계관 성경)**을 생성하세요.

## 목표
- 모든 핵심 정보를 **2,000토큰 이내**로 압축
- 매 화 집필 시 이 World Bible만 보고도 세계관을 완벽히 이해할 수 있어야 함
- 절대 변하면 안 되는 것들만 포함 (캐릭터 현재 상태는 제외)

## 입력 데이터

### Layer 1: 세계 (World)
${JSON.stringify(world, null, 2)}

### Layer 2: 핵심 규칙 (Core Rules)
${JSON.stringify(coreRules, null, 2)}

### Layer 3: 씨앗 (Seeds)
${JSON.stringify(seeds, null, 2)}

### Layer 4: 주인공 서사 (Hero Arc)
${JSON.stringify(heroArc, null, 2)}

### Layer 5: 빌런 서사 (Villain Arc)
${JSON.stringify(villainArc, null, 2)}

### Layer 6: 궁극의 떡밥 (Ultimate Mystery)
${JSON.stringify(ultimateMystery, null, 2)}

## 출력 형식 (JSON)

{
  "worldSummary": "세계 100자 이내 요약. 핵심 특징만.",

  "rules": {
    "powerSystem": "힘의 체계 2~3문장 요약",
    "magicTypes": "능력 종류와 상성 관계 (있으면)",
    "socialStructure": "사회 구조/계급 2문장",
    "keyHistory": "핵심 역사 3~5줄. 현재에 영향 주는 것만.",
    "contradiction": "세계의 핵심 모순 1문장 (있으면)"
  },

  "characters": {
    "주인공이름": {
      "core": "이름. 나이. 직업/신분. 핵심 특성 1줄",
      "desire": "표면적 욕망",
      "deficiency": "내면적 결핍",
      "weakness": "치명적 약점",
      "currentState": "1화 시작 시점 상태 (나중에 업데이트됨)"
    },
    "빌런이름": {
      "core": "...",
      "desire": "...",
      "weakness": "...",
      "currentState": "..."
    }
  },

  "factions": "주요 세력 관계 2~3문장. 누가 누구와 적대/동맹인지.",

  "breadcrumbs": {
    "떡밥1이름": {
      "truth": "실제 진실 1문장",
      "status": "hidden",
      "lastMentionedEp": 0,
      "plannedRevealEp": 50
    },
    "떡밥2이름": {
      "truth": "...",
      "status": "hidden",
      "lastMentionedEp": 0
    }
  },

  "prophecy": "예언 원문 (있으면)",
  "legends": ["전설1 요약", "전설2 요약"]
}

## ⚠️ 압축 규칙 (절대 지킬 것)

**토큰 상한: 2,000토큰 (약 4,000자)**
- 이 한계를 반드시 지켜라. 초과하면 실패.

1. 모든 값은 **짧고 명확하게** (1~2문장)
2. 예시나 설명은 제외, 핵심 사실만
3. 중복 정보 완전 제거
4. 이야기에 직접 영향 주지 않는 정보는 과감히 삭제
5. **캐릭터**: 주인공 + 빌런 + 핵심 조연 **최대 5명**만
   - 캐릭터가 많으면: 상위 5명만 상세, 나머지는 이름만 factions에 언급
6. **떡밥**: 핵심 **3~5개**만 (minor 떡밥 제외)
7. **역사**: **3~5줄**만 (현재 이야기에 영향 주는 것만)
8. **세력**: 핵심 대립 구도만 **2~3문장**

잘린 정보는 Supabase 원본에 보존되어 있으니 걱정 마라.
필요할 때 Tier 3로 상세 로드된다.

JSON만 출력하세요. 설명 없이.`;
}
