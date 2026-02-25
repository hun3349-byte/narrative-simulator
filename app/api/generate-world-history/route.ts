import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AUTHOR_PERSONA_PRESETS } from '@/lib/presets/author-personas';
import type { WorldHistoryEra, WorldLayer, CoreRulesLayer, SeedsLayer, HeroArcLayer, UltimateMysteryLayer, WorldHistorySubEra } from '@/lib/types';

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
  totalYears?: number;  // 기본 1000년 (레거시)
  // 이원화 시뮬레이션 - 사용자 설정 범위
  startYearsBefore?: number;  // 시작 시점 (N년 전), 예: 500
  endYearsBefore?: number;    // 종료 시점 (N년 전), 예: 0 (현재)
  unit?: number;              // 시뮬레이션 단위 (100년/50년/10년/1년)
  // 드릴다운 모드
  drilldownEraId?: string;    // 상세화할 시대 ID
  drilldownUnit?: number;     // 드릴다운 단위 (10년/1년)
  existingEras?: WorldHistoryEra[]; // 기존 시대 데이터 (드릴다운 시 컨텍스트)
}

export async function POST(req: NextRequest) {
  try {
    const body: WorldHistoryRequest = await req.json();
    const persona = AUTHOR_PERSONA_PRESETS.find(p => p.id === body.authorPersonaId);

    // 이원화 시뮬레이션 파라미터 (우선) 또는 레거시 파라미터
    const startYearsBefore = body.startYearsBefore ?? body.totalYears ?? 1000;
    const endYearsBefore = body.endYearsBefore ?? 0;
    const unit = body.unit ?? 100;
    const totalYears = startYearsBefore - endYearsBefore;

    // 드릴다운 모드 체크
    const isDrilldown = !!body.drilldownEraId;
    const drilldownEra = body.existingEras?.find(e => e.id === body.drilldownEraId);
    const drilldownUnit = body.drilldownUnit ?? 10;

    // Null-safe data extraction
    const worldData = body.world || {} as WorldLayer;
    const coreRulesData = body.coreRules || {} as CoreRulesLayer;
    const seedsData = body.seeds || {} as SeedsLayer;
    const heroArcData = body.heroArc || {} as HeroArcLayer;
    const ultimateMysteryData = body.ultimateMystery || {} as UltimateMysteryLayer;

    const continentName = worldData.continentName || '(미설정)';
    const geography = worldData.geography || '(미설정)';
    const cities = worldData.cities || [];
    const powerSystem = coreRulesData.powerSystem || '(미설정)';
    const history = coreRulesData.history || '(미설정)';
    const currentState = coreRulesData.currentState || '(미설정)';
    const factions = seedsData.factions || [];
    const heroName = heroArcData.name || '(미설정)';
    const coreNarrative = heroArcData.coreNarrative || '(미설정)';
    const surface = ultimateMysteryData.surface || '(미설정)';
    const truth = ultimateMysteryData.truth || '(미설정)';
    const hints = ultimateMysteryData.hints || [];

    // 드릴다운 모드 프롬프트
    let prompt: string;

    if (isDrilldown && drilldownEra) {
      // 드릴다운: 특정 시대를 더 세분화
      const eraYearRange = drilldownEra.yearRange;
      const eraYears = eraYearRange[1] - eraYearRange[0];
      const subEraCount = Math.ceil(eraYears / drilldownUnit);

      prompt = `당신은 "${persona?.name || '작가'}"입니다.

## 기존 시대 정보 (상세화 대상)
- 시대: ${drilldownEra.name}
- 기간: ${eraYearRange[0]}년 ~ ${eraYearRange[1]}년 (${eraYears}년)
- 설명: ${drilldownEra.description}
- 핵심 사건: ${drilldownEra.keyEvents?.join(', ') || '없음'}
- 세력 변화: ${drilldownEra.factionChanges || '없음'}
- 분위기: ${drilldownEra.mood || '없음'}

## 세계 정보
- 대륙: ${continentName}
- 힘의 체계: ${powerSystem}

## 세력들
${factions.length > 0 ? factions.map(f => `- ${f.name}: ${f.nature}`).join('\n') : '(미설정)'}

## 임무
이 시대를 ${drilldownUnit}년 단위로 세분화해. (총 ${subEraCount}개 기간)

각 기간에 무슨 일이 있었는지 구체적으로 생성해.

## 마크다운 금지
마크다운 서식 쓰지 마. 순수 텍스트만.

JSON으로 응답:
{
  "subEras": [
    {
      "id": "sub-1",
      "parentEraId": "${drilldownEra.id}",
      "yearRange": [시작년, 끝년],
      "name": "하위 기간 이름",
      "description": "이 기간의 상황",
      "keyEvents": ["사건1", "사건2"],
      "factionChanges": "세력 변화 (있으면)",
      "notableFigures": ["주요 인물"],
      "mood": "분위기"
    }
  ],
  "message": "작가의 설명"
}`;
    } else {
      // 일반 모드: 전체 역사 생성
      const eraCount = Math.max(2, Math.min(8, Math.ceil(totalYears / unit)));

      prompt = `당신은 "${persona?.name || '작가'}"입니다.

## 세계 정보
- 대륙: ${continentName}
- 지형: ${geography}
- 도시들: ${cities.length > 0 ? cities.map(c => c.name).join(', ') : '(미설정)'}

## 핵심 규칙
- 힘의 체계: ${powerSystem}
- 역사: ${history}
- 현재 상태: ${currentState}

## 세력들
${factions.length > 0 ? factions.map(f => `- ${f.name}: ${f.nature}, ${f.goal}`).join('\n') : '(미설정)'}

## 주인공
- 이름: ${heroName}
- 핵심 서사: ${coreNarrative}

## 궁극의 떡밥
- 표면: ${surface}
- 진실: ${truth}
- 힌트들: ${hints.length > 0 ? hints.join(', ') : '(미설정)'}

## 임무 (사용자 설정 범위)
${startYearsBefore}년 전부터 ${endYearsBefore === 0 ? '현재' : `${endYearsBefore}년 전`}까지의 역사를 생성해.
${unit}년 단위로 나누어 ${eraCount}개 시대 정도 생성.

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
    }

    console.log('=== GENERATE WORLD HISTORY ===');
    console.log('Mode:', isDrilldown ? 'Drilldown' : 'Normal');
    console.log('Continent:', continentName);
    console.log('Range:', `${startYearsBefore}년 전 ~ ${endYearsBefore}년 전, ${unit}년 단위`);
    if (isDrilldown) {
      console.log('Drilldown Era:', drilldownEra?.name);
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('Response length:', text.length);
    console.log('Response preview:', text.substring(0, 200));

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // 드릴다운 모드
        if (isDrilldown && parsed.subEras && parsed.subEras.length > 0) {
          console.log('Parsed subEras count:', parsed.subEras.length);
          const subEras: WorldHistorySubEra[] = parsed.subEras.map((s: WorldHistorySubEra, idx: number) => ({
            ...s,
            id: s.id || `sub-${idx + 1}`,
            parentEraId: body.drilldownEraId,
          }));
          return NextResponse.json({
            subEras,
            parentEraId: body.drilldownEraId,
            message: parsed.message || '시대를 상세화했어.',
          });
        }

        // 일반 모드
        console.log('Parsed eras count:', parsed.eras?.length || 0);
        if (parsed.eras && parsed.eras.length > 0) {
          return NextResponse.json(parsed);
        }
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
    }

    // JSON 파싱 실패 또는 eras 비어있음 - 기본 시대 생성
    console.log('Generating default eras...');

    // 사용자 설정 범위에 따른 기본 시대 생성
    const startYear = -startYearsBefore;
    const endYear = -endYearsBefore;
    const range = startYearsBefore - endYearsBefore;
    const eraCount = Math.max(2, Math.min(4, Math.ceil(range / unit)));
    const eraLength = Math.floor(range / eraCount);

    const defaultEras: WorldHistoryEra[] = [];
    for (let i = 0; i < eraCount; i++) {
      const eraStart = startYear + (i * eraLength);
      const eraEnd = i === eraCount - 1 ? endYear : startYear + ((i + 1) * eraLength);
      const isLast = i === eraCount - 1;

      defaultEras.push({
        id: `era-${i + 1}`,
        name: i === 0 ? '태초의 시대' : isLast ? '전야의 시대' : `${i + 1}번째 시대`,
        yearRange: [eraStart, eraEnd],
        description: isLast
          ? '주인공이 태어나기 직전. 무언가 큰 변화가 다가오고 있다.'
          : i === 0
            ? '세계가 형성되던 시기.'
            : '역사가 흘러간 시기.',
        keyEvents: isLast ? ['불길한 징조'] : ['주요 사건'],
        factionChanges: '세력 변화',
        notableFigures: ['주요 인물'],
        mysteryHints: hints.length > i ? [hints[i]] : ['숨겨진 비밀'],
        mood: isLast ? '긴장되는' : '평온한',
      });
    }

    return NextResponse.json({
      eras: defaultEras,
      message: `세계의 역사를 정리했어. ${eraCount}개 시대로 나눠봤어.`,
    });
  } catch (error) {
    console.error('World history generation error:', error);
    return NextResponse.json(
      { error: '세계 역사 생성 실패' },
      { status: 500 }
    );
  }
}
