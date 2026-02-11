import {
  NarrativeArcType,
  NarrativePhase,
  NarrativeBeat,
  CharacterArc,
  MasterArc,
  NarrativeGrammarConfig,
} from '../types';

// === 아크 템플릿 정의 ===

export const ARC_LABELS: Record<NarrativeArcType, string> = {
  heroes_journey: '영웅의 여정',
  tragedy: '비극',
  transformation: '변신',
  fall: '몰락',
  redemption: '구원',
  revenge: '복수',
};

function beat(type: NarrativeBeat['type'], description: string): NarrativeBeat {
  return { type, description, fulfilled: false };
}

// --- 영웅의 여정 (12단계 → 6 Phase) ---
const HEROES_JOURNEY_PHASES: NarrativePhase[] = [
  {
    name: '일상 세계',
    description: '평범한 세계에서 결핍을 안고 살아가는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('inciting', '일상의 결핍이 드러남'),
    ],
    optionalBeats: [
      beat('complication', '멘토와의 만남'),
    ],
    tensionTarget: 15,
  },
  {
    name: '모험의 소명',
    description: '모험의 부름을 받고 문턱을 넘는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('inciting', '운명적 사건 발생'),
      beat('complication', '소명의 거부 또는 갈등'),
    ],
    optionalBeats: [
      beat('complication', '동료/조력자 등장'),
    ],
    tensionTarget: 35,
  },
  {
    name: '시련의 길',
    description: '시련과 적대자를 만나며 성장하는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('complication', '주요 시련에 직면'),
      beat('reversal', '예상치 못한 반전'),
    ],
    optionalBeats: [
      beat('complication', '배신 또는 상실'),
      beat('crisis', '내면의 갈등 심화'),
    ],
    tensionTarget: 55,
  },
  {
    name: '가장 깊은 동굴',
    description: '최대 위기에 봉착하는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('crisis', '최대 위기 - 모든 것을 잃을 위험'),
      beat('climax', '결정적 대결 또는 시험'),
    ],
    optionalBeats: [
      beat('reversal', '숨겨진 진실 발각'),
    ],
    tensionTarget: 85,
  },
  {
    name: '보상과 귀환',
    description: '시련을 극복하고 보상을 얻는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('resolution', '보상 획득 또는 깨달음'),
    ],
    optionalBeats: [
      beat('complication', '귀환의 장애물'),
      beat('reversal', '마지막 반전'),
    ],
    tensionTarget: 50,
  },
  {
    name: '부활과 환수',
    description: '변화된 존재로 세계에 귀환하는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('climax', '최종 시험 (부활)'),
      beat('resolution', '세계에 환수 (변화의 완성)'),
    ],
    optionalBeats: [],
    tensionTarget: 70,
  },
];

// --- 비극 (5막) ---
const TRAGEDY_PHASES: NarrativePhase[] = [
  {
    name: '소개',
    description: '주인공의 위대함과 결함이 드러나는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('inciting', '주인공의 강점과 치명적 결함 노출'),
    ],
    optionalBeats: [
      beat('complication', '경고하는 인물 등장'),
    ],
    tensionTarget: 20,
  },
  {
    name: '상승',
    description: '야망을 향해 질주하며 결함이 깊어지는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('complication', '야망 추구로 인한 도덕적 타협'),
      beat('reversal', '성공 속의 균열'),
    ],
    optionalBeats: [
      beat('complication', '충성하던 존재와의 갈등'),
    ],
    tensionTarget: 45,
  },
  {
    name: '절정',
    description: '돌이킬 수 없는 선택을 하는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('climax', '돌이킬 수 없는 결정적 행동'),
      beat('crisis', '결함이 파국의 씨앗이 됨'),
    ],
    optionalBeats: [
      beat('reversal', '예상치 못한 결과'),
    ],
    tensionTarget: 80,
  },
  {
    name: '하강',
    description: '결과가 연쇄적으로 돌아오는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('crisis', '동맹의 붕괴 또는 배신'),
      beat('reversal', '숨겨진 진실의 폭로'),
    ],
    optionalBeats: [
      beat('complication', '마지막 구원의 기회를 놓침'),
    ],
    tensionTarget: 90,
  },
  {
    name: '파국',
    description: '최종 파멸에 이르는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('climax', '최종 파멸 (죽음/파산/상실)'),
      beat('resolution', '비극적 깨달음 또는 교훈'),
    ],
    optionalBeats: [],
    tensionTarget: 100,
  },
];

// --- 변신 아크 ---
const TRANSFORMATION_PHASES: NarrativePhase[] = [
  {
    name: '구체제',
    description: '기존의 정체성에 갇혀 있는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('inciting', '현재 상태의 불만족 또는 억압'),
    ],
    optionalBeats: [
      beat('complication', '변화의 전조'),
    ],
    tensionTarget: 20,
  },
  {
    name: '촉발',
    description: '변화를 촉발하는 사건이 발생하는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('inciting', '기존 체제를 흔드는 결정적 사건'),
      beat('complication', '새로운 가능성의 발견'),
    ],
    optionalBeats: [],
    tensionTarget: 40,
  },
  {
    name: '저항',
    description: '변화에 저항하며 갈등하는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('crisis', '변화에 대한 내적 저항'),
      beat('complication', '구체제로 돌아가려는 유혹'),
    ],
    optionalBeats: [
      beat('reversal', '뜻밖의 시련'),
    ],
    tensionTarget: 65,
  },
  {
    name: '수용',
    description: '변화를 받아들이고 새로운 자아를 형성하는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('climax', '구체제의 결정적 포기'),
      beat('reversal', '새로운 정체성의 시험'),
    ],
    optionalBeats: [
      beat('crisis', '마지막 정체성 위기'),
    ],
    tensionTarget: 75,
  },
  {
    name: '통합',
    description: '변화가 완성되어 새로운 존재로 거듭나는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('resolution', '새로운 정체성으로 세계와 화해'),
    ],
    optionalBeats: [
      beat('complication', '변화의 대가'),
    ],
    tensionTarget: 45,
  },
];

// --- 몰락 아크 ---
const FALL_PHASES: NarrativePhase[] = [
  {
    name: '정상',
    description: '정점에 서 있는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('inciting', '높은 지위/능력/명성 확립'),
    ],
    optionalBeats: [
      beat('complication', '잠재적 위험의 복선'),
    ],
    tensionTarget: 15,
  },
  {
    name: '유혹',
    description: '금지된 것에 손을 대는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('inciting', '금지된 힘/관계/비밀에 빠짐'),
      beat('complication', '첫 번째 도덕적 타협'),
    ],
    optionalBeats: [],
    tensionTarget: 35,
  },
  {
    name: '타락',
    description: '점점 깊이 빠져드는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('complication', '타락의 심화 - 주변인 피해'),
      beat('reversal', '자신의 변화를 자각하지 못함'),
    ],
    optionalBeats: [
      beat('crisis', '경고를 무시'),
    ],
    tensionTarget: 60,
  },
  {
    name: '대가',
    description: '타락의 대가가 돌아오는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('crisis', '소중한 것을 잃기 시작'),
      beat('reversal', '배신 또는 고립'),
    ],
    optionalBeats: [
      beat('climax', '마지막 선택의 순간'),
    ],
    tensionTarget: 85,
  },
  {
    name: '파멸',
    description: '최종 파멸에 이르는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('climax', '완전한 파멸 또는 추락'),
      beat('resolution', '몰락의 의미 (비극적 깨달음)'),
    ],
    optionalBeats: [],
    tensionTarget: 95,
  },
];

// --- 구원 아크 ---
const REDEMPTION_PHASES: NarrativePhase[] = [
  {
    name: '타락한 상태',
    description: '죄의식 또는 어둠 속에 있는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('inciting', '과거의 죄/실패/어둠이 드러남'),
    ],
    optionalBeats: [
      beat('complication', '구원의 빛 또는 계기'),
    ],
    tensionTarget: 30,
  },
  {
    name: '각성',
    description: '변화의 필요를 깨닫는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('inciting', '속죄의 계기가 되는 사건'),
      beat('complication', '과거와 현재의 갈등'),
    ],
    optionalBeats: [],
    tensionTarget: 45,
  },
  {
    name: '시련의 속죄',
    description: '속죄를 위한 고난을 겪는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('crisis', '속죄의 대가를 치름'),
      beat('reversal', '과거가 현재를 방해'),
    ],
    optionalBeats: [
      beat('complication', '신뢰를 얻기 위한 투쟁'),
    ],
    tensionTarget: 70,
  },
  {
    name: '최종 시험',
    description: '진정한 변화를 증명해야 하는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('climax', '과거의 자신과 대면하는 최종 시험'),
      beat('crisis', '구원과 몰락 사이의 결정적 선택'),
    ],
    optionalBeats: [],
    tensionTarget: 85,
  },
  {
    name: '구원',
    description: '용서와 새로운 시작을 얻는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('resolution', '구원의 완성 (용서/화해/새 출발)'),
    ],
    optionalBeats: [
      beat('reversal', '구원의 대가'),
    ],
    tensionTarget: 40,
  },
];

// --- 복수 아크 ---
const REVENGE_PHASES: NarrativePhase[] = [
  {
    name: '상실',
    description: '소중한 것을 잃는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('inciting', '복수의 원인이 되는 상실/억울함'),
    ],
    optionalBeats: [
      beat('complication', '복수를 다짐'),
    ],
    tensionTarget: 40,
  },
  {
    name: '준비',
    description: '복수를 위해 힘을 기르는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('complication', '복수를 위한 수련/계획'),
      beat('inciting', '적에 대한 정보 수집'),
    ],
    optionalBeats: [
      beat('complication', '복수에 의문을 품는 순간'),
    ],
    tensionTarget: 50,
  },
  {
    name: '추적',
    description: '적을 향해 다가가는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('complication', '적과의 첫 대면 또는 근접'),
      beat('reversal', '적의 예상치 못한 면모 발견'),
    ],
    optionalBeats: [
      beat('crisis', '복수로 인한 도덕적 갈등'),
    ],
    tensionTarget: 70,
  },
  {
    name: '대결',
    description: '적과 최종 대결하는 시기',
    yearRange: [0, 0],
    requiredBeats: [
      beat('climax', '최종 대결'),
      beat('crisis', '복수의 대가 또는 허무함'),
    ],
    optionalBeats: [
      beat('reversal', '숨겨진 진실'),
    ],
    tensionTarget: 95,
  },
  {
    name: '결말',
    description: '복수 후의 공허함 또는 새 시작',
    yearRange: [0, 0],
    requiredBeats: [
      beat('resolution', '복수의 결말 (허무/해방/새 목적)'),
    ],
    optionalBeats: [],
    tensionTarget: 35,
  },
];

// === 템플릿 맵 ===

const ARC_TEMPLATES: Record<NarrativeArcType, NarrativePhase[]> = {
  heroes_journey: HEROES_JOURNEY_PHASES,
  tragedy: TRAGEDY_PHASES,
  transformation: TRANSFORMATION_PHASES,
  fall: FALL_PHASES,
  redemption: REDEMPTION_PHASES,
  revenge: REVENGE_PHASES,
};

// === 긴장도 커브 보정 ===

const TENSION_CURVE_MULTIPLIERS: Record<NarrativeGrammarConfig['tensionCurve'], (phaseRatio: number) => number> = {
  standard: () => 1.0,
  slow_burn: (ratio) => ratio < 0.5 ? 0.7 : 1.3,
  explosive: (ratio) => ratio < 0.3 ? 1.3 : ratio < 0.7 ? 0.8 : 1.2,
};

// === 팩토리 함수 ===

/**
 * 캐릭터 아크를 생성한다.
 * yearRange를 시뮬레이션 기간에 맞게 자동 분배.
 */
export function createCharacterArc(
  characterId: string,
  arcType: NarrativeArcType,
  startYear: number,
  endYear: number,
  tensionCurve: NarrativeGrammarConfig['tensionCurve'] = 'standard'
): CharacterArc {
  const template = ARC_TEMPLATES[arcType];
  const totalYears = endYear - startYear;
  const phaseCount = template.length;
  const yearsPerPhase = totalYears / phaseCount;

  const curveMultiplier = TENSION_CURVE_MULTIPLIERS[tensionCurve];

  const phases: NarrativePhase[] = template.map((phase, idx) => {
    const phaseStart = Math.round(startYear + idx * yearsPerPhase);
    const phaseEnd = idx === phaseCount - 1
      ? endYear
      : Math.round(startYear + (idx + 1) * yearsPerPhase) - 1;

    const phaseRatio = idx / (phaseCount - 1);
    const adjustedTension = Math.round(
      Math.min(100, phase.tensionTarget * curveMultiplier(phaseRatio))
    );

    return {
      ...phase,
      yearRange: [phaseStart, phaseEnd] as [number, number],
      tensionTarget: adjustedTension,
      requiredBeats: phase.requiredBeats.map(b => ({ ...b })),
      optionalBeats: phase.optionalBeats.map(b => ({ ...b })),
    };
  });

  return {
    characterId,
    archetype: arcType,
    currentPhase: 0,
    phases,
    tension: 0,
    fulfillment: 0,
  };
}

/**
 * 마스터 아크(전체 이야기)를 생성한다.
 */
export function createMasterArc(
  arcType: NarrativeArcType,
  startYear: number,
  endYear: number,
  actCount: 3 | 4 | 5 = 3
): MasterArc {
  const totalYears = endYear - startYear;
  const yearsPerAct = totalYears / actCount;

  const actNames: Record<number, string[]> = {
    3: ['발단', '전개', '결말'],
    4: ['발단', '전개', '위기', '결말'],
    5: ['발단', '전개', '절정', '하강', '결말'],
  };

  const tensionTargets: Record<number, number[]> = {
    3: [25, 70, 50],
    4: [20, 50, 85, 45],
    5: [15, 40, 80, 65, 40],
  };

  const acts = actNames[actCount].map((name, idx) => ({
    name,
    yearRange: [
      Math.round(startYear + idx * yearsPerAct),
      idx === actCount - 1 ? endYear : Math.round(startYear + (idx + 1) * yearsPerAct) - 1,
    ] as [number, number],
    tensionTarget: tensionTargets[actCount][idx],
    description: `${idx + 1}막: ${name}`,
  }));

  // 마스터 비트: 아크 타입에서 주요 비트만 추출
  const template = ARC_TEMPLATES[arcType];
  const keyBeats: NarrativeBeat[] = template
    .flatMap(phase => phase.requiredBeats)
    .filter(b => b.type === 'inciting' || b.type === 'climax' || b.type === 'resolution')
    .slice(0, actCount + 2)
    .map(b => ({ ...b }));

  return {
    acts,
    currentAct: 0,
    overallTension: 0,
    keyBeats,
  };
}

/**
 * 전체 Grammar Config로부터 CharacterArc + MasterArc를 일괄 생성한다.
 */
export function createArcsFromConfig(
  config: NarrativeGrammarConfig,
  characterIds: string[],
  startYear: number,
  endYear: number
): { characterArcs: CharacterArc[]; masterArc: MasterArc } {
  const characterArcs = characterIds.map(id => {
    const arcType = config.characterArcOverrides?.[id] || config.masterArcType;
    return createCharacterArc(id, arcType, startYear, endYear, config.tensionCurve);
  });

  const masterArc = createMasterArc(config.masterArcType, startYear, endYear, config.actCount);

  return { characterArcs, masterArc };
}
