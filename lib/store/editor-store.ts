import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Chapter, NarrativeEvent, NovelProject } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface EditorStore {
  project: NovelProject | null;
  activeChapterId: string | null;
  unassignedScenes: NarrativeEvent[];

  // 프로젝트
  initProject: (title: string) => void;

  // 챕터 관리
  createChapter: (title: string) => void;
  deleteChapter: (chapterId: string) => void;
  renameChapter: (chapterId: string, title: string) => void;
  setActiveChapter: (chapterId: string | null) => void;
  reorderChapters: (fromIndex: number, toIndex: number) => void;

  // 장면 배치
  addToUnassigned: (event: NarrativeEvent) => void;
  removeFromUnassigned: (eventId: string) => void;
  addSceneToChapter: (chapterId: string, event: NarrativeEvent, targetIndex?: number) => void;
  removeSceneFromChapter: (chapterId: string, eventId: string) => void;
  reorderScenes: (chapterId: string, fromIndex: number, toIndex: number) => void;
  moveSceneBetweenChapters: (fromChapterId: string, toChapterId: string, eventId: string, targetIndex: number) => void;
  moveFromUnassignedToChapter: (eventId: string, chapterId: string, targetIndex?: number) => void;

  // 메모/태그
  updateChapterNotes: (chapterId: string, notes: string) => void;

  // 유틸
  getActiveChapter: () => Chapter | undefined;
  getTotalWordCount: () => number;
  getChapterWordCount: (chapterId: string) => number;
  isEventAdopted: (eventId: string) => boolean;
}

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
      project: null,
      activeChapterId: null,
      unassignedScenes: [],

      initProject: (title) =>
        set({
          project: {
            id: uuidv4(),
            title,
            chapters: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          activeChapterId: null,
          unassignedScenes: [],
        }),

      createChapter: (title) =>
        set((state) => {
          if (!state.project) return state;
          const newChapter: Chapter = {
            id: uuidv4(),
            number: state.project.chapters.length + 1,
            title,
            scenes: [],
            notes: '',
          };
          return {
            project: {
              ...state.project,
              chapters: [...state.project.chapters, newChapter],
              updatedAt: new Date().toISOString(),
            },
            activeChapterId: newChapter.id,
          };
        }),

      deleteChapter: (chapterId) =>
        set((state) => {
          if (!state.project) return state;
          const chapter = state.project.chapters.find(c => c.id === chapterId);
          const returnedScenes = chapter?.scenes ?? [];
          return {
            project: {
              ...state.project,
              chapters: state.project.chapters
                .filter(c => c.id !== chapterId)
                .map((c, i) => ({ ...c, number: i + 1 })),
              updatedAt: new Date().toISOString(),
            },
            unassignedScenes: [...state.unassignedScenes, ...returnedScenes],
            activeChapterId: state.activeChapterId === chapterId ? null : state.activeChapterId,
          };
        }),

      renameChapter: (chapterId, title) =>
        set((state) => {
          if (!state.project) return state;
          return {
            project: {
              ...state.project,
              chapters: state.project.chapters.map(c =>
                c.id === chapterId ? { ...c, title } : c
              ),
              updatedAt: new Date().toISOString(),
            },
          };
        }),

      setActiveChapter: (chapterId) => set({ activeChapterId: chapterId }),

      reorderChapters: (fromIndex, toIndex) =>
        set((state) => {
          if (!state.project) return state;
          const chapters = [...state.project.chapters];
          const [moved] = chapters.splice(fromIndex, 1);
          chapters.splice(toIndex, 0, moved);
          return {
            project: {
              ...state.project,
              chapters: chapters.map((c, i) => ({ ...c, number: i + 1 })),
              updatedAt: new Date().toISOString(),
            },
          };
        }),

      addToUnassigned: (event) =>
        set((state) => {
          if (state.unassignedScenes.some(s => s.id === event.id)) return state;
          // Also check if already in a chapter
          if (state.project?.chapters.some(ch => ch.scenes.some(s => s.id === event.id))) return state;
          return { unassignedScenes: [...state.unassignedScenes, { ...event, adopted: true }] };
        }),

      removeFromUnassigned: (eventId) =>
        set((state) => ({
          unassignedScenes: state.unassignedScenes.filter(s => s.id !== eventId),
        })),

      addSceneToChapter: (chapterId, event, targetIndex) =>
        set((state) => {
          if (!state.project) return state;
          return {
            project: {
              ...state.project,
              chapters: state.project.chapters.map(ch => {
                if (ch.id !== chapterId) return ch;
                if (ch.scenes.some(s => s.id === event.id)) return ch;
                const scenes = [...ch.scenes];
                if (targetIndex !== undefined) {
                  scenes.splice(targetIndex, 0, { ...event, adopted: true });
                } else {
                  scenes.push({ ...event, adopted: true });
                }
                return { ...ch, scenes };
              }),
              updatedAt: new Date().toISOString(),
            },
          };
        }),

      removeSceneFromChapter: (chapterId, eventId) =>
        set((state) => {
          if (!state.project) return state;
          const chapter = state.project.chapters.find(c => c.id === chapterId);
          const scene = chapter?.scenes.find(s => s.id === eventId);
          return {
            project: {
              ...state.project,
              chapters: state.project.chapters.map(ch =>
                ch.id === chapterId
                  ? { ...ch, scenes: ch.scenes.filter(s => s.id !== eventId) }
                  : ch
              ),
              updatedAt: new Date().toISOString(),
            },
            unassignedScenes: scene
              ? [...state.unassignedScenes, scene]
              : state.unassignedScenes,
          };
        }),

      reorderScenes: (chapterId, fromIndex, toIndex) =>
        set((state) => {
          if (!state.project) return state;
          return {
            project: {
              ...state.project,
              chapters: state.project.chapters.map(ch => {
                if (ch.id !== chapterId) return ch;
                const scenes = [...ch.scenes];
                const [moved] = scenes.splice(fromIndex, 1);
                scenes.splice(toIndex, 0, moved);
                return { ...ch, scenes };
              }),
              updatedAt: new Date().toISOString(),
            },
          };
        }),

      moveSceneBetweenChapters: (fromChapterId, toChapterId, eventId, targetIndex) =>
        set((state) => {
          if (!state.project) return state;
          const fromChapter = state.project.chapters.find(c => c.id === fromChapterId);
          const scene = fromChapter?.scenes.find(s => s.id === eventId);
          if (!scene) return state;
          return {
            project: {
              ...state.project,
              chapters: state.project.chapters.map(ch => {
                if (ch.id === fromChapterId) {
                  return { ...ch, scenes: ch.scenes.filter(s => s.id !== eventId) };
                }
                if (ch.id === toChapterId) {
                  const scenes = [...ch.scenes];
                  scenes.splice(targetIndex, 0, scene);
                  return { ...ch, scenes };
                }
                return ch;
              }),
              updatedAt: new Date().toISOString(),
            },
          };
        }),

      moveFromUnassignedToChapter: (eventId, chapterId, targetIndex) =>
        set((state) => {
          if (!state.project) return state;
          const scene = state.unassignedScenes.find(s => s.id === eventId);
          if (!scene) return state;
          return {
            unassignedScenes: state.unassignedScenes.filter(s => s.id !== eventId),
            project: {
              ...state.project,
              chapters: state.project.chapters.map(ch => {
                if (ch.id !== chapterId) return ch;
                const scenes = [...ch.scenes];
                if (targetIndex !== undefined) {
                  scenes.splice(targetIndex, 0, scene);
                } else {
                  scenes.push(scene);
                }
                return { ...ch, scenes };
              }),
              updatedAt: new Date().toISOString(),
            },
          };
        }),

      updateChapterNotes: (chapterId, notes) =>
        set((state) => {
          if (!state.project) return state;
          return {
            project: {
              ...state.project,
              chapters: state.project.chapters.map(ch =>
                ch.id === chapterId ? { ...ch, notes } : ch
              ),
              updatedAt: new Date().toISOString(),
            },
          };
        }),

      getActiveChapter: () => {
        const { project, activeChapterId } = get();
        return project?.chapters.find(c => c.id === activeChapterId);
      },

      getTotalWordCount: () => {
        const { project } = get();
        if (!project) return 0;
        return project.chapters.reduce((total, ch) =>
          total + ch.scenes.reduce((sum, s) =>
            sum + (s.detailScene?.content?.length ?? 0), 0), 0);
      },

      getChapterWordCount: (chapterId) => {
        const { project } = get();
        const chapter = project?.chapters.find(c => c.id === chapterId);
        if (!chapter) return 0;
        return chapter.scenes.reduce((sum, s) =>
          sum + (s.detailScene?.content?.length ?? 0), 0);
      },

      isEventAdopted: (eventId) => {
        const { unassignedScenes, project } = get();
        if (unassignedScenes.some(s => s.id === eventId)) return true;
        return project?.chapters.some(ch => ch.scenes.some(s => s.id === eventId)) ?? false;
      },
    }),
    {
      name: 'narrative-editor-data',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') return localStorage;
        return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
      }),
      partialize: (state) => ({
        project: state.project,
        activeChapterId: state.activeChapterId,
        unassignedScenes: state.unassignedScenes,
      }),
    }
  )
);
