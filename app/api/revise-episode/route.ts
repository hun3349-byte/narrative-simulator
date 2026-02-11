import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AUTHOR_PERSONA_PRESETS } from '@/lib/presets/author-personas';
import type { Episode } from '@/lib/types';

const client = new Anthropic();

interface ReviseEpisodeRequest {
  episode: Episode;
  feedback: string;
  genre: string;
  tone: string;
  viewpoint: string;
  authorPersonaId: string;
  // 부분 수정용
  mode?: 'full' | 'partial';
  selectedText?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: ReviseEpisodeRequest = await req.json();
    const persona = AUTHOR_PERSONA_PRESETS.find(p => p.id === body.authorPersonaId);
    const isPartialMode = body.mode === 'partial' && body.selectedText;

    // 시점별 규칙
    const viewpointRules = body.viewpoint === 'first_person'
      ? `1인칭 주인공 시점:
- "나"로 서술해
- 주인공이 모르는 것은 독자도 몰라
- 다른 인물의 속마음은 추측만 가능`
      : `3인칭 작가 시점:
- 캐릭터 이름으로 서술해
- 여러 인물의 시점을 전환할 수 있어
- 속마음을 직접 서술할 수 있어`;

    // 부분 수정 모드
    if (isPartialMode) {
      const partialPrompt = `당신은 "${persona?.name || '작가'}"입니다.

## 현재 에피소드
제목: ${body.episode.title}
번호: ${body.episode.number}화

## 전체 본문
${body.episode.content}

## 수정할 부분
"${body.selectedText}"

## 환님 요청
${body.feedback}

## 규칙
${viewpointRules}

## 서식 절대 규칙
마크다운 서식 절대 금지. 순수 텍스트만.

## 임무
위에서 "수정할 부분"으로 표시된 텍스트만 환님 요청에 맞게 수정해.
나머지 본문은 그대로 유지해.
"삭제" 요청이면 해당 부분을 제거해.

JSON으로 응답:
{
  "revisedText": "수정된 텍스트 (해당 부분만)",
  "fullContent": "전체 본문 (수정된 부분 포함)",
  "authorComment": "작가 코멘트 (자연스러운 말투)"
}`;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8000,
        messages: [{ role: 'user', content: partialPrompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          return NextResponse.json({
            episode: {
              ...body.episode,
              content: parsed.fullContent || body.episode.content,
              charCount: (parsed.fullContent || body.episode.content).length,
              updatedAt: new Date().toISOString(),
            },
            authorComment: parsed.authorComment || '수정했어.',
            revisedText: parsed.revisedText,
          });
        }
      } catch {
        return NextResponse.json({
          episode: null,
          authorComment: text,
        });
      }

      return NextResponse.json({
        episode: null,
        authorComment: '수정하는 중에 문제가 생겼어.',
      });
    }

    // 전체 수정 모드
    const prompt = `당신은 "${persona?.name || '작가'}"입니다.

## 현재 에피소드
제목: ${body.episode.title}
번호: ${body.episode.number}화

## 현재 본문
${body.episode.content}

## 환님 피드백
${body.feedback}

## 규칙
장르: ${body.genre}
톤: ${body.tone}

${viewpointRules}

## 서식 절대 규칙
소설 본문에 마크다운 서식 절대 금지:
- **볼드**, *이탤릭*, # 제목, - 목록, > 인용, 코드 블록(백틱) 금지
- 순수한 텍스트만 사용
- 장면 전환은 빈 줄로만

## 서술 규칙
1. 첫 문장부터 임팩트
2. 감정은 설명하지 말고 보여줘 (Show, Don't Tell)
3. 대사는 짧고 강렬하게
4. 70% 보여주고 30%는 상상하게

## 대화와 서술 비율 (절대 규칙)
- 나레이션 위주: 대화보다 서술이 훨씬 많아야 해
- 대화 극소수: 한 화에 대화는 5~10회 미만
- 짧은 왕복 대화 금지: 핑퐁 대화 금지
- 대화 없이 긴장감을 만들어: 행동, 감각, 생각으로 장면을 채워

## 임무
환님 피드백에 맞춰 에피소드를 수정해.
본문 전체를 다시 써.

JSON으로 응답:
{
  "episode": {
    "title": "화 제목",
    "content": "수정된 본문 (줄바꿈은 \\n으로)",
    "charCount": 글자수,
    "endHook": "다음 화 훅"
  },
  "authorComment": "작가 코멘트 (자연스러운 말투)"
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // 에피소드 정보 보완
        if (parsed.episode) {
          parsed.episode.id = body.episode.id;
          parsed.episode.number = body.episode.number;
          parsed.episode.status = 'drafted';
          parsed.episode.pov = body.episode.pov;
          parsed.episode.sourceEventIds = body.episode.sourceEventIds;
          parsed.episode.charCount = parsed.episode.content?.length || 0;
          parsed.episode.updatedAt = new Date().toISOString();
        }

        return NextResponse.json(parsed);
      }
    } catch {
      return NextResponse.json({
        episode: null,
        authorComment: text,
      });
    }

    return NextResponse.json({
      episode: null,
      authorComment: text,
    });
  } catch (error) {
    console.error('Episode revision error:', error);
    return NextResponse.json(
      { error: '에피소드 수정 실패' },
      { status: 500 }
    );
  }
}
