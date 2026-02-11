import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { NarrativeEvent, DetailScene, Character } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface TimelineStore {
  selectedYear: number | null;
  selectedEvent: NarrativeEvent | null;
  filterCharacter: string | null;
  viewMode: 'overview' | 'detailed';

  // 세밀 장면 관련
  generatingDetailFor: string | null;
  detailScenes: Record<string, DetailScene>;

  // 액션
  setSelectedYear: (year: number | null) => void;
  setSelectedEvent: (event: NarrativeEvent | null) => void;
  setFilterCharacter: (characterId: string | null) => void;
  setViewMode: (mode: 'overview' | 'detailed') => void;

  // 세밀 장면 액션
  setGeneratingDetailFor: (eventId: string | null) => void;
  setDetailScene: (eventId: string, scene: DetailScene) => void;
  deleteDetailScene: (eventId: string) => void;
  getDetailScene: (eventId: string) => DetailScene | undefined;
}

export const useTimelineStore = create<TimelineStore>()(
  persist(
    (set, get) => ({
      selectedYear: null,
      selectedEvent: null,
      filterCharacter: null,
      viewMode: 'overview',
      generatingDetailFor: null,
      detailScenes: {},

      setSelectedYear: (selectedYear) => set({ selectedYear }),
      setSelectedEvent: (selectedEvent) => set({ selectedEvent }),
      setFilterCharacter: (filterCharacter) => set({ filterCharacter }),
      setViewMode: (viewMode) => set({ viewMode }),

      setGeneratingDetailFor: (generatingDetailFor) => set({ generatingDetailFor }),

      setDetailScene: (eventId, scene) =>
        set((state) => ({
          detailScenes: {
            ...state.detailScenes,
            [eventId]: { ...scene, id: scene.id || uuidv4(), eventId },
          },
        })),

      deleteDetailScene: (eventId) =>
        set((state) => {
          const { [eventId]: _, ...rest } = state.detailScenes;
          return { detailScenes: rest };
        }),

      getDetailScene: (eventId) => get().detailScenes[eventId],
    }),
    {
      name: 'narrative-timeline-data',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') return localStorage;
        return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
      }),
      partialize: (state) => ({
        detailScenes: state.detailScenes,
      }),
    }
  )
);
