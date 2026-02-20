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

## 규칙 구축 가이드 (V2 강화판)

1. 힘의 체계
   - 이 세계의 힘은 무엇인가 (마나/기/각성/신력/기술)
   - 힘의 원천은 어디서 오는가
   - 힘의 등급은 어떻게 나뉘는가
   - 힘의 한계/대가/부작용은 무엇인가

2. 마법/능력 체계 (힘의 하위 시스템)
   - 마법/능력의 종류와 분류
   - 발동 조건
   - 상성 관계 (뭐가 뭘 이기는가)
   - 금기/금지된 마법이 있는가

3. 계급 사회
   - 누가 위에 있고 누가 아래인가
   - 계급은 어떻게 결정되는가 (혈통? 능력? 부?)
   - 계급 이동이 가능한가
   - 계급 간 갈등의 핵심
   - 피지배층은 어떻게 살아가는가

4. 전설과 신화
   - 이 세계의 창세 신화
   - 핵심 전설 1~2개 (사람들이 믿는 이야기)
   - 전설과 실제 역사의 차이
   - 예언이 있는가

5. 설화와 전승
   - 민간에 전해지는 이야기
   - 설화 속에 숨겨진 진실
   - 설화가 현재 사회에 미치는 영향 (금기, 관습)

6. 핵심 역사 사건 3~5개 (시간축)
   - 언제, 무엇이, 왜 일어났는가
   - 현재 세계에 어떤 흔적을 남겼는가
   - 사건 간 인과관계 (A 때문에 B가 일어남)

7. 세계의 의도적 모순 1~2개
   - 규칙 체계 안에 일부러 넣는 모순
   - 이 모순이 이야기의 핵심 갈등을 만든다
   - 예: "능력이 등급을 결정하는데 왜 S급이 빈민가에?"
   - 주인공의 여정과 연결되어야 한다

## 인과관계 검증 (내부적으로)
- 힘의 체계 → 계급 사회: 힘이 계급을 어떻게 결정하는가?
- 신화 → 현재: 신화가 현재 사회 구조를 어떻게 정당화하는가?
- 역사 사건 → 현재: 대사건이 현재 세력 구도를 어떻게 만들었는가?
- 모순 → 이야기: 이 모순이 주인공에게 어떤 영향을 미치는가?

JSON으로 응답:
{
  "message": "작가의 설명 (인과관계 포함)",
  "layer": {
    "powerSystem": "힘/마법 체계",
    "powerSource": "힘의 원천",
    "powerLimits": "힘의 한계/대가",
    "magicSystem": {
      "types": "종류와 분류",
      "activation": "발동 조건",
      "counters": "상성 관계",
      "forbidden": "금기 마법"
    },
    "socialHierarchy": {
      "structure": "계급 구조",
      "determinedBy": "계급 결정 요소",
      "mobility": "계급 이동성",
      "coreConflict": "계급 간 핵심 갈등",
      "underclass": "피지배층의 삶"
    },
    "legends": {
      "creationMyth": "창세 신화",
      "keyLegends": ["전설1", "전설2"],
      "legendVsHistory": "전설과 역사의 차이",
      "prophecy": "예언 (있으면)"
    },
    "folklore": {
      "tales": ["설화1", "설화2"],
      "hiddenTruths": "숨겨진 진실",
      "socialImpact": "사회적 영향"
    },
    "historyEvents": [
      { "when": "800년 전", "name": "대붕괴", "what": "고대 문명 멸망", "why": "이유", "trace": "현재 흔적" }
    ],
    "worldContradiction": [
      { "contradiction": "모순 내용", "reason": "해결 안 되는 이유", "connectionToHero": "주인공 연결" }
    ],
    "races": "종족 설명",
    "history": "핵심 역사 요약",
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

## 씨앗 가이드 (V2 강화판)

1. 생명체
   - 종족 1~3개: 이름, 특성, 거주지, 문화
   - 종족 간 관계: 동맹/적대/무관심 (역사 사건에서 기인)
   - 몬스터/마물: 생태계, 위험도, 왜 존재하는가
   - 특이 생명체 (소환수, 정령, 언데드 등)

2. 세력 3~5개
   - 이름, 목적, 영역, 리더
   - 세력 간 관계도 (동맹/적대)
   - 각 세력의 강점과 약점
   - 숨겨진 세력이 있는가 (암흑 조직, 비밀 결사)

3. 전설/신화의 구체화
   - Layer 2의 전설을 구체적 이야기로 확장
   - 전설 속 영웅의 이름, 행적, 결말
   - 전설 속 유물이 존재하는가 (어디에?)
   - 전설이 현재 어떤 세력에게 이용되고 있는가

4. 설화/전승의 구체화
   - 민간 설화를 구체적 이야기로 확장
   - 지역마다 다른 버전 (A에선 영웅, B에선 악당)
   - 설화 속 장소가 실제로 존재하는가
   - 설화를 믿는 사람들과 믿지 않는 사람들의 갈등

5. 일상의 뼈대
   - 사람들은 뭘 먹고 사는가 (경제)
   - 돈은 어떻게 버는가 (직업)
   - 아이들은 어떻게 자라는가 (교육)
   - 범죄와 치안은 어떤가
   - 종교/신앙이 있는가

6. 주요 NPC 3-5명
   - 이름, 역할, 위치, 성격
   - 숨겨진 동기 (있으면)
   - 각자의 욕망과 사정

## 인과관계 검증 (내부적으로)
- 모든 세력의 목적이 규칙(힘/계급)과 연결되는가?
- 종족 간 관계가 역사 사건에서 자연스럽게 발생하는가?
- 전설/설화가 Layer 2의 신화와 일관성이 있는가?
- 일상의 뼈대가 힘의 체계/계급에 의해 형성되는가?
- 이 세계에서 "평범한 사람의 하루"를 상상할 수 있는가?

JSON으로 응답:
{
  "message": "작가의 설명",
  "layer": {
    "factions": [{ "name": "", "nature": "", "base": "", "goal": "", "relationship": "" }],
    "races": [{ "name": "", "traits": "", "territory": "", "culture": "" }],
    "threats": [{ "name": "", "region": "", "nature": "", "dangerLevel": "" }],
    "npcs": [{ "name": "", "role": "", "location": "", "personality": "", "hiddenMotivation": "" }],
    "legendStories": [
      { "name": "전설 이름", "story": "구체적 이야기", "heroName": "영웅 이름", "artifact": "유물", "usedBy": "이용 세력" }
    ],
    "dailyLife": {
      "economy": "경제 활동",
      "jobs": "직업들",
      "education": "교육 시스템",
      "crime": "치안 상태",
      "religion": "종교/신앙"
    }
  }
}`,

    heroArc: `${baseContext}

세계: ${(req.previousLayers.world as { continentName?: string })?.continentName || ''}
힘의 체계: ${(req.previousLayers.coreRules as { powerSystem?: string })?.powerSystem || ''}
계급 구조: ${(req.previousLayers.coreRules as { socialHierarchy?: { structure?: string } })?.socialHierarchy?.structure || ''}
세력들: ${(req.previousLayers.seeds as { factions?: Array<{ name: string }> })?.factions?.map(f => f.name).join(', ') || ''}

## 임무
${req.action === 'generate_layer' ? '이 세계에서 태어난 주인공을 만들어.' : req.userMessage ? `환님 피드백: "${req.userMessage}"\n\n이 피드백에 맞춰 주인공을 수정해.` : '피드백에 맞춰 주인공을 수정해.'}
${req.currentDraft ? `\n현재 초안:\n${JSON.stringify(req.currentDraft, null, 2)}` : ''}

## 주인공 설계 가이드 (V2 강화판)

1. 기본 정보
   - 이름, 나이, 출신
   - 씨앗의 어떤 계층/세력에 속하는가
   - 어떤 환경에서 자랐는가
   - 현재 어떤 상태인가 (직업, 능력, 관계)

2. 서사의 엔진 — 욕망과 결핍 (핵심!)
   - 주인공이 가장 원하는 것 (표면적 욕망)
   - 주인공이 진짜 필요한 것 (내면적 결핍)
   - 둘의 차이가 이야기를 만든다
   - 결핍은 세계/규칙/씨앗에서 자연스럽게 발생해야 함
     "이 세계의 이 규칙 때문에 이 사람은 이게 부족하다"

3. 무기와 약점
   - 능력/재능 (규칙 체계 안에서)
   - 성격적 강점 (행동으로 드러나는 것)
   - 치명적 약점 (이것 때문에 계속 위기에 빠짐)
   - 약점은 강점의 이면이면 좋다
     예: 의리가 강함(강점) → 적에게도 정을 줌(약점)

4. 배경 인물 3~5명 (자연 발생)
   - 주인공 주변에 자연스럽게 존재하는 인물
   - 가족, 동료, 스승, 라이벌, 첫사랑 등
   - 각각: 이름 + 관계 + 주인공에게 어떤 영향
   - 이 인물들은 씨앗의 세력/계급에 소속되어 있어야 함
   - 단순 조연이 아니라 각자의 욕망과 사정이 있는 사람
   - 최소 1명은 나중에 배신하거나 떠나갈 수 있는 인물

5. 100화 서사 아크
   - 1~5화: 어디서 시작하는가 (바닥)
   - 6~20화: 첫 번째 변화 (능력/기회/위기)
   - 21~50화: 성장과 시련 (올라갔다 떨어짐)
   - 51~80화: 진짜 갈등 (세계와 충돌)
   - 81~100화: 최종 대결과 변화

## 인과관계 검증 (내부적으로)
- 주인공의 결핍이 세계 규칙에서 자연스럽게 발생하는가?
- 주인공의 능력이 힘의 체계 안에 있는가?
- 배경 인물이 씨앗의 세력에 소속되어 있는가?
- "이 세계에서만 가능한 이야기"를 살고 있는가?
- 100화까지 성장할 여지가 충분한가?

JSON으로 응답:
{
  "message": "작가의 설명",
  "layer": {
    "name": "이름",
    "age": 18,
    "origin": "태생",
    "faction": "소속 세력/계층",
    "environment": "자란 환경",
    "currentStatus": "현재 상태",
    "coreNarrative": "핵심 서사",
    "initialState": "시작 상태",
    "ultimateGoal": "궁극적 목표",
    "desire": "표면적 욕망",
    "deficiency": "내면적 결핍",
    "abilities": ["능력1", "능력2"],
    "strengths": ["강점1", "강점2"],
    "fatalWeakness": "치명적 약점",
    "supportingCharacters": [
      { "name": "이름", "relation": "관계", "faction": "소속", "influence": "영향", "ownDesire": "자신의 욕망", "potentialBetrayal": false }
    ],
    "narrativeArc100": {
      "phase1_5": "바닥에서 시작",
      "phase6_20": "첫 변화",
      "phase21_50": "성장과 시련",
      "phase51_80": "진짜 갈등",
      "phase81_100": "최종 대결"
    }
  }
}`,

    villainArc: `${baseContext}

세계: ${(req.previousLayers.world as { continentName?: string })?.continentName || ''}
세계의 모순: ${JSON.stringify((req.previousLayers.coreRules as { worldContradiction?: unknown[] })?.worldContradiction) || '없음'}
세력들: ${(req.previousLayers.seeds as { factions?: Array<{ name: string }> })?.factions?.map(f => f.name).join(', ') || ''}
주인공: ${(req.previousLayers.heroArc as { name?: string; coreNarrative?: string })?.name || ''} - ${(req.previousLayers.heroArc as { coreNarrative?: string })?.coreNarrative || ''}
주인공 욕망: ${(req.previousLayers.heroArc as { desire?: string })?.desire || ''}
주인공 결핍: ${(req.previousLayers.heroArc as { deficiency?: string })?.deficiency || ''}

## 임무
${req.action === 'generate_layer' ? '대립 구도를 만들어. 빌런 + 제3세력으로 삼각 구도를 만들어.' : req.userMessage ? `환님 피드백: "${req.userMessage}"\n\n이 피드백에 맞춰 대립 구도를 수정해.` : '피드백에 맞춰 대립 구도를 수정해.'}
${req.currentDraft ? `\n현재 초안:\n${JSON.stringify(req.currentDraft, null, 2)}` : ''}

## 대립 구도 설계 가이드 (V2 강화판 — 삼각 구도)

### 핵심 원칙
기존: 주인공 vs 빌런 (1:1 구도)
변경: 주인공 vs 빌런 vs 제3세력 (최소 삼각 구도)

왜?
- 1:1 구도는 100화에서 단조로워진다
- 삼각 구도면 동맹이 바뀌고 예측이 어려워진다
- "적의 적은 아군"이 되었다가 다시 적이 되는 구조
- 독자가 "누구 편을 들어야 하지?"라고 고민하게 만든다

### 1. 메인 빌런
- 이름, 나이, 출신, 소속 세력
- 표면적 목표
- 이렇게 된 이유 (과거의 상처/경험)
- 빌런의 관점에서 자신은 정당한가? (YES여야 함)
- "이 세계의 이 규칙이 나를 이렇게 만들었다"
- 빌런 측 인물 2~3명 (충성하는 부하, 배신할 동료, 과거의 은인)

### 2. 제3세력 (또 다른 대립축)
- 세력 이름, 리더, 목적
- 주인공과 어떤 관계인가 (동맹? 이용? 감시?)
- 빌런과 어떤 관계인가 (적대? 경쟁? 공생?)
- 이 세력만의 논리 (이들도 자기 관점에서 정당)
- 이야기에 개입하는 시점
- 제3세력 측 인물 2~3명 (리더, 내부 분열 인물, 주인공과 개인적 연결)

삼각 구도 예시:
  주인공(약자, 자유를 원함)
  빌런(기득권, 질서를 원함)
  제3세력(혁명가, 파괴를 원함)
  → 주인공은 빌런의 질서도 싫고 제3세력의 파괴도 싫다
  → 때로는 제3세력과 손잡아야 빌런을 이길 수 있다
  → 동맹이 계속 바뀐다

### 3. 관계 설계
- 주인공 vs 빌런: 어디서 충돌? 왜 화해 불가? 공통점은?
- 주인공 vs 제3세력: 왜 완전한 동맹이 될 수 없는가?
- 빌런 vs 제3세력: 이 둘이 손잡는 순간이 있는가?

### 4. 대립 구도 변화 로드맵 (100화)
1~10화:   주인공 vs 세계 (아직 적이 보이지 않음)
11~25화:  주인공 vs 빌런 (메인 갈등 시작)
26~40화:  제3세력 등장 (구도 변화)
41~55화:  주인공 + 제3세력 vs 빌런 (임시 동맹)
56~70화:  동맹 붕괴 + 삼파전
71~85화:  빌런 + 제3세력 vs 주인공 (최악의 위기)
86~100화: 최종 구도 재편 + 결말
핵심: "동맹이 한 번 이상 바뀐다"

## 검증 (내부적으로)
- 빌런의 관점에서 읽어도 납득이 되는가?
- 제3세력의 관점에서 읽어도 납득이 되는가?
- 세 세력 모두 "이 세계에서만 가능한 갈등"을 하고 있는가?
- 독자가 "누구 편을 들어야 하지?"라고 고민하는가?

JSON으로 응답:
{
  "message": "작가의 설명",
  "layer": {
    "name": "빌런 이름",
    "age": 35,
    "origin": "태생",
    "faction": "소속 세력",
    "surfaceGoal": "표면적 목표",
    "motivation": "동기",
    "selfJustification": "자기 정당화",
    "worldMadeMe": "이 세계가 나를 이렇게 만들었다",
    "coreNarrative": "핵심 서사",
    "relationship": "주인공과의 관계",
    "supportingCharacters": [
      { "name": "이름", "role": "역할", "ownDesire": "욕망" }
    ],
    "thirdForce": {
      "name": "제3세력 이름",
      "leader": "리더",
      "goal": "목적",
      "logic": "이들의 논리",
      "vsHero": "주인공과의 관계",
      "vsVillain": "빌런과의 관계",
      "entryPoint": "등장 시점",
      "supportingCharacters": [
        { "name": "이름", "role": "역할", "ownDesire": "욕망" }
      ]
    },
    "vsHero": "주인공과 어디서 충돌하나",
    "whyNoReconcile": "왜 화해할 수 없는가",
    "commonGround": "공통점",
    "conflictRoadmap": {
      "phase1_10": "주인공 vs 세계",
      "phase11_25": "주인공 vs 빌런",
      "phase26_40": "제3세력 등장",
      "phase41_55": "임시 동맹",
      "phase56_70": "삼파전",
      "phase71_85": "최악의 위기",
      "phase86_100": "최종 결말"
    }
  }
}`,

    ultimateMystery: `${baseContext}

세계: ${(req.previousLayers.world as { continentName?: string })?.continentName || ''}
역사: ${(req.previousLayers.coreRules as { history?: string })?.history || ''}
세계의 모순: ${JSON.stringify((req.previousLayers.coreRules as { worldContradiction?: unknown[] })?.worldContradiction) || '없음'}
전설/설화: ${JSON.stringify((req.previousLayers.coreRules as { legends?: unknown })?.legends) || '없음'}
주인공: ${(req.previousLayers.heroArc as { name?: string })?.name || ''} - ${(req.previousLayers.heroArc as { coreNarrative?: string })?.coreNarrative || ''}
빌런: ${(req.previousLayers.villainArc as { name?: string })?.name || ''} - ${(req.previousLayers.villainArc as { motivation?: string })?.motivation || ''}
제3세력: ${(req.previousLayers.villainArc as { thirdForce?: { name?: string } })?.thirdForce?.name || '없음'}
대립 로드맵: ${JSON.stringify((req.previousLayers.villainArc as { conflictRoadmap?: unknown })?.conflictRoadmap) || '없음'}

## 임무
${req.action === 'generate_layer' ? '이 이야기의 떡밥 + 독자 감정 설계를 만들어.' : req.userMessage ? `환님 피드백: "${req.userMessage}"\n\n이 피드백에 맞춰 떡밥을 수정해.` : '피드백에 맞춰 떡밥을 수정해.'}
${req.currentDraft ? `\n현재 초안:\n${JSON.stringify(req.currentDraft, null, 2)}` : ''}

## 떡밥 + 감정 설계 가이드 (V2 강화판)

=== Part A: 떡밥 설계 ===

### 1. 궁극의 떡밥 (최종 반전)
- 100화에 밝혀질 가장 큰 비밀
- 이것이 밝혀지면 세계/규칙/캐릭터의 의미가 뒤집힌다
- 1화부터 흔적이 깔려야 한다
- 독자가 다시 읽으면 "아, 그래서 그랬구나"가 되어야 한다

### 2. 중간 떡밥 3~5개 (세부 반전)
- 20화, 40화, 60화, 80화 근처에서 터지는 반전
- 각 반전은 궁극의 떡밥과 연결
- 독자는 중간 반전으로 궁극을 예감하지만 정확히 예측할 수 없다

### 3. 떡밥 설계 원칙
숨기기:
- 떡밥은 "당연한 배경"으로 위장
- 사소한 디테일에 숨긴다
- 설화/전설/일상 속에 녹인다

예상은 가능, 예측은 불가:
- 독자가 "뭔가 이상하다"고 느낄 수 있다 → OK
- 독자가 정확히 맞출 수 있다 → NG
- 미스디렉션(거짓 단서), 반만 보여주기

카타르시스:
- 반전 = 단순 놀라움이 아니라 감정적 충격
- "세상에, 그 사람이?" (배신)
- "그래서 그랬던 거야..." (이해)
- "처음부터 다 계획된 거였어" (전율)

### 4. 떡밥 연결망
떡밥은 독립적이지 않다. 서로 엮인다.
- 떡밥 A가 터지면서 떡밥 B의 단서가 나온다
- 떡밥 B가 터지면서 떡밥 C가 의심된다
- 마지막에 전부 하나로 합쳐지면서 궁극의 떡밥이 터진다

### 5. 떡밥 ↔ 레이어 연결
모든 떡밥은 Layer 1~5 어딘가에 뿌리를 둔다:
- 세계에 숨긴 떡밥 (특정 장소의 비밀)
- 규칙에 숨긴 떡밥 (힘의 체계의 숨겨진 진실)
- 역사에 숨긴 떡밥 (대사건의 진짜 원인)
- 모순에 숨긴 떡밥 (세계의 모순이 사실은 누군가의 의도)
- 주인공/빌런/제3세력에 숨긴 떡밥

=== Part B: 독자 감정 로드맵 ===

100화에 걸쳐 독자가 느낄 감정을 설계해.
이것이 떡밥, 서사 아크, 클리프행어를 하나로 정렬한다.

1~5화: 호기심 + 동정 ("이 사람 불쌍하다, 근데 뭔가 있다")
6~15화: 응원 + 기대 ("올라가기 시작했다, 더 해줘")
16~25화: 통쾌 + 첫 번째 의문 ("시원하다, 근데 이거 뭐지?")
26~40화: 불안 + 의심 ("뭔가 이상하다, 저 사람 괜찮나?")
41~55화: 충격 + 분노 ("배신이야, 이럴 수가")
56~70화: 혼란 + 공감 ("빌런 말도 맞는데..., 뭐가 옳은 거지?")
71~85화: 절망 + 희망 ("이제 끝인가, 아니 아직...")
86~100화: 전율 + 카타르시스 ("소름, 처음부터 이거였어")

### 감정 설계 원칙
- 같은 감정이 20화 이상 지속되면 안 된다
- 올린 다음에 반드시 떨어뜨린다
- 떨어뜨린 다음에 더 높이 올린다
- 감정 곡선이 예측 가능하면 안 된다

### 감정 ↔ 떡밥 연결
각 떡밥이 터지는 시점의 독자 감정을 미리 설계:
- 독자가 안심하고 있을 때 배신 떡밥 → 충격 최대
- 독자가 절망하고 있을 때 희망 떡밥 → 카타르시스 최대

이건 환님만 알고 있어야 해. 독자는 끝까지 몰라.

JSON으로 응답:
{
  "message": "작가의 설명",
  "layer": {
    "surface": "표면적으로 보이는 것",
    "truth": "실제 진실",
    "hints": ["힌트1", "힌트2", "힌트3"],
    "revealTiming": "밝혀지는 시점/방법",
    "rereadValue": "다시 읽으면 느낄 포인트",
    "middleTwists": [
      {
        "name": "떡밥 이름",
        "truth": "실제 진실",
        "disguise": "위장 방법",
        "revealEpisode": 40,
        "readerEmotion": "터졌을 때 감정",
        "connectionToUltimate": "궁극 떡밥과 연결",
        "hintPlacement": { "early": "초반 힌트", "middle": "미스디렉션", "late": "진짜 단서" }
      }
    ],
    "twistConnections": "떡밥 A→B→C→궁극 연결 설명",
    "emotionRoadmap": {
      "phase1_5": "호기심 + 동정",
      "phase6_15": "응원 + 기대",
      "phase16_25": "통쾌 + 첫 의문",
      "phase26_40": "불안 + 의심",
      "phase41_55": "충격 + 분노",
      "phase56_70": "혼란 + 공감",
      "phase71_85": "절망 + 희망",
      "phase86_100": "전율 + 카타르시스"
    }
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
