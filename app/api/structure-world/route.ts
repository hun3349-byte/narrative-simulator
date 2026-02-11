import { NextRequest, NextResponse } from 'next/server';
import { generateStructure } from '@/lib/utils/api-client';

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  try {
    const { freeText } = await req.json();

    const prompt = `아래 자연어 세계관 설명을 구조화된 JSON으로 변환하세요.

입력:
${freeText}

출력 형식 (JSON만, 다른 텍스트 없이):
{
  "worldName": "세계 이름",
  "description": "한 문단 설명",
  "genre": "장르",
  "coreRule": "이 세계의 고유 법칙",
  "era": "현재 시대 분위기",
  "factions": [
    { "name": "세력명", "alignment": "light|gray|dark|chaotic|neutral", "description": "설명" }
  ],
  "timeline": {
    "startYear": 숫자,
    "currentYear": 숫자,
    "majorEras": [
      { "name": "시대명", "years": [시작, 끝], "description": "설명" }
    ],
    "worldEvents": [
      { "year": 숫자, "event": "사건", "impact": "영향" }
    ]
  }
}

중요: 반드시 유효한 JSON만 출력하세요. 마크다운 코드블록이나 설명 텍스트를 포함하지 마세요.`;

    const raw = await generateStructure(prompt);

    // JSON 추출: 코드블록 제거 후, 첫 번째 { ~ 마지막 } 사이만 추출
    let cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(cleaned);

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error('[structure-world] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to structure world' },
      { status: 500 }
    );
  }
}
