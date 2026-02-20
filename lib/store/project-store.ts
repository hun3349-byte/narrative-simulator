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
  ProjectPhase,
  Feedback,
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

  // 유틸리티
  reset: () => void;
}

// 초기 프로젝트 생성 헬퍼
function createEmptyProject(config: NewProjectConfig): Project {
  const persona = AUTHOR_PERSONA_PRESETS.find(p => p.id === config.authorPersonaId)
    || AUTHOR_PERSONA_PRESETS[0];

  const now = new Date().toISOString();

  return {
    id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    genre: config.genre,
    tone: config.tone,
    viewpoint: config.viewpoint,
    authorPersona: persona,
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
