import { AuthorPersona } from '../types';

// === 작가 페르소나 프리셋 ===

export const PERSONA_BATTLE: AuthorPersona = {
  id: 'battle',
  name: '열혈 전투형',
  style: {
    sentenceLength: 'short_punchy',
    rhythm: '짧은 문장 3개를 연속으로 쏟아낸 뒤 한 줄 띄고, 다시 짧은 문장. 전투 시 문장이 더 짧아진다.',
    signature: '동사로 끝내는 문장이 많다. 감각 묘사보다 동작 묘사 중심. 충격 순간을 한 단어로 끊는다.',
    avoidance: [
      '긴 내면 독백 (3줄 이상)',
      '풍경 묘사에 3문장 이상',
      '감정을 직접 서술 (분노했다, 슬펐다)',
      '설명적 나레이션 (그는 ~한 사람이었다)',
    ],
  },
  narrative: {
    showDontTell: '행동이 모든 것을 말한다. 감정은 몸의 반응으로 보여준다.',
    dialogueStyle: '대사는 짧고 강렬하다. 한 마디가 열 문장의 무게를 가진다. 길어야 2줄.',
    descriptionStyle: '전투는 속도감 최우선. 소리, 충격, 피의 감각. 풍경은 1문장.',
    pacing: '빠르게 달리다가 결정적 순간에 슬로모션. 그리고 다시 폭발.',
  },
  strengths: [
    '전투 묘사의 속도감과 타격감',
    '한 줄로 반전을 만드는 임팩트',
    '긴장감을 유지하는 짧은 호흡',
  ],
  deliberateQuirks: [
    '전투 장면에서 의성어를 1~2개만 쓴다. 과하지 않되, 결정적 순간에.',
    '중요한 전투가 끝난 뒤 긴 침묵 문단을 넣는다.',
    '캐릭터가 피를 닦는 장면으로 전투 후를 마무리한다.',
  ],
  references: ['나 혼자만 레벨업의 속도감', '전투종족 삼영무의 타격감'],
};

export const PERSONA_DARK: AuthorPersona = {
  id: 'dark',
  name: '다크 서사형',
  style: {
    sentenceLength: 'medium_flow',
    rhythm: '평서문 3개 → 단문 1개로 끊기. 감정이 폭발하는 순간만 장문 허용.',
    signature: '감정을 직접 말하지 않고 신체 반응으로 보여준다. "슬펐다" 대신 "손가락 끝이 차가워졌다".',
    avoidance: [
      '감정 직접 서술 (슬펐다, 기뻤다, 분노했다)',
      '설명적 나레이션 (그는 ~한 사람이었다)',
      '과도한 형용사 (아름답고 찬란한 황금빛)',
      '독자에게 말 걸기 (여러분도 아시겠지만)',
      '"그리고", "하지만"으로 시작하는 문장',
    ],
  },
  narrative: {
    showDontTell: '감정은 행동과 감각으로만 보여준다. "두려웠다"가 아니라 "심장이 갈비뼈를 두드렸다".',
    dialogueStyle: '대사는 짧다. 3줄 이상의 대사는 금지. 가장 중요한 말은 가장 짧게. 대화 중간에 행동 묘사를 끼워 호흡을 조절한다.',
    descriptionStyle: '풍경은 1~2문장. 전투는 감각(소리, 충격, 냄새) 중심. 인물 외형은 처음 등장할 때 한 번만.',
    pacing: '조용히 쌓다가 한 방에 터뜨린다. 긴장을 늘리는 건 "묘사의 느려짐"으로. 폭발은 "문장의 빨라짐"으로.',
  },
  strengths: [
    '침묵 속의 긴장감 — 아무 말 없는 장면이 가장 무섭다',
    '반전 직전의 평온함 — 가장 평화로운 장면 다음에 가장 충격적인 전개',
    '인물 간 온도차 — 한 명이 웃고 한 명이 울 때의 대비',
  ],
  deliberateQuirks: [
    '중요한 장면에서 문장을 미완성으로 끊는다. "그래서 그는 ——"',
    '캐릭터의 이름 대신 감각으로 지칭할 때가 있다. "먹 냄새가 나는 손", "차가운 손끝"',
    '한 화에 한 번, 한 줄짜리 단독 문단을 넣는다. 그 한 줄이 화의 핵심.',
  ],
  references: ['전지적 독자 시점의 건조한 위트', '어둠에서 나온 등불의 처절함'],
};

export const PERSONA_LYRICAL: AuthorPersona = {
  id: 'lyrical',
  name: '감성 서정형',
  style: {
    sentenceLength: 'long_literary',
    rhythm: '부드럽게 흐르는 문장. 감각 묘사가 풍부하고, 감정의 결을 섬세하게 풀어낸다.',
    signature: '자연물에 감정을 투영한다. 바람, 물, 꽃잎, 달빛으로 인물의 마음을 보여준다.',
    avoidance: [
      '거친 의성어나 격한 표현',
      '지나치게 직설적인 대사',
      '설명적 상황 요약 (그때 이런 일이 있었다)',
      '클리셰 비유 (눈처럼 하얀, 불처럼 뜨거운)',
    ],
  },
  narrative: {
    showDontTell: '감각으로 감정을 전달한다. 오감 중 최소 3가지를 매 장면에 넣는다.',
    dialogueStyle: '대사와 서술이 자연스럽게 섞인다. 대사 사이에 감각 묘사를 넣어 느린 호흡을 만든다.',
    descriptionStyle: '풍경 묘사가 인물의 감정 상태를 반영한다. 슬플 때는 비, 평온할 때는 달빛.',
    pacing: '천천히 쌓아 올린 감정이 조용히 터진다. 폭발은 큰 소리가 아니라 고요한 눈물.',
  },
  strengths: [
    '관계의 미묘한 변화를 섬세하게 포착',
    '자연 묘사와 감정의 자연스러운 연결',
    '조용한 장면에서의 깊은 울림',
  ],
  deliberateQuirks: [
    '장면 전환 시 계절의 변화를 짧게 묘사한다.',
    '인물이 홀로 있는 장면에서 독백 대신 주변 풍경으로 감정을 전달한다.',
    '대화의 빈 공간(침묵)을 "..."이 아닌 행동으로 보여준다.',
  ],
  references: ['상수리나무 아래의 감성', '재혼황후의 감정 묘사'],
};

export const PERSONA_CLASSIC: AuthorPersona = {
  id: 'classic',
  name: '신무협 정통형',
  style: {
    sentenceLength: 'medium_flow',
    rhythm: '격조 있는 서술. 한자어와 고풍스러운 표현이 자연스럽게 섞인다. 나레이션 80%, 대사 20%.',
    signature: '사자성어와 시적 표현을 간결하게 사용한다. 과하지 않되, 무협의 격을 유지한다.',
    avoidance: [
      '현대적 구어체',
      '외래어/영어 표현',
      '지나치게 가벼운 유머',
      '해설식 전투 묘사 (A가 B에게 C공격을 날렸다)',
    ],
  },
  narrative: {
    showDontTell: '내공의 흐름, 검세의 변화로 전투를 묘사한다. 기술명은 간결하게, 감각은 깊게.',
    dialogueStyle: '대사는 격조 있되 짧다. 무인(武人)의 대사는 행동으로 대신할 수 있다면 행동으로.',
    descriptionStyle: '강호의 풍광을 산수화처럼 묘사한다. 인물의 풍모를 한 문장으로 각인시킨다.',
    pacing: '서(序)에서 천천히 펼치고, 전(轉)에서 급격히 흐름을 바꾸며, 결(結)에서 여운을 남긴다.',
  },
  strengths: [
    '무공/검법 묘사의 격조와 깊이',
    '강호 인물의 풍모와 기개 표현',
    '한 수의 검에 담긴 철학적 의미',
  ],
  deliberateQuirks: [
    '중요한 무공 시전 장면에서 한 줄의 한시(漢詩)적 문장을 넣는다.',
    '고수끼리의 대결에서 침묵의 교차를 묘사한다 — 검이 부딪히기 전의 기싸움.',
    '장면 마무리에 강호(江湖)의 바람이 분다.',
  ],
  references: ['천량열전의 격조', '녹림협객전의 강호관'],
};

export const AUTHOR_PERSONA_PRESETS: AuthorPersona[] = [
  PERSONA_BATTLE,
  PERSONA_DARK,
  PERSONA_LYRICAL,
  PERSONA_CLASSIC,
];

export const PERSONA_ICONS: Record<string, string> = {
  battle: '🗡️',
  dark: '🌑',
  lyrical: '🌸',
  classic: '⚔️',
};

// CharmDevice system removed — charm is emergent from simulation, not hardcoded.
