import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Character,
  CharacterArc,
  CharacterSeed,
  MasterArc,
  NPC,
  NarrativeEvent,
  NarrativeGrammarConfig,
  NPCPool,
  WorldEvent,
  SimulationState,
  Memory,
  EmergentProfile,
  StoryDirectorConfig,
  SeedEditLog,
  SeedEditType,
  SOFT_EDIT_ALLOWED,
  SimulationStatus,
  StorylinePreview,
  IntegratedStoryline,
  StorylineMonitorConfig,
  SimulationRun,
  AuthorNarrativeArc,
  Episode,
  AuthorComment,
  Foreshadow,
  SimplifiedProjectConfig,
  ConversationMessage,
  GenerationProgress,
  // World First Architecture
  WorldFirstProject,
  LayerBuildMessage,
  LayerName,
  LayerStatus,
  WorldLayer,
  CoreRulesLayer,
  SeedsLayer,
  HeroArcLayer,
  VillainArcLayer,
  UltimateMysteryLayer,
} from '../types';
import worldSettings from '../../data/world-settings.json';

interface SimulationStoreV2 {
  seeds: CharacterSeed[];
  memoryStacks: Record<string, Memory[]>;
  profiles: Record<string, EmergentProfile>;
}

interface SimulationStoreGrammar {
  grammarConfig?: NarrativeGrammarConfig;
  characterArcs: CharacterArc[];
  masterArc?: MasterArc;
}

interface SimulationStoreNPC {
  npcPool: NPCPool;
}

interface SimulationStoreDirector {
  storyDirectorConfig?: StoryDirectorConfig;
}

interface SimulationStoreSeedEdit {
  seedEditHistory: SeedEditLog[];
}

interface SimulationStoreAuthorAI {
  narrativeArcs: Record<string, AuthorNarrativeArc>;
}

interface SimulationStoreWriting {
  episodes: Episode[];
  authorComments: AuthorComment[];
  foreshadows: Foreshadow[];
}

interface SimulationStoreConversation {
  simplifiedProject: SimplifiedProjectConfig | null;
  conversationMessages: ConversationMessage[];
  generationProgress: GenerationProgress | null;
  currentEpisodeNumber: number;
}

// World First Architecture
interface SimulationStoreWorldFirst {
  worldFirstProject: WorldFirstProject | null;
  layerBuildMessages: LayerBuildMessage[];
}

interface SimulationStoreMonitor {
  simulationStatus: SimulationStatus;
  sessionId: string | null;
  storylinePreviews: Record<string, StorylinePreview>;
  integratedStoryline: IntegratedStoryline | null;
  monitorConfig: StorylineMonitorConfig;
  simulationHistory: SimulationRun[];
  pendingWarning: IntegratedStoryline | null;
}

interface SimulationStore extends SimulationState, SimulationStoreV2, SimulationStoreGrammar, SimulationStoreNPC, SimulationStoreDirector, SimulationStoreSeedEdit, SimulationStoreAuthorAI, SimulationStoreWriting, SimulationStoreMonitor, SimulationStoreConversation, SimulationStoreWorldFirst {
  setRunning: (running: boolean) => void;
  setCurrentYear: (year: number) => void;
  setProgress: (progress: number) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  setCharacters: (characters: Character[]) => void;
  setWorldEvents: (worldEvents: WorldEvent[]) => void;
  addEvent: (event: NarrativeEvent) => void;
  addEvents: (events: NarrativeEvent[]) => void;
  // V2 actions
  setSeeds: (seeds: CharacterSeed[]) => void;
  addMemories: (characterId: string, memories: Memory[]) => void;
  setMemoryStacks: (memoryStacks: Record<string, Memory[]>) => void;
  setProfiles: (profiles: Record<string, EmergentProfile>) => void;
  // Grammar actions
  setGrammarConfig: (config: NarrativeGrammarConfig | undefined) => void;
  setCharacterArcs: (arcs: CharacterArc[]) => void;
  setMasterArc: (arc: MasterArc | undefined) => void;
  // NPC actions
  setNPCPool: (pool: NPCPool) => void;
  addNPC: (npc: NPC) => void;
  updateNPC: (id: string, updates: Partial<NPC>) => void;
  promoteNPCToCore: (npcId: string) => void;
  // Story Director actions
  setStoryDirectorConfig: (config: StoryDirectorConfig | undefined) => void;
  // Author AI actions
  setNarrativeArcs: (arcs: Record<string, AuthorNarrativeArc>) => void;
  updateNarrativeArc: (characterId: string, arc: AuthorNarrativeArc) => void;
  // Seed Edit actions
  editSeed: (characterId: string, editType: SeedEditType, newSeed: CharacterSeed, rewindToAge?: number) => void;
  clearSeedEditHistory: () => void;
  // Writing actions
  setEpisodes: (episodes: Episode[]) => void;
  addEpisode: (episode: Episode) => void;
  updateEpisode: (id: string, updates: Partial<Episode>) => void;
  deleteEpisode: (id: string) => void;
  setAuthorComments: (comments: AuthorComment[]) => void;
  addAuthorComment: (comment: AuthorComment) => void;
  resolveComment: (id: string, selectedOption?: number, userResponse?: string) => void;
  setForeshadows: (foreshadows: Foreshadow[]) => void;
  addForeshadow: (foreshadow: Foreshadow) => void;
  updateForeshadow: (id: string, updates: Partial<Foreshadow>) => void;
  // Monitor actions
  setSimulationStatus: (status: SimulationStatus) => void;
  setSessionId: (sessionId: string | null) => void;
  setStorylinePreview: (preview: StorylinePreview) => void;
  setIntegratedStoryline: (storyline: IntegratedStoryline | null) => void;
  setMonitorConfig: (partial: Partial<StorylineMonitorConfig>) => void;
  setPendingWarning: (warning: IntegratedStoryline | null) => void;
  addSimulationRun: (run: SimulationRun) => void;
  clearSimulationHistory: () => void;
  // Conversation actions
  setSimplifiedProject: (project: SimplifiedProjectConfig | null) => void;
  addConversationMessage: (message: ConversationMessage) => void;
  clearConversationMessages: () => void;
  setGenerationProgress: (progress: GenerationProgress | null) => void;
  updateGenerationStep: (step: string, status: 'pending' | 'in_progress' | 'completed' | 'error', message?: string) => void;
  setCurrentEpisodeNumber: (num: number) => void;
  respondToChoice: (messageId: string, choiceId: string) => void;
  // World First actions
  setWorldFirstProject: (project: WorldFirstProject | null) => void;
  initWorldFirstProject: (genre: string, tone: string, viewpoint: string, authorPersonaId: string, initialPrompt?: string) => void;
  updateWorldLayer: (layer: WorldLayer) => void;
  updateCoreRulesLayer: (layer: CoreRulesLayer) => void;
  updateSeedsLayer: (layer: SeedsLayer) => void;
  updateHeroArcLayer: (layer: HeroArcLayer) => void;
  updateVillainArcLayer: (layer: VillainArcLayer) => void;
  updateUltimateMysteryLayer: (layer: UltimateMysteryLayer) => void;
  confirmLayer: (layerName: LayerName) => void;
  setCurrentLayer: (layerName: LayerName) => void;
  addLayerBuildMessage: (message: LayerBuildMessage) => void;
  clearLayerBuildMessages: () => void;
  resetWorldFirstProject: () => void;
  reset: () => void;
}

const initialState: SimulationState & SimulationStoreV2 & SimulationStoreGrammar & SimulationStoreNPC & SimulationStoreDirector & SimulationStoreSeedEdit & SimulationStoreAuthorAI & SimulationStoreWriting & SimulationStoreMonitor & SimulationStoreConversation & SimulationStoreWorldFirst = {
  isRunning: false,
  currentYear: worldSettings.timeline.startYear,
  progress: 0,
  characters: [],  // 새 플로우에서는 generate-project에서 생성된 캐릭터를 사용
  events: [],
  worldEvents: worldSettings.timeline.worldEvents as WorldEvent[],
  seeds: [],
  memoryStacks: {},
  profiles: {},
  grammarConfig: undefined,
  characterArcs: [],
  masterArc: undefined,
  npcPool: { npcs: [], maxActive: 20 },
  storyDirectorConfig: undefined,
  narrativeArcs: {},
  episodes: [],
  authorComments: [],
  foreshadows: [],
  seedEditHistory: [],
  simulationStatus: 'idle',
  sessionId: null,
  storylinePreviews: {},
  integratedStoryline: null,
  monitorConfig: {
    previewFrequency: 'semi_auto',
    autoPauseOnCritical: true,
    integratedAnalysisEnabled: true,
  },
  simulationHistory: [],
  pendingWarning: null,
  // Conversation state
  simplifiedProject: null,
  conversationMessages: [],
  generationProgress: null,
  currentEpisodeNumber: 0,
  // World First state
  worldFirstProject: null,
  layerBuildMessages: [],
};

export const useSimulationStore = create<SimulationStore>()(
  persist(
    (set) => ({
      ...initialState,

      setRunning: (isRunning) => set({
        isRunning,
        simulationStatus: isRunning ? 'running' : 'idle',
      }),

      setCurrentYear: (currentYear) => set({ currentYear }),

      setProgress: (progress) => set({ progress }),

      updateCharacter: (id, updates) =>
        set((state) => ({
          characters: state.characters.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      setCharacters: (characters) => set({ characters }),

      setWorldEvents: (worldEvents) => set({ worldEvents }),

      addEvent: (event) =>
        set((state) => ({
          events: [...state.events, event],
        })),

      addEvents: (events) =>
        set((state) => ({
          events: [...state.events, ...events],
        })),

      // V2 actions
      setSeeds: (seeds) => set({ seeds }),

      addMemories: (characterId, memories) =>
        set((state) => ({
          memoryStacks: {
            ...state.memoryStacks,
            [characterId]: [...(state.memoryStacks[characterId] || []), ...memories],
          },
        })),

      setMemoryStacks: (memoryStacks) => set({ memoryStacks }),

      setProfiles: (profiles) => set({ profiles }),

      // Grammar actions
      setGrammarConfig: (grammarConfig) => set({ grammarConfig }),
      setCharacterArcs: (characterArcs) => set({ characterArcs }),
      setMasterArc: (masterArc) => set({ masterArc }),

      // NPC actions
      setNPCPool: (npcPool) => set({ npcPool }),
      addNPC: (npc) => set((state) => ({
        npcPool: {
          ...state.npcPool,
          npcs: [...state.npcPool.npcs, npc],
        },
      })),
      updateNPC: (id, updates) => set((state) => ({
        npcPool: {
          ...state.npcPool,
          npcs: state.npcPool.npcs.map(n => n.id === id ? { ...n, ...updates } : n),
        },
      })),
      promoteNPCToCore: (npcId) => set((state) => ({
        npcPool: {
          ...state.npcPool,
          npcs: state.npcPool.npcs.map(n =>
            n.id === npcId ? { ...n, lifecycle: 'core' as const } : n
          ),
        },
      })),

      // Story Director actions
      setStoryDirectorConfig: (storyDirectorConfig) => set({ storyDirectorConfig }),

      // Author AI actions
      setNarrativeArcs: (narrativeArcs) => set({ narrativeArcs }),
      updateNarrativeArc: (characterId, arc) => set((state) => ({
        narrativeArcs: { ...state.narrativeArcs, [characterId]: arc },
      })),

      // Seed Edit actions
      editSeed: (characterId, editType, newSeed, rewindToAge) =>
        set((state) => {
          const oldSeed = state.seeds.find(s => s.id === characterId);
          if (!oldSeed) return {};

          const memories = state.memoryStacks[characterId] || [];
          let deletedMemoryCount = 0;
          let deletedNPCIds: string[] = [];
          let affectedMemoryIds: string[] = [];
          let newMemoryStacks = { ...state.memoryStacks };
          let newNPCPool = { ...state.npcPool };

          // Apply seed based on edit type
          let appliedSeed: CharacterSeed;

          if (editType === 'pre_simulation') {
            // No memories — full edit allowed
            appliedSeed = newSeed;
          } else if (editType === 'soft_edit') {
            // Only allowed fields change, memories preserved
            appliedSeed = { ...oldSeed };
            for (const key of SOFT_EDIT_ALLOWED) {
              if (key in newSeed) {
                (appliedSeed as unknown as Record<string, unknown>)[key] = (newSeed as unknown as Record<string, unknown>)[key];
              }
            }
          } else {
            // hard_reset
            appliedSeed = newSeed;

            if (rewindToAge !== undefined) {
              // Rewind: keep memories up to rewindToAge
              const cutoffYear = oldSeed.birthYear + rewindToAge;
              const kept = memories.filter(m => m.year <= cutoffYear);
              const removed = memories.filter(m => m.year > cutoffYear);
              deletedMemoryCount = removed.length;
              affectedMemoryIds = removed.map(m => m.id);
              newMemoryStacks = {
                ...newMemoryStacks,
                [characterId]: kept,
              };
            } else {
              // Full reset: delete all memories
              deletedMemoryCount = memories.length;
              affectedMemoryIds = memories.map(m => m.id);
              newMemoryStacks = {
                ...newMemoryStacks,
                [characterId]: [],
              };
            }

            // Delete NPCs that only relate to this character
            const relatedNPCs = newNPCPool.npcs.filter(n =>
              n.relatedCharacters.length === 1 &&
              n.relatedCharacters[0].characterId === characterId
            );
            deletedNPCIds = relatedNPCs.map(n => n.id);
            newNPCPool = {
              ...newNPCPool,
              npcs: newNPCPool.npcs.filter(n => !deletedNPCIds.includes(n.id)),
            };

            // In other characters' memories, replace characterId references with 'unknown_entity'
            const otherCharIds = Object.keys(newMemoryStacks).filter(id => id !== characterId);
            for (const otherId of otherCharIds) {
              newMemoryStacks[otherId] = newMemoryStacks[otherId].map(m => ({
                ...m,
                content: m.content.replace(new RegExp(characterId, 'g'), 'unknown_entity'),
              }));
            }
          }

          // Create log entry
          const logEntry: SeedEditLog = {
            id: `edit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            characterId,
            editType,
            timestamp: new Date().toISOString(),
            previousSeed: oldSeed,
            newSeed: appliedSeed,
            rewindToAge,
            deletedMemoryCount,
            deletedNPCIds,
            affectedMemoryIds,
          };

          // Update seeds array
          const newSeeds = state.seeds.map(s =>
            s.id === characterId ? appliedSeed : s
          );

          return {
            seeds: newSeeds,
            memoryStacks: newMemoryStacks,
            npcPool: newNPCPool,
            seedEditHistory: [...state.seedEditHistory, logEntry],
          };
        }),

      clearSeedEditHistory: () => set({ seedEditHistory: [] }),

      // Writing actions
      setEpisodes: (episodes) => set({ episodes }),
      addEpisode: (episode) => set((state) => ({
        episodes: [...state.episodes, episode],
      })),
      updateEpisode: (id, updates) => set((state) => ({
        episodes: state.episodes.map(e => e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e),
      })),
      deleteEpisode: (id) => set((state) => ({
        episodes: state.episodes.filter(e => e.id !== id),
      })),
      setAuthorComments: (authorComments) => set({ authorComments }),
      addAuthorComment: (comment) => set((state) => ({
        authorComments: [...state.authorComments, comment],
      })),
      resolveComment: (id, selectedOption, userResponse) => set((state) => ({
        authorComments: state.authorComments.map(c =>
          c.id === id ? { ...c, resolved: true, selectedOption, userResponse, resolvedAt: new Date().toISOString() } : c
        ),
      })),
      setForeshadows: (foreshadows) => set({ foreshadows }),
      addForeshadow: (foreshadow) => set((state) => ({
        foreshadows: [...state.foreshadows, foreshadow],
      })),
      updateForeshadow: (id, updates) => set((state) => ({
        foreshadows: state.foreshadows.map(f => f.id === id ? { ...f, ...updates } : f),
      })),

      // Monitor actions
      setSimulationStatus: (simulationStatus) => set({
        simulationStatus,
        isRunning: simulationStatus === 'running',
      }),
      setSessionId: (sessionId) => set({ sessionId }),
      setStorylinePreview: (preview) => set((state) => ({
        storylinePreviews: { ...state.storylinePreviews, [preview.characterId]: preview },
      })),
      setIntegratedStoryline: (integratedStoryline) => set({ integratedStoryline }),
      setMonitorConfig: (partial) => set((state) => ({
        monitorConfig: { ...state.monitorConfig, ...partial },
      })),
      setPendingWarning: (pendingWarning) => set({ pendingWarning }),
      addSimulationRun: (run) => set((state) => ({
        simulationHistory: [...state.simulationHistory, run],
      })),
      clearSimulationHistory: () => set({ simulationHistory: [] }),

      // Conversation actions
      setSimplifiedProject: (simplifiedProject) => set({ simplifiedProject }),
      addConversationMessage: (message) => set((state) => ({
        conversationMessages: [...state.conversationMessages, message],
      })),
      clearConversationMessages: () => set({ conversationMessages: [] }),
      setGenerationProgress: (generationProgress) => set({ generationProgress }),
      updateGenerationStep: (step, status, message) => set((state) => {
        if (!state.generationProgress) return {};
        return {
          generationProgress: {
            ...state.generationProgress,
            currentStep: step as GenerationProgress['currentStep'],
            steps: {
              ...state.generationProgress.steps,
              [step]: status,
            },
            message,
          },
        };
      }),
      setCurrentEpisodeNumber: (currentEpisodeNumber) => set({ currentEpisodeNumber }),
      respondToChoice: (messageId, choiceId) => set((state) => ({
        conversationMessages: state.conversationMessages.map((m) =>
          m.id === messageId && m.choices
            ? {
                ...m,
                choices: m.choices.map((c) => ({
                  ...c,
                  selected: c.id === choiceId,
                })),
              }
            : m
        ),
      })),

      // World First actions
      setWorldFirstProject: (worldFirstProject) => set({ worldFirstProject }),

      initWorldFirstProject: (genre, tone, viewpoint, authorPersonaId, initialPrompt) => set({
        worldFirstProject: {
          id: `wfp-${Date.now()}`,
          genre,
          tone,
          viewpoint,
          authorPersonaId,
          initialPrompt,
          world: null,
          coreRules: null,
          seeds: null,
          heroArc: null,
          villainArc: null,
          ultimateMystery: null,
          layerStatus: {
            world: 'pending',
            coreRules: 'pending',
            seeds: 'pending',
            heroArc: 'pending',
            villainArc: 'pending',
            ultimateMystery: 'pending',
            novel: 'pending',
          },
          currentLayer: 'world',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        layerBuildMessages: [],
      }),

      updateWorldLayer: (layer) => set((state) => {
        if (!state.worldFirstProject) return {};
        return {
          worldFirstProject: {
            ...state.worldFirstProject,
            world: layer,
            layerStatus: { ...state.worldFirstProject.layerStatus, world: 'drafting' },
            updatedAt: new Date().toISOString(),
          },
        };
      }),

      updateCoreRulesLayer: (layer) => set((state) => {
        if (!state.worldFirstProject) return {};
        return {
          worldFirstProject: {
            ...state.worldFirstProject,
            coreRules: layer,
            layerStatus: { ...state.worldFirstProject.layerStatus, coreRules: 'drafting' },
            updatedAt: new Date().toISOString(),
          },
        };
      }),

      updateSeedsLayer: (layer) => set((state) => {
        if (!state.worldFirstProject) return {};
        return {
          worldFirstProject: {
            ...state.worldFirstProject,
            seeds: layer,
            layerStatus: { ...state.worldFirstProject.layerStatus, seeds: 'drafting' },
            updatedAt: new Date().toISOString(),
          },
        };
      }),

      updateHeroArcLayer: (layer) => set((state) => {
        if (!state.worldFirstProject) return {};
        return {
          worldFirstProject: {
            ...state.worldFirstProject,
            heroArc: layer,
            layerStatus: { ...state.worldFirstProject.layerStatus, heroArc: 'drafting' },
            updatedAt: new Date().toISOString(),
          },
        };
      }),

      updateVillainArcLayer: (layer) => set((state) => {
        if (!state.worldFirstProject) return {};
        return {
          worldFirstProject: {
            ...state.worldFirstProject,
            villainArc: layer,
            layerStatus: { ...state.worldFirstProject.layerStatus, villainArc: 'drafting' },
            updatedAt: new Date().toISOString(),
          },
        };
      }),

      updateUltimateMysteryLayer: (layer) => set((state) => {
        if (!state.worldFirstProject) return {};
        return {
          worldFirstProject: {
            ...state.worldFirstProject,
            ultimateMystery: layer,
            layerStatus: { ...state.worldFirstProject.layerStatus, ultimateMystery: 'drafting' },
            updatedAt: new Date().toISOString(),
          },
        };
      }),

      confirmLayer: (layerName) => set((state) => {
        if (!state.worldFirstProject) return {};
        const layerOrder: LayerName[] = ['world', 'coreRules', 'seeds', 'heroArc', 'villainArc', 'ultimateMystery', 'novel'];
        const currentIndex = layerOrder.indexOf(layerName);
        const nextLayer = currentIndex < layerOrder.length - 1 ? layerOrder[currentIndex + 1] : 'novel';

        return {
          worldFirstProject: {
            ...state.worldFirstProject,
            layerStatus: { ...state.worldFirstProject.layerStatus, [layerName]: 'confirmed' },
            currentLayer: nextLayer,
            updatedAt: new Date().toISOString(),
          },
        };
      }),

      setCurrentLayer: (layerName) => set((state) => {
        if (!state.worldFirstProject) return {};
        return {
          worldFirstProject: {
            ...state.worldFirstProject,
            currentLayer: layerName,
            updatedAt: new Date().toISOString(),
          },
        };
      }),

      addLayerBuildMessage: (message) => set((state) => ({
        layerBuildMessages: [...state.layerBuildMessages, message],
      })),

      clearLayerBuildMessages: () => set({ layerBuildMessages: [] }),

      resetWorldFirstProject: () => set({
        worldFirstProject: null,
        layerBuildMessages: [],
      }),

      reset: () => set({
        ...initialState,
        characters: [],
        seeds: [],
        memoryStacks: {},
        profiles: {},
        grammarConfig: undefined,
        characterArcs: [],
        masterArc: undefined,
        npcPool: { npcs: [], maxActive: 20 },
        storyDirectorConfig: undefined,
        narrativeArcs: {},
        episodes: [],
        authorComments: [],
        foreshadows: [],
        seedEditHistory: [],
        simulationStatus: 'idle',
        sessionId: null,
        storylinePreviews: {},
        integratedStoryline: null,
        pendingWarning: null,
        simplifiedProject: null,
        conversationMessages: [],
        generationProgress: null,
        currentEpisodeNumber: 0,
        worldFirstProject: null,
        layerBuildMessages: [],
      }),
    }),
    {
      name: 'narrative-simulator-data',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') return localStorage;
        // SSR fallback
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        events: state.events,
        characters: state.characters,
        currentYear: state.currentYear,
        progress: state.progress,
        worldEvents: state.worldEvents,
        seeds: state.seeds,
        memoryStacks: state.memoryStacks,
        profiles: state.profiles,
        grammarConfig: state.grammarConfig,
        characterArcs: state.characterArcs,
        masterArc: state.masterArc,
        npcPool: state.npcPool,
        storyDirectorConfig: state.storyDirectorConfig,
        narrativeArcs: state.narrativeArcs,
        episodes: state.episodes,
        authorComments: state.authorComments,
        foreshadows: state.foreshadows,
        seedEditHistory: state.seedEditHistory,
        monitorConfig: state.monitorConfig,
        simulationHistory: state.simulationHistory,
        storylinePreviews: state.storylinePreviews,
        integratedStoryline: state.integratedStoryline,
        simplifiedProject: state.simplifiedProject,
        conversationMessages: state.conversationMessages,
        currentEpisodeNumber: state.currentEpisodeNumber,
        worldFirstProject: state.worldFirstProject,
        layerBuildMessages: state.layerBuildMessages,
      }),
    }
  )
);
