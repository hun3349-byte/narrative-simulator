import {
  GenreType,
  GenrePersonaDNA,
  AuthorConfig,
  ToneDensity,
  MoodType,
  DialogueStyle,
  DescriptionDensity,
} from '../types';

// === 장르별 페르소나 DNA ===

export const GENRE_PERSONAS: Record<Exclude<GenreType, 'custom'>, GenrePersonaDNA> = {
  martial_arts: {
    id: 'martial_arts',
    name: '무협',
    style: {
      description: '건조하되 감각적. 한문체 느낌 없이 현대적 호흡.',
      senses: '바람/검/피/흙 — 촉각과 후각 중심 묘사.',
    },
    combat: {
      rhythm: '짧은 문장으로 빠르게. 한 문장에 하나의 동작.',
      forbidden: [
        '무공명 나열',
        '괄호 한자 설명',
        '"○○○. □□□의 △△△이다." 패턴',
        '설정 나레이션',
      ],
      bad_example: '"현천문 경공의 진수, 현허신법이었다."',
      good_example: '"나뭇가지가 흔들리지 않았다."',
    },
    dialogue: {
      style: '짧고 무게감. 말 아끼는 사람들.',
      allowed: ['감정은 말이 아니라 행동으로'],
    },
    forbidden: [
      '괄호 한자 설명',
      '무공명+설명 패턴',
      '설정 나레이션',
      '"○○○. □□□의 △△△이다."',
    ],
  },

  fantasy: {
    id: 'fantasy',
    name: '판타지',
    style: {
      description: '웅장함과 유머가 공존. 세계의 경이로움.',
      senses: '색감과 빛 중심 묘사. 마법의 시각적 효과.',
    },
    combat: {
      rhythm: '마법은 시각적으로 화려하게, 근접전은 거칠게.',
      forbidden: [
        '스킬명 나열',
        '스탯창 남용',
        '시스템 메시지 과다',
        '"레벨업" 반복 패턴',
      ],
      bad_example: '"[스킬: 파이어볼 Lv.3] 발동!"',
      good_example: '"손끝에서 핏빛 불꽃이 피어올랐다."',
    },
    dialogue: {
      style: '캐릭터 간 케미. 위트 있는 대화.',
      allowed: ['파티원 간 말장난', '가벼운 농담'],
    },
    forbidden: [
      '스탯창 남용',
      '시스템 메시지 과다',
      '"레벨업" 반복',
      '스킬명 괄호 설명',
    ],
  },

  modern_fantasy: {
    id: 'modern_fantasy',
    name: '현대판타지',
    style: {
      description: '라이트하고 일상적. 독백 비중 높음.',
      senses: '일상과 비일상의 대비가 핵심.',
    },
    combat: {
      rhythm: '현실적 물리 법칙 + 초자연 요소.',
      forbidden: [
        '이세계 문어체',
        '과도한 세계관 설명',
        '어색한 존대말',
      ],
      bad_example: '"이것이 바로 마나의 힘인가..."',
      good_example: '"편의점에서 몬스터가 나오는 낯섦."',
    },
    dialogue: {
      style: '현실적 말투. 은어, 줄임말, 인터넷 밈 허용.',
      allowed: ['"아 시발 이거 버그 아님?" 같은 반응', '자연스러운 비속어'],
    },
    forbidden: [
      '이세계 문어체',
      '과도한 세계관 설명',
      '뻣뻣한 대화체',
    ],
  },

  romance: {
    id: 'romance',
    name: '로맨스',
    style: {
      description: '감정 밀도 높게. 시선/손끝/숨결/온도.',
      senses: '거리감의 변화가 곧 관계의 변화.',
    },
    combat: {
      rhythm: '물리적 전투보다 감정 전투. 오해, 질투, 그리움, 밀당.',
      forbidden: [
        '직접적 감정 고백 남발',
        '"널 사랑해"가 너무 빨리 나옴',
        '감정 직접 서술',
      ],
      bad_example: '"나는 그녀를 사랑하고 있었다."',
      good_example: '"그녀가 웃을 때마다, 심장이 한 박자 늦게 뛰었다."',
    },
    dialogue: {
      style: '말 속에 감춰진 진심.',
      allowed: ['"괜찮아"가 "괜찮지 않아"인 맥락', '행간의 감정'],
    },
    forbidden: [
      '직접적 감정 고백 남발',
      '"널 사랑해" 조기 등장',
      '감정 직접 서술 과다',
    ],
  },

  regression: {
    id: 'regression',
    name: '회귀/환생',
    style: {
      description: '과거와 현재의 시선 교차.',
      senses: '"전생에서는 여기서 죽었다" 류의 이중 시점.',
    },
    combat: {
      rhythm: '독자에게 미래 정보를 주되, 결과는 바뀔 수 있게.',
      forbidden: [
        '먹방(능력 획득) 나열',
        '체크리스트 소화 패턴',
        '너무 쉬운 전개',
      ],
      bad_example: '"이번엔 S급 스킬을 먼저 얻고, A급 던전을 클리어하고..."',
      good_example: '"이번엔 다르다"의 설렘과 불안.',
    },
    dialogue: {
      style: '주인공만 아는 정보에서 오는 아이러니.',
      allowed: ['주변 반응: "이 놈이 미래를 아나?"', '정보 비대칭의 긴장'],
    },
    forbidden: [
      '먹방 나열',
      '체크리스트 소화',
      '예정된 전개만 따라가기',
    ],
  },
};

// === 톤 밀도별 가이드 ===

export const TONE_DENSITY_GUIDE: Record<ToneDensity, { name: string; description: string }> = {
  light: {
    name: '라이트',
    description: '가볍고 빠르게. 유머와 위트. 술술 읽힘.',
  },
  medium: {
    name: '미디엄',
    description: '적당한 깊이. 재미와 의미 균형.',
  },
  deep: {
    name: '딥',
    description: '무겁고 진지. 감정의 깊이. 천천히 곱씹는 맛.',
  },
};

// === 분위기별 가이드 ===

export const MOOD_GUIDE: Record<MoodType, { name: string; description: string; example: string }> = {
  humor_sarcasm: {
    name: '유머/자조',
    description: '주인공 독백에 위트.',
    example: '"아 이러려고 살았나."',
  },
  lyrical: {
    name: '서정적',
    description: '풍경과 감정이 어우러짐. 여운이 남는 문장.',
    example: '"바람이 머리카락을 흩트렸다. 그녀의 향기가 스쳤다."',
  },
  hardboiled: {
    name: '건조/하드보일드',
    description: '감정 절제. 행동만. 담백.',
    example: '"쐈다. 쓰러졌다. 끝."',
  },
  philosophical: {
    name: '철학적',
    description: '삶/죽음/존재에 대한 질문이 깔림.',
    example: '"왜 살아남은 건 늘 나일까."',
  },
  dark_gritty: {
    name: '다크/그리티',
    description: '어둡고 거친 세계. 선악 경계 모호.',
    example: '"영웅은 없다. 덜 썩은 놈이 있을 뿐."',
  },
  hot_blood: {
    name: '열혈',
    description: '뜨겁고 직선적. 가슴이 뛰는 전개.',
    example: '"포기? 그딴 단어 내 사전에 없다!"',
  },
};

// === 대사 스타일별 가이드 ===

export const DIALOGUE_STYLE_GUIDE: Record<DialogueStyle, { name: string; description: string }> = {
  short_impact: {
    name: '짧고 강렬',
    description: '"가." "알고 있었어." 한 마디가 열 문장의 무게.',
  },
  realistic: {
    name: '현실적',
    description: '일상 말투, 은어 허용. 자연스러운 대화.',
  },
  literary: {
    name: '문어체',
    description: '격식있고 무게감. 한문 투 표현 가능.',
  },
  mixed: {
    name: '혼합',
    description: '상황에 따라 자동 전환. 평소엔 일상적, 긴장 시 짧게.',
  },
};

// === 묘사 밀도별 가이드 ===

export const DESCRIPTION_DENSITY_GUIDE: Record<DescriptionDensity, { name: string; description: string }> = {
  minimal: {
    name: '최소한',
    description: '행동과 대사 위주. 배경 묘사 절제.',
  },
  balanced: {
    name: '균형',
    description: '필요한 곳에만 묘사. 과하지 않게.',
  },
  rich: {
    name: '풍부',
    description: '감각적 묘사 많음. 장면이 눈에 그려짐.',
  },
};

// === AuthorConfig → 페르소나 프롬프트 빌드 함수 ===

export function buildAuthorPersonaPrompt(config: AuthorConfig): string {
  const sections: string[] = [];

  // 1. 장르 페르소나
  if (config.genre !== 'custom') {
    const genrePersona = GENRE_PERSONAS[config.genre];
    sections.push(`=== 장르 페르소나: ${genrePersona.name} ===

[문체]
${genrePersona.style.description}
${genrePersona.style.senses}

[전투/갈등 묘사]
${genrePersona.combat.rhythm}
✗ 나쁜 예: ${genrePersona.combat.bad_example}
✓ 좋은 예: ${genrePersona.combat.good_example}

[대사]
${genrePersona.dialogue.style}
허용: ${genrePersona.dialogue.allowed.join(', ')}

[금지 사항]
${genrePersona.forbidden.map(f => `- ${f}`).join('\n')}`);
  } else if (config.customGenre) {
    sections.push(`=== 장르: ${config.customGenre} (커스텀) ===
환님이 설정한 커스텀 장르입니다. 장르의 특성에 맞게 유연하게 작성하세요.`);
  }

  // 2. 톤 밀도
  const toneDensity = TONE_DENSITY_GUIDE[config.toneDensity];
  sections.push(`=== 톤 밀도: ${toneDensity.name} ===
${toneDensity.description}`);

  // 3. 분위기 (복수 가능)
  if (config.moods.length > 0) {
    const moodDescriptions = config.moods.map(m => {
      const mood = MOOD_GUIDE[m];
      return `- ${mood.name}: ${mood.description} 예: ${mood.example}`;
    });
    sections.push(`=== 분위기 ===
${moodDescriptions.join('\n')}`);
  }

  // 4. 대사 스타일
  const dialogueStyle = DIALOGUE_STYLE_GUIDE[config.dialogueStyle];
  sections.push(`=== 대사 스타일: ${dialogueStyle.name} ===
${dialogueStyle.description}`);

  // 5. 묘사 밀도
  const descDensity = DESCRIPTION_DENSITY_GUIDE[config.descriptionDensity];
  sections.push(`=== 묘사 밀도: ${descDensity.name} ===
${descDensity.description}`);

  return sections.join('\n\n');
}

// === UI용 옵션 배열 ===

export const GENRE_OPTIONS: { id: GenreType; label: string; icon: string; description: string }[] = [
  { id: 'martial_arts', label: '무협', icon: '⚔️', description: '강호, 무공, 의리' },
  { id: 'fantasy', label: '판타지', icon: '🐉', description: '마법, 던전, 모험' },
  { id: 'modern_fantasy', label: '현대판타지', icon: '🌆', description: '일상+비일상' },
  { id: 'romance', label: '로맨스', icon: '💕', description: '감정, 관계, 설렘' },
  { id: 'regression', label: '회귀/환생', icon: '🔮', description: '두번째 기회' },
  { id: 'custom', label: '직접 입력', icon: '📝', description: '커스텀 장르' },
];

export const TONE_DENSITY_OPTIONS: { id: ToneDensity; label: string; description: string }[] = [
  { id: 'light', label: '라이트', description: '가볍고 빠르게. 유머와 위트.' },
  { id: 'medium', label: '미디엄', description: '적당한 깊이. 재미와 의미 균형.' },
  { id: 'deep', label: '딥', description: '무겁고 진지. 감정의 깊이.' },
];

export const MOOD_OPTIONS: { id: MoodType; label: string; description: string }[] = [
  { id: 'humor_sarcasm', label: '유머/자조', description: '주인공 독백에 위트' },
  { id: 'lyrical', label: '서정적', description: '풍경과 감정이 어우러짐' },
  { id: 'hardboiled', label: '건조/하드보일드', description: '감정 절제, 행동만' },
  { id: 'philosophical', label: '철학적', description: '삶/죽음 질문이 깔림' },
  { id: 'dark_gritty', label: '다크/그리티', description: '어둡고 거친 세계' },
  { id: 'hot_blood', label: '열혈', description: '뜨겁고 직선적' },
];

export const DIALOGUE_STYLE_OPTIONS: { id: DialogueStyle; label: string; description: string }[] = [
  { id: 'short_impact', label: '짧고 강렬', description: '"가." "알고 있었어."' },
  { id: 'realistic', label: '현실적', description: '일상 말투, 은어 허용' },
  { id: 'literary', label: '문어체', description: '격식있고 무게감' },
  { id: 'mixed', label: '혼합', description: '상황에 따라 자동 전환' },
];

export const DESCRIPTION_DENSITY_OPTIONS: { id: DescriptionDensity; label: string; description: string }[] = [
  { id: 'minimal', label: '최소한', description: '행동과 대사 위주' },
  { id: 'balanced', label: '균형', description: '필요한 곳에만 묘사' },
  { id: 'rich', label: '풍부', description: '감각적 묘사 많음' },
];

// === 하위 호환 마이그레이션 ===

// 기존 authorPersonaId를 새 AuthorConfig로 변환
export function inferConfigFromPersonaId(personaId: string): AuthorConfig {
  const mapping: Record<string, Partial<AuthorConfig>> = {
    battle: {
      toneDensity: 'light',
      moods: ['hot_blood'],
      dialogueStyle: 'short_impact',
      descriptionDensity: 'minimal',
    },
    dark: {
      toneDensity: 'deep',
      moods: ['dark_gritty', 'philosophical'],
      dialogueStyle: 'mixed',
      descriptionDensity: 'balanced',
    },
    lyrical: {
      toneDensity: 'medium',
      moods: ['lyrical'],
      dialogueStyle: 'literary',
      descriptionDensity: 'rich',
    },
    classic: {
      toneDensity: 'deep',
      moods: ['philosophical'],
      dialogueStyle: 'literary',
      descriptionDensity: 'balanced',
    },
  };

  const personaConfig = mapping[personaId] || {};

  return {
    genre: 'custom' as GenreType,
    toneDensity: (personaConfig.toneDensity || 'medium') as ToneDensity,
    moods: (personaConfig.moods || []) as MoodType[],
    dialogueStyle: (personaConfig.dialogueStyle || 'mixed') as DialogueStyle,
    descriptionDensity: (personaConfig.descriptionDensity || 'balanced') as DescriptionDensity,
  };
}

// authorConfig가 없고 authorPersonaId만 있는 경우 자동 변환
export function ensureAuthorConfig(
  authorConfig?: AuthorConfig,
  authorPersonaId?: string
): AuthorConfig | undefined {
  if (authorConfig) {
    return authorConfig;
  }
  if (authorPersonaId) {
    return inferConfigFromPersonaId(authorPersonaId);
  }
  return undefined;
}
