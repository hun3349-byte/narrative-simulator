'use client';

import { useEditorStore } from '@/lib/store/editor-store';

export default function ChapterBuilder() {
  const { project, activeChapterId, createChapter, setActiveChapter, deleteChapter } = useEditorStore();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-widest text-text-muted">
          챕터 구성
        </h3>
        <button
          onClick={() => {
            const title = `제 ${(project?.chapters.length ?? 0) + 1}장`;
            createChapter(title);
          }}
          className="rounded-md border border-base-border px-2 py-1 text-xs text-text-secondary hover:bg-base-tertiary hover:text-text-primary transition-colors"
        >
          + 새 챕터
        </button>
      </div>

      {project?.chapters.map((chapter) => (
        <div
          key={chapter.id}
          className={`rounded-lg border p-3 cursor-pointer transition-colors ${
            activeChapterId === chapter.id
              ? 'border-seojin/40 bg-seojin/5'
              : 'border-base-border bg-base-card hover:border-seojin/30'
          }`}
          onClick={() => setActiveChapter(chapter.id)}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-text-primary">{chapter.title}</h4>
            <span className="text-xs text-text-muted">{chapter.scenes.length}개 장면</span>
          </div>
          {chapter.notes && (
            <p className="mt-1 text-xs text-text-secondary line-clamp-2">{chapter.notes}</p>
          )}
        </div>
      ))}

      {(!project || project.chapters.length === 0) && (
        <p className="py-8 text-center text-xs text-text-muted">
          챕터를 추가하여 웹소설을 구성하세요
        </p>
      )}
    </div>
  );
}
