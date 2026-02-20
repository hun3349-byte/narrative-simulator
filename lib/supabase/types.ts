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
  episodes: EpisodeJson[];
  feedback_history: FeedbackJson[];
  messages: MessageJson[];
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
  episodes?: EpisodeJson[];
  feedback_history?: FeedbackJson[];
  messages?: MessageJson[];
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
  episodes?: EpisodeJson[];
  feedback_history?: FeedbackJson[];
  messages?: MessageJson[];
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
