import { NextRequest, NextResponse } from 'next/server';
import { generateStructure } from '@/lib/utils/api-client';
import { WorldSettings } from '@/lib/types';

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  try {
    const { worldSettings } = (await req.json()) as { worldSettings: WorldSettings };

    // Build world context from 4-layer data
    let worldContext = `세계: ${worldSettings.worldName}
장르: ${worldSettings.genre}
핵심 규칙: ${worldSettings.coreRule}
시대: ${worldSettings.era}
세력: ${worldSettings.factions.map(f => `${f.name}(${f.alignment}): ${f.description}`).join('; ')}
기존 대사건: ${worldSettings.timeline.worldEvents.map(e => `[${e.year}년] ${e.event}`).join('; ')}`;

    if (worldSettings.worldLayers) {
      const wl = worldSettings.worldLayers;
      worldContext += `\n\n[4레이어 세계관]
Layer1 핵심법칙: ${wl.coreRule.law} / 대가: ${wl.coreRule.cost} / 함의: ${wl.coreRule.implication}
Layer2 역사상처: ${wl.historicalWound.event} / 갈등: ${wl.historicalWound.underlyingConflict} / 미해결: ${wl.historicalWound.unresolvedTension}
Layer3 현재긴장: ${wl.currentTension.powerStructure} / 억압: ${wl.currentTension.oppressionDetail} / 위협: ${wl.currentTension.emergingThreat}
Layer4 감각: ${wl.sensoryDetails.join(', ')}
사회규범: ${wl.socialNorms.join(', ')}
일상: ${wl.dailyLife.join(', ')}`;
    }

    const prompt = `아래 세계관을 바탕으로 연대기(세계 역사)를 자동 생성하세요.

[세계관 정보]
${worldContext}

[요구사항]
1. 시대(eras): 3~6개. 각 시대에 이름, 연도 범위, 설명, 분위기(mood), 지배 세력을 부여.
2. 사건(events): 10~20개. 시대에 걸쳐 배분. 각 사건에 연도, 제목, 설명, 영향, 카테고리(war/discovery/catastrophe/founding/cultural/political/mystery), 중요도(minor/major/critical)를 부여.
3. 미스터리: 2~3개의 사건은 isMystery=true로 설정하고, hiddenTruth(숨겨진 진실, 공개 조건)를 포함.
4. 사건은 기존 worldEvents와 모순되지 않고 확장해야 합니다.
5. 시대 범위는 세계관의 timeline.startYear~currentYear를 커버.
6. worldState: 현재 세계의 한 줄 요약.

[출력: JSON만]
{
  "eras": [
    { "id": "era-1", "name": "시대명", "years": [시작, 끝], "description": "설명", "mood": "분위기", "dominantFaction": "세력명" }
  ],
  "events": [
    { "id": "evt-1", "year": 숫자, "title": "제목", "description": "설명", "impact": "영향", "category": "카테고리", "isMystery": false, "significance": "major", "relatedFactions": ["세력명"] }
  ],
  "worldState": "현재 상태 요약"
}

미스터리 사건은:
{ "id": "evt-n", "year": 숫자, "title": "제목", "description": "공식 기록", "impact": "영향", "category": "mystery", "isMystery": true, "hiddenTruth": { "truth": "실제 진실", "revealCondition": "공개 조건" }, "significance": "critical", "relatedFactions": ["세력명"] }

중요: 반드시 유효한 JSON만 출력하세요.`;

    const raw = await generateStructure(prompt);

    // JSON extraction (same pattern as structure-world)
    let cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(cleaned);

    // Wrap in WorldChronology format
    const chronology = {
      eras: parsed.eras || [],
      events: parsed.events || [],
      generatedAt: new Date().toISOString(),
      worldState: parsed.worldState || '',
    };

    return NextResponse.json({ success: true, data: chronology });
  } catch (error) {
    console.error('[generate-chronology] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate chronology' },
      { status: 500 }
    );
  }
}
