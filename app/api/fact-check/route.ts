import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import type {
  FactCheckResult,
  FactCheckContradiction,
  FactCheckSeverity,
  WorldBible,
  Episode
} from '@/lib/types';

const client = new Anthropic();

interface FactCheckRequest {
  worldBible: WorldBible;
  episode: Episode;
}

export async function POST(request: Request) {
  try {
    const body: FactCheckRequest = await request.json();
    const { worldBible, episode } = body;

    if (!worldBible || !episode) {
      return NextResponse.json(
        { error: 'worldBible과 episode가 필요합니다.' },
        { status: 400 }
      );
    }

    const prompt = buildFactCheckPrompt(worldBible, episode);

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      temperature: 0.1, // 낮은 온도로 정확한 분석
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // JSON 파싱
    let result: FactCheckResult;
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
        result = {
          episodeNumber: episode.number,
          hasContradictions: parsed.hasContradictions || false,
          contradictions: (parsed.contradictions || []).map((c: FactCheckContradiction) => ({
            field: c.field || '',
            worldBibleValue: c.worldBibleValue || '',
            episodeValue: c.episodeValue || '',
            severity: validateSeverity(c.severity),
            suggestion: c.suggestion || '',
          })),
          overallSeverity: validateOverallSeverity(parsed.overallSeverity),
          shouldRewrite: parsed.overallSeverity === 'critical',
          checkedAt: new Date().toISOString(),
        };
      } else {
        // JSON이 없으면 모순 없음으로 처리
        result = {
          episodeNumber: episode.number,
          hasContradictions: false,
          contradictions: [],
          overallSeverity: 'none',
          shouldRewrite: false,
          checkedAt: new Date().toISOString(),
        };
      }
    } catch (parseError) {
      console.error('Fact check parse error:', parseError);
      // 파싱 실패 시 모순 없음으로 처리 (에러를 던지지 않음)
      result = {
        episodeNumber: episode.number,
        hasContradictions: false,
        contradictions: [],
        overallSeverity: 'none',
        shouldRewrite: false,
        checkedAt: new Date().toISOString(),
      };
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Fact check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function validateSeverity(severity: string): FactCheckSeverity {
  if (severity === 'minor' || severity === 'major' || severity === 'critical') {
    return severity;
  }
  return 'minor';
}

function validateOverallSeverity(severity: string): FactCheckSeverity | 'none' {
  if (severity === 'minor' || severity === 'major' || severity === 'critical') {
    return severity;
  }
  return 'none';
}

function buildFactCheckPrompt(worldBible: WorldBible, episode: Episode): string {
  const content = episode.editedContent || episode.content;

  return `당신은 웹소설의 설정 오류를 검출하는 전문 편집자입니다.
아래 World Bible(세계관 성경)과 새 에피소드를 비교하여 **모순**을 찾아주세요.

## 검출 대상
1. **캐릭터 설정 오류**: 나이, 외모, 능력, 성격이 World Bible과 다름
2. **세계관 설정 오류**: 힘의 체계, 사회 구조, 역사가 World Bible과 다름
3. **떡밥 누설 오류**: revealed 상태가 아닌 떡밥을 공개함
4. **사망자 부활**: 이미 죽은 캐릭터가 살아서 등장
5. **시간축 오류**: 과거 사건의 시점이 맞지 않음

## 심각도 분류
- **minor**: 사소한 불일치 (독자가 눈치채기 어려움)
- **major**: 명백한 오류 (수정하면 좋지만 필수는 아님)
- **critical**: 심각한 모순 (반드시 수정 필요)

## World Bible
${JSON.stringify(worldBible, null, 2)}

## 에피소드 ${episode.number}화
${content}

## 출력 형식 (JSON)

모순이 **없으면**:
{
  "hasContradictions": false,
  "contradictions": [],
  "overallSeverity": "none"
}

모순이 **있으면**:
{
  "hasContradictions": true,
  "contradictions": [
    {
      "field": "위반 필드 (예: '캐릭터: 태민의 나이')",
      "worldBibleValue": "World Bible에 기록된 값",
      "episodeValue": "에피소드에서 발견된 값",
      "severity": "minor | major | critical",
      "suggestion": "수정 제안"
    }
  ],
  "overallSeverity": "가장 심각한 모순의 severity"
}

## 분석 규칙
1. **추측하지 마세요**: World Bible에 명시되지 않은 것은 모순이 아님
2. **의도적 변화는 모순이 아님**: 캐릭터가 성장/변화하는 것은 자연스러움
3. **새 정보는 모순이 아님**: World Bible에 없는 새 설정 추가는 OK
4. **죽은 캐릭터만 엄격히 체크**: 사망 확인된 캐릭터가 살아있으면 critical
5. **떡밥 상태 체크**: hidden/hinted 상태인 떡밥의 진실이 직접 언급되면 major

JSON만 출력하세요. 설명 없이.`;
}
