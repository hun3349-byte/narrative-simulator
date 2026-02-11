import { NextRequest, NextResponse } from 'next/server';
import { generateDetail } from '@/lib/utils/api-client';
import { buildDetailPrompt } from '@/lib/prompts/detail-prompt';

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  try {
    const { character, event, worldContext, authorPersona, worldSettings, allCharacters } = await req.json();

    const prompt = buildDetailPrompt(character, event, worldContext, authorPersona, worldSettings, allCharacters);
    const rawResponse = await generateDetail(prompt);

    let detailScene;
    try {
      const cleaned = rawResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      detailScene = JSON.parse(cleaned);
    } catch {
      detailScene = {
        content: rawResponse,
        dialogues: [],
        atmosphere: '',
        innerThought: '',
      };
    }

    return NextResponse.json({ success: true, detailScene });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
