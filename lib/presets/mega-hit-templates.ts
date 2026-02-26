/**
 * Mega Hit Templates (Task 3.3)
 * 인기 장르별 황금 공식 템플릿
 */

import type { MegaHitTemplate, MegaHitTemplateCategory } from '@/lib/types';

export const MEGA_HIT_TEMPLATES: MegaHitTemplate[] = [
  // 회귀물 템플릿
  {
    id: 'regression-template',
    category: 'regression',
    name: '회귀물 황금 공식',
    description: '인생 막장에서 과거로 회귀, 이번 생에는 제대로 산다',
    keyElements: {
      protagonist: {
        commonTraits: [
          '이전 생에서 배신당함',
          '비참한 최후를 맞음',
          '회귀 후 냉정해짐',
          '이번엔 다르게 산다는 결의',
        ],
        goldenHook: '죽음 직전 가장 약했던 시점으로 회귀',
        avoidTraits: [
          '너무 착한 성격 유지',
          '똑같은 실수 반복',
          '회귀 사실을 쉽게 발설',
        ],
      },
      worldSetup: {
        essentialRules: [
          '회귀 전 세계와 동일한 설정',
          '미래 지식이 유용한 구조',
          '과거에 놓친 기회들 존재',
        ],
        conflictSources: [
          '배신자들과의 재회',
          '미래 지식 vs 나비효과',
          '달라진 자신 vs 주변의 기대',
        ],
      },
      plotStructure: {
        openingPattern: '비참한 죽음 장면으로 시작 → 과거로 회귀',
        firstArcMilestones: [
          '회귀 인지 및 적응',
          '첫 번째 미래 지식 활용',
          '이전 생 배신자 식별',
          '자신만의 세력 구축 시작',
        ],
        tensionEscalation: [
          '미래가 조금씩 달라지기 시작',
          '새로운 적 등장 (나비효과)',
          '이전 생 기억과 현재의 충돌',
        ],
      },
      hookPatterns: {
        chapter1Hook: '죽음의 순간 눈을 떴다. 10년 전이었다.',
        chapter5Hook: '이번엔 내가 먼저 움직인다. 배신자들을 향해.',
        arcEndingPattern: '과거를 바꿨지만, 더 큰 위기가 기다린다',
      },
    },
    successExamples: [
      '전지적 독자 시점',
      '화산귀환',
      '나 혼자만 레벨업',
      '회귀자 사용설명서',
    ],
    commonMistakes: [
      '회귀 후에도 수동적인 태도 유지',
      '미래 지식을 너무 쉽게 활용',
      '이전 생 트라우마 무시',
      '성장 곡선 없이 즉시 강해짐',
    ],
    estimatedAppeal: 95,
  },

  // 빙의물 템플릿
  {
    id: 'possession-template',
    category: 'possession',
    name: '빙의물 황금 공식',
    description: '소설/게임 속 캐릭터에 빙의, 파멸 엔딩을 피하라',
    keyElements: {
      protagonist: {
        commonTraits: [
          '원작 내용을 알고 있음',
          '빙의한 캐릭터는 악역 or 엑스트라',
          '파멸 엔딩을 피하려 함',
          '원작과 다른 행동으로 주변 당황',
        ],
        goldenHook: '망한 캐릭터에 빙의, 생존을 위해 스토리 탈선',
        avoidTraits: [
          '원작 그대로 따라가기',
          '빙의 사실 쉽게 들킴',
          '원래 주인공을 너무 쉽게 이김',
        ],
      },
      worldSetup: {
        essentialRules: [
          '원작이 존재하는 세계',
          '주인공은 원작 내용 파악',
          '원작 전개가 이미 진행 중',
        ],
        conflictSources: [
          '원작 전개 vs 변경된 행동',
          '원래 악역의 짓을 수습',
          '원작 주인공/히로인과의 관계',
        ],
      },
      plotStructure: {
        openingPattern: '소설/게임 속 캐릭터로 깨어남',
        firstArcMilestones: [
          '자신이 누구인지 파악',
          '파멸 엔딩 확인',
          '첫 번째 분기점 변경',
          '원작 주인공과의 조우',
        ],
        tensionEscalation: [
          '바뀐 스토리로 예측 불가해짐',
          '원작에 없는 인물/사건 등장',
          '빙의 사실을 눈치채는 자 출현',
        ],
      },
      hookPatterns: {
        chapter1Hook: '눈을 떴다. 거울 속에 소설의 악녀가 있었다.',
        chapter5Hook: '원작 전개가 달라지기 시작했다. 더 위험한 쪽으로.',
        arcEndingPattern: '파멸 엔딩은 피했지만, 새로운 엔딩이 기다린다',
      },
    },
    successExamples: [
      '악녀는 모래시계를 되돌린다',
      '죽음을 피하는 방법',
      '소설 속 엑스트라',
      '버림받은 왕녀의 은밀한 침실',
    ],
    commonMistakes: [
      '원작 지식 남발로 치트 느낌',
      '빙의 캐릭터의 기존 관계 무시',
      '원작 주인공을 너무 쉽게 능가',
      '로맨스가 너무 빨리 진행',
    ],
    estimatedAppeal: 90,
  },

  // 아카데미물 템플릿
  {
    id: 'academy-template',
    category: 'academy',
    name: '아카데미물 황금 공식',
    description: '엘리트 양성 기관, 숨겨진 천재의 각성',
    keyElements: {
      protagonist: {
        commonTraits: [
          '처음엔 무시당하는 위치',
          '숨겨진 재능 or 특수 능력',
          '점진적 실력 공개',
          '라이벌과의 경쟁',
        ],
        goldenHook: '꼴찌/무능력자가 숨겨진 능력으로 역전',
        avoidTraits: [
          '처음부터 만렙',
          '노력 없는 먼치킨',
          '경쟁자를 너무 쉽게 제압',
        ],
      },
      worldSetup: {
        essentialRules: [
          '명확한 등급/서열 시스템',
          '정기적 시험/대회',
          '명문 출신 vs 평민 구도',
        ],
        conflictSources: [
          '출신 배경에 따른 차별',
          '라이벌들의 견제',
          '학원 내 음모/비밀',
        ],
      },
      plotStructure: {
        openingPattern: '입학 or 편입, 무시받는 첫날',
        firstArcMilestones: [
          '첫 수업/시험에서 의외의 모습',
          '라이벌 1호 등장',
          '숨겨진 능력 일부 공개',
          '소규모 승리로 주목받기',
        ],
        tensionEscalation: [
          '더 강한 상대 등장',
          '학원 바깥의 위협 침입',
          '주인공의 과거 비밀 위협',
        ],
      },
      hookPatterns: {
        chapter1Hook: '차갑게 무시하던 그들 앞에서, 검을 들어올렸다.',
        chapter5Hook: '학원 1등, 처음으로 자신을 똑바로 봤다.',
        arcEndingPattern: '학원 대회 우승, 하지만 더 큰 무대가 기다린다',
      },
    },
    successExamples: [
      '입학용병',
      '템빨',
      '마검왕의 성검학원',
      '낙오자',
    ],
    commonMistakes: [
      '성장 곡선 없이 즉시 1등',
      '학원 시스템의 규칙 무시',
      '라이벌 캐릭터 너무 얕게 설정',
      '학원 외부 스토리에 집중',
    ],
    estimatedAppeal: 85,
  },

  // 탑 클라이밍 템플릿
  {
    id: 'tower-climbing-template',
    category: 'tower_climbing',
    name: '탑 클라이밍 황금 공식',
    description: '층마다 강해지는 시스템, 끝없는 도전',
    keyElements: {
      protagonist: {
        commonTraits: [
          '탑 공략에 특화된 능력 or 아이템',
          '동료들과의 파티 플레이',
          '매 층마다 성장',
          '최상층을 향한 목표',
        ],
        goldenHook: '유일하게 탑을 오를 수 있는 조건 획득',
        avoidTraits: [
          '혼자서 모든 것 해결',
          '층 난이도 무시하고 스킵',
          '목표 없이 그냥 오르기',
        ],
      },
      worldSetup: {
        essentialRules: [
          '탑의 층수와 규칙 명확',
          '층별 특성/보스 존재',
          '탑 공략 길드/집단 존재',
        ],
        conflictSources: [
          '다른 공략자들과의 경쟁',
          '탑 내부의 음모',
          '탑의 진짜 목적 미스터리',
        ],
      },
      plotStructure: {
        openingPattern: '탑 입장 자격 획득 또는 강제 편입',
        firstArcMilestones: [
          '1층 공략 (튜토리얼)',
          '첫 파티 구성',
          '초보자 구간 돌파',
          '중급자 구간 진입',
        ],
        tensionEscalation: [
          '층 난이도 급상승',
          '경쟁 파티의 방해',
          '탑의 숨겨진 진실 발견',
        ],
      },
      hookPatterns: {
        chapter1Hook: '눈앞에 거대한 탑이 나타났다. "공략자로 선택되었습니다."',
        chapter5Hook: '5층 보스를 쓰러뜨렸다. 진짜 시련은 이제부터였다.',
        arcEndingPattern: '구간 보스 격파, 새로운 구간의 규칙이 드러난다',
      },
    },
    successExamples: [
      '신의 탑',
      '탑에서 태어난 자',
      '무한의 탑 헌터즈',
    ],
    commonMistakes: [
      '층별 특성 없이 반복적 전투만',
      '동료 캐릭터 활용 미흡',
      '탑의 미스터리 방치',
      '성장 속도 너무 빠름',
    ],
    estimatedAppeal: 80,
  },

  // 던전물 템플릿
  {
    id: 'dungeon-template',
    category: 'dungeon',
    name: '던전물 황금 공식',
    description: '현대에 던전 출현, 헌터가 되어 살아남아라',
    keyElements: {
      protagonist: {
        commonTraits: [
          '낮은 등급에서 시작',
          '숨겨진 유니크 능력',
          '솔로 플레이 선호',
          '강해지려는 명확한 이유',
        ],
        goldenHook: '최하위 헌터가 숨겨진 능력으로 최강이 되어간다',
        avoidTraits: [
          '시작부터 S급',
          '아무 이유 없이 강해짐',
          '던전 시스템 무시',
        ],
      },
      worldSetup: {
        essentialRules: [
          '던전 등급 시스템 (E~S급)',
          '헌터 협회/길드 존재',
          '현대 사회와 공존',
        ],
        conflictSources: [
          '대형 길드의 횡포',
          '던전 브레이크 위기',
          '헌터 간 세력 다툼',
        ],
      },
      plotStructure: {
        openingPattern: '각성 or 재각성, 던전 첫 입장',
        firstArcMilestones: [
          '첫 던전 클리어',
          '유니크 능력 발견',
          '소형 길드 가입 or 솔로 활동',
          '업계 주목받기',
        ],
        tensionEscalation: [
          'S급 던전 출현',
          '대형 길드와의 충돌',
          '헌터의 기원 비밀',
        ],
      },
      hookPatterns: {
        chapter1Hook: '"시스템 메시지: 숨겨진 직업이 각성되었습니다."',
        chapter5Hook: 'S급 헌터가 나를 찾아왔다. "네 능력... 위험해."',
        arcEndingPattern: '레이드 클리어, 하지만 더 큰 던전이 깨어난다',
      },
    },
    successExamples: [
      '나 혼자만 레벨업',
      '헌터와 매드 사이언티스트',
      'SSS급 헌터가 되었습니다',
    ],
    commonMistakes: [
      '레벨업만 반복, 스토리 부재',
      '헌터 사회 시스템 무시',
      '던전 묘사 부실',
      '너무 빠른 최강자 등극',
    ],
    estimatedAppeal: 90,
  },

  // 무협 템플릿
  {
    id: 'murim-template',
    category: 'murim',
    name: '무협물 황금 공식',
    description: '강호에 발을 내딛다, 무공을 익혀 정상으로',
    keyElements: {
      protagonist: {
        commonTraits: [
          '비천한 출신 or 몰락 가문',
          '기연으로 절세무공 습득',
          '사부/은인의 존재',
          '강해져야 하는 절박한 이유',
        ],
        goldenHook: '무림에서 잊힌 절세무공의 유일한 계승자',
        avoidTraits: [
          '처음부터 천하제일',
          '무공 수련 과정 생략',
          '강호 질서 완전 무시',
        ],
      },
      worldSetup: {
        essentialRules: [
          '정사대립 구도',
          '무공 등급/경지 체계',
          '문파/방파 시스템',
        ],
        conflictSources: [
          '구파일방 vs 마교',
          '무림맹주 자리 다툼',
          '오래된 원한의 부활',
        ],
      },
      plotStructure: {
        openingPattern: '기연 획득 or 복수의 서약',
        firstArcMilestones: [
          '첫 무공 습득',
          '사부/멘토 만남',
          '첫 강적과의 대결',
          '소문파에서 이름 알리기',
        ],
        tensionEscalation: [
          '명문대파의 주목/견제',
          '마교의 음모 감지',
          '과거 진실 밝혀짐',
        ],
      },
      hookPatterns: {
        chapter1Hook: '칼을 쥐었다. 복수의 첫걸음이었다.',
        chapter5Hook: '그 무공... 천년 전 사라진 문파의 것이었다.',
        arcEndingPattern: '무림맹 가입, 더 넓은 강호로 나아간다',
      },
    },
    successExamples: [
      '화산귀환',
      '무림 공자',
      '사신검',
      '천마는 평범하게 살 수 없다',
    ],
    commonMistakes: [
      '무공 수련 묘사 부실',
      '강호 정치 무시',
      '정사대립 단순화',
      '너무 빠른 경지 돌파',
    ],
    estimatedAppeal: 85,
  },

  // 로맨스 판타지 템플릿
  {
    id: 'romance-fantasy-template',
    category: 'romance_fantasy',
    name: '로맨스 판타지 황금 공식',
    description: '소설 속 세계, 파멸 엔딩을 피하고 진정한 사랑을 찾아',
    keyElements: {
      protagonist: {
        commonTraits: [
          '원작을 알고 있음 (빙의/회귀)',
          '파멸 엔딩 예정',
          '원작 남주와 다른 남주 선택',
          '당찬 성격',
        ],
        goldenHook: '악녀/엑스트라로 빙의, 생존을 위해 남주를 피한다',
        avoidTraits: [
          '너무 수동적인 성격',
          '남주에게 쉽게 넘어감',
          '로맨스만 집중, 생존 무시',
        ],
      },
      worldSetup: {
        essentialRules: [
          '신분제 사회 (귀족/평민)',
          '마법 or 축복 존재',
          '정략결혼/사교계 중심',
        ],
        conflictSources: [
          '원작 여주와의 충돌',
          '가문 간 정치 싸움',
          '숨겨진 출생의 비밀',
        ],
      },
      plotStructure: {
        openingPattern: '파멸 직전 or 빙의 직후, 상황 파악',
        firstArcMilestones: [
          '현재 상황 파악',
          '파멸 플래그 확인',
          '원작 남주 첫 만남 (회피)',
          '진짜 남주 후보 등장',
        ],
        tensionEscalation: [
          '원작 전개 변화',
          '로맨스 삼각관계',
          '가문의 위기',
        ],
      },
      hookPatterns: {
        chapter1Hook: '눈을 떴다. 내가 소설 속 악녀라니.',
        chapter5Hook: '원작 남주가 나를 이상하게 봤다. 원래 이러면 안 되는데.',
        arcEndingPattern: '1차 위기 돌파, 하지만 사랑은 시작일 뿐',
      },
    },
    successExamples: [
      '재혼 황후',
      '버려진 황비',
      '악녀는 두 번 산다',
      '황제의 반려동물',
    ],
    commonMistakes: [
      '로맨스 전개 너무 빠름',
      '여주 성격 일관성 부족',
      '남주 매력 포인트 부족',
      '세계관 설정 부실',
    ],
    estimatedAppeal: 88,
  },
];

/**
 * 카테고리별 템플릿 가져오기
 */
export function getTemplateByCategory(category: MegaHitTemplateCategory): MegaHitTemplate | undefined {
  return MEGA_HIT_TEMPLATES.find(t => t.category === category);
}

/**
 * 모든 템플릿 목록 (요약)
 */
export function getTemplatesSummary(): Array<{
  id: string;
  category: MegaHitTemplateCategory;
  name: string;
  description: string;
  estimatedAppeal: number;
}> {
  return MEGA_HIT_TEMPLATES.map(t => ({
    id: t.id,
    category: t.category,
    name: t.name,
    description: t.description,
    estimatedAppeal: t.estimatedAppeal,
  }));
}

/**
 * 장르 키워드로 템플릿 찾기
 */
export function findTemplateByKeywords(keywords: string[]): MegaHitTemplate[] {
  const lowercaseKeywords = keywords.map(k => k.toLowerCase());

  return MEGA_HIT_TEMPLATES.filter(template => {
    const searchText = `${template.name} ${template.description} ${template.category}`.toLowerCase();
    return lowercaseKeywords.some(kw => searchText.includes(kw));
  });
}

/**
 * 콜드 스타트 가이드 생성
 */
export function generateColdStartGuide(category: MegaHitTemplateCategory): {
  template: MegaHitTemplate;
  quickStartGuide: string[];
  firstChapterOutline: string;
  mustHaveElements: string[];
  redFlags: string[];
} | null {
  const template = getTemplateByCategory(category);
  if (!template) return null;

  const quickStartGuide = [
    `1화 시작: ${template.keyElements.plotStructure.openingPattern}`,
    `주인공 훅: ${template.keyElements.protagonist.goldenHook}`,
    `5화까지 달성: ${template.keyElements.plotStructure.firstArcMilestones.join(' → ')}`,
    `긴장 상승: ${template.keyElements.plotStructure.tensionEscalation[0]}`,
  ];

  const firstChapterOutline = `
[1화 개요]
- 오프닝: ${template.keyElements.hookPatterns.chapter1Hook}
- 상황 설정: ${template.keyElements.worldSetup.essentialRules[0]}
- 주인공 소개: ${template.keyElements.protagonist.commonTraits[0]}
- 첫 갈등 암시: ${template.keyElements.worldSetup.conflictSources[0]}
- 화 끝 훅: 다음 화로 이어지는 궁금증
  `.trim();

  const mustHaveElements = [
    template.keyElements.protagonist.goldenHook,
    template.keyElements.worldSetup.essentialRules[0],
    template.keyElements.hookPatterns.chapter1Hook,
  ];

  const redFlags = template.commonMistakes;

  return {
    template,
    quickStartGuide,
    firstChapterOutline,
    mustHaveElements,
    redFlags,
  };
}
