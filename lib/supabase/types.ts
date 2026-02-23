// Supabase Database Types

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: ProjectRow;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
      };
    };
  };
}

export interface ProjectRow {
  id: string;
  user_id: string;
  title: string;
  genre: string;
  tone: string;
  viewpoint: string;
  direction: string | null;
  author_persona: AuthorPersonaJson;
  layers: LayersJson;
  layer_status: LayerStatusJson;
  current_layer: string;
  current_phase: string;
  world_history: WorldHistoryJson | null;
  world_bible: WorldBibleJson | null;
  episode_logs: EpisodeLogJson[];
  episodes: EpisodeJson[];
  feedback_history: FeedbackJson[];
  messages: MessageJson[];
  writing_memory: WritingMemoryJson | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectInsert {
  id: string;
  user_id: string;
  title: string;
  genre: string;
  tone: string;
  viewpoint: string;
  direction?: string | null;
  author_persona: AuthorPersonaJson;
  layers: LayersJson;
  layer_status: LayerStatusJson;
  current_layer: string;
  current_phase: string;
  world_history?: WorldHistoryJson | null;
  world_bible?: WorldBibleJson | null;
  episode_logs?: EpisodeLogJson[];
  episodes?: EpisodeJson[];
  feedback_history?: FeedbackJson[];
  messages?: MessageJson[];
  writing_memory?: WritingMemoryJson | null;
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectUpdate {
  title?: string;
  genre?: string;
  tone?: string;
  viewpoint?: string;
  direction?: string | null;
  author_persona?: AuthorPersonaJson;
  layers?: LayersJson;
  layer_status?: LayerStatusJson;
  current_layer?: string;
  current_phase?: string;
  world_history?: WorldHistoryJson | null;
  world_bible?: WorldBibleJson | null;
  episode_logs?: EpisodeLogJson[];
  episodes?: EpisodeJson[];
  feedback_history?: FeedbackJson[];
  messages?: MessageJson[];
  writing_memory?: WritingMemoryJson | null;
  is_public?: boolean;
  updated_at?: string;
}

// JSON 타입들
export interface AuthorPersonaJson {
  id: string;
  name: string;
  style?: unknown;
}

export interface LayersJson {
  world: unknown | null;
  coreRules: unknown | null;
  seeds: unknown | null;
  heroArc: unknown | null;
  villainArc: unknown | null;
  ultimateMystery: unknown | null;
}

export interface LayerStatusJson {
  world: string;
  coreRules: string;
  seeds: string;
  heroArc: string;
  villainArc: string;
  ultimateMystery: string;
  novel: string;
}

export interface WorldHistoryJson {
  eras: unknown[];
  detailedDecades: unknown[];
}

// 일관성 엔진용 타입
export interface WorldBibleJson {
  worldSummary: string;
  rules: {
    powerSystem: string;
    magicTypes?: string;
    socialStructure: string;
    keyHistory: string;
    contradiction?: string;
  };
  characters: {
    [name: string]: {
      core: string;
      desire: string;
      deficiency?: string;
      weakness: string;
      currentState: string;
    }
  };
  factions: string;
  breadcrumbs: {
    [name: string]: {
      truth: string;
      status: 'hidden' | 'hinted' | 'suspected' | 'revealed';
      lastMentionedEp: number;
      plannedRevealEp?: number;
    }
  };
  prophecy?: string;
  legends?: string[];
  generatedAt: string;
  lastUpdatedAt: string;
  tokenCount?: number;
}

export interface EpisodeLogJson {
  episodeNumber: number;
  summary: string;
  scenes: {
    location: string;
    characters: string[];
    event: string;
  }[];
  characterChanges: {
    [name: string]: string;
  };
  relationshipChanges: {
    who: string;
    withWhom: string;
    change: string;
  }[];
  breadcrumbActivity: {
    advanced: string[];
    newlyPlanted: string[];
    hintGiven: string[];
  };
  cliffhangerType: string;
  cliffhangerContent: string;
  unresolvedTensions: string[];
  dominantMonologueTone: string;
  miniArcPosition: number;
  buildupPhase: string;
  generatedAt: string;
}

export interface EpisodeJson {
  id: string;
  number: number;
  title: string;
  content: string;
  editedContent?: string;
  charCount: number;
  status: string;
  pov: string;
  sourceEventIds: string[];
  authorNote: string;
  endHook: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackJson {
  id: string;
  episodeNumber: number;
  type: string;
  content: string;
  isRecurring: boolean;
  timestamp: string;
}

export interface MessageJson {
  id: string;
  role: string;
  content: string;
  layerData?: unknown;
  choices?: unknown[];
  episode?: unknown;
  timestamp: string;
}

// Writing Memory (자가진화 피드백 루프)
export interface WritingMemoryJson {
  styleRules: {
    id: string;
    category: string;
    rule: string;
    source: string;
    confidence: number;
    examples?: string[];
    counterExamples?: string[];
    createdAt: string;
    lastAppliedAt?: string;
  }[];
  editPatterns: {
    id: string;
    patternType: string;
    description: string;
    originalPattern: string;
    correctedPattern: string;
    frequency: number;
    examples: { original: string; edited: string; episodeNumber: number }[];
    createdAt: string;
  }[];
  qualityTracker: {
    episodeNumber: number;
    originalCharCount: number;
    finalCharCount: number;
    editAmount: number;
    adoptedDirectly: boolean;
    feedbackCount: number;
    revisionCount: number;
    status: string;
    createdAt: string;
  }[];
  commonMistakes: {
    id: string;
    category: string;
    description: string;
    frequency: number;
    lastOccurred: number;
    severity: string;
    avoidanceRule: string;
    createdAt: string;
  }[];
  lastUpdatedAt: string;
  totalEpisodes: number;
  averageEditAmount: number;
  directAdoptionRate: number;
}

// 탐색 페이지용 프로젝트 요약
export interface PublicProjectSummary {
  id: string;
  title: string;
  genre: string;
  tone: string;
  authorPersonaName: string;
  layersCompleted: number;  // 완료된 레이어 수 (0-6)
  episodeCount: number;
  createdAt: string;
  updatedAt: string;
}

// 공유용 프로젝트 데이터 (스포일러 제외)
export interface SharedProjectData {
  id: string;
  title: string;
  genre: string;
  tone: string;
  viewpoint: string;
  authorPersona: {
    name: string;
  };
  // 세계관 (스포일러 아님)
  world: {
    continentName?: string;
    geography?: string;
    cities?: Array<{ name: string; description: string }>;
  } | null;
  // 주인공 기본 정보만
  hero: {
    name?: string;
    origin?: string;
    coreNarrative?: string;
  } | null;
  // 에피소드 (final 상태만)
  episodes: Array<{
    number: number;
    title: string;
    content: string;
    charCount: number;
  }>;
  // 빌런/떡밥은 제외 (스포일러)
}
