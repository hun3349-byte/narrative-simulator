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

    const prompt = `당신은 "${persona?.name || '작가'}"입니다.

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

    console.log('=== GENERATE WORLD HISTORY ===');
    console.log('Continent:', continentName);
    console.log('Factions count:', factions.length);

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
    const defaultEras: WorldHistoryEra[] = [
      {
        id: 'era-1',
        name: '태초의 시대',
        yearRange: [-1000, -700],
        description: '세계가 형성되던 시기. 힘의 체계가 처음 발현되었다.',
        keyEvents: ['세계 형성', '최초의 문명 등장'],
        factionChanges: '원시 부족들이 세력으로 성장',
        notableFigures: ['전설의 시조들'],
        mysteryHints: hints.length > 0 ? [hints[0]] : ['고대의 비밀이 묻히다'],
        mood: '원시적, 신비로운',
      },
      {
        id: 'era-2',
        name: '혼란의 시대',
        yearRange: [-700, -300],
        description: '세력들이 충돌하며 전쟁이 끊이지 않던 시기.',
        keyEvents: ['대전쟁', '세력 재편'],
        factionChanges: '강자만이 살아남았다',
        notableFigures: ['전쟁 영웅들'],
        mysteryHints: hints.length > 1 ? [hints[1]] : ['숨겨진 힘의 흔적'],
        mood: '격동의, 피비린내 나는',
      },
      {
        id: 'era-3',
        name: '안정의 시대',
        yearRange: [-300, -50],
        description: '현재 질서가 확립된 시기. 평화롭지만 긴장이 감돈다.',
        keyEvents: ['현 체제 수립', '세력 균형'],
        factionChanges: '현재의 세력 구도 형성',
        notableFigures: ['현 체제의 수립자들'],
        mysteryHints: hints.length > 2 ? [hints[2]] : ['진실이 가려지다'],
        mood: '평화로우나 불안한',
      },
      {
        id: 'era-4',
        name: '전야의 시대',
        yearRange: [-50, 0],
        description: '주인공이 태어나기 직전. 무언가 큰 변화가 다가오고 있다.',
        keyEvents: ['불길한 징조', '영웅의 탄생 예언'],
        factionChanges: '긴장 고조',
        notableFigures: ['주인공의 부모 세대'],
        mysteryHints: ['폭풍 전야의 고요함'],
        mood: '긴장되는, 기대되는',
      },
    ];

    return NextResponse.json({
      eras: defaultEras,
      message: '세계의 역사를 정리했어. 4개 시대로 나눠봤어.',
    });
  } catch (error) {
    console.error('World history generation error:', error);
    return NextResponse.json(
      { error: '세계 역사 생성 실패' },
      { status: 500 }
    );
  }
}
