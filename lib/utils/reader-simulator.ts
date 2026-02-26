/**
 * Meta Reader Simulator (Task 3.2)
 * 가상 독자 시뮬레이션 및 댓글 생성
 */

import type {
  Episode,
  EpisodeLog,
  ReaderPersona,
  ReaderPersonaType,
  SimulatedComment,
  ReaderReactionSummary,
} from '@/lib/types';

// 기본 독자 페르소나
export const DEFAULT_READER_PERSONAS: ReaderPersona[] = [
  {
    id: 'casual-reader',
    type: 'casual',
    name: '정주행러',
    preferences: {
      pacingPreference: 'fast',
      romanceInterest: 50,
      actionInterest: 70,
      mysteryInterest: 60,
      characterDepthImportance: 40,
    },
    reactionStyle: 'enthusiastic',
  },
  {
    id: 'hardcore-fan',
    type: 'hardcore',
    name: '초고수 독자',
    preferences: {
      pacingPreference: 'moderate',
      romanceInterest: 40,
      actionInterest: 80,
      mysteryInterest: 70,
      characterDepthImportance: 80,
    },
    reactionStyle: 'analytical',
  },
  {
    id: 'critic',
    type: 'critic',
    name: '까다로운 평론가',
    preferences: {
      pacingPreference: 'slow',
      romanceInterest: 30,
      actionInterest: 50,
      mysteryInterest: 80,
      characterDepthImportance: 90,
    },
    reactionStyle: 'critical',
  },
  {
    id: 'shipper',
    type: 'shipper',
    name: '커플러',
    preferences: {
      pacingPreference: 'moderate',
      romanceInterest: 95,
      actionInterest: 40,
      mysteryInterest: 50,
      characterDepthImportance: 70,
    },
    reactionStyle: 'emotional',
  },
  {
    id: 'worldbuilder',
    type: 'worldbuilder',
    name: '설정덕후',
    preferences: {
      pacingPreference: 'slow',
      romanceInterest: 20,
      actionInterest: 60,
      mysteryInterest: 95,
      characterDepthImportance: 85,
    },
    reactionStyle: 'analytical',
  },
];

// 감정 키워드 매핑
const EMOTION_KEYWORDS: Record<string, string[]> = {
  excitement: ['대박', '미쳤다', '소름', '역대급', '레전드'],
  satisfaction: ['좋다', '재밌다', '만족', '최고', '잘 읽었'],
  frustration: ['답답', '왜', '언제', '빨리', '짜증'],
  sadness: ['슬프', '눈물', '아프', '마음이', '울었'],
  curiosity: ['궁금', '다음화', '어떻게 될', '혹시', '예상'],
  anger: ['화나', '짜증', '열받', '미워', '왜 이러'],
};

// 댓글 템플릿
const COMMENT_TEMPLATES: Record<ReaderPersonaType, string[]> = {
  casual: [
    '와 {highlight} 진짜 미쳤다 ㅋㅋㅋ',
    '{highlight} 개쩔어 ㄷㄷ',
    '다음화 언제요?? 너무 궁금해요',
    '이거 정주행 각이다',
    '{highlight} 장면 레전드 ㅋㅋㅋ',
  ],
  hardcore: [
    '{highlight} 부분에서 복선이 느껴지네요. {prediction}일 것 같습니다.',
    '이 전개라면 {prediction}가 될 가능성이 높아 보입니다.',
    '{highlight} 설정이 잘 짜여있네요. 특히 {detail}이 좋았습니다.',
    '캐릭터 성장 곡선이 적절하게 그려지고 있네요.',
    '작가님 필력 대단합니다. {highlight} 묘사가 특히 좋았어요.',
  ],
  critic: [
    '{highlight}은 좋았으나, {concern}는 조금 아쉽네요.',
    '전체적으로 무난하나 {concern} 부분은 개선이 필요해 보입니다.',
    '{highlight}의 개연성이 부족합니다. {suggestion}하면 더 좋았을 것 같아요.',
    '페이스 조절이 {concern}. 좀 더 {suggestion}하면 좋겠습니다.',
    '캐릭터 일관성 측면에서 {concern}가 눈에 띕니다.',
  ],
  shipper: [
    '{character1}x{character2} 떡밥 주세요 제발!!!',
    '둘이 눈 마주치는 장면에서 심장 터질 뻔 ㅠㅠ',
    '로맨스 언제 시작해요?? 기다리다 지쳐요',
    '{character1} 너무 좋아... 주인공 찐이다',
    '이 둘 케미 미쳤어 진짜... 작가님 감사합니다',
  ],
  worldbuilder: [
    '{setting}에 대해 더 설명해주시면 좋겠어요. {question}',
    '이 세계관의 {setting} 시스템이 궁금합니다. {prediction}인가요?',
    '{setting} 설정 정말 신선하네요. 혹시 {question}?',
    '능력 체계가 체계적이네요. {detail} 부분이 특히 잘 짜여있어요.',
    '떡밥 회수가 깔끔합니다. {setting} 관련해서 더 보고 싶어요.',
  ],
};

/**
 * 에피소드 분석 및 하이라이트 추출
 */
function analyzeEpisode(episode: Episode, episodeLog?: EpisodeLog): {
  highlights: string[];
  concerns: string[];
  characters: string[];
  settings: string[];
  emotionalPeaks: string[];
} {
  const content = episode.editedContent || episode.content;

  // 하이라이트 추출 (각 장면의 핵심)
  const highlights: string[] = [];
  if (episodeLog?.scenes) {
    episodeLog.scenes.forEach(scene => {
      highlights.push(scene.event);
    });
  }

  // 감정적 절정 찾기
  const emotionalPeaks: string[] = [];
  Object.entries(EMOTION_KEYWORDS).forEach(([emotion, keywords]) => {
    keywords.forEach(kw => {
      if (content.includes(kw)) {
        emotionalPeaks.push(emotion);
      }
    });
  });

  // 캐릭터 이름 추출 (대화 패턴에서)
  const characters: string[] = [];
  if (episodeLog?.scenes) {
    episodeLog.scenes.forEach(scene => {
      characters.push(...scene.characters);
    });
  }
  const uniqueCharacters = [...new Set(characters)];

  // 우려 사항 (기본 패턴)
  const concerns: string[] = [];
  if (content.length < 4000) {
    concerns.push('분량이 좀 짧아요');
  }
  if (content.length > 8000) {
    concerns.push('분량이 많아서 읽기 힘들어요');
  }

  // 설정 관련
  const settings: string[] = [];
  if (episodeLog?.breadcrumbActivity?.newlyPlanted) {
    settings.push(...episodeLog.breadcrumbActivity.newlyPlanted);
  }

  return {
    highlights: highlights.length > 0 ? highlights : ['이번 화'],
    concerns,
    characters: uniqueCharacters.length > 0 ? uniqueCharacters : ['주인공'],
    settings: settings.length > 0 ? settings : ['세계관'],
    emotionalPeaks: [...new Set(emotionalPeaks)],
  };
}

/**
 * 특정 페르소나의 댓글 생성
 */
export function generateComment(
  persona: ReaderPersona,
  episode: Episode,
  episodeLog?: EpisodeLog
): SimulatedComment {
  const analysis = analyzeEpisode(episode, episodeLog);
  const templates = COMMENT_TEMPLATES[persona.type];
  const template = templates[Math.floor(Math.random() * templates.length)];

  // 템플릿 채우기
  let content = template
    .replace('{highlight}', analysis.highlights[0] || '이 장면')
    .replace('{concern}', analysis.concerns[0] || '페이스')
    .replace('{character1}', analysis.characters[0] || '주인공')
    .replace('{character2}', analysis.characters[1] || '상대방')
    .replace('{setting}', analysis.settings[0] || '이 세계')
    .replace('{prediction}', '복선 회수')
    .replace('{detail}', '묘사')
    .replace('{question}', '더 자세한 설명이 나올까요?')
    .replace('{suggestion}', '조금 더 천천히');

  // 감정 분석
  let sentiment: SimulatedComment['sentiment'] = 'neutral';
  if (analysis.emotionalPeaks.includes('excitement') || analysis.emotionalPeaks.includes('satisfaction')) {
    sentiment = 'positive';
  } else if (analysis.emotionalPeaks.includes('frustration') || analysis.emotionalPeaks.includes('anger')) {
    sentiment = 'negative';
  } else if (analysis.emotionalPeaks.length > 2) {
    sentiment = 'mixed';
  }

  // 페르소나별 조정
  if (persona.type === 'critic') {
    sentiment = analysis.concerns.length > 0 ? 'mixed' : 'positive';
  } else if (persona.type === 'casual' || persona.type === 'shipper') {
    sentiment = 'positive'; // 일반적으로 긍정적
  }

  // 예측 생성
  const predictions: string[] = [];
  if (episodeLog?.unresolvedTensions) {
    predictions.push(`${episodeLog.unresolvedTensions[0]}이(가) 곧 해결될 것 같아요`);
  }

  // 별점 계산
  let rating: number | undefined;
  if (persona.reactionStyle === 'critical') {
    rating = sentiment === 'positive' ? 4 : sentiment === 'negative' ? 2 : 3;
  } else if (persona.reactionStyle === 'enthusiastic') {
    rating = sentiment === 'positive' ? 5 : 4;
  }

  return {
    id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    episodeNumber: episode.number,
    readerPersona: persona,
    content,
    sentiment,
    highlights: analysis.highlights,
    concerns: analysis.concerns,
    predictions,
    rating,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 여러 페르소나의 댓글 생성
 */
export function generateMultipleComments(
  episode: Episode,
  episodeLog?: EpisodeLog,
  count: number = 5
): SimulatedComment[] {
  const personas = DEFAULT_READER_PERSONAS;
  const comments: SimulatedComment[] = [];

  // 각 페르소나에서 댓글 생성
  const shuffled = [...personas].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    comments.push(generateComment(shuffled[i], episode, episodeLog));
  }

  return comments;
}

/**
 * 독자 반응 요약 생성
 */
export function generateReactionSummary(
  episode: Episode,
  episodeLog?: EpisodeLog,
  commentCount: number = 10
): ReaderReactionSummary {
  const comments = generateMultipleComments(episode, episodeLog, commentCount);

  // 감정 점수 계산
  let sentimentScore = 0;
  comments.forEach(c => {
    if (c.sentiment === 'positive') sentimentScore += 25;
    else if (c.sentiment === 'negative') sentimentScore -= 25;
    else if (c.sentiment === 'mixed') sentimentScore += 5;
  });
  const overallSentiment = Math.max(-100, Math.min(100, sentimentScore));

  // 하이라이트/우려 집계
  const highlightCounts: Record<string, number> = {};
  const concernCounts: Record<string, number> = {};

  comments.forEach(c => {
    c.highlights.forEach(h => {
      highlightCounts[h] = (highlightCounts[h] || 0) + 1;
    });
    c.concerns.forEach(cn => {
      concernCounts[cn] = (concernCounts[cn] || 0) + 1;
    });
  });

  const topHighlights = Object.entries(highlightCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h]) => h);

  const topConcerns = Object.entries(concernCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);

  // 이탈 위험 계산
  const negativeCount = comments.filter(c => c.sentiment === 'negative').length;
  const predictedDropoffRisk = Math.min(100, negativeCount * 20);

  // 개선 제안
  const suggestedImprovements: string[] = [];
  if (topConcerns.includes('분량이 좀 짧아요')) {
    suggestedImprovements.push('분량을 5,000자 이상으로 늘려보세요.');
  }
  if (predictedDropoffRisk > 40) {
    suggestedImprovements.push('독자 이탈 위험이 있습니다. 보상 요소를 추가해보세요.');
  }
  if (overallSentiment < 30) {
    suggestedImprovements.push('전반적인 독자 반응이 미온적입니다. 임팩트 있는 장면을 추가해보세요.');
  }

  return {
    episodeNumber: episode.number,
    overallSentiment,
    topHighlights,
    topConcerns,
    predictedDropoffRisk,
    suggestedImprovements,
    comments,
  };
}

/**
 * 페르소나별 만족도 계산
 */
export function calculatePersonaSatisfaction(
  episode: Episode,
  persona: ReaderPersona
): number {
  const content = episode.editedContent || episode.content;
  let score = 50;

  // 페이스 선호도 반영
  const charCount = content.length;
  if (persona.preferences.pacingPreference === 'fast' && charCount < 5000) {
    score += 10;
  } else if (persona.preferences.pacingPreference === 'slow' && charCount > 6000) {
    score += 10;
  }

  // 로맨스 관심도 반영
  const romanceKeywords = ['사랑', '마음', '두근', '설레', '키스', '포옹'];
  const romanceCount = romanceKeywords.filter(kw => content.includes(kw)).length;
  score += (romanceCount * 5 * persona.preferences.romanceInterest) / 100;

  // 액션 관심도 반영
  const actionKeywords = ['검', '칼', '싸움', '전투', '공격', '방어', '피'];
  const actionCount = actionKeywords.filter(kw => content.includes(kw)).length;
  score += (actionCount * 5 * persona.preferences.actionInterest) / 100;

  // 미스터리 관심도 반영
  const mysteryKeywords = ['비밀', '진실', '숨겨', '의문', '미스터리', '단서'];
  const mysteryCount = mysteryKeywords.filter(kw => content.includes(kw)).length;
  score += (mysteryCount * 5 * persona.preferences.mysteryInterest) / 100;

  return Math.min(100, Math.round(score));
}
