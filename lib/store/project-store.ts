'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Project,
  NewProjectConfig,
  LayerName,
  LayerStatus,
  WorldLayer,
  CoreRulesLayer,
  SeedsLayer,
  HeroArcLayer,
  VillainArcLayer,
  UltimateMysteryLayer,
  Message,
  Episode,
  WorldHistoryEra,
  DetailedDecade,
  Character,
  CharacterSeed,
  Memory,
  EmergentProfile,
  NPCPool,
  NPCSeedInfo,
  ProjectPhase,
  Feedback,
  WorldBible,
  EpisodeLog,
  WritingMemory,
  AuthorConfig,
  DualSimulationConfig,
  ProtagonistPrehistory,
  TimelineAdvance,
} from '@/lib/types';
import { AUTHOR_PERSONA_PRESETS } from '@/lib/presets/author-personas';
import {
  saveProjectToSupabase,
  loadProjectsFromSupabase,
  deleteProjectFromSupabase,
  isSupabaseEnabled
} from '@/lib/supabase';

// 레이어 순서
const LAYER_ORDER: LayerName[] = [
  'world',
  'coreRules',
  'seeds',
  'heroArc',
  'villainArc',
  'ultimateMystery',
  'novel',
];

interface ProjectStore {
  // 프로젝트 목록
  projects: Project[];
  currentProjectId: string | null;

  // 현재 프로젝트 getter (편의용)
  getCurrentProject: () => Project | null;

  // 프로젝트 CRUD
  createProject: (config: NewProjectConfig) => string;
  selectProject: (id: string) => void;
  deleteProject: (id: string) => void;

  // Supabase 동기화
  syncCurrentProjectToSupabase: () => Promise<void>;
  loadFromSupabase: () => Promise<void>;
  mergeSupabaseProjects: (supabaseProjects: Project[]) => void;

  // 레이어 관리
  updateLayer: <T>(layerName: Exclude<LayerName, 'novel'>, data: T) => void;
  confirmLayer: (layerName: LayerName) => void;
  setCurrentLayer: (layerName: LayerName) => void;
  reopenLayer: (layerName: Exclude<LayerName, 'novel'>) => void;  // 확정된 레이어 재수정

  // 메시지 관리
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;

  // 세계 역사
  setWorldHistory: (eras: WorldHistoryEra[], decades: DetailedDecade[]) => void;

  // 캐릭터/시뮬레이션
  setCharacters: (characters: Character[]) => void;
  setSeeds: (seeds: CharacterSeed[]) => void;
  addMemory: (characterId: string, memory: Memory) => void;
  setProfiles: (profiles: Record<string, EmergentProfile>) => void;
  setNpcPool: (pool: NPCPool) => void;

  // 캐릭터 관리 (NPC)
  updateNPC: (npcId: string, updates: Partial<NPCSeedInfo>, oldName?: string) => void;
  deleteNPC: (npcId: string) => void;
  getCharacterAppearances: (characterName: string) => number[]; // 등장 에피소드 번호들

  // 에피소드
  addEpisode: (episode: Episode) => void;
  updateEpisode: (id: string, updates: Partial<Episode>) => void;
  deleteEpisode: (id: string) => void;

  // 피드백 누적 학습
  addFeedback: (feedback: Omit<Feedback, 'id' | 'timestamp'>) => void;
  getRecurringFeedback: () => Feedback[];

  // 시뮬레이션 상태
  setSimulationStatus: (status: Project['simulationStatus']) => void;
  setSimulationProgress: (progress: number) => void;

  // 프로젝트 단계 (UNIFIED2)
  setCurrentPhase: (phase: ProjectPhase) => void;

  // 일관성 엔진 (100화 개연성 유지)
  setWorldBible: (worldBible: WorldBible) => void;
  updateWorldBible: (updates: Partial<WorldBible>) => void;
  addEpisodeLog: (log: EpisodeLog) => void;
  updateEpisodeLog: (episodeNumber: number, updates: Partial<EpisodeLog>) => void;

  // 자가진화 피드백 루프 (Writing Memory)
  setWritingMemory: (memory: WritingMemory) => void;
  updateWritingMemory: (updates: Partial<WritingMemory>) => void;
  getWritingMemory: () => WritingMemory | undefined;

  // 이원화 시뮬레이션 (Dual Simulation)
  setDualSimulationConfig: (config: DualSimulationConfig) => void;
  updateDualSimulationConfig: (updates: Partial<DualSimulationConfig>) => void;
  setProtagonistPrehistory: (prehistory: ProtagonistPrehistory) => void;
  addTimelineAdvance: (advance: TimelineAdvance) => void;
  updateTimelineAdvance: (id: string, updates: Partial<TimelineAdvance>) => void;

  // 유틸리티
  reset: () => void;
  resetEpisodes: () => void;  // 에피소드만 초기화 (설정 유지)
  resetProject: () => void;   // 프로젝트 완전 리셋 (세계관부터 다시)
}

// 초기 프로젝트 생성 헬퍼
function createEmptyProject(config: NewProjectConfig): Project {
  // 레거시: authorPersonaId가 있으면 기존 방식 사용
  // 새 시스템: authorConfig가 있으면 새 방식 사용
  const persona = config.authorPersonaId
    ? (AUTHOR_PERSONA_PRESETS.find(p => p.id === config.authorPersonaId) || AUTHOR_PERSONA_PRESETS[0])
    : AUTHOR_PERSONA_PRESETS[0]; // authorConfig가 있어도 fallback으로 기본 페르소나 유지

  const now = new Date().toISOString();

  return {
    id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    genre: config.genre,
    tone: config.tone,
    viewpoint: config.viewpoint,
    authorPersona: persona,
    authorConfig: config.authorConfig, // 새로운 작가 설정
    direction: config.direction,
    createdAt: now,
    updatedAt: now,

    layers: {
      world: { status: 'pending', data: null },
      coreRules: { status: 'pending', data: null },
      seeds: { status: 'pending', data: null },
      heroArc: { status: 'pending', data: null },
      villainArc: { status: 'pending', data: null },
      ultimateMystery: { status: 'pending', data: null },
    },
    currentLayer: 'world',
    currentPhase: 'setup',

    worldHistory: {
      eras: [],
      detailedDecades: [],
    },

    messages: [],
    characters: [],
    seeds: [],
    memoryStacks: {},
    profiles: {},
    npcPool: { npcs: [], maxActive: 30 },
    episodes: [],
    feedbackHistory: [],

    simulationStatus: 'idle',

    // 공개 설정 (기본값: 공개)
    isPublic: true,
  };
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: null,

      getCurrentProject: () => {
        const { projects, currentProjectId } = get();
        if (!currentProjectId) return null;
        return projects.find(p => p.id === currentProjectId) || null;
      },

      createProject: (config) => {
        const newProject = createEmptyProject(config);
        set(state => ({
          projects: [...state.projects, newProject],
          currentProjectId: newProject.id,
        }));
        // Supabase 동기화 (비동기, 실패해도 계속 진행)
        if (isSupabaseEnabled) {
          saveProjectToSupabase(newProject).catch(console.warn);
        }
        return newProject.id;
      },

      selectProject: (id) => {
        set({ currentProjectId: id });
      },

      deleteProject: (id) => {
        set(state => ({
          projects: state.projects.filter(p => p.id !== id),
          currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
        }));
        // Supabase에서도 삭제
        if (isSupabaseEnabled) {
          deleteProjectFromSupabase(id).catch(console.warn);
        }
      },

      updateLayer: (layerName, data) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p =>
            p.id === currentProjectId
              ? {
                  ...p,
                  layers: {
                    ...p.layers,
                    [layerName]: { status: 'drafting' as LayerStatus, data },
                  },
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        });
        // Supabase 동기화
        get().syncCurrentProjectToSupabase();
      },

      confirmLayer: (layerName) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        const currentIndex = LAYER_ORDER.indexOf(layerName);
        const nextLayer = currentIndex < LAYER_ORDER.length - 1
          ? LAYER_ORDER[currentIndex + 1]
          : 'novel';

        set({
          projects: projects.map(p => {
            if (p.id !== currentProjectId) return p;

            // novel 레이어는 layers 객체에 없음
            if (layerName === 'novel') {
              return {
                ...p,
                currentLayer: 'novel',
                updatedAt: new Date().toISOString(),
              };
            }

            return {
              ...p,
              layers: {
                ...p.layers,
                [layerName]: {
                  ...p.layers[layerName as keyof typeof p.layers],
                  status: 'confirmed' as LayerStatus,
                },
              },
              currentLayer: nextLayer,
              updatedAt: new Date().toISOString(),
            };
          }),
        });
        // Supabase 동기화
        get().syncCurrentProjectToSupabase();
      },

      setCurrentLayer: (layerName) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p =>
            p.id === currentProjectId
              ? { ...p, currentLayer: layerName, updatedAt: new Date().toISOString() }
              : p
          ),
        });
      },

      reopenLayer: (layerName) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p => {
            if (p.id !== currentProjectId) return p;

            return {
              ...p,
              layers: {
                ...p.layers,
                [layerName]: {
                  ...p.layers[layerName],
                  status: 'drafting' as LayerStatus,
                },
              },
              currentLayer: layerName,
              updatedAt: new Date().toISOString(),
            };
          }),
        });
      },

      addMessage: (message) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        const newMessage: Message = {
          ...message,
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          timestamp: new Date().toISOString(),
        };

        set({
          projects: projects.map(p =>
            p.id === currentProjectId
              ? { ...p, messages: [...p.messages, newMessage] }
              : p
          ),
        });
      },

      clearMessages: () => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p =>
            p.id === currentProjectId
              ? { ...p, messages: [] }
              : p
          ),
        });
      },

      setWorldHistory: (eras, decades) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p =>
            p.id === currentProjectId
              ? {
                  ...p,
                  worldHistory: {
                    eras,
                    detailedDecades: decades,
                    generatedAt: new Date().toISOString(),
                  },
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        });
      },

      setCharacters: (characters) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p =>
            p.id === currentProjectId
              ? { ...p, characters, updatedAt: new Date().toISOString() }
              : p
          ),
        });
      },

      setSeeds: (seeds) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p =>
            p.id === currentProjectId
              ? { ...p, seeds, updatedAt: new Date().toISOString() }
              : p
          ),
        });
      },

      addMemory: (characterId, memory) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p => {
            if (p.id !== currentProjectId) return p;

            const existing = p.memoryStacks[characterId] || [];
            return {
              ...p,
              memoryStacks: {
                ...p.memoryStacks,
                [characterId]: [...existing, memory],
              },
            };
          }),
        });
      },

      setProfiles: (profiles) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p =>
            p.id === currentProjectId
              ? { ...p, profiles, updatedAt: new Date().toISOString() }
              : p
          ),
        });
      },

      setNpcPool: (pool) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p =>
            p.id === currentProjectId
              ? { ...p, npcPool: pool, updatedAt: new Date().toISOString() }
              : p
          ),
        });
      },

      // 캐릭터 관리 (NPC)
      updateNPC: (npcId, updates, oldName) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p => {
            if (p.id !== currentProjectId) return p;

            // seeds 레이어에서 NPC 업데이트
            const seedsData = p.layers.seeds.data as SeedsLayer | null;
            if (!seedsData?.npcs) return p;

            const updatedNpcs = seedsData.npcs.map(npc =>
              npc.id === npcId ? { ...npc, ...updates } : npc
            );

            // World Bible에서 캐릭터 이름 업데이트 (이름이 변경된 경우)
            let updatedWorldBible = p.worldBible;
            if (oldName && updates.name && oldName !== updates.name && p.worldBible?.characters) {
              const newCharacters = { ...p.worldBible.characters };
              if (newCharacters[oldName]) {
                newCharacters[updates.name] = newCharacters[oldName];
                delete newCharacters[oldName];
              }
              updatedWorldBible = {
                ...p.worldBible,
                characters: newCharacters,
                lastUpdatedAt: new Date().toISOString(),
              };
            }

            // Episode Log에서 캐릭터 이름 업데이트 (이름이 변경된 경우)
            let updatedEpisodeLogs = p.episodeLogs;
            const newName = updates.name;
            if (oldName && newName && oldName !== newName && p.episodeLogs) {
              updatedEpisodeLogs = p.episodeLogs.map(log => ({
                ...log,
                scenes: log.scenes?.map(scene => ({
                  ...scene,
                  characters: scene.characters?.map(c => c === oldName ? newName : c).filter((c): c is string => c !== undefined) || [],
                })) || [],
                characterChanges: log.characterChanges ?
                  Object.fromEntries(
                    Object.entries(log.characterChanges).map(([k, v]) =>
                      [k === oldName ? newName : k, v]
                    )
                  ) : {},
              }));
            }

            return {
              ...p,
              layers: {
                ...p.layers,
                seeds: {
                  ...p.layers.seeds,
                  data: { ...seedsData, npcs: updatedNpcs },
                },
              },
              worldBible: updatedWorldBible,
              episodeLogs: updatedEpisodeLogs,
              updatedAt: new Date().toISOString(),
            };
          }),
        });
        get().syncCurrentProjectToSupabase();
      },

      deleteNPC: (npcId) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p => {
            if (p.id !== currentProjectId) return p;

            const seedsData = p.layers.seeds.data as SeedsLayer | null;
            if (!seedsData?.npcs) return p;

            // 삭제할 NPC 찾기
            const npcToDelete = seedsData.npcs.find(npc => npc.id === npcId);
            const updatedNpcs = seedsData.npcs.filter(npc => npc.id !== npcId);

            // World Bible에서도 제거
            let updatedWorldBible = p.worldBible;
            if (npcToDelete && p.worldBible?.characters) {
              const newCharacters = { ...p.worldBible.characters };
              delete newCharacters[npcToDelete.name];
              updatedWorldBible = {
                ...p.worldBible,
                characters: newCharacters,
                lastUpdatedAt: new Date().toISOString(),
              };
            }

            return {
              ...p,
              layers: {
                ...p.layers,
                seeds: {
                  ...p.layers.seeds,
                  data: { ...seedsData, npcs: updatedNpcs },
                },
              },
              worldBible: updatedWorldBible,
              updatedAt: new Date().toISOString(),
            };
          }),
        });
        get().syncCurrentProjectToSupabase();
      },

      getCharacterAppearances: (characterName) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return [];

        const project = projects.find(p => p.id === currentProjectId);
        if (!project) return [];

        // 에피소드 본문에서 캐릭터 이름 검색
        const appearances: number[] = [];
        for (const episode of project.episodes) {
          const content = episode.editedContent || episode.content;
          if (content && content.includes(characterName)) {
            appearances.push(episode.number);
          }
        }

        return appearances;
      },

      addEpisode: (episode) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p =>
            p.id === currentProjectId
              ? { ...p, episodes: [...p.episodes, episode], updatedAt: new Date().toISOString() }
              : p
          ),
        });
        // Supabase 동기화
        get().syncCurrentProjectToSupabase();
      },

      updateEpisode: (id, updates) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p =>
            p.id === currentProjectId
              ? {
                  ...p,
                  episodes: p.episodes.map(ep =>
                    ep.id === id ? { ...ep, ...updates, updatedAt: new Date().toISOString() } : ep
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        });
        // Supabase 동기화
        get().syncCurrentProjectToSupabase();
      },

      deleteEpisode: (id) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p =>
            p.id === currentProjectId
              ? { ...p, episodes: p.episodes.filter(ep => ep.id !== id), updatedAt: new Date().toISOString() }
              : p
          ),
        });
      },

      addFeedback: (feedback) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        const newFeedback: Feedback = {
          ...feedback,
          id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          timestamp: new Date().toISOString(),
        };

        set({
          projects: projects.map(p =>
            p.id === currentProjectId
              ? {
                  ...p,
                  // 기존 프로젝트에 feedbackHistory가 없을 수 있음
                  feedbackHistory: [...(p.feedbackHistory || []), newFeedback],
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        });
        // Supabase 동기화
        get().syncCurrentProjectToSupabase();
      },

      getRecurringFeedback: () => {
        const project = get().getCurrentProject();
        if (!project) return [];
        // 기존 프로젝트에 feedbackHistory가 없을 수 있음
        if (!project.feedbackHistory) return [];
        return project.feedbackHistory.filter(f => f.isRecurring);
      },

      setSimulationStatus: (status) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p =>
            p.id === currentProjectId
              ? { ...p, simulationStatus: status, updatedAt: new Date().toISOString() }
              : p
          ),
        });
      },

      setSimulationProgress: (progress) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p =>
            p.id === currentProjectId
              ? { ...p, simulationProgress: progress }
              : p
          ),
        });
      },

      setCurrentPhase: (phase) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p =>
            p.id === currentProjectId
              ? { ...p, currentPhase: phase, updatedAt: new Date().toISOString() }
              : p
          ),
        });
      },

      // === 일관성 엔진 ===

      setWorldBible: (worldBible) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p =>
            p.id === currentProjectId
              ? { ...p, worldBible, updatedAt: new Date().toISOString() }
              : p
          ),
        });
        // Supabase 동기화
        get().syncCurrentProjectToSupabase();
      },

      updateWorldBible: (updates) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p => {
            if (p.id !== currentProjectId || !p.worldBible) return p;
            return {
              ...p,
              worldBible: {
                ...p.worldBible,
                ...updates,
                lastUpdatedAt: new Date().toISOString(),
              },
              updatedAt: new Date().toISOString(),
            };
          }),
        });
        // Supabase 동기화
        get().syncCurrentProjectToSupabase();
      },

      addEpisodeLog: (log) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p => {
            if (p.id !== currentProjectId) return p;
            const episodeLogs = p.episodeLogs || [];
            // 같은 화수의 기존 로그가 있으면 교체
            const existingIndex = episodeLogs.findIndex(
              l => l.episodeNumber === log.episodeNumber
            );
            if (existingIndex >= 0) {
              const newLogs = [...episodeLogs];
              newLogs[existingIndex] = log;
              return { ...p, episodeLogs: newLogs, updatedAt: new Date().toISOString() };
            }
            return {
              ...p,
              episodeLogs: [...episodeLogs, log],
              updatedAt: new Date().toISOString(),
            };
          }),
        });
        // Supabase 동기화
        get().syncCurrentProjectToSupabase();
      },

      updateEpisodeLog: (episodeNumber, updates) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p => {
            if (p.id !== currentProjectId) return p;
            const episodeLogs = p.episodeLogs || [];
            return {
              ...p,
              episodeLogs: episodeLogs.map(log =>
                log.episodeNumber === episodeNumber
                  ? { ...log, ...updates }
                  : log
              ),
              updatedAt: new Date().toISOString(),
            };
          }),
        });
      },

      // === 자가진화 피드백 루프 (Writing Memory) ===

      setWritingMemory: (memory) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p =>
            p.id === currentProjectId
              ? { ...p, writingMemory: memory, updatedAt: new Date().toISOString() }
              : p
          ),
        });
        // Supabase 동기화
        get().syncCurrentProjectToSupabase();
      },

      updateWritingMemory: (updates) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p => {
            if (p.id !== currentProjectId) return p;
            const currentMemory = p.writingMemory || {
              styleRules: [],
              editPatterns: [],
              qualityTracker: [],
              commonMistakes: [],
              lastUpdatedAt: new Date().toISOString(),
              totalEpisodes: 0,
              averageEditAmount: 0,
              directAdoptionRate: 0,
            };
            return {
              ...p,
              writingMemory: {
                ...currentMemory,
                ...updates,
                lastUpdatedAt: new Date().toISOString(),
              },
              updatedAt: new Date().toISOString(),
            };
          }),
        });
        // Supabase 동기화
        get().syncCurrentProjectToSupabase();
      },

      getWritingMemory: () => {
        const project = get().getCurrentProject();
        return project?.writingMemory;
      },

      // === 이원화 시뮬레이션 ===

      setDualSimulationConfig: (config) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p =>
            p.id === currentProjectId
              ? { ...p, dualSimulationConfig: config, updatedAt: new Date().toISOString() }
              : p
          ),
        });
        // Supabase 동기화
        get().syncCurrentProjectToSupabase();
      },

      updateDualSimulationConfig: (updates) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p => {
            if (p.id !== currentProjectId) return p;
            const currentConfig = p.dualSimulationConfig || {
              worldHistory: { startYearsBefore: 500, endYearsBefore: 0, unit: 100 },
              protagonist: { prehistoryStart: 30, novelStartAge: 15, currentAge: 15, prehistoryUnit: 10 },
            };
            return {
              ...p,
              dualSimulationConfig: {
                ...currentConfig,
                ...updates,
                worldHistory: updates.worldHistory
                  ? { ...currentConfig.worldHistory, ...updates.worldHistory }
                  : currentConfig.worldHistory,
                protagonist: updates.protagonist
                  ? { ...currentConfig.protagonist, ...updates.protagonist }
                  : currentConfig.protagonist,
              },
              updatedAt: new Date().toISOString(),
            };
          }),
        });
        // Supabase 동기화
        get().syncCurrentProjectToSupabase();
      },

      setProtagonistPrehistory: (prehistory) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p =>
            p.id === currentProjectId
              ? { ...p, protagonistPrehistory: prehistory, updatedAt: new Date().toISOString() }
              : p
          ),
        });
        // Supabase 동기화
        get().syncCurrentProjectToSupabase();
      },

      addTimelineAdvance: (advance) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p => {
            if (p.id !== currentProjectId) return p;
            const currentAdvances = p.timelineAdvances || [];
            return {
              ...p,
              timelineAdvances: [...currentAdvances, advance],
              updatedAt: new Date().toISOString(),
            };
          }),
        });
        // Supabase 동기화
        get().syncCurrentProjectToSupabase();
      },

      updateTimelineAdvance: (id, updates) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        set({
          projects: projects.map(p => {
            if (p.id !== currentProjectId) return p;
            const currentAdvances = p.timelineAdvances || [];
            return {
              ...p,
              timelineAdvances: currentAdvances.map(adv =>
                adv.id === id ? { ...adv, ...updates } : adv
              ),
              updatedAt: new Date().toISOString(),
            };
          }),
        });
        // Supabase 동기화
        get().syncCurrentProjectToSupabase();
      },

      // Supabase 동기화: 현재 프로젝트를 Supabase에 저장
      syncCurrentProjectToSupabase: async () => {
        if (!isSupabaseEnabled) return;

        const project = get().getCurrentProject();
        if (!project) return;

        const result = await saveProjectToSupabase(project);
        if (!result.success) {
          console.warn('Supabase sync failed:', result.error);
        }
      },

      // Supabase에서 프로젝트 불러오기
      loadFromSupabase: async () => {
        if (!isSupabaseEnabled) return;

        const result = await loadProjectsFromSupabase();
        if (result.error) {
          console.warn('Supabase load failed:', result.error);
          return;
        }

        if (result.projects.length > 0) {
          get().mergeSupabaseProjects(result.projects);
        }
      },

      // Supabase 프로젝트를 로컬과 병합
      mergeSupabaseProjects: (supabaseProjects: Project[]) => {
        const { projects: localProjects } = get();
        const mergedProjects: Project[] = [...localProjects];

        for (const supaProject of supabaseProjects) {
          const localIndex = mergedProjects.findIndex(p => p.id === supaProject.id);
          if (localIndex === -1) {
            // 로컬에 없는 프로젝트 추가
            mergedProjects.push(supaProject);
          } else {
            // 더 최근에 업데이트된 것으로 교체
            const localUpdated = new Date(mergedProjects[localIndex].updatedAt || 0);
            const supaUpdated = new Date(supaProject.updatedAt || 0);
            if (supaUpdated > localUpdated) {
              mergedProjects[localIndex] = supaProject;
            }
          }
        }

        set({ projects: mergedProjects });
      },

      reset: () => {
        set({
          projects: [],
          currentProjectId: null,
        });
      },

      resetEpisodes: () => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        const updatedProjects = projects.map(p =>
          p.id === currentProjectId
            ? {
                ...p,
                episodes: [],
                episodeLogs: [],
                writingMemory: undefined,
                feedbackHistory: [],
                // currentPhase는 'novel'로 유지 (세계관 설정은 그대로)
                updatedAt: new Date().toISOString(),
              }
            : p
        );

        set({ projects: updatedProjects });

        // Supabase 동기화
        const project = updatedProjects.find(p => p.id === currentProjectId);
        if (project && isSupabaseEnabled) {
          saveProjectToSupabase(project).catch(err => console.warn('Supabase sync failed:', err));
        }
      },

      resetProject: () => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;

        const updatedProjects = projects.map(p =>
          p.id === currentProjectId
            ? {
                ...p,
                layers: {
                  world: { status: 'pending' as const, data: null },
                  coreRules: { status: 'pending' as const, data: null },
                  seeds: { status: 'pending' as const, data: null },
                  heroArc: { status: 'pending' as const, data: null },
                  villainArc: { status: 'pending' as const, data: null },
                  ultimateMystery: { status: 'pending' as const, data: null },
                },
                currentLayer: 'world' as const,
                currentPhase: 'setup' as const,
                episodes: [],
                episodeLogs: [],
                writingMemory: undefined,
                feedbackHistory: [],
                messages: [],
                worldBible: undefined,
                worldHistory: { eras: [], detailedDecades: [] },
                characters: [],
                seeds: [],
                memoryStacks: {},
                profiles: {},
                npcPool: { npcs: [], maxActive: 30 },
                updatedAt: new Date().toISOString(),
              }
            : p
        );

        set({ projects: updatedProjects });

        // Supabase 동기화
        const project = updatedProjects.find(p => p.id === currentProjectId);
        if (project && isSupabaseEnabled) {
          saveProjectToSupabase(project).catch(err => console.warn('Supabase sync failed:', err));
        }
      },
    }),
    {
      name: 'narrative-projects',
      partialize: (state) => ({
        projects: state.projects,
        currentProjectId: state.currentProjectId,
      }),
    }
  )
);
