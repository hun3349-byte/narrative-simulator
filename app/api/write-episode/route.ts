import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AUTHOR_PERSONA_PRESETS } from '@/lib/presets/author-personas';
import type { Episode, Feedback, FeedbackType } from '@/lib/types';
import { getEpisodeFinalContent } from '@/lib/types';

// 누적 피드백을 프롬프트용 문자열로 변환
function buildFeedbackSection(recurringFeedback?: Feedback[]): string {
  if (!recurringFeedback || recurringFeedback.length === 0) {
    return '';
  }

  // 유형별로 그룹화
  const byType: Record<FeedbackType, string[]> = {
    style: [],
    character: [],
    plot: [],
    pacing: [],
    general: [],
  };

  for (const fb of recurringFeedback) {
    byType[fb.type].push(fb.content);
  }

  let result = '\n### 환님 피드백 (누적 - 반드시 반영)\n';

  if (byType.style.length > 0) {
    result += '\n[문체/스타일]\n' + byType.style.map(c => `- ${c}`).join('\n');
  }
  if (byType.character.length > 0) {
    result += '\n[캐릭터]\n' + byType.character.map(c => `- ${c}`).join('\n');
  }
  if (byType.plot.length > 0) {
    result += '\n[전개]\n' + byType.plot.map(c => `- ${c}`).join('\n');
  }
  if (byType.pacing.length > 0) {
    result += '\n[페이스]\n' + byType.pacing.map(c => `- ${c}`).join('\n');
  }
  if (byType.general.length > 0) {
    result += '\n[기타]\n' + byType.general.map(c => `- ${c}`).join('\n');
  }

  return result + '\n※ 위 피드백은 환님이 이전 화에서 요청한 수정사항입니다. 이번 화에도 반드시 반영하세요.\n';
}

const client = new Anthropic();

// 설정 상수
const MODEL = 'claude-sonnet-4-20250514';  // 최신 Sonnet 모델
const MAX_TOKENS = 12000;  // 충분한 토큰 (한글 5000~7000자 = 약 5000~7000 토큰)
const TEMPERATURE = 0.8;   // 창작용 온도

const MIN_CHAR_COUNT = 4000;
const TARGET_MIN_CHAR = 5000;
const TARGET_MAX_CHAR = 7000;
const MAX_RETRY = 2;

// 시스템 프롬프트 (고정 - 작가 페르소나 + 4단계 사고 + 문체 규칙)
function buildSystemPrompt(persona: typeof AUTHOR_PERSONA_PRESETS[0] | undefined, viewpoint: string): string {
  const viewpointRule = viewpoint === 'first_person'
    ? '1인칭 주인공 시점. 모든 서술을 "나"로. 주인공이 모르는 것은 독자도 모른다. 다른 인물의 속마음은 추측만 가능.'
    : '3인칭 작가 시점. 캐릭터 이름으로 서술. 여러 인물 시점 전환 가능. 인물의 속마음 직접 서술 가능.';

  return `당신은 한국 웹소설 전문 작가입니다.

## 작가 정체성
${persona?.name || '웹소설 작가'}
${persona?.style || ''}

## 시점
${viewpointRule}

## 4단계 집필 프로세스
반드시 아래 4단계를 내부적으로 수행한 후, 최종 본문만 출력하세요.
중간 과정(1~4단계 메모)은 절대 출력하지 마세요.

### 1단계: 감정 감독
- 주인공 감정의 시작점, 변화점, 폭발점 설계
- 독자가 느껴야 할 감정 설계
- 감정은 행동으로만 드러낸다
  나쁜 예: "태민은 분노했다."
  좋은 예: "태민의 손이 떨렸다. 이를 깨물었다."

### 2단계: 장면 감독
- 카메라 시점 (클로즈업/와이드)
- 공간 묘사 (시각, 청각, 후각, 촉각)
- 긴장 곡선 설계
- 한 장면 800자 이내

### 3단계: 초고 집필
- 설명 최소, 행동 중심
- 문장 리듬: 짧은 문장 3~5개 → 긴 서술 1~2개 → 임팩트 문장
- 대사는 짧고 강렬하게, 전후에 표정/동작 묘사
- 왕복 대사(A-B-A-B) 금지

### 4단계: 수정
- AI스러운 표현 제거 (균일한 문장 길이, 정돈된 나열)
- 거친 초고 느낌 유지
- 감각 묘사 보강

## 절대 규칙
1. 분량: 반드시 ${TARGET_MIN_CHAR}자 이상 ${TARGET_MAX_CHAR}자 이하
2. 마크다운 서식 절대 금지 (**, *, #, - 등)
3. 순수한 소설 텍스트만 출력
4. 장면 전환은 빈 줄로만
5. 매 화 마지막 2줄은 클리프행어 (위기/발견/반전/선언)
6. 매 화 최소 1개 보상 (정보/감정/능력/전개)

## 출력 형식
JSON으로만 응답:
{
  "episode": {
    "title": "화 제목",
    "content": "본문 전체 (줄바꿈은 \\n)",
    "endHook": "마지막 2줄"
  },
  "authorComment": "이 화의 핵심 포인트",
  "nextEpisodePreview": "다음 화 예고"
}`;
}

// 유저 프롬프트 (가변 - 세계관 + 캐릭터 + 이전 화 + 방향)
function buildUserPrompt(params: {
  episodeNumber: number;
  confirmedLayers?: {
    world?: string;
    coreRules?: string;
    seeds?: string;
    heroArc?: string;
    villainArc?: string;
    ultimateMystery?: string;
  };
  characterProfiles?: string;
  characterMemories?: string;
  previousEpisodes?: Episode[];
  authorDirection?: string;
  isRetry?: boolean;
  previousContent?: string;
  previousCharCount?: number;
  recurringFeedback?: Feedback[];
}): string {
  const {
    episodeNumber,
    confirmedLayers,
    characterProfiles,
    characterMemories,
    previousEpisodes,
    authorDirection,
    isRetry,
    previousContent,
    previousCharCount,
    recurringFeedback
  } = params;

  const lastEpisode = previousEpisodes?.[previousEpisodes.length - 1];
  const lastEpisodeFinalContent = lastEpisode ? getEpisodeFinalContent(lastEpisode) : null;
  const wasEdited = lastEpisode?.editedContent ? true : false;

  const retryInstruction = isRetry ? `
⚠️ 이전 작성본이 ${previousCharCount}자로 분량 부족!
반드시 ${TARGET_MIN_CHAR}자 이상으로 다시 작성하세요.
- 장면 묘사를 구체적으로 (공간, 빛, 냄새, 온도)
- 인물 내면을 깊이 파고들기
- 동작을 섬세하게 풀어쓰기
같은 정보 반복으로 늘리지 마세요.
` : '';

  // 누적 피드백 섹션
  const feedbackSection = buildFeedbackSection(recurringFeedback);

  return `${retryInstruction}${feedbackSection}
## 제${episodeNumber}화 작성 요청

### 세계관
${confirmedLayers?.world || '(미설정)'}

### 핵심 규칙
${confirmedLayers?.coreRules || '(미설정)'}

### 주요 인물
${confirmedLayers?.seeds || characterProfiles || '(미설정)'}

### 주인공 서사
${confirmedLayers?.heroArc || '(미설정)'}

### 빌런 서사
${confirmedLayers?.villainArc || '(미설정)'}

### 숨겨진 떡밥
${confirmedLayers?.ultimateMystery || '(미설정)'}
이 떡밥의 흔적을 본문에 자연스럽게 깔되, 독자가 알아채지 못하게.

### 캐릭터 현재 상태
${characterProfiles || '(없음)'}

### 기억 잔상
${characterMemories || '(없음)'}
※ 이 경험들을 직접 언급하지 말고, 행동/반응/망설임에 자연스럽게 반영하세요.

### 이전 화 (문체 참고)
${lastEpisodeFinalContent ? `
${lastEpisodeFinalContent.slice(0, 3000)}${lastEpisodeFinalContent.length > 3000 ? '\n... (이하 생략)' : ''}
${wasEdited ? '※ 환님이 수정한 버전입니다. 이 문체와 방향성을 유지하세요.' : ''}
` : '(첫 화입니다)'}

### 이 화 방향
${authorDirection || '자유롭게 전개'}

${episodeNumber <= 5 ? `
### 초반 5화 주의사항
- 주인공의 목표/강점/결핍이 드러나야 함
- 세계 규칙이 자연스럽게 노출되어야 함
- 다음 화 클릭할 궁금증 필수
` : ''}

---
지금 ${episodeNumber}화를 ${TARGET_MIN_CHAR}자 이상으로 작성하세요.`;
}

// API 호출 및 파싱
async function generateEpisode(
  systemPrompt: string,
  userPrompt: string,
  episodeNumber: number
): Promise<{
  episode: Episode | null;
  authorComment: string;
  nextEpisodePreview: string;
  rawText: string;
}> {
  // 상세 디버그 로그
  console.log('\n========================================');
  console.log('=== WRITE EPISODE API CALL DEBUG ===');
  console.log('========================================');
  console.log('Model:', MODEL);
  console.log('Max tokens:', MAX_TOKENS);
  console.log('Temperature:', TEMPERATURE);
  console.log('');
  console.log('=== SYSTEM PROMPT LENGTH ===', systemPrompt.length);
  console.log('=== USER PROMPT LENGTH ===', userPrompt.length);
  console.log('');
  console.log('=== SYSTEM PROMPT FIRST 500 ===');
  console.log(systemPrompt.substring(0, 500));
  console.log('');
  console.log('=== SYSTEM PROMPT KEYWORDS CHECK ===');
  console.log('Contains "4단계":', systemPrompt.includes('4단계'));
  console.log('Contains "감정 감독":', systemPrompt.includes('감정 감독'));
  console.log('Contains "5000":', systemPrompt.includes('5000'));
  console.log('Contains "장면 감독":', systemPrompt.includes('장면 감독'));
  console.log('');
  console.log('=== USER PROMPT FIRST 500 ===');
  console.log(userPrompt.substring(0, 500));
  console.log('');
  console.log('=== CALLING CLAUDE API NOW ===');
  console.log('========================================\n');

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  console.log('\n=== RESPONSE DEBUG ===');
  console.log('Response length:', text.length);
  console.log('Response preview:', text.slice(0, 300));
  console.log('=== END ===\n');

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed.episode) {
        const content = parsed.episode.content || '';
        return {
          episode: {
            id: `ep-${Date.now()}`,
            number: episodeNumber,
            title: parsed.episode.title || `제${episodeNumber}화`,
            content: content,
            charCount: content.length,
            status: 'drafted',
            pov: '',
            sourceEventIds: [],
            authorNote: parsed.authorComment || '',
            endHook: parsed.episode.endHook || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as Episode,
          authorComment: parsed.authorComment || '',
          nextEpisodePreview: parsed.nextEpisodePreview || '',
          rawText: text,
        };
      }
    }
  } catch (e) {
    console.error('Episode parsing error:', e);
  }

  return {
    episode: null,
    authorComment: '',
    nextEpisodePreview: '',
    rawText: text,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      episodeNumber,
      projectConfig,
      confirmedLayers,
      characterProfiles,
      characterMemories,
      previousEpisodes,
      authorDirection,
      seeds,
      recurringFeedback,
    } = body;

    const persona = AUTHOR_PERSONA_PRESETS.find(
      p => p.id === projectConfig?.authorPersonaId
    );
    const viewpoint = (projectConfig?.viewpoint as string) || 'third_person';

    // 시스템 프롬프트 (고정)
    const systemPrompt = buildSystemPrompt(persona, viewpoint);

    // 유저 프롬프트 (가변)
    let userPrompt = buildUserPrompt({
      episodeNumber,
      confirmedLayers,
      characterProfiles,
      characterMemories,
      previousEpisodes,
      authorDirection,
      recurringFeedback,
    });

    let result = await generateEpisode(systemPrompt, userPrompt, episodeNumber);
    let retryCount = 0;

    // 분량 검증 및 재시도
    while (
      result.episode &&
      result.episode.charCount < MIN_CHAR_COUNT &&
      retryCount < MAX_RETRY
    ) {
      console.log(`Episode too short: ${result.episode.charCount} chars. Retry ${retryCount + 1}/${MAX_RETRY}`);

      userPrompt = buildUserPrompt({
        episodeNumber,
        confirmedLayers,
        characterProfiles,
        characterMemories,
        previousEpisodes,
        authorDirection,
        isRetry: true,
        previousContent: result.episode.content,
        previousCharCount: result.episode.charCount,
        recurringFeedback,
      });

      result = await generateEpisode(systemPrompt, userPrompt, episodeNumber);
      retryCount++;
    }

    // 결과 반환
    if (result.episode) {
      result.episode.pov = seeds?.[0]?.id || '';

      // 분량 부족 시 경고
      if (result.episode.charCount < MIN_CHAR_COUNT) {
        result.authorComment = `[분량 ${result.episode.charCount}자 - 목표 ${TARGET_MIN_CHAR}자 미달]\n\n${result.authorComment}`;
      }

      return NextResponse.json({
        episode: result.episode,
        authorComment: result.authorComment,
        nextEpisodePreview: result.nextEpisodePreview,
      });
    }

    // 파싱 실패 시 raw 텍스트로 에피소드 생성
    return NextResponse.json({
      episode: {
        id: `ep-${Date.now()}`,
        number: episodeNumber,
        title: `제${episodeNumber}화`,
        content: result.rawText.slice(0, 10000),
        charCount: result.rawText.length,
        status: 'drafted',
        pov: seeds?.[0]?.id || '',
        sourceEventIds: [],
        authorNote: '',
        endHook: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      authorComment: '파싱 실패 - 원본 텍스트 사용',
      nextEpisodePreview: '',
    });
  } catch (error) {
    console.error('Write episode error:', error);
    return NextResponse.json(
      { error: '에피소드 작성 실패' },
      { status: 500 }
    );
  }
}
