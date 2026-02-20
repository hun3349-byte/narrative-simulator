// === 핵심 타입 ===

export interface Character {
  id: string;
  name: string;
  alias: string;          // 이명
  age: number;            // 현재 나이 (시뮬레이션 시점)
  birthYear: number;      // 태어난 해 (세계관 내 연도)
  status: CharacterStatus;
  stats: CharacterStats;
  emotionalState: EmotionalState;
  profile: CharacterProfile;
}

export interface CharacterProfile {
  background: string;     // 출신 배경
  personality: string;    // 성격 요약
  motivation: string;     // 핵심 동기
  abilities: string[];    // 능력 목록
  weakness: string;       // 약점
  secretGoal: string;     // 숨겨진 목표
}

export interface CharacterStats {
  combat: number;         // 무공
  intellect: number;      // 지력
  willpower: number;      // 의지력
  social: number;         // 사교성
  specialStat: {          // 캐릭터 고유 스탯
    name: string;
    value: number;
  };
}

export interface EmotionalState {
  primary: string;        // 주요 감정 (예: "고독", "분노", "희망")
  intensity: number;      // 감정 강도 (0~100)
  trigger: string;        // 감정 원인
}

export type CharacterStatus =
  | 'childhood'           // 유년기
  | 'training'            // 수련기
  | 'wandering'           // 방랑기
  | 'conflict'            // 갈등기
  | 'transformation'      // 변화기
  | 'convergence';        // 합류기

// === 서사 이벤트 ===

export interface NarrativeEvent {
  id: string;
  characterId: string;
  year: number;           // 세계관 연도
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  title: string;          // 이벤트 제목
  summary: string;        // 1~2줄 요약 (타임라인에 표시)
  detailScene?: DetailScene;  // 세밀 장면 (클릭 시 생성)
  importance: 'major' | 'minor' | 'turning_point';
  tags: string[];         // 태그 (예: ["전투", "만남", "상실"])
  relatedCharacters?: string[];  // 관련된 다른 캐릭터 ID
  emotionalShift?: EmotionalState;  // 이 이벤트 후 감정 변화
  statsChange?: Partial<CharacterStats>;  // 능력치 변화
  adopted: boolean;       // 웹소설에 채택 여부
}

export interface DetailScene {
  id: string;
  eventId: string;
  content: string;        // 세밀한 서술 (1000~3000자)
  dialogues: Dialogue[];  // 대화문
  atmosphere: string;     // 분위기 묘사
  innerThought: string;   // 캐릭터 내면 독백
}

export interface Dialogue {
  speaker: string;
  text: string;
  emotion: string;
}

// === 시뮬레이션 ===

export interface SimulationConfig {
  startYear: number;      // 시작 연도
  endYear: number;        // 종료 연도
  eventsPerYear: number;  // 년당 이벤트 수 (큰 흐름: 2~4개)
  detailLevel: 'overview' | 'detailed';  // 생성 수준
  worldEvents: WorldEvent[];  // 세계관 대사건
  selectedCharacters?: string[];  // 선택된 캐릭터 (미지정 시 전체)
  continueFromExisting?: boolean; // 기존 시뮬레이션 이어서
  batchMode?: boolean;    // true: 고속모드(묶음), false: 정밀모드(개별)
}

// 프로젝트 설정 타입
export interface ProjectConfig {
  id: string;
  name: string;
  worldSettings: WorldSettings;
  characters: Character[];
  relationships: Relationship[];
  simulationConfig: SimulationConfig;
  storyDirectorConfig?: StoryDirectorConfig;
  createdAt: string;
  updatedAt: string;
}

export interface WorldSettings {
  worldName: string;
  description: string;
  genre: string;
  coreRule: string;
  era: string;
  factions: Faction[];
  timeline: {
    startYear: number;
    currentYear: number;
    majorEras: Era[];
    worldEvents: WorldEvent[];
  };
  // 4레이어 세계관 확장 (선택적 — 없으면 기존 coreRule 사용)
  worldLayers?: {
    coreRule: WorldCoreRule;
    historicalWound: WorldHistoricalWound;
    currentTension: WorldCurrentTension;
    sensoryDetails: string[];
    socialNorms: string[];
    dailyLife: string[];
  };
  // 세계 연대기 (선택적 — /create Step 1.5에서 생성)
  chronology?: WorldChronology;
  // 마일스톤 (Anchor Events)
  anchorEvents?: AnchorEvent[];
}

export interface Faction {
  name: string;
  alignment: 'light' | 'gray' | 'dark' | 'chaotic' | 'neutral';
  description: string;
}

export interface Era {
  name: string;
  years: [number, number];
  description: string;
}

export interface Relationship {
  characterIds: [string, string];
  type: string;
  description: string;
  tensionPoint: string;

  // 관계 역학 (AI가 시뮬레이션 중 자유 서술)
  dynamic?: string;                // "애증", "일방적 동경", "경쟁적 인정" 등
  frictionPoints?: string[];       // "A의 과묵함이 B의 인정욕구를 자극"
  resonancePoints?: string[];      // "둘 다 '잃어버린 것'을 찾고 있다"
  history?: string[];              // 관계 변화 이력
}

// === 시뮬레이션 진행 업데이트 ===

export interface ProgressUpdate {
  type: 'year_start' | 'generating' | 'completed' | 'cross_event' | 'error' | 'done' | 'final_state' | 'storyline_preview' | 'integrated_storyline' | 'auto_paused' | 'session_init' | 'arc_designed' | 'author_direction';
  characterId?: string;
  characterName?: string;
  year?: number;
  message: string;
  progress?: number;
  events?: NarrativeEvent[];
  storylinePreview?: StorylinePreview;
  integratedStoryline?: IntegratedStoryline;
  pauseReason?: string;
  sessionId?: string;
  narrativeArcs?: AuthorNarrativeArc[];
  authorDirection?: AuthorDirection;
}

export interface SimulationResponse {
  events: {
    season: 'spring' | 'summer' | 'autumn' | 'winter';
    title: string;
    summary: string;
    importance: 'major' | 'minor' | 'turning_point';
    tags: string[];
    relatedCharacters: string[];
    emotionalShift: EmotionalState | null;
    statsChange: Partial<CharacterStats> | null;
  }[];
  yearEndStatus: CharacterStatus;
}

export interface WorldEvent {
  year: number;
  event: string;
  impact: string;         // 캐릭터들에게 미치는 영향
}

export interface SimulationState {
  isRunning: boolean;
  currentYear: number;
  progress: number;       // 0~100
  characters: Character[];
  events: NarrativeEvent[];
  worldEvents: WorldEvent[];
}

// === 편집기 ===

export interface Chapter {
  id: string;
  number: number;
  title: string;
  scenes: NarrativeEvent[];  // 채택된 이벤트들
  notes: string;          // 편집자 메모
}

export interface NovelProject {
  id: string;
  title: string;
  chapters: Chapter[];
  createdAt: string;
  updatedAt: string;
}

// === 경험 레이어 시스템 ===

export type ImprintType =
  | 'insight'        // 깨달음
  | 'emotion'        // 감정 각인
  | 'skill'          // 기술 습득
  | 'speech'         // 말투/화법
  | 'name'           // 이름/이명 획득
  | 'relationship'   // 관계 형성
  | 'trauma'         // 트라우마
  | 'belief';        // 신념/가치관

export interface MemoryImprint {
  type: ImprintType;
  content: string;            // 각인 내용
  intensity: number;          // 강도 (0~100)
  source: string;             // 출처 (이벤트 설명)
  appearanceChange?: string;  // 외모 변화 (예: "흉터가 생김", "머리카락이 하얗게 변함")
}

export interface Memory {
  id: string;
  characterId: string;
  year: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  eventId: string;       // 연결된 NarrativeEvent ID
  content: string;       // 기억 내용
  imprints: MemoryImprint[];
  emotionalWeight: number;  // 감정적 비중 (0~100)
  tags: string[];
}

export interface PersonalityTrait {
  trait: string;          // 성격 특성 (예: "과묵", "보호본능")
  strength: number;       // 강도 (0~100)
  origin: string;         // 형성 계기
  formedAtYear: number;
  history: { year: number; change: number; reason: string }[];
}

export interface Belief {
  content: string;        // 신념 내용
  conviction: number;     // 확신 정도 (0~100)
  origin: string;         // 형성 계기
  formedAtYear: number;
  challenged: boolean;    // 도전받은 적 있는지
}

export interface Ability {
  name: string;
  level: 'discovered' | 'practicing' | 'mastered';
  origin: string;
  milestones: { year: number; description: string }[];
}

export interface EmergentProfile {
  displayName: string;          // 현재 이름
  currentAlias: string;         // 현재 이명
  personality: PersonalityTrait[];
  beliefs: Belief[];
  abilities: Ability[];
  speechPatterns: string[];     // 말투 패턴들
  innerConflicts: string[];     // 내적 갈등
  computedAt: number;           // 계산 시점 (연도)
}

export interface CharacterSeed {
  id: string;
  codename: string;            // 코드명 (예: "저주받은 아이")
  name?: string;               // 이름 (나중에 부여)
  birthYear: number;
  birthCondition?: string;     // UNIFIED2: 출생 조건
  initialCondition: string;    // 초기 상황
  initialEnvironment?: string; // UNIFIED2: 초기 환경
  temperament: string;         // 기질 (예: "과묵, 관찰형")
  innateTraits?: string[];     // UNIFIED2: 선천적 특성 배열
  latentAbility: string;       // 잠재 능력
  latentPotentials?: string[]; // UNIFIED2: 잠재력 배열
  physicalTrait: string;       // 신체 특성
  innateAppearance?: string;   // 선천적 외모 특성 (예: "검은 눈동자, 마른 체형")
  wound: string;               // 근원 상처
  roleTendency?: string;       // UNIFIED2: 역할 경향
  color: string;               // 테마 색상 (hex)
}

// UNIFIED2 섹션 8.3 - 시뮬레이션 후 캐릭터 프로필
export interface CharacterProfileV2 {
  seed: CharacterSeed;
  age: number;
  personality: {
    dominantTraits: string[];
    values: string[];
    fears: string[];
  };
  abilities: { name: string; level: number }[];
  appearance: {
    base: string;
    changes: string[];
  };
  relationships: Relationship[];
  alignment: {
    lightDark: number;          // -100(어둠) ~ +100(빛)
    orderChaos: number;         // -100(혼돈) ~ +100(질서)
  };
  emotionalState: {
    dominant: string;
    intensity: number;
  };
  memories: Memory[];
  events: SimulationEvent[];
}

export interface SimulationResponseV2 extends SimulationResponse {
  memories: {
    eventIndex: number;        // events 배열의 인덱스
    content: string;
    imprints: MemoryImprint[];
    emotionalWeight: number;
  }[];
}

// === 서사 문법 시스템 ===

export type NarrativeArcType =
  | 'heroes_journey'    // 영웅의 여정
  | 'tragedy'           // 비극
  | 'transformation'    // 변신
  | 'fall'              // 몰락
  | 'redemption'        // 구원
  | 'revenge';          // 복수

export type BeatType =
  | 'inciting'          // 촉발 사건
  | 'complication'      // 복잡화
  | 'reversal'          // 반전
  | 'crisis'            // 위기
  | 'climax'            // 절정
  | 'resolution';       // 해결

export interface NarrativeBeat {
  type: BeatType;
  description: string;          // 비트 설명
  fulfilled: boolean;
  fulfillmentEventId?: string;  // 이행한 이벤트 ID
  fulfillmentYear?: number;
}

export interface NarrativePhase {
  name: string;                 // 단계 이름 (예: "일상 세계", "시련")
  description: string;          // 단계 설명
  yearRange: [number, number];  // 이 단계의 연도 범위
  requiredBeats: NarrativeBeat[];
  optionalBeats: NarrativeBeat[];
  tensionTarget: number;        // 목표 긴장도 (0~100)
}

export interface CharacterArc {
  characterId: string;
  archetype: NarrativeArcType;
  currentPhase: number;         // 현재 단계 인덱스 (0~N)
  phases: NarrativePhase[];
  tension: number;              // 현재 긴장도 (0~100)
  fulfillment: number;          // 아크 완성도 (0~100, 이행된 비트 비율)
}

export interface MasterArc {
  acts: {
    name: string;
    yearRange: [number, number];
    tensionTarget: number;
    description: string;
  }[];
  currentAct: number;
  overallTension: number;
  keyBeats: NarrativeBeat[];
}

export interface NarrativeGrammarConfig {
  enabled: boolean;
  masterArcType: NarrativeArcType;
  characterArcOverrides?: Record<string, NarrativeArcType>;  // 캐릭터별 아크 지정
  tensionCurve: 'standard' | 'slow_burn' | 'explosive';      // 긴장도 커브 유형
  actCount: 3 | 4 | 5;                                        // 막 수
}

// === NPC Emergence System ===

export type NPCLifecycle = 'mention' | 'encounter' | 'recurring' | 'significant' | 'core';

// NPC role is now a free-form string instead of a fixed enum

export interface NPCAppearance {
  year: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  eventId: string;
  role: string;
  interaction: string;
}

export interface NPC {
  id: string;
  lifecycle: NPCLifecycle;
  role: string;                   // 자유 서술 역할 (예: "수상한 노인", "거리의 약사")

  name?: string;
  alias: string;            // 별명/묘사 ("수상한 노인")
  description: string;
  faction?: string;

  appearances: NPCAppearance[];
  firstSeenYear: number;
  lastSeenYear: number;
  totalAppearances: number;

  relatedCharacters: {
    characterId: string;
    relationship: string;
    sentiment: number;       // -100 ~ +100
  }[];

  motivation?: string;
  secretGoal?: string;
  abilities?: string[];

  seed?: CharacterSeed;     // Core 승격 시 생성
}

export interface NPCPool {
  npcs: NPC[];
  maxActive: number;
}

export interface NPCInteraction {
  eventIndex: number;
  npcAlias: string;
  npcName?: string;
  role: string;                    // 자유 서술 역할
  interaction: string;
  isNew: boolean;
}

export interface SimulationResponseV3 extends SimulationResponseV2 {
  npcInteractions?: NPCInteraction[];
}

// === 스토리 디렉터 시스템 ===

// 세계관 4레이어 확장
export interface WorldCoreRule {
  law: string;                     // "글자에 힘이 깃들어 있다"
  cost: string;                    // "글자를 쓸 때마다 기억을 소모한다"
  implication: string;             // "지식 = 권력 = 생명"
}

export interface WorldHistoricalWound {
  event: string;                   // 역사적 사건
  underlyingConflict: string;      // 근본 갈등
  unresolvedTension: string;       // 미해결 긴장
}

export interface WorldCurrentTension {
  powerStructure: string;          // "야율문이 글자의 힘을 독점"
  oppressionDetail: string;        // "미등록 서생은 범죄자"
  emergingThreat: string;          // "미등록 글자의 힘이 각지에서 목격"
}

// 작가 페르소나
export interface AuthorPersona {
  id: string;
  name: string;
  style: {
    sentenceLength: 'short_punchy' | 'medium_flow' | 'long_literary';
    rhythm: string;
    signature: string;
    avoidance: string[];
  };
  narrative: {
    showDontTell: string;
    dialogueStyle: string;
    descriptionStyle: string;
    pacing: string;
  };
  strengths: string[];
  deliberateQuirks: string[];
  references: string[];
}

// 스토리 디렉터 설정
export interface StoryDirectorConfig {
  enabled: boolean;
  protagonistId: string;           // A 캐릭터 ID
  ratio: {                         // A:B:C 비중
    protagonist: number;           // 기본 60
    antagonist: number;            // 기본 20
    neutral: number;               // 기본 20
  };
  logline: string;                 // "이 소설은 ___한 이야기다"
  authorPersona?: AuthorPersona;
  characterRoles: Record<string, 'protagonist' | 'antagonist' | 'neutral'>;
}

// A 연관도 체크
export type ARelevanceType =
  | 'direct_impact'      // A의 과거/현재/미래에 직접 영향
  | 'foreshadow'         // A와의 만남/충돌의 복선
  | 'theme_mirror'       // A의 테마를 다른 각도에서 비춤
  | 'hidden_truth';      // A가 모르는 진실을 독자에게 공개

export interface ARelevanceCheck {
  eventId: string;
  relevanceTypes: ARelevanceType[];
  score: number;                   // 0: 무관, 1: 약한 연관, 2+: 충분
}

// 떡밥 관리
export interface PlotThread {
  id: string;
  type: 'mystery' | 'foreshadow' | 'character_arc' | 'world_secret';
  title: string;
  description: string;
  plantedInYear: number;
  visibility: 'hidden' | 'subtle' | 'obvious';
  resolvedInYear?: number;
  relatedCharacterId?: string;
}

// 스토리 디렉터 출력
export interface StoryOutline {
  episodes: StoryEpisode[];
  plotThreads: PlotThread[];
  aScreenTime: number;             // A 비중 (%)
}

export interface StoryEpisode {
  episodeNumber: number;
  title: string;
  perspective: 'protagonist' | 'antagonist' | 'neutral';
  events: string[];                // NarrativeEvent IDs
  hookEnd: string;                 // 화 끝 떡밥/긴장
  aRelevance: ARelevanceType[];
}

// === 씨앗 수정 시스템 ===

export type SeedEditType = 'pre_simulation' | 'soft_edit' | 'hard_reset';

// soft_edit 허용 필드
export const SOFT_EDIT_ALLOWED: (keyof CharacterSeed)[] = [
  'innateAppearance', 'latentAbility', 'temperament', 'wound',
];

// soft_edit 잠김 필드
export const SOFT_EDIT_LOCKED: (keyof CharacterSeed)[] = [
  'birthYear', 'initialCondition', 'physicalTrait', 'codename', 'id', 'color',
];

export interface SeedEditLog {
  id: string;
  characterId: string;
  editType: SeedEditType;
  timestamp: string;
  previousSeed: CharacterSeed;
  newSeed: CharacterSeed;
  rewindToAge?: number;
  deletedMemoryCount: number;
  deletedNPCIds: string[];
  affectedMemoryIds: string[];
}

// === 세계 연대기 ===

export interface WorldChronology {
  eras: ChronologyEra[];
  events: ChronologyEvent[];
  generatedAt: string;
  worldState: string;
}

export interface ChronologyEra {
  id: string;
  name: string;
  years: [number, number];
  description: string;
  mood: string;
  dominantFaction?: string;
}

export type ChronologyEventCategory =
  | 'war'             // 전쟁
  | 'discovery'       // 발견
  | 'catastrophe'     // 재앙
  | 'founding'        // 건국/창설
  | 'cultural'        // 문화
  | 'political'       // 정치
  | 'mystery';        // 미스터리

export interface HiddenTruth {
  truth: string;
  revealCondition: string;
  relatedCharacterIds?: string[];
}

export interface ChronologyEvent {
  id: string;
  year: number;
  title: string;
  description: string;
  impact: string;
  category: ChronologyEventCategory;
  isMystery: boolean;
  hiddenTruth?: HiddenTruth;
  relatedFactions?: string[];
  significance: 'minor' | 'major' | 'critical';
}

// === 마일스톤 (Anchor Events) ===

export interface AnchorEvent {
  id: string;
  triggerYear: number;              // 발생 연도 (세계 연도 기준)

  // 사건 내용 (세계 사건)
  event: string;                    // "제국과 마교의 전쟁 발발"
  worldImpact: string;              // "전국이 전장이 됨. 민간인 징집 시작."

  // 캐릭터별 상황 (환경만, 반응은 시뮬레이션이 결정)
  characterSituations: {
    characterId: string;
    situation: string;              // "전장 한가운데에 있다"
  }[];

  // 적용 범위
  scope: 'all' | 'specific';
  targetCharacters?: string[];

  // 필수 여부
  mandatory: boolean;
}

// === 작가 AI — 서사 아크 & 디렉션 시스템 ===

export interface ArcPhase {
  id: string;
  name: string;                    // 작가가 자유 명명: "시련기", "성장기", "각성기" 등
  estimatedAgeRange: string;       // "5~10세" (대략적, 고정 아님)
  intent: string;                  // "스승을 만나 강해지는 시기"
  keyMoments: string[];            // "스승과의 만남", "첫 전투", "능력 부분 각성"
  emotionalArc: string;            // "절망 → 희망 → 자신감"
  endCondition: string;            // "충분히 강해져서 다음 시련을 받을 준비가 되면"
}

export interface ArcRevision {
  year: number;
  reason: string;                  // "캐릭터가 예상과 다르게 반응해서 조정"
  changes: string;                 // 변경 내용 요약
}

export interface AuthorNarrativeArc {
  characterId: string;
  phases: ArcPhase[];
  currentPhaseIndex: number;
  revisions: ArcRevision[];
  designedAt: string;              // ISO timestamp
}

export interface AuthorDirection {
  characterId: string;
  year: number;
  age: number;
  arcPosition: string;             // 서사 아크에서 현재 위치 설명
  narrativeIntent: string;         // 이 캐릭터에게 지금 필요한 것과 이유
  worldPressure: string;           // 이번 연도에 캐릭터에게 닥칠 상황/환경
  avoid: string;                   // 이번에 피해야 할 것
  desiredEffect: string;           // 독자에게 주고 싶은 효과
  phaseTransition?: {
    from: string;
    to: string;
    reason: string;
  } | null;
}

// === 스토리라인 모니터링 시스템 ===

export type StorylineWarningType =
  | 'theme_drift'       // 주제 이탈
  | 'flat_character'    // 평평한 캐릭터
  | 'no_conflict'       // 갈등 부재
  | 'repetitive'        // 반복적 전개
  | 'dead_end'          // 막다른 골목
  | 'pacing';           // 페이싱 문제

export interface StorylineWarning {
  type: StorylineWarningType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  detectedAtAge: number;
}

export interface StorylineMetrics {
  themeAlignment: number;   // 0~100
  coherence: number;        // 0~100
  interest: number;         // 0~100
  characterDepth: number;   // 0~100
  awakeningPotential: number; // 0~100 — "곧 전환점이 올 것 같은 긴장감"
}

export interface StorylinePreview {
  characterId: string;
  year: number;
  narrativeSoFar: string;
  characterSnapshot: string;
  projectedDirection: string;
  metrics: StorylineMetrics;
  warnings: StorylineWarning[];
  generatedAt: string;
}

export type StoryHealth = 'excellent' | 'good' | 'concerning' | 'critical';

export interface IntegratedStoryline {
  characters: StorylinePreview[];
  convergenceStatus: string;
  betrayalPrediction: string;
  overallThemeAlignment: number;
  overallInterest: number;
  storyHealth: StoryHealth;
  recommendation: string;
  generatedAt: string;
}

export type PreviewFrequency = 'auto' | 'semi_auto' | 'manual' | 'off';

export type SimulationStatus = 'idle' | 'running' | 'paused' | 'completed' | 'aborted';

export interface StorylineMonitorConfig {
  previewFrequency: PreviewFrequency;
  autoPauseOnCritical: boolean;
  integratedAnalysisEnabled: boolean;
}

export interface SimulationRun {
  runId: string;
  startedAt: string;
  endedAt?: string;
  status: SimulationStatus;
  abortReason?: string;
  characterSnapshots: Record<string, StorylinePreview>;
  integratedStoryline?: IntegratedStoryline;
  config: SimulationConfig;
  finalYear: number;
}

// === 시뮬레이션 이벤트 (UNIFIED2 섹션 8.3) ===

export interface SimulationEvent {
  age: number;
  event: string;
  sensoryDetail: string;          // 감각적 디테일
  emotionalImpact: {
    emotion: string;
    intensity: number;            // 0~100
  };
  consequences: string[];         // 결과들
  importance: number;             // 0~100
  isTurningPoint: boolean;        // 전환점 여부
}

// === 에피소드 시스템 ===

export type EpisodeStatus = 'planned' | 'drafted' | 'reviewed' | 'final';

export interface EpisodeHooks {
  opening: string;                // 오프닝 훅
  closing: string;                // 클로징 훅 (다음 화 예고)
}

// 독백 톤 5가지 (같은 톤 2화 연속 금지)
export type MonologueTone = '자조' | '관찰' | '냉정' | '감각' | '메타';

export interface Episode {
  id: string;
  number: number;
  title: string;
  status: EpisodeStatus;
  pov: string;                    // 시점 캐릭터 ID (복수 시 콤마 구분)
  viewpointCharacter?: string;    // 시점 캐릭터 이름
  sourceEventIds: string[];       // 활용한 이벤트 ID
  content: string;                // 작가가 쓴 원본
  editedContent?: string;         // 환님이 수정한 본문 (없으면 undefined)
  charCount: number;
  wordCount?: number;             // 단어 수
  authorNote: string;             // 작가 메모
  endHook: string;                // 화 끝 훅 (레거시)
  hooks?: EpisodeHooks;           // 오프닝/클로징 훅
  monologueTone?: MonologueTone;  // 이 화에 사용한 독백 톤
  createdAt: string;
  updatedAt: string;
}

// 에피소드 최종 본문 헬퍼 (환님 수정본 우선)
export function getEpisodeFinalContent(episode: Episode): string {
  return episode.editedContent ?? episode.content;
}

// === 작가 코멘트 시스템 ===

export type CommentType = 'suggestion' | 'question' | 'discovery' | 'warning';

export interface AuthorComment {
  id: string;
  type: CommentType;
  content: string;
  relatedTo: string;              // 관련 대상 (화 번호, 캐릭터, 'NPC', '전체' 등)
  options?: string[];             // 선택지
  selectedOption?: number;        // 선택한 옵션 인덱스
  userResponse?: string;          // 자유 응답
  resolved: boolean;
  createdAt: string;
  resolvedAt?: string;
}

// === 떡밥 (Foreshadowing) ===

export type ForeshadowStatus = 'planted' | 'collected' | 'planned';

export interface Foreshadow {
  id: string;
  content: string;                // 떡밥 내용
  status: ForeshadowStatus;
  plantedEpisode?: number;        // 투하된 화
  collectedEpisode?: number;      // 회수된 화
  relatedCharacters: string[];
  createdAt: string;
}

// === 심플 UI 시스템 (instruction-ui-simplified) ===

// 단순화된 프로젝트 설정
export interface SimplifiedProjectConfig {
  id: string;
  topic: string;                    // 큰 주제 (한 줄)
  storyline: string;                // 스토리라인 (자유 텍스트)
  genre: string;                    // 장르
  tone: string;                     // 톤
  viewpoint: 'first_person' | 'third_person' | string;  // 시점 (1인칭/3인칭)
  authorPersonaId: string;          // 작가 페르소나 ID
  advancedSettings: {
    simulationRange: [number, number];
    eventDensity: 'low' | 'normal' | 'high';
    apiMode: 'fast' | 'quality';
  };
  createdAt: string;
  status: 'creating' | 'ready' | 'in_progress' | 'completed';
}

// 대화 메시지 타입
export type ConversationMessageType =
  | 'author'           // 작가 메시지 (일반)
  | 'author_episode'   // 작가 메시지 (에피소드 본문 포함)
  | 'author_choice'    // 작가 메시지 (선택지 포함)
  | 'user';            // 환님 메시지

// 대화 메시지
export interface ConversationMessage {
  id: string;
  type: ConversationMessageType;
  content: string;                  // 메시지 본문
  episodeContent?: string;          // 에피소드 본문 (type이 author_episode일 때)
  episodeNumber?: number;           // 에피소드 번호
  episodeTitle?: string;            // 에피소드 제목
  choices?: ConversationChoice[];   // 선택지 (type이 author_choice일 때)
  metadata?: {
    episodeId?: string;
    relatedEventIds?: string[];
    arcInfo?: string;
  };
  timestamp: string;
}

// 선택지
export interface ConversationChoice {
  id: string;
  label: string;                    // '연재 승인', '수정 요청', '방향 변경'
  action: 'approve' | 'revise' | 'redirect' | 'write_next' | 'discuss' | 'alt_opening' | 'view_characters' | 'custom';
  selected?: boolean;
}

// 생성 진행 상태
export type GenerationStep =
  | 'storyline_analysis'
  | 'world_building'
  | 'character_design'
  | 'arc_design'
  | 'simulation'
  | 'story_structure';

export interface GenerationProgress {
  currentStep: GenerationStep;
  steps: {
    [K in GenerationStep]: 'pending' | 'in_progress' | 'completed' | 'error';
  };
  simulationProgress?: number;      // 0~100
  message?: string;
}

// === 세계 우선 아키텍처 (7 Layers System) ===

export type LayerName = 'world' | 'coreRules' | 'seeds' | 'heroArc' | 'villainArc' | 'ultimateMystery' | 'novel';
export type LayerStatus = 'pending' | 'drafting' | 'confirmed';

// Layer 1: 세계 (World)
export interface WorldLayer {
  continentName: string;
  geography: string;              // 지형 설명 (작가가 자유 서술)
  cities: CityInfo[];
  landmarks: string[];            // 주요 지형지물
  mapDescription: string;         // 텍스트 기반 지도 묘사
}

export interface CityInfo {
  name: string;
  description: string;            // 특징, 분위기
  location: string;               // "대륙 북서쪽 산맥 기슭"
  significance: string;           // 이야기에서의 의미
}

// Layer 2: 핵심 규칙 (Core Rules) — V2 강화
export interface CoreRulesLayer {
  powerSystem: string;            // 힘/마법 체계
  powerSource: string;            // 힘의 원천
  powerLimits: string;            // 힘의 한계/대가
  magicSystem?: {                 // 마법/능력 체계 (하위 시스템)
    types: string;                // 종류와 분류
    activation: string;           // 발동 조건
    counters: string;             // 상성 관계
    forbidden?: string;           // 금기/금지된 마법
  };
  socialHierarchy?: {             // 계급 사회
    structure: string;            // 누가 위/아래인가
    determinedBy: string;         // 계급 결정 요소
    mobility: string;             // 계급 이동 가능성
    coreConflict: string;         // 계급 간 갈등 핵심
    underclass: string;           // 피지배층의 삶
  };
  legends?: {                     // 전설과 신화
    creationMyth: string;         // 창세 신화
    keyLegends: string[];         // 핵심 전설 1~2개
    legendVsHistory: string;      // 전설과 실제 역사의 차이
    prophecy?: string;            // 예언 (있으면)
  };
  folklore?: {                    // 설화와 전승
    tales: string[];              // 민간 설화들
    regionalVariants?: string;    // 지역별 다른 버전
    hiddenTruths?: string;        // 설화 속 숨겨진 진실
    socialImpact: string;         // 현재 사회에 미치는 영향
  };
  historyEvents?: HistoryEvent[]; // 핵심 역사 사건 3~5개 (시간축)
  worldContradiction?: {          // 세계의 의도적 모순 1~2개
    contradiction: string;        // 모순 내용
    reason: string;               // 해결되지 않는 이유
    connectionToHero: string;     // 주인공 여정과의 연결
  }[];
  races: string;                  // 종족 설명
  history: string;                // 핵심 역사
  currentState: string;           // 현재 세계 상태
  rules: string[];                // 핵심 규칙들 (자유 서술)
}

// 핵심 역사 사건
export interface HistoryEvent {
  when: string;                   // 언제 (예: "800년 전")
  name: string;                   // 사건 이름
  what: string;                   // 무엇이 일어났는가
  why: string;                    // 왜 일어났는가
  trace: string;                  // 현재 세계에 남긴 흔적
  causedBy?: string;              // 이전 사건과의 인과관계
}

// Layer 3: 씨앗 (Seeds) — V2 강화
export interface SeedsLayer {
  factions: FactionSeedInfo[];    // 세력 3~5개
  races: RaceInfo[];              // 종족 상세
  threats: ThreatInfo[];          // 몬스터/위협
  npcs: NPCSeedInfo[];            // 주요 NPC 씨앗
  legendStories?: LegendStory[];  // 전설/설화를 구체적 이야기로 확장
  dailyLife?: {                   // 일상의 뼈대
    economy: string;              // 사람들은 뭘 먹고 사는가
    jobs: string;                 // 돈은 어떻게 버는가 (직업)
    education: string;            // 아이들은 어떻게 자라는가
    crime: string;                // 범죄와 치안
    religion?: string;            // 종교/신앙
  };
}

// 전설/설화 스토리
export interface LegendStory {
  name: string;                   // 전설/설화 이름
  story: string;                  // 구체적 이야기
  heroName?: string;              // 전설 속 영웅 이름
  artifact?: string;              // 전설 속 유물
  location?: string;              // 관련 실제 장소
  usedBy?: string;                // 현재 어떤 세력이 이용하는가
  variants?: string;              // 지역별 다른 버전
}

export interface FactionSeedInfo {
  name: string;
  nature: string;                 // 성격/특징
  base: string;                   // 거점
  goal: string;                   // 목적
  relationship: string;           // 다른 세력과의 관계
}

export interface RaceInfo {
  name: string;
  traits: string;                 // 특성
  territory: string;              // 영역
  culture: string;                // 문화
}

export interface ThreatInfo {
  name: string;
  region: string;                 // 출몰 지역
  nature: string;                 // 성격/특성
  dangerLevel: string;            // 위험도
}

export interface NPCSeedInfo {
  name: string;
  role: string;                   // "상인", "현자", "기사단장" 등
  location: string;
  personality: string;
  hiddenMotivation?: string;      // 숨겨진 동기 (있으면)
}

// Layer 4: 주인공 서사 (Hero Arc) — V2 강화
export interface HeroArcLayer {
  name: string;
  age: number;
  origin: string;                 // 태생
  faction?: string;               // 속한 세력/계층
  environment?: string;           // 자란 환경
  currentStatus?: string;         // 현재 상태 (직업, 능력, 관계)
  coreNarrative: string;          // 핵심 서사
  initialState: string;           // 시작 시점의 상태
  ultimateGoal: string;           // 궁극적 목표

  // 서사의 엔진 — 욕망과 결핍
  desire?: string;                // 표면적 욕망 (가장 원하는 것)
  deficiency?: string;            // 내면적 결핍 (진짜 필요한 것)

  // 무기와 약점
  abilities?: string[];           // 능력/재능
  strengths?: string[];           // 성격적 강점
  fatalWeakness?: string;         // 치명적 약점

  // 배경 인물 (자연 발생) 3~5명
  supportingCharacters?: SupportingCharacter[];

  // 100화 서사 아크
  narrativeArc100?: NarrativeArc100;
}

// 배경 인물
export interface SupportingCharacter {
  name: string;
  relation: string;               // 가족/동료/스승/라이벌/첫사랑 등
  faction?: string;               // 소속 세력
  influence: string;              // 주인공에게 어떤 영향을 주는가
  ownDesire?: string;             // 이 인물 자신의 욕망/사정
  potentialBetrayal?: boolean;    // 배신/이탈 가능성
}

// 100화 서사 아크 구간별 설계
export interface NarrativeArc100 {
  phase1_5: string;               // 1~5화: 어디서 시작하는가 (바닥)
  phase6_20: string;              // 6~20화: 첫 번째 변화
  phase21_50: string;             // 21~50화: 성장과 시련
  phase51_80: string;             // 51~80화: 진짜 갈등 (세계와 충돌)
  phase81_100: string;            // 81~100화: 최종 대결과 변화
}

// Layer 5: 대립 구도 (Conflict Structure) — V2 확장 (삼각 구도)
export interface VillainArcLayer {
  // 메인 빌런
  name: string;
  age?: number;
  origin: string;                 // 태생
  faction?: string;               // 소속 세력
  surfaceGoal?: string;           // 표면적 목표
  motivation: string;             // 동기 (이렇게 된 이유)
  selfJustification?: string;     // 빌런 관점에서의 정당성
  worldMadeMe?: string;           // "이 세계의 이 규칙이 나를 이렇게 만들었다"
  coreNarrative: string;          // 핵심 서사
  relationship: string;           // 주인공과의 관계
  supportingCharacters?: VillainSupport[]; // 빌런 측 인물 2~3명

  // 제3세력 (삼각 구도)
  thirdForce?: ThirdForce;

  // 대립 구도 관계
  vsHero?: string;                // 주인공 vs 빌런: 어디서 충돌하나
  whyNoReconcile?: string;        // 왜 화해할 수 없는가
  commonGround?: string;          // 공통점 (같은 세계의 피해자?)

  // 대립 구도 변화 로드맵 (100화)
  conflictRoadmap?: ConflictRoadmap;
}

// 빌런 측 배경 인물
export interface VillainSupport {
  name: string;
  role: string;                   // 충성하는 부하/배신할 동료/과거의 은인
  ownDesire?: string;             // 자신의 욕망
}

// 제3세력
export interface ThirdForce {
  name: string;                   // 세력 이름
  leader?: string;                // 리더
  goal: string;                   // 목적
  logic: string;                  // 이들만의 논리 (자기 관점에서 정당)
  vsHero: string;                 // 주인공과의 관계 (동맹? 이용? 감시?)
  vsVillain: string;              // 빌런과의 관계 (적대? 경쟁? 공생?)
  entryPoint?: string;            // 이야기에 개입하는 시점
  supportingCharacters?: ThirdForceSupport[]; // 제3세력 측 인물 2~3명
}

// 제3세력 측 인물
export interface ThirdForceSupport {
  name: string;
  role: string;                   // 리더/내부 분열 인물/주인공과 개인적 연결
  ownDesire?: string;
}

// 대립 구도 변화 로드맵 (100화)
export interface ConflictRoadmap {
  phase1_10: string;              // 주인공 vs 세계
  phase11_25: string;             // 주인공 vs 빌런 (메인 갈등 시작)
  phase26_40: string;             // 제3세력 등장 (구도 변화)
  phase41_55: string;             // 임시 동맹
  phase56_70: string;             // 동맹 붕괴 + 삼파전
  phase71_85: string;             // 최악의 위기
  phase86_100: string;            // 최종 구도 재편 + 결말
}

// Layer 6: 떡밥 + 독자 감정 설계 (Ultimate Mystery) — V2 강화
export interface UltimateMysteryLayer {
  // 궁극의 떡밥 (최종 반전)
  surface: string;                // 표면적으로 보이는 것
  truth: string;                  // 실제 진실
  hints: string[];                // 세계 곳곳에 깔릴 힌트들 3~5개
  revealTiming: string;           // 언제 밝혀지는가
  rereadValue?: string;           // 다시 읽으면 "아, 그래서" 포인트

  // 중간 떡밥 (세부 반전) 3~5개
  middleTwists?: MiddleTwist[];

  // 떡밥 연결망
  twistConnections?: string;      // 떡밥 A→B→C→궁극 연결 설명

  // 독자 감정 로드맵 (100화 기준)
  emotionRoadmap?: EmotionRoadmap;
}

// 중간 떡밥 (세부 반전)
export interface MiddleTwist {
  name: string;                   // 떡밥 이름
  truth: string;                  // 실제로 무엇인가
  disguise: string;               // 어떻게 숨기는가 (위장)
  revealEpisode: number;          // 터지는 시점 (화)
  readerEmotion: string;          // 터졌을 때 독자 감정
  connectionToUltimate: string;   // 궁극의 떡밥과의 연결
  hintPlacement?: {               // 힌트 배치
    early?: string;               // 1~10화: 사소한 단서
    middle?: string;              // 30~50화: 미스디렉션
    late?: string;                // 70~90화: 진짜 단서
  };
}

// 독자 감정 로드맵
export interface EmotionRoadmap {
  phase1_5: string;               // 호기심 + 동정
  phase6_15: string;              // 응원 + 기대
  phase16_25: string;             // 통쾌 + 첫 번째 의문
  phase26_40: string;             // 불안 + 의심
  phase41_55: string;             // 충격 + 분노 (배신)
  phase56_70: string;             // 혼란 + 공감 (빌런 이해)
  phase71_85: string;             // 절망 + 희망
  phase86_100: string;            // 전율 + 카타르시스
}

// 전체 프로젝트 (7 레이어 통합)
export interface WorldFirstProject {
  id: string;

  // 메타 정보
  genre: string;
  tone: string;
  viewpoint: 'first_person' | 'third_person' | string;
  authorPersonaId: string;
  initialPrompt?: string;         // 환님이 처음에 준 자유 텍스트

  // 7 Layers
  world: WorldLayer | null;
  coreRules: CoreRulesLayer | null;
  seeds: SeedsLayer | null;
  heroArc: HeroArcLayer | null;
  villainArc: VillainArcLayer | null;
  ultimateMystery: UltimateMysteryLayer | null;

  // 레이어 상태
  layerStatus: Record<LayerName, LayerStatus>;
  currentLayer: LayerName;

  // 타임스탬프
  createdAt: string;
  updatedAt: string;
}

// 레이어 구축 대화 메시지
export type LayerMessageType =
  | 'author_proposal'     // 작가가 레이어 제안
  | 'author_revision'     // 작가가 수정안 제안
  | 'user_feedback'       // 환님 피드백
  | 'layer_confirmed';    // 레이어 확정

export interface LayerBuildMessage {
  id: string;
  layer: LayerName;
  type: LayerMessageType;
  content: string;                // 메시지 본문
  layerData?: unknown;            // 해당 레이어 데이터 (확정 시)
  timestamp: string;
}

// 레이어 구축 선택지
export interface LayerChoice {
  id: string;
  label: string;
  action: 'confirm' | 'revise' | 'regenerate' | 'custom';
}

// === UNIFIED-INSTRUCTION 기반 새 타입들 ===

// 세계 역사 시대 (섹션 4 - 세계 시뮬레이션 1단계)
export interface WorldHistoryEra {
  id: string;
  name: string;                     // 시대 이름 (예: "신들의 시대", "암흑기")
  yearRange: [number, number];      // 시작~끝 연도
  period?: string;                  // UNIFIED2: 기간 텍스트 ("500년~700년")
  description: string;              // 시대 설명
  keyEvents: string[];              // 핵심 사건들
  events?: {                        // UNIFIED2: 상세 이벤트 배열
    year: number;
    event: string;
    impact: string;
  }[];
  factionChanges: string;           // 세력 변화
  worldMood?: string;               // UNIFIED2: 세계 분위기
  notableFigures: string[] | { name: string; description: string }[];  // 주요 인물
  mysteryHints: string[];           // 떡밥 흔적
  mysteryHint?: string;             // UNIFIED2: 단일 힌트
  mood: string;                     // 시대 분위기
  legacy?: string;                  // UNIFIED2: 다음 시대에 미친 영향
}

// 10년 단위 상세화 (섹션 4 - 세계 시뮬레이션 2단계)
export interface DetailedDecade {
  id: string;
  yearRange: [number, number];      // 10년 범위
  period?: string;                  // UNIFIED2: 기간 텍스트
  factionStates: {
    factionName: string;
    status: string;                 // 상태 설명
    influence: number;              // 영향력 (0~100)
  }[];
  factionStatus?: Record<string, string>;  // UNIFIED2: 세력별 상태 맵
  cityStates: {
    cityName: string;
    condition: string;              // 도시 상태
    tension: number;                // 긴장도 (0~100)
  }[];
  worldTension: number;             // 전체 긴장도 (0~100)
  tension?: number;                 // UNIFIED2: 긴장도 별칭
  worldState?: string;              // UNIFIED2: 세계 상태 설명
  majorEvents: string[];            // 이 10년의 주요 사건
  events?: { year: number; event: string }[];  // UNIFIED2: 상세 이벤트
  hints: string[];                  // 복선들
}

// 대화 메시지 (UNIFIED 섹션 10 - Message 타입)
export interface Message {
  id: string;
  role: 'author' | 'user';
  content: string;
  timestamp: string;
  choices?: Choice[];               // 작가가 제시하는 선택지
  episode?: Episode;                // 에피소드가 포함된 메시지
  layerData?: unknown;              // 레이어 확정 데이터
  simulationProgress?: number;      // 시뮬레이션 진행률 (0~100)
}

// 선택지 (UNIFIED 섹션 10 - Choice 타입)
export interface Choice {
  label: string;
  action: string;                   // 'confirm_layer' | 'edit_layer' | 'approve_episode' | 'revise_episode' | 'change_direction' | 'write_next' | ...
}

// 프로젝트 레이어 상태
export interface LayerState<T> {
  status: LayerStatus;
  data: T | null;
}

// 프로젝트 진행 단계 (UNIFIED2 섹션 12)
export type ProjectPhase = 'setup' | 'worldbuilding' | 'simulation' | 'writing';

// 다중 프로젝트 지원 (UNIFIED 섹션 10 - ProjectStore)
export interface Project {
  id: string;

  // 메타 정보
  genre: string;
  tone: string;
  viewpoint: 'first_person' | 'third_person' | string;
  authorPersona: AuthorPersona;
  direction?: string;               // 초기 방향 (환님 입력)
  createdAt: string;
  updatedAt: string;

  // 7 레이어 (상태 포함)
  layers: {
    world: LayerState<WorldLayer>;
    coreRules: LayerState<CoreRulesLayer>;
    seeds: LayerState<SeedsLayer>;
    heroArc: LayerState<HeroArcLayer>;
    villainArc: LayerState<VillainArcLayer>;
    ultimateMystery: LayerState<UltimateMysteryLayer>;
  };
  currentLayer: LayerName;
  currentPhase: ProjectPhase;       // 프로젝트 진행 단계 (UNIFIED2)

  // 세계 시뮬레이션 (3단계)
  worldHistory: {
    eras: WorldHistoryEra[];
    detailedDecades: DetailedDecade[];
    generatedAt?: string;
  };

  // 대화 메시지
  messages: Message[];

  // 캐릭터 (시뮬레이션 결과)
  characters: Character[];
  seeds: CharacterSeed[];
  memoryStacks: Record<string, Memory[]>;
  profiles: Record<string, EmergentProfile>;

  // NPC
  npcPool: NPCPool;

  // 에피소드
  episodes: Episode[];

  // 피드백 누적 학습
  feedbackHistory: Feedback[];

  // 시뮬레이션 상태
  simulationStatus: 'idle' | 'running' | 'paused' | 'complete';
  simulationProgress?: number;
}

// 환님 피드백 (누적 학습용)
export type FeedbackType = 'style' | 'character' | 'plot' | 'pacing' | 'general';

export interface Feedback {
  id: string;
  episodeNumber: number;
  type: FeedbackType;
  content: string;              // "캐릭터 소개를 설명적으로 하지 마"
  isRecurring: boolean;         // true: 모든 다음 화에 적용, false: 1회성
  timestamp: string;
}

// 프로젝트 생성 설정
export interface NewProjectConfig {
  genre: string;
  tone: string;
  viewpoint: 'first_person' | 'third_person' | string;
  authorPersonaId: string;
  direction?: string;               // 초기 방향 (선택)
}
