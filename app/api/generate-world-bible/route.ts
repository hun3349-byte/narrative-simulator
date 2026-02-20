import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import type {
  WorldBible,
  WorldLayer,
  CoreRulesLayer,
  SeedsLayer,
  HeroArcLayer,
  VillainArcLayer,
  UltimateMysteryLayer
} from '@/lib/types';

const client = new Anthropic();

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
  try {
    const body: GenerateWorldBibleRequest = await request.json();
    const { layers } = body;

    // 레이어 데이터 검증
    if (!layers.world || !layers.coreRules || !layers.heroArc) {
      return NextResponse.json(
        { error: '필수 레이어(world, coreRules, heroArc)가 없습니다.' },
        { status: 400 }
      );
    }

    const prompt = buildWorldBiblePrompt(layers);

    const response = await client.messages.create({
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

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // JSON 파싱
    let worldBible: WorldBible;
    try {
      // 마크다운 코드 블록 제거
      let cleanText = text;
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        cleanText = codeBlockMatch[1].trim();
      }

      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        worldBible = {
          ...parsed,
          generatedAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
        };
      } else {
        throw new Error('JSON not found in response');
      }
    } catch (parseError) {
      console.error('World Bible parse error:', parseError);
      return NextResponse.json(
        { error: 'World Bible 파싱 실패', raw: text },
        { status: 500 }
      );
    }

    // 토큰 수 추정 (대략 한글 1자 = 1.5토큰, 영문 1단어 = 1토큰)
    const estimatedTokens = Math.ceil(JSON.stringify(worldBible).length / 2);
    worldBible.tokenCount = estimatedTokens;

    return NextResponse.json({ worldBible });
  } catch (error) {
    console.error('World Bible generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
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

## 압축 규칙
1. 모든 값은 **짧고 명확하게**
2. 예시나 설명은 제외, 핵심 사실만
3. 중복 정보 제거
4. 이야기에 직접 영향 주지 않는 정보는 과감히 삭제
5. 캐릭터는 주인공 + 빌런 + 핵심 조연 최대 5명만

JSON만 출력하세요. 설명 없이.`;
}
