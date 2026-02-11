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
    const { freeText, worldContext } = await req.json();

    const prompt = `아래 자연어 캐릭터 설명을 구조화된 JSON으로 변환하세요.
비어있는 필드는 세계관 맥락에 맞게 창의적으로 채워주세요.

세계관: ${worldContext}

캐릭터 설명:
${freeText}

출력 형식 (JSON만, 다른 텍스트 없이):
{
  "name": "이름",
  "alias": "이명/별칭",
  "age": 숫자,
  "birthYear": 숫자,
  "gender": "남/여/기타",
  "race": "종족",
  "status": "childhood",
  "stats": {
    "combat": 1~10,
    "intellect": 1~10,
    "willpower": 1~10,
    "social": 1~10,
    "specialStat": { "name": "고유스탯명", "value": 0~10 }
  },
  "emotionalState": {
    "primary": "초기 감정",
    "intensity": 0~100,
    "trigger": "감정 원인"
  },
  "profile": {
    "background": "출신 배경 (2~3문장)",
    "personality": "성격 요약 (1~2문장)",
    "motivation": "핵심 동기",
    "abilities": ["능력1", "능력2"],
    "weakness": "약점",
    "secretGoal": "숨겨진 목표",
    "appearance": "외형 묘사",
    "innerConflict": "내적 갈등",
    "quotes": ["대표 대사1", "대표 대사2"]
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
    console.error('[structure-character] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to structure character' },
      { status: 500 }
    );
  }
}
