import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AUTHOR_PERSONA_PRESETS } from '@/lib/presets/author-personas';
import type { LayerName, Episode, Feedback, FeedbackType } from '@/lib/types';
import { getEpisodeFinalContent } from '@/lib/types';

const client = new Anthropic();

// 피드백 분류 함수
async function classifyFeedback(
  feedbackContent: string,
  episodeNumber: number
): Promise<{ type: FeedbackType; isRecurring: boolean }> {
  // 누적형 피드백 키워드 (문체, 스타일 관련)
  const recurringKeywords = [
    '문체', '문장', '톤', '분위기', '스타일', '말투',
    '묘사', '표현', '리듬', '호흡', '감각', '감정 표현',
    '항상', '계속', '매번', '전반적', '전체적으로',
    '너무 짧', '너무 길', '더 짧게', '더 길게',
    '대사', '대화', '서술', '설명'
  ];

  // 1회성 피드백 키워드 (특정 내용 관련)
  const oneTimeKeywords = [
    '이 장면', '여기서', '이 부분', '이 대사',
    '캐릭터 이름', '설정 오류', '앞뒤가', '모순',
    '삭제', '추가', '변경', '수정해줘'
  ];

  const content = feedbackContent.toLowerCase();

  // 키워드 기반 1차 분류
  const hasRecurringKeyword = recurringKeywords.some(kw => content.includes(kw));
  const hasOneTimeKeyword = oneTimeKeywords.some(kw => content.includes(kw));

  // 피드백 유형 결정
  let type: FeedbackType = 'general';
  if (content.includes('문체') || content.includes('스타일') || content.includes('톤')) {
    type = 'style';
  } else if (content.includes('캐릭터') || content.includes('인물') || content.includes('성격')) {
    type = 'character';
  } else if (content.includes('전개') || content.includes('스토리') || content.includes('플롯')) {
    type = 'plot';
  } else if (content.includes('속도') || content.includes('페이스') || content.includes('빠르') || content.includes('느리')) {
    type = 'pacing';
  }

  // 누적형 여부 결정
  // style, pacing은 대부분 누적형
  // 명시적 누적 키워드가 있으면 누적형
  // 특정 장면 언급 없으면 누적형 가능성 높음
  const isRecurring = (type === 'style' || type === 'pacing') ||
    (hasRecurringKeyword && !hasOneTimeKeyword);

  return { type, isRecurring };
}

// 집필용 설정 (write-episode와 동일)
const WRITING_MODEL = 'claude-sonnet-4-20250514';
const WRITING_MAX_TOKENS = 12000;
const WRITING_TEMPERATURE = 0.8;
const TARGET_MIN_CHAR = 5000;
const TARGET_MAX_CHAR = 7000;
const MIN_CHAR_COUNT = 4000;
const MAX_RETRY = 2;

interface AuthorChatRequest {
  projectId: string;
  action: 'generate_layer' | 'respond' | 'revise_layer' | 'conversation';
  layer: LayerName;
  genre: string;
  tone: string;
  viewpoint: string;
  authorPersonaId: string;
  direction?: string;
  userMessage?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  previousLayers: {
    world?: unknown;
    coreRules?: unknown;
    seeds?: unknown;
    heroArc?: unknown;
    villainArc?: unknown;
    ultimateMystery?: unknown;
  };
  currentDraft?: unknown;
  currentPhase?: string;
  worldHistory?: {
    eras?: Array<{ name: string; yearRange: number[]; description: string }>;
  };
  simulationState?: {
    currentYear?: number;
    charactersCount?: number;
    eventsCount?: number;
  };
  currentEpisode?: {
    number?: number;
    title?: string;
    status?: string;
  };
  episodesCount?: number;
  episodes?: Episode[];
  // 피드백 누적 학습
  recurringFeedback?: Feedback[];
}

// 집필 요청인지 감지
function isWritingRequest(message: string): { isWriting: boolean; episodeNumber?: number } {
  const msg = message.toLowerCase();

  // 집필 관련 키워드
  const writingKeywords = [
    '써줘', '써 줘', '작성해', '작성 해', '집필',
    '시작하자', '시작해', '이어서', '이어 서',
    '다음 화', '다음화', '1화', '2화', '3화', '4화', '5화',
    '첫 화', '첫화', '시작해줘', '써봐', '써 봐'
  ];

  const hasWritingKeyword = writingKeywords.some(kw => msg.includes(kw));

  if (!hasWritingKeyword) {
    return { isWriting: false };
  }

  // 에피소드 번호 추출 시도
  const numberMatch = msg.match(/(\d+)\s*화/);
  const episodeNumber = numberMatch ? parseInt(numberMatch[1]) : undefined;

  return { isWriting: true, episodeNumber };
}

// 피드백인지 감지
function isFeedbackMessage(message: string): boolean {
  const msg = message.toLowerCase();

  // 피드백 관련 키워드
  const feedbackKeywords = [
    // 문체 관련
    '문체', '톤', '스타일', '말투', '표현', '묘사',
    '너무 짧', '너무 길', '더 짧게', '더 길게',
    // 변경 요청
    '바꿔', '수정해', '고쳐', '다르게',
    // 평가/불만
    '아쉬', '별로', '안 맞', '어색', '이상해',
    // 방향 제시
    '좀 더', '덜', '많이', '적게',
    // 대사/서술
    '대사', '대화', '서술', '설명'
  ];

  // 긍정 피드백 (학습 필요 없음)
  const positiveKeywords = ['좋아', '괜찮', '잘 됐', '잘했', '마음에 들'];
  const hasPositive = positiveKeywords.some(kw => msg.includes(kw));
  if (hasPositive && !msg.includes('안') && !msg.includes('별로')) {
    return false;
  }

  return feedbackKeywords.some(kw => msg.includes(kw));
}

// 집필용 시스템 프롬프트 (4단계 사고)
function buildWritingSystemPrompt(persona: typeof AUTHOR_PERSONA_PRESETS[0] | undefined, viewpoint: string): string {
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

  let result = '\n### 환님 피드백 (누적)\n아래 피드백들을 반드시 반영하세요:\n';

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

  return result + '\n';
}

// 집필용 유저 프롬프트
function buildWritingUserPrompt(req: AuthorChatRequest, episodeNumber: number, isRetry?: boolean, previousCharCount?: number): string {
  const lastEpisode = req.episodes?.[req.episodes.length - 1];
  const lastEpisodeFinalContent = lastEpisode ? getEpisodeFinalContent(lastEpisode) : null;
  const wasEdited = lastEpisode?.editedContent ? true : false;

  const layerToString = (data: unknown): string => {
    if (!data) return '(미설정)';
    if (typeof data === 'string') return data;
    return JSON.stringify(data, null, 2);
  };

  const retryInstruction = isRetry ? `
⚠️ 이전 작성본이 ${previousCharCount}자로 분량 부족!
반드시 ${TARGET_MIN_CHAR}자 이상으로 다시 작성하세요.
- 장면 묘사를 구체적으로 (공간, 빛, 냄새, 온도)
- 인물 내면을 깊이 파고들기
- 동작을 섬세하게 풀어쓰기
같은 정보 반복으로 늘리지 마세요.
` : '';

  // 누적 피드백 섹션
  const feedbackSection = buildFeedbackSection(req.recurringFeedback);

  return `${retryInstruction}${feedbackSection}
## 제${episodeNumber}화 작성 요청

### 세계관
${layerToString(req.previousLayers.world)}

### 핵심 규칙
${layerToString(req.previousLayers.coreRules)}

### 주요 인물
${layerToString(req.previousLayers.seeds)}

### 주인공 서사
${layerToString(req.previousLayers.heroArc)}

### 빌런 서사
${layerToString(req.previousLayers.villainArc)}

### 숨겨진 떡밥
${layerToString(req.previousLayers.ultimateMystery)}
이 떡밥의 흔적을 본문에 자연스럽게 깔되, 독자가 알아채지 못하게.

### 이전 화 (문체 참고)
${lastEpisodeFinalContent ? `
${lastEpisodeFinalContent.slice(0, 3000)}${lastEpisodeFinalContent.length > 3000 ? '\n... (이하 생략)' : ''}
${wasEdited ? '※ 환님이 수정한 버전입니다. 이 문체와 방향성을 유지하세요.' : ''}
` : '(첫 화입니다)'}

### 이 화 방향
${req.direction || '자유롭게 전개'}

${episodeNumber <= 5 ? `
### 초반 5화 주의사항
- 주인공의 목표/강점/결핍이 드러나야 함
- 세계 규칙이 자연스럽게 노출되어야 함
- 다음 화 클릭할 궁금증 필수
` : ''}

---
지금 ${episodeNumber}화를 ${TARGET_MIN_CHAR}자 이상으로 작성하세요.`;
}

// 에피소드 생성 (4단계 사고 적용)
async function generateEpisodeInternal(
  systemPrompt: string,
  userPrompt: string,
  episodeNumber: number
): Promise<{
  episode: Episode | null;
  authorComment: string;
  nextEpisodePreview: string;
  rawText: string;
}> {
  console.log('\n========================================');
  console.log('=== AUTHOR-CHAT -> WRITE EPISODE ===');
  console.log('========================================');
  console.log('Model:', WRITING_MODEL);
  console.log('Max tokens:', WRITING_MAX_TOKENS);
  console.log('Temperature:', WRITING_TEMPERATURE);
  console.log('System prompt length:', systemPrompt.length);
  console.log('User prompt length:', userPrompt.length);
  console.log('');
  console.log('=== SYSTEM PROMPT KEYWORDS CHECK ===');
  console.log('Contains "4단계":', systemPrompt.includes('4단계'));
  console.log('Contains "감정 감독":', systemPrompt.includes('감정 감독'));
  console.log('Contains "5000":', systemPrompt.includes('5000'));
  console.log('');
  console.log('=== CALLING CLAUDE API ===\n');

  const response = await client.messages.create({
    model: WRITING_MODEL,
    max_tokens: WRITING_MAX_TOKENS,
    temperature: WRITING_TEMPERATURE,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  console.log('\n=== RESPONSE ===');
  console.log('Response length:', text.length);
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

function buildLayerPrompt(req: AuthorChatRequest): string {
  const persona = AUTHOR_PERSONA_PRESETS.find(p => p.id === req.authorPersonaId);
  const personaName = persona?.name || '작가';
  const personaStyle = persona?.style?.signature || '';

  const baseContext = `당신은 "${personaName}"입니다.
스타일: ${personaStyle}

환님이 요청한 방향:
- 장르: ${req.genre}
- 톤: ${req.tone}
- 시점: ${req.viewpoint}
${req.direction ? `- 초기 아이디어: ${req.direction}` : ''}

## 대화 규칙 (필수)
1. 마크다운 서식 금지 - **볼드**, *이탤릭*, # 제목, - 목록, > 인용 전부 금지
2. 보고서 형태 금지 - 이야기하듯이 자연스럽게 말해
3. 존댓말 금지 - 반말로 말해 (동등한 창작 파트너)
4. 기술 용어 금지 - "시뮬레이션", "서사 아크", "캐릭터 씨앗" 같은 말 쓰지 마
5. 확신 있게 말해 - "이렇게 할게", "이건 이래" 같은 톤으로
6. 허락 구하지 마 - "어떻게 생각해?"가 아니라 제안을 먼저 해`;

  const layerPrompts: Record<string, string> = {
    world: `${baseContext}

## 임무
${req.action === 'generate_layer' ? '세계를 만들어.' : req.userMessage ? `환님 피드백: "${req.userMessage}"\n\n이 피드백에 맞춰 세계를 수정해.` : '피드백에 맞춰 세계를 수정해.'}
${req.currentDraft ? `\n현재 초안:\n${JSON.stringify(req.currentDraft, null, 2)}` : ''}

## 세계 구축 규칙
- 대륙 이름을 지어
- 지형을 설명해 (산맥, 바다, 숲, 사막 등)
- 주요 도시 3-5개를 만들어 (각각 이름, 특징, 위치, 이야기에서의 의미)
- 주요 지형지물을 나열해
- 전체 지도를 텍스트로 묘사해

JSON으로 응답:
{
  "message": "작가의 설명 (자연스러운 말투)",
  "layer": {
    "continentName": "대륙 이름",
    "geography": "지형 설명",
    "cities": [
      { "name": "도시명", "description": "특징", "location": "위치", "significance": "이야기 의미" }
    ],
    "landmarks": ["지형지물1", "지형지물2"],
    "mapDescription": "텍스트 지도 묘사"
  }
}`,

    coreRules: `${baseContext}

이미 만든 세계:
${req.previousLayers.world ? JSON.stringify(req.previousLayers.world, null, 2) : '(없음)'}

## 임무
${req.action === 'generate_layer' ? '이 세계의 핵심 규칙을 정해.' : req.userMessage ? `환님 피드백: "${req.userMessage}"\n\n이 피드백에 맞춰 규칙을 수정해.` : '피드백에 맞춰 규칙을 수정해.'}
${req.currentDraft ? `\n현재 초안:\n${JSON.stringify(req.currentDraft, null, 2)}` : ''}

## 규칙 구축 가이드
1. 힘의 체계: 마법? 무공? 기술? 어떻게 작동하고 대가는 뭔가?
2. 종족: 인간만? 다른 종족?
3. 역사: 수천 년 전 무슨 일이 있었나? 그 여파는?
4. 현재 상태: 지금 세계는 어떤 상황인가?
5. 핵심 규칙들: 이 세계에서 절대적인 법칙들

JSON으로 응답:
{
  "message": "작가의 설명",
  "layer": {
    "powerSystem": "힘/마법 체계 설명",
    "races": "종족 설명",
    "history": "핵심 역사",
    "currentState": "현재 세계 상태",
    "rules": ["규칙1", "규칙2", "규칙3"]
  }
}`,

    seeds: `${baseContext}

세계:
${req.previousLayers.world ? JSON.stringify(req.previousLayers.world, null, 2) : '(없음)'}

규칙:
${req.previousLayers.coreRules ? JSON.stringify(req.previousLayers.coreRules, null, 2) : '(없음)'}

## 임무
${req.action === 'generate_layer' ? '세계에 살아가는 존재들(씨앗)을 뿌려.' : req.userMessage ? `환님 피드백: "${req.userMessage}"\n\n이 피드백에 맞춰 씨앗을 수정해.` : '피드백에 맞춰 씨앗을 수정해.'}
${req.currentDraft ? `\n현재 초안:\n${JSON.stringify(req.currentDraft, null, 2)}` : ''}

## 씨앗 가이드
1. 세력 2-4개: 이름, 성격, 거점, 목적, 다른 세력과의 관계
2. 종족 1-3개: 이름, 특성, 영역, 문화
3. 위협 1-3개: 이름, 출몰 지역, 성격, 위험도
4. 주요 NPC 3-5명: 이름, 역할, 위치, 성격, 숨겨진 동기(있으면)

JSON으로 응답:
{
  "message": "작가의 설명",
  "layer": {
    "factions": [{ "name": "", "nature": "", "base": "", "goal": "", "relationship": "" }],
    "races": [{ "name": "", "traits": "", "territory": "", "culture": "" }],
    "threats": [{ "name": "", "region": "", "nature": "", "dangerLevel": "" }],
    "npcs": [{ "name": "", "role": "", "location": "", "personality": "", "hiddenMotivation": "" }]
  }
}`,

    heroArc: `${baseContext}

세계: ${(req.previousLayers.world as { continentName?: string })?.continentName || ''}
힘의 체계: ${(req.previousLayers.coreRules as { powerSystem?: string })?.powerSystem || ''}

## 임무
${req.action === 'generate_layer' ? '이 세계에서 태어난 주인공을 만들어.' : req.userMessage ? `환님 피드백: "${req.userMessage}"\n\n이 피드백에 맞춰 주인공을 수정해.` : '피드백에 맞춰 주인공을 수정해.'}
${req.currentDraft ? `\n현재 초안:\n${JSON.stringify(req.currentDraft, null, 2)}` : ''}

## 주인공 설계 가이드
- 이름: 세계관에 맞는 이름
- 태생: 어디서 어떻게 태어났나
- 핵심 서사: 이 캐릭터의 이야기 한 줄 요약
- 시작 상태: 이야기 시작 시점의 상황
- 궁극적 목표: 끝까지 추구하는 것

JSON으로 응답:
{
  "message": "작가의 설명",
  "layer": {
    "name": "이름",
    "origin": "태생",
    "coreNarrative": "핵심 서사",
    "initialState": "시작 상태",
    "ultimateGoal": "궁극적 목표"
  }
}`,

    villainArc: `${baseContext}

세계: ${(req.previousLayers.world as { continentName?: string })?.continentName || ''}
주인공: ${(req.previousLayers.heroArc as { name?: string; coreNarrative?: string })?.name || ''} - ${(req.previousLayers.heroArc as { coreNarrative?: string })?.coreNarrative || ''}

## 임무
${req.action === 'generate_layer' ? '주인공과 충돌할 빌런을 만들어.' : req.userMessage ? `환님 피드백: "${req.userMessage}"\n\n이 피드백에 맞춰 빌런을 수정해.` : '피드백에 맞춰 빌런을 수정해.'}
${req.currentDraft ? `\n현재 초안:\n${JSON.stringify(req.currentDraft, null, 2)}` : ''}

## 빌런 설계 가이드
- 이름: 세계관에 맞는 이름
- 태생: 어디서 왔나
- 동기: 왜 이렇게 됐나 (처음부터 나쁜 놈은 없어)
- 핵심 서사: 빌런의 이야기
- 주인공과의 관계: 어떻게 연결되나

JSON으로 응답:
{
  "message": "작가의 설명",
  "layer": {
    "name": "이름",
    "origin": "태생",
    "motivation": "동기",
    "coreNarrative": "핵심 서사",
    "relationship": "주인공과의 관계"
  }
}`,

    ultimateMystery: `${baseContext}

세계: ${(req.previousLayers.world as { continentName?: string })?.continentName || ''}
역사: ${(req.previousLayers.coreRules as { history?: string })?.history || ''}
주인공: ${(req.previousLayers.heroArc as { name?: string })?.name || ''} - ${(req.previousLayers.heroArc as { coreNarrative?: string })?.coreNarrative || ''}
빌런: ${(req.previousLayers.villainArc as { name?: string })?.name || ''} - ${(req.previousLayers.villainArc as { motivation?: string })?.motivation || ''}

## 임무
${req.action === 'generate_layer' ? '이 이야기의 궁극의 떡밥(반전)을 만들어.' : req.userMessage ? `환님 피드백: "${req.userMessage}"\n\n이 피드백에 맞춰 떡밥을 수정해.` : '피드백에 맞춰 떡밥을 수정해.'}
${req.currentDraft ? `\n현재 초안:\n${JSON.stringify(req.currentDraft, null, 2)}` : ''}

## 떡밥 설계 가이드
- 표면: 독자가 믿는 것, 보이는 것
- 진실: 끝에 밝혀지는 실제 진실
- 힌트들: 세계 곳곳에 깔아놓을 복선들 (3-5개)
- 밝혀지는 시점: 언제, 어떻게 드러나나

이건 환님만 알고 있어야 해. 독자는 끝까지 몰라.

JSON으로 응답:
{
  "message": "작가의 설명",
  "layer": {
    "surface": "표면적으로 보이는 것",
    "truth": "실제 진실",
    "hints": ["힌트1", "힌트2", "힌트3"],
    "revealTiming": "밝혀지는 시점/방법"
  }
}`
  };

  return layerPrompts[req.layer] || layerPrompts.world;
}

function buildConversationPrompt(req: AuthorChatRequest): string {
  const persona = AUTHOR_PERSONA_PRESETS.find(p => p.id === req.authorPersonaId);
  const personaName = persona?.name || '작가';
  const personaStyle = persona?.style?.signature || '';

  const worldLayer = req.previousLayers.world
    ? JSON.stringify(req.previousLayers.world, null, 2)
    : '(미완성)';
  const coreRulesLayer = req.previousLayers.coreRules
    ? JSON.stringify(req.previousLayers.coreRules, null, 2)
    : '(미완성)';
  const seedsLayer = req.previousLayers.seeds
    ? JSON.stringify(req.previousLayers.seeds, null, 2)
    : '(미완성)';
  const heroArcLayer = req.previousLayers.heroArc
    ? JSON.stringify(req.previousLayers.heroArc, null, 2)
    : '(미완성)';
  const villainArcLayer = req.previousLayers.villainArc
    ? JSON.stringify(req.previousLayers.villainArc, null, 2)
    : '(미완성)';
  const ultimateMysteryLayer = req.previousLayers.ultimateMystery
    ? JSON.stringify(req.previousLayers.ultimateMystery, null, 2)
    : '(미완성)';

  let worldHistorySection = '';
  if (req.worldHistory?.eras && req.worldHistory.eras.length > 0) {
    const erasSummary = req.worldHistory.eras
      .map(era => `- ${era.name} (${era.yearRange?.[0] || '?'}~${era.yearRange?.[1] || '?'}년): ${era.description}`)
      .join('\n');
    worldHistorySection = `\n## 세계 역사 (${req.worldHistory.eras.length}개 시대)\n${erasSummary}`;
  }

  let simulationSection = '';
  if (req.simulationState?.currentYear) {
    simulationSection = `\n## 시뮬레이션 상태
- 현재 연도: ${req.simulationState.currentYear}년
- 캐릭터 수: ${req.simulationState.charactersCount || 0}명
- 발생한 이벤트: ${req.simulationState.eventsCount || 0}개`;
  }

  let episodeSection = '';
  if (req.currentEpisode?.number) {
    episodeSection = `\n## 현재 에피소드
- ${req.currentEpisode.number}화: ${req.currentEpisode.title || '(제목 미정)'}
- 상태: ${req.currentEpisode.status || 'drafting'}`;
  }
  if (req.episodesCount && req.episodesCount > 0) {
    episodeSection += `\n- 완성된 에피소드: ${req.episodesCount}개`;
  }

  const recentHistory = (req.conversationHistory || [])
    .slice(-25)
    .map(m => `${m.role === 'user' ? '환님' : '나'}: ${m.content}`)
    .join('\n');

  return `당신은 "${personaName}"입니다.
스타일: ${personaStyle}

## 프로젝트 정보
- 장르: ${req.genre}
- 톤: ${req.tone}
- 시점: ${req.viewpoint}
- 초기 아이디어: ${req.direction || '(없음)'}
- 현재 단계: ${req.currentPhase || 'novel'}

============================================
아래는 이 프로젝트의 확정된 설정이야.
대화할 때 이 설정을 절대 잊지 마.
============================================

## 1. 세계 (World)
${worldLayer}

## 2. 핵심 규칙 (Core Rules)
${coreRulesLayer}

## 3. 씨앗 - 세력/종족/NPC (Seeds)
${seedsLayer}

## 4. 주인공 (Hero Arc)
${heroArcLayer}

## 5. 빌런 (Villain Arc)
${villainArcLayer}

## 6. 궁극의 떡밥 (Ultimate Mystery) - 환님만 아는 비밀
${ultimateMysteryLayer}
${worldHistorySection}${simulationSection}${episodeSection}

============================================
최근 대화
============================================
${recentHistory || '(첫 대화)'}

## 환님의 현재 메시지
"${req.userMessage}"

## 응답 규칙 (필수)
1. 마크다운 서식 금지 - 볼드, 이탤릭, 제목, 목록, 인용 전부 금지
2. 반말로 말해 (동등한 창작 파트너)
3. 기술 용어 금지 - "시뮬레이션", "서사 아크", "캐릭터 씨앗" 같은 시스템 용어 쓰지 마
4. 위에 있는 세계/캐릭터/떡밥 설정을 기반으로 대화해
5. 세계관에 대해 물으면 위 설정에서 찾아서 구체적으로 답해
6. 진행 상황을 물으면 현재 단계와 다음 할 일을 알려줘
7. 수정 요청이면 어떤 부분을 어떻게 바꿀지 제안해

자연스럽게 대화해. JSON 형식으로 응답하지 마, 그냥 텍스트로 답해.`;
}

export async function POST(req: NextRequest) {
  try {
    const body: AuthorChatRequest = await req.json();
    const { layer, action, userMessage } = body;

    // novel 레이어 또는 일반 대화
    if (layer === 'novel' || action === 'conversation') {
      // 사용자 메시지가 있으면 집필 요청인지 확인
      if (userMessage) {
        const writingCheck = isWritingRequest(userMessage);

        // 집필 요청이면 write-episode 로직 실행
        if (writingCheck.isWriting) {
          console.log('\n=== WRITING REQUEST DETECTED ===');
          console.log('Message:', userMessage);
          console.log('Episode number hint:', writingCheck.episodeNumber);

          const persona = AUTHOR_PERSONA_PRESETS.find(p => p.id === body.authorPersonaId);
          const episodeNumber = writingCheck.episodeNumber || (body.episodesCount || 0) + 1;

          const systemPrompt = buildWritingSystemPrompt(persona, body.viewpoint);
          let userPrompt = buildWritingUserPrompt(body, episodeNumber);

          let result = await generateEpisodeInternal(systemPrompt, userPrompt, episodeNumber);
          let retryCount = 0;

          // 분량 검증 및 재시도
          while (
            result.episode &&
            result.episode.charCount < MIN_CHAR_COUNT &&
            retryCount < MAX_RETRY
          ) {
            console.log(`Episode too short: ${result.episode.charCount} chars. Retry ${retryCount + 1}/${MAX_RETRY}`);

            userPrompt = buildWritingUserPrompt(body, episodeNumber, true, result.episode.charCount);
            result = await generateEpisodeInternal(systemPrompt, userPrompt, episodeNumber);
            retryCount++;
          }

          if (result.episode) {
            // 분량 부족 경고
            let comment = result.authorComment;
            if (result.episode.charCount < MIN_CHAR_COUNT) {
              comment = `[분량 ${result.episode.charCount}자 - 목표 ${TARGET_MIN_CHAR}자 미달]\n\n${comment}`;
            }

            return NextResponse.json({
              message: comment || `${episodeNumber}화 초안이야. 읽어봐.`,
              episode: result.episode,
              nextEpisodePreview: result.nextEpisodePreview,
              isEpisode: true,
            });
          }

          // 파싱 실패
          return NextResponse.json({
            message: '에피소드 생성 중 문제가 생겼어. 다시 시도해볼게.',
            episode: null,
            isEpisode: false,
          });
        }

        // 피드백 메시지인지 확인
        const isFeedback = isFeedbackMessage(userMessage);
        let feedbackInfo = null;

        if (isFeedback) {
          // 피드백 분류
          const currentEpisodeNumber = body.currentEpisode?.number || body.episodesCount || 1;
          const classification = await classifyFeedback(userMessage, currentEpisodeNumber);
          feedbackInfo = {
            content: userMessage,
            type: classification.type,
            isRecurring: classification.isRecurring,
            episodeNumber: currentEpisodeNumber,
          };

          console.log('\n=== FEEDBACK DETECTED ===');
          console.log('Content:', userMessage);
          console.log('Type:', classification.type);
          console.log('Is Recurring:', classification.isRecurring);
        }

        // 일반 대화
        const prompt = buildConversationPrompt(body);

        const response = await client.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';

        return NextResponse.json({
          message: text,
          layer: null,
          isEpisode: false,
          feedback: feedbackInfo,  // 피드백 분류 정보 포함
        });
      }

      // 사용자 메시지 없이 novel 단계 진입
      return NextResponse.json({
        message: '세계 구축이 끝났어. 이제 뭘 할까? 1화 써볼까?',
        layer: null,
        isEpisode: false,
      });
    }

    const prompt = buildLayerPrompt(body);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ ...parsed, isEpisode: false });
      }
    } catch {
      return NextResponse.json({
        message: text,
        layer: null,
        isEpisode: false,
      });
    }

    return NextResponse.json({
      message: text,
      layer: null,
      isEpisode: false,
    });
  } catch (error) {
    console.error('Author chat error:', error);
    return NextResponse.json(
      { error: '작가 대화 실패', message: '문제가 생겼어. 다시 시도해볼게.' },
      { status: 500 }
    );
  }
}
