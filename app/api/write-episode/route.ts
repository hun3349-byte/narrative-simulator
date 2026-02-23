import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AUTHOR_PERSONA_PRESETS } from '@/lib/presets/author-personas';
import type { Episode, Feedback, FeedbackType, MonologueTone, ActiveContext, WritingMemory } from '@/lib/types';
import { getEpisodeFinalContent } from '@/lib/types';
import { activeContextToPrompt } from '@/lib/utils/active-context';
import { buildWritingMemoryPrompt } from '@/lib/utils/writing-memory';

export const maxDuration = 60; // Vercel Fluid Compute 활성화

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

// 독백 톤 5가지 (같은 톤 2화 연속 금지)
const MONOLOGUE_TONES: MonologueTone[] = ['자조', '관찰', '냉정', '감각', '메타'];

// 클리프행어 7유형 (돌려쓰기)
const CLIFFHANGER_TYPES = [
  '위기 직전',      // "그 순간, 문이 열렸다."
  '비밀 폭로',      // "그녀의 이름은 진짜가 아니었다."
  '선택 강요',      // "죽이거나, 죽거나."
  '예상 뒤집기',    // "하지만 그는 웃고 있었다."
  '능력 각성 힌트', // "손끝에서 뭔가가 일렁였다."
  '과거 연결',      // "10년 전, 바로 이 자리였다."
  '인물 등장',      // "그리고 그가 나타났다."
] as const;

// 시스템 프롬프트 (고정 - 작가 페르소나 + 4단계 사고 + 문체 규칙 + v2 강화)
function buildSystemPrompt(
  persona: typeof AUTHOR_PERSONA_PRESETS[0] | undefined,
  viewpoint: string,
  episodeNumber: number,
  previousMonologueTone?: MonologueTone
): string {
  const viewpointRule = viewpoint === 'first_person'
    ? '1인칭 주인공 시점. 모든 서술을 "나"로. 주인공이 모르는 것은 독자도 모른다. 다른 인물의 속마음은 추측만 가능.'
    : '3인칭 작가 시점. 캐릭터 이름으로 서술. 여러 인물 시점 전환 가능. 인물의 속마음 직접 서술 가능.';

  // 이번 화에 사용할 독백 톤 (이전 화 톤 제외)
  const availableTones = previousMonologueTone
    ? MONOLOGUE_TONES.filter(t => t !== previousMonologueTone)
    : MONOLOGUE_TONES;
  const suggestedTone = availableTones[episodeNumber % availableTones.length];

  // 이번 화에 사용할 클리프행어 유형
  const suggestedCliffhanger = CLIFFHANGER_TYPES[(episodeNumber - 1) % CLIFFHANGER_TYPES.length];

  // 구간별 속도 (100화 기준)
  let pacingGuide = '';
  if (episodeNumber <= 10) {
    pacingGuide = '초반(1~10화): 빠르게. 한 장면에 머물지 마라. 다음 장면으로 밀어붙여라. 설명 최소화.';
  } else if (episodeNumber <= 50) {
    pacingGuide = '중반(11~50화): 깊게. 감정/관계/갈등을 파고들어라. 속도를 줄이고 밀도를 높여라.';
  } else {
    pacingGuide = '후반(51화~): 폭풍. 사건이 몰아친다. 쉴 틈 없이. 그러나 감정 정점은 쉼표로 강조.';
  }

  return `당신은 한국 웹소설 전문 작가입니다.

## 작가 정체성
${persona?.name || '웹소설 작가'}
${persona?.style || ''}

## 시점
${viewpointRule}

## 어그로 페르소나 (필수)
### 첫 문장 = 어그로
첫 문장은 3가지 중 하나:
1. 감각 충격: "피 냄새가 났다." / "차가웠다. 뼈까지."
2. 상황 충격: "죽었다. 아니, 죽어야 했다."
3. 의문 유발: "왜 하필 나였을까."
※ "평화로운 아침이었다" 류의 느슨한 시작 절대 금지

### 독백의 재치
지루한 내면 금지. 독백은 다음 중 하나:
- 자조적 유머: "운이 좋다고? 이게 운이면 난 신의 장난감이다."
- 날카로운 관찰: "저 눈. 거짓말쟁이 눈이다."
- 냉정한 계산: "3명. 내 오른쪽이 빠르다. 먼저."

### 정보 전달의 재치
설명하지 말고 보여줘:
나쁜 예: "이 세계는 마나를 기반으로 한 힘의 체계가 있었다."
좋은 예: "그가 손을 펴자, 푸른 빛이 일렁였다. 마나. 이 세계의 전부."

## 독백 톤 시스템
5가지 톤을 돌려쓴다. 같은 톤 2화 연속 금지.
- 자조: 자기비하 유머, 쓴웃음
- 관찰: 타인/상황 분석, 날카로운 시선
- 냉정: 감정 배제, 계산적 판단
- 감각: 오감 중심, 몸의 반응
- 메타: 상황의 아이러니 인식, 독자와 공유하는 듯한 거리감

이번 화 권장 톤: "${suggestedTone}"
${previousMonologueTone ? `(이전 화 톤: "${previousMonologueTone}" - 이 톤 사용 금지)` : ''}

## 빌드업 구조 (중요)
### 한 화 완결 금지
문제 제시 → 해결은 다음 화로. 매 화는 "미완의 긴장"으로 끝난다.

### 긴장 3겹 쌓기
매 화 최소 3개의 긴장을 동시에 굴린다:
1. 즉각 긴장: 지금 당장의 위협/궁금증
2. 중기 긴장: 이 아크에서 해결될 문제
3. 장기 긴장: 시리즈 전체를 관통하는 미스터리

### 정보는 한 꺼풀씩
한 화에 모든 것을 밝히지 마라. 새 정보는 새 궁금증을 낳아야 한다.

## 구간별 속도
${pacingGuide}

## 연독 장치 (필수)
### 클리프행어 7유형 돌려쓰기
이번 화 권장 유형: "${suggestedCliffhanger}"
마지막 2줄에 반드시 이 유형의 훅을 건다.

### 3중 훅 시스템
1. 오프닝 훅 (첫 3줄): 독자를 잡는다
2. 미드포인트 훅 (50% 지점): 새 긴장 추가 또는 반전
3. 클로징 훅 (마지막 2줄): 다음 화 클릭

### 떡밥 순환
깔린 떡밥을 잊지 마라. 3~5화마다 기존 떡밥 언급/진전.

### 5화 미니 아크
매 5화를 하나의 작은 서사로. 5화마다 작은 결말 + 더 큰 시작.

## 장면 전환 규칙
### 감정 브릿지
장면 전환 시 감정을 연결한다:
나쁜 예: [장면1 끝] ... [장면2 시작]
좋은 예: 분노로 끝난 장면 → 그 분노의 여파로 시작하는 다음 장면

### 시점 3줄 규칙
새 장면 첫 3줄 안에 (누가/어디서/언제) 명확히.

### 시간 앵커
"3일 후", "그날 밤", "해가 지고" - 시간 감각 유지

### 빈도 제한
한 화에 장면 전환 최대 4회. 너무 잦으면 독자가 멀미.

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
- 긴장 곡선 설계 (3중 긴장 확인)
- 한 장면 800자 이내

### 3단계: 초고 집필
- 설명 최소, 행동 중심
- 문장 리듬: 짧은 문장 3~5개 → 긴 서술 1~2개 → 임팩트 문장
- 대사는 짧고 강렬하게, 전후에 표정/동작 묘사
- 왕복 대사(A-B-A-B) 금지
- 선택한 독백 톤 유지

### 4단계: 수정
- AI스러운 표현 제거 (균일한 문장 길이, 정돈된 나열)
- 거친 초고 느낌 유지
- 감각 묘사 보강
- 3중 훅 확인 (오프닝/미드포인트/클로징)

## 절대 규칙
1. 분량: 반드시 ${TARGET_MIN_CHAR}자 이상 ${TARGET_MAX_CHAR}자 이하
2. 마크다운 서식 절대 금지 (**, *, #, - 등)
3. 순수한 소설 텍스트만 출력
4. 장면 전환은 빈 줄로만
5. 매 화 마지막 2줄은 클리프행어 (지정 유형: ${suggestedCliffhanger})
6. 매 화 최소 1개 보상 (정보/감정/능력/전개)
7. 한 화 완결 금지 - 미완의 긴장으로 끝낼 것
8. 첫 문장 어그로 필수

## 출력 형식
JSON으로만 응답:
{
  "episode": {
    "title": "화 제목",
    "content": "본문 전체 (줄바꿈은 \\n)",
    "endHook": "마지막 2줄"
  },
  "authorComment": "이 화의 핵심 포인트",
  "nextEpisodePreview": "다음 화 예고",
  "monologueTone": "${suggestedTone}"
}`;
}

// 유저 프롬프트 (가변 - 세계관 + 캐릭터 + 이전 화 + 방향 + Active Context + Writing Memory)
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
  activeContext?: ActiveContext;
  writingMemory?: WritingMemory;
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
    recurringFeedback,
    activeContext,
    writingMemory
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

  // Writing Memory 섹션 (자가진화 피드백 루프)
  const writingMemorySection = writingMemory
    ? `\n=== 학습된 문체 규칙 ===\n${buildWritingMemoryPrompt(writingMemory)}\n=== 학습된 문체 규칙 끝 ===\n`
    : '';

  // Active Context가 있으면 사용, 없으면 기존 방식
  const activeContextSection = activeContext
    ? activeContextToPrompt(activeContext)
    : '';

  return `${retryInstruction}${feedbackSection}${writingMemorySection}
## 제${episodeNumber}화 작성 요청

${activeContextSection ? `
=== 일관성 엔진 (Active Context) ===
${activeContextSection}
=== 일관성 엔진 끝 ===
` : ''}

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
    // 마크다운 코드 블록 제거
    let cleanText = text;
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleanText = codeBlockMatch[1].trim();
    }

    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
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
            monologueTone: parsed.monologueTone || undefined, // 독백 톤 저장
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as Episode & { monologueTone?: string },
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
  const encoder = new TextEncoder();

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
      activeContext,
      writingMemory,
    } = body;

    const persona = AUTHOR_PERSONA_PRESETS.find(
      p => p.id === projectConfig?.authorPersonaId
    );
    const viewpoint = (projectConfig?.viewpoint as string) || 'third_person';

    // 이전 화의 독백 톤 추출 (같은 톤 2화 연속 금지)
    const lastEpisode = previousEpisodes?.[previousEpisodes.length - 1];
    const previousMonologueTone = (lastEpisode as Episode & { monologueTone?: MonologueTone })?.monologueTone;

    // 시스템 프롬프트 (고정 + 화수/톤 기반 동적 요소)
    const systemPrompt = buildSystemPrompt(persona, viewpoint, episodeNumber, previousMonologueTone);

    // 유저 프롬프트 (가변)
    const userPrompt = buildUserPrompt({
      episodeNumber,
      confirmedLayers,
      characterProfiles,
      characterMemories,
      previousEpisodes,
      authorDirection,
      recurringFeedback,
      activeContext,
      writingMemory,
    });

    // 스트리밍 응답 생성
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullText = '';

          const streamResponse = client.messages.stream({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            temperature: TEMPERATURE,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          });

          for await (const event of streamResponse) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              fullText += event.delta.text;
              // 실시간 텍스트 전송
              const chunk = JSON.stringify({ type: 'text', content: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
            }
          }

          // 파싱
          let cleanText = fullText;
          const codeBlockMatch = fullText.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (codeBlockMatch) {
            cleanText = codeBlockMatch[1].trim();
          }

          const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);

              if (parsed.episode) {
                const content = parsed.episode.content || '';
                const episode = {
                  id: `ep-${Date.now()}`,
                  number: episodeNumber,
                  title: parsed.episode.title || `제${episodeNumber}화`,
                  content: content,
                  charCount: content.length,
                  status: 'drafted',
                  pov: seeds?.[0]?.id || '',
                  sourceEventIds: [],
                  authorNote: parsed.authorComment || '',
                  endHook: parsed.episode.endHook || '',
                  monologueTone: parsed.monologueTone || undefined,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                // 분량 경고
                let authorComment = parsed.authorComment || '';
                if (content.length < MIN_CHAR_COUNT) {
                  authorComment = `[분량 ${content.length}자 - 목표 ${TARGET_MIN_CHAR}자 미달]\n\n${authorComment}`;
                }

                const finalData = JSON.stringify({
                  type: 'done',
                  episode,
                  authorComment,
                  nextEpisodePreview: parsed.nextEpisodePreview || '',
                });
                controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
              } else {
                // episode 키 없음 - raw 텍스트 사용
                const episode = {
                  id: `ep-${Date.now()}`,
                  number: episodeNumber,
                  title: `제${episodeNumber}화`,
                  content: fullText.slice(0, 10000),
                  charCount: fullText.length,
                  status: 'drafted',
                  pov: seeds?.[0]?.id || '',
                  sourceEventIds: [],
                  authorNote: '',
                  endHook: '',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                const finalData = JSON.stringify({
                  type: 'done',
                  episode,
                  authorComment: '파싱 부분 실패 - 원본 텍스트 사용',
                  nextEpisodePreview: '',
                });
                controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
              }
            } catch {
              // JSON 파싱 실패 - raw 텍스트 사용
              const episode = {
                id: `ep-${Date.now()}`,
                number: episodeNumber,
                title: `제${episodeNumber}화`,
                content: fullText.slice(0, 10000),
                charCount: fullText.length,
                status: 'drafted',
                pov: seeds?.[0]?.id || '',
                sourceEventIds: [],
                authorNote: '',
                endHook: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              const finalData = JSON.stringify({
                type: 'done',
                episode,
                authorComment: '파싱 실패 - 원본 텍스트 사용',
                nextEpisodePreview: '',
              });
              controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
            }
          } else {
            // JSON 없음 - raw 텍스트 사용
            const episode = {
              id: `ep-${Date.now()}`,
              number: episodeNumber,
              title: `제${episodeNumber}화`,
              content: fullText.slice(0, 10000),
              charCount: fullText.length,
              status: 'drafted',
              pov: seeds?.[0]?.id || '',
              sourceEventIds: [],
              authorNote: '',
              endHook: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const finalData = JSON.stringify({
              type: 'done',
              episode,
              authorComment: 'JSON 없음 - 원본 텍스트 사용',
              nextEpisodePreview: '',
            });
            controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
          }

          controller.close();
        } catch (error) {
          console.error('Write episode streaming error:', error);
          const errorData = JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : '에피소드 작성 오류',
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Write episode error:', error);
    const encoder = new TextEncoder();
    const errorData = JSON.stringify({
      type: 'error',
      message: '에피소드 작성 실패',
    });
    return new Response(`data: ${errorData}\n\n`, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  }
}
