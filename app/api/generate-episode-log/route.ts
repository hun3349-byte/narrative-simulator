import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import type { EpisodeLog, Episode, WorldBible, MonologueTone } from '@/lib/types';

const client = new Anthropic();

interface GenerateEpisodeLogRequest {
  episode: Episode;
  worldBible: WorldBible;
  previousLogs?: EpisodeLog[];
}

export async function POST(request: Request) {
  try {
    const body: GenerateEpisodeLogRequest = await request.json();
    const { episode, worldBible, previousLogs = [] } = body;

    if (!episode || !episode.content) {
      return NextResponse.json(
        { error: '에피소드 정보가 없습니다.' },
        { status: 400 }
      );
    }

    const prompt = buildEpisodeLogPrompt(episode, worldBible, previousLogs);

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
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
    let episodeLog: EpisodeLog;
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
        episodeLog = {
          ...parsed,
          episodeNumber: episode.number,
          generatedAt: new Date().toISOString(),
        };
      } else {
        throw new Error('JSON not found in response');
      }
    } catch (parseError) {
      console.error('Episode Log parse error:', parseError);
      return NextResponse.json(
        { error: 'Episode Log 파싱 실패', raw: text },
        { status: 500 }
      );
    }

    // 필드 검증 및 기본값 설정
    episodeLog = validateAndFillDefaults(episodeLog, episode);

    return NextResponse.json({ episodeLog });
  } catch (error) {
    console.error('Episode Log generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function validateAndFillDefaults(log: EpisodeLog, episode: Episode): EpisodeLog {
  return {
    episodeNumber: episode.number,
    summary: log.summary || `${episode.number}화 요약`,
    scenes: log.scenes || [],
    characterChanges: log.characterChanges || {},
    relationshipChanges: log.relationshipChanges || [],
    breadcrumbActivity: log.breadcrumbActivity || {
      advanced: [],
      newlyPlanted: [],
      hintGiven: []
    },
    cliffhangerType: log.cliffhangerType || 'crisis',
    cliffhangerContent: log.cliffhangerContent || episode.endHook || '',
    unresolvedTensions: log.unresolvedTensions || [],
    dominantMonologueTone: (log.dominantMonologueTone || episode.monologueTone || '관찰') as MonologueTone,
    miniArcPosition: log.miniArcPosition || ((episode.number - 1) % 5) + 1,
    buildupPhase: log.buildupPhase || calculateBuildupPhase(episode.number),
    generatedAt: log.generatedAt || new Date().toISOString(),
  };
}

function calculateBuildupPhase(episodeNumber: number): 'early' | 'middle' | 'late' {
  const position = ((episodeNumber - 1) % 5) + 1;
  if (position <= 2) return 'early';
  if (position <= 4) return 'middle';
  return 'late';
}

function buildEpisodeLogPrompt(
  episode: Episode,
  worldBible: WorldBible,
  previousLogs: EpisodeLog[]
): string {
  const finalContent = episode.editedContent || episode.content;
  const lastLog = previousLogs[previousLogs.length - 1];

  return `당신은 웹소설 에피소드를 분석하는 전문가입니다.
아래 에피소드를 읽고 **Episode Log (에피소드 로그)**를 생성하세요.

## 목표
- 이 화의 핵심 정보를 300토큰 이내로 압축
- 다음 화 집필 시 이 로그만 보고도 흐름을 이어갈 수 있어야 함
- 캐릭터 변화, 관계 변화, 떡밥 운용을 정확히 추적

## 에피소드 정보
- 화수: ${episode.number}화
- 제목: ${episode.title}
- 글자수: ${finalContent.length}자

## 에피소드 본문
${finalContent}

## World Bible (참고용)
캐릭터 목록: ${Object.keys(worldBible.characters || {}).join(', ')}
떡밥 목록: ${Object.keys(worldBible.breadcrumbs || {}).join(', ')}

## 직전 화 로그 (있으면)
${lastLog ? JSON.stringify(lastLog, null, 2) : '(1화입니다)'}

## 출력 형식 (JSON)

{
  "summary": "한 줄 요약 50자 이내. 핵심 사건만.",

  "scenes": [
    {
      "location": "장소명",
      "characters": ["등장인물1", "등장인물2"],
      "event": "이 장면에서 일어난 일 1문장"
    }
  ],

  "characterChanges": {
    "캐릭터명": "변화 내용 (부상, 감정 변화, 능력 변화 등)"
  },

  "relationshipChanges": [
    {
      "who": "A",
      "withWhom": "B",
      "change": "관계 변화 설명 (신뢰 상승, 갈등 발생 등)"
    }
  ],

  "breadcrumbActivity": {
    "advanced": ["진전된 떡밥 이름"],
    "newlyPlanted": ["새로 심은 떡밥 이름"],
    "hintGiven": ["힌트 준 떡밥 이름"]
  },

  "cliffhangerType": "crisis | revelation | choice | reversal | awakening | past_connection | character_entrance",
  "cliffhangerContent": "마지막 2줄의 훅 내용",

  "unresolvedTensions": [
    "해결되지 않은 긴장 1",
    "해결되지 않은 긴장 2"
  ],

  "dominantMonologueTone": "자조 | 관찰 | 냉정 | 감각 | 메타",

  "miniArcPosition": ${((episode.number - 1) % 5) + 1},
  "buildupPhase": "${calculateBuildupPhase(episode.number)}"
}

## 분석 규칙
1. **summary**: 독자가 안 읽어도 이해할 수 있게 핵심 사건만
2. **scenes**: 장면이 3개 이상이면 가장 중요한 3개만
3. **characterChanges**: 실제 변화가 있는 캐릭터만
4. **relationshipChanges**: 명시적 변화만 (추측 금지)
5. **breadcrumbActivity**: World Bible의 떡밥 목록 참고. 없는 떡밥 언급 금지
6. **cliffhangerType**: 7유형 중 가장 적합한 것 선택
7. **unresolvedTensions**: 다음 화에 이어져야 할 긴장만

JSON만 출력하세요. 설명 없이.`;
}
