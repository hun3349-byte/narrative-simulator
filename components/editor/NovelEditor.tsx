'use client';

import { useState, useCallback, useMemo } from 'react';
import { NarrativeEvent, Chapter } from '@/lib/types';
import { useEditorStore } from '@/lib/store/editor-store';
import { useTimelineStore } from '@/lib/store/timeline-store';
import { useSimulationStore } from '@/lib/store/simulation-store';
import { getCharacterName, getCharacterColor, buildTintMap, buildColorMap } from '@/lib/utils/character-display';
import ExportModal from '@/components/export/ExportModal';
import Link from 'next/link';

export default function NovelEditor() {
  const {
    project,
    activeChapterId,
    unassignedScenes,
    initProject,
    createChapter,
    deleteChapter,
    renameChapter,
    setActiveChapter,
    removeSceneFromChapter,
    reorderScenes,
    moveSceneBetweenChapters,
    moveFromUnassignedToChapter,
    removeFromUnassigned,
    updateChapterNotes,
    getActiveChapter,
    getTotalWordCount,
    getChapterWordCount,
  } = useEditorStore();

  const { detailScenes } = useTimelineStore();
  const { characters, seeds } = useSimulationStore();
  const colorMap = useMemo(() => buildColorMap(characters, seeds), [characters, seeds]);
  const tintMap = useMemo(() => buildTintMap(characters, seeds), [characters, seeds]);

  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [dragData, setDragData] = useState<{ eventId: string; source: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ chapterId: string; index: number } | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const activeChapter = getActiveChapter();

  // === DnD 핸들러 ===
  const handleDragStart = useCallback((e: React.DragEvent, eventId: string, source: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ eventId, source }));
    e.dataTransfer.effectAllowed = 'move';
    setDragData({ eventId, source });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, chapterId: string, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ chapterId, index });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetChapterId: string, targetIndex: number) => {
    e.preventDefault();
    setDropTarget(null);

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const { eventId, source } = data;

      if (source === 'unassigned') {
        moveFromUnassignedToChapter(eventId, targetChapterId, targetIndex);
      } else if (source === targetChapterId) {
        const chapter = project?.chapters.find(c => c.id === targetChapterId);
        const fromIndex = chapter?.scenes.findIndex(s => s.id === eventId) ?? -1;
        if (fromIndex >= 0) {
          reorderScenes(targetChapterId, fromIndex, targetIndex);
        }
      } else {
        moveSceneBetweenChapters(source, targetChapterId, eventId, targetIndex);
      }
    } catch {
      // ignore parse errors
    }

    setDragData(null);
  }, [project, moveFromUnassignedToChapter, reorderScenes, moveSceneBetweenChapters]);

  const handleDragEnd = useCallback(() => {
    setDragData(null);
    setDropTarget(null);
  }, []);

  // === 장면 전환 구분자 ===
  const getSceneSeparator = (prev: NarrativeEvent, curr: NarrativeEvent) => {
    const yearDiff = curr.year - prev.year;
    if (yearDiff > 1) {
      return <div className="novel-separator time-jump">━━━ {yearDiff}년 후 ━━━</div>;
    }
    if (prev.characterId !== curr.characterId) {
      return <div className="novel-separator character-change">※ &nbsp; ※ &nbsp; ※</div>;
    }
    return <div className="novel-separator same-character">────────</div>;
  };

  // === 챕터 제목 인라인 편집 ===
  const startRename = (chapter: Chapter) => {
    setEditingChapterId(chapter.id);
    setEditingTitle(chapter.title);
  };

  const commitRename = () => {
    if (editingChapterId && editingTitle.trim()) {
      renameChapter(editingChapterId, editingTitle.trim());
    }
    setEditingChapterId(null);
  };

  // === 프로젝트 미생성 시 ===
  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-base-tertiary flex items-center justify-center">
            <span className="font-serif text-2xl text-text-muted">書</span>
          </div>
          <h2 className="font-serif text-xl font-bold text-text-primary">웹소설 프로젝트</h2>
          <p className="mt-2 text-sm text-text-secondary">
            시뮬레이션에서 생성된 서사를 웹소설로 편집합니다
          </p>
          <button
            onClick={() => initProject('새 이야기')}
            className="mt-4 rounded-lg bg-seojin px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            새 프로젝트 시작
          </button>
          {unassignedScenes.length === 0 && (
            <p className="mt-3 text-xs text-text-muted">
              먼저 <Link href="/timeline" className="text-seojin hover:underline">타임라인</Link>에서 장면을 채택하세요
            </p>
          )}
        </div>
      </div>
    );
  }

  // === 3컬럼 레이아웃 ===
  return (
    <div className="flex h-full">
      {/* ===== 좌측 패널: 챕터 + 미배치 장면 ===== */}
      <div className={`shrink-0 border-r border-base-border bg-base-secondary flex flex-col transition-all ${leftCollapsed ? 'w-10' : 'w-72'}`}>
        {leftCollapsed ? (
          <button onClick={() => setLeftCollapsed(false)} className="p-2 text-text-muted hover:text-text-primary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6 3l5 5-5 5V3z" /></svg>
          </button>
        ) : (
          <>
            {/* 패널 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-base-border">
              <h3 className="text-xs font-medium uppercase tracking-widest text-text-muted">챕터 구성</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => createChapter(`제 ${project.chapters.length + 1}장`)}
                  className="rounded-md border border-base-border px-2 py-0.5 text-[10px] text-text-secondary hover:bg-base-tertiary transition-colors"
                >
                  + 새 챕터
                </button>
                <button onClick={() => setLeftCollapsed(true)} className="ml-1 text-text-muted hover:text-text-primary">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M10 3L5 8l5 5V3z" /></svg>
                </button>
              </div>
            </div>

            {/* 챕터 목록 + 장면 트리 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {project.chapters.map((chapter) => (
                <div key={chapter.id}>
                  {/* 챕터 헤더 */}
                  <div
                    className={`rounded-lg border p-2.5 cursor-pointer transition-colors ${
                      activeChapterId === chapter.id
                        ? 'border-seojin/40 bg-seojin/5'
                        : 'border-base-border bg-base-card hover:border-base-border/80'
                    }`}
                    onClick={() => setActiveChapter(chapter.id)}
                  >
                    <div className="flex items-center justify-between">
                      {editingChapterId === chapter.id ? (
                        <input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => e.key === 'Enter' && commitRename()}
                          autoFocus
                          className="flex-1 bg-transparent text-sm font-medium text-text-primary outline-none border-b border-seojin/50"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <h4
                          className="text-sm font-medium text-text-primary"
                          onDoubleClick={(e) => { e.stopPropagation(); startRename(chapter); }}
                        >
                          {chapter.title}
                        </h4>
                      )}
                      <span className="text-[10px] text-text-muted ml-2 shrink-0">{chapter.scenes.length}개</span>
                    </div>
                  </div>

                  {/* 챕터 내 장면 (활성 챕터만 펼침) */}
                  {activeChapterId === chapter.id && (
                    <div
                      className="ml-2 mt-1 space-y-0.5 min-h-[32px] rounded-md border border-dashed border-transparent transition-colors"
                      style={dropTarget?.chapterId === chapter.id ? { borderColor: 'rgba(123, 107, 168, 0.25)' } : undefined}
                      onDragOver={(e) => handleDragOver(e, chapter.id, chapter.scenes.length)}
                      onDragLeave={() => setDropTarget(null)}
                      onDrop={(e) => handleDrop(e, chapter.id, chapter.scenes.length)}
                    >
                      {chapter.scenes.map((scene, idx) => (
                        <div
                          key={scene.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, scene.id, chapter.id)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); handleDragOver(e, chapter.id, idx); }}
                          onDrop={(e) => { e.stopPropagation(); handleDrop(e, chapter.id, idx); }}
                          className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs cursor-grab active:cursor-grabbing transition-all ${
                            dragData?.eventId === scene.id ? 'opacity-40' : 'hover:bg-base-tertiary/50'
                          } ${dropTarget?.chapterId === chapter.id && dropTarget.index === idx ? 'border-t-2 border-seojin/50' : ''}`}
                        >
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colorMap[scene.characterId] }} />
                          <span className="truncate text-text-secondary">{scene.title}</span>
                          <span className="ml-auto shrink-0 text-[10px] text-text-muted">{scene.year}</span>
                        </div>
                      ))}
                      {chapter.scenes.length === 0 && (
                        <p className="text-[10px] text-text-muted text-center py-2">장면을 여기로 드래그</p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {project.chapters.length === 0 && (
                <p className="py-4 text-center text-xs text-text-muted">챕터를 추가하세요</p>
              )}

              {/* 미배치 장면 섹션 */}
              <div className="pt-3 mt-3 border-t border-base-border">
                <h3 className="text-xs font-medium text-text-muted mb-2">
                  미배치 ({unassignedScenes.length})
                </h3>
                <div className="space-y-1">
                  {unassignedScenes.map((scene) => (
                    <div
                      key={scene.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, scene.id, 'unassigned')}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-2 rounded-md border border-base-border bg-base-card px-2.5 py-2 text-xs cursor-grab active:cursor-grabbing transition-all ${
                        dragData?.eventId === scene.id ? 'opacity-40' : 'hover:border-seojin/30'
                      }`}
                      title={scene.summary}
                    >
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorMap[scene.characterId] }} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-text-primary">{scene.title}</p>
                        <p className="text-[10px] text-text-muted">{getCharacterName(scene.characterId, characters)} · {scene.year}년</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFromUnassigned(scene.id); }}
                        className="text-text-muted hover:text-yeonhwa transition-colors shrink-0"
                        title="채택 취소"
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2.354 2.354a.5.5 0 0 1 .707 0L5 4.293l1.939-1.94a.5.5 0 0 1 .707.708L5.707 5l1.94 1.939a.5.5 0 0 1-.708.707L5 5.707l-1.939 1.94a.5.5 0 0 1-.707-.708L4.293 5 2.354 3.061a.5.5 0 0 1 0-.707z" /></svg>
                      </button>
                    </div>
                  ))}
                  {unassignedScenes.length === 0 && (
                    <p className="py-3 text-center text-[10px] text-text-muted">
                      <Link href="/timeline" className="text-seojin hover:underline">타임라인</Link>에서 채택
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===== 중앙: 웹소설 프리뷰 ===== */}
      <div className="flex-1 overflow-y-auto">
        {activeChapter ? (
          <div className="novel-preview-area">
            <div className="mx-auto max-w-2xl px-8 py-12">
              {/* 챕터 제목 */}
              <div className="text-center mb-12">
                <div className="novel-chapter-divider">───</div>
                <h2 className="novel-chapter-title">{activeChapter.title}</h2>
                <div className="novel-chapter-divider">───</div>
              </div>

              {activeChapter.scenes.length > 0 ? (
                <div>
                  {activeChapter.scenes.map((scene, idx) => {
                    const prevScene = idx > 0 ? activeChapter.scenes[idx - 1] : null;
                    const tint = tintMap[scene.characterId] ?? 'transparent';
                    const detailFromStore = detailScenes[scene.id];
                    const detail = scene.detailScene || detailFromStore;

                    return (
                      <div key={scene.id}>
                        {prevScene && getSceneSeparator(prevScene, scene)}

                        <div
                          className="novel-scene-block rounded-sm px-6 py-4 transition-colors scene-loading"
                          style={{ backgroundColor: tint }}
                        >
                          {detail?.content ? (
                            <div className="novel-content">
                              {detail.content.split('\n').map((para, i) => (
                                para.trim() ? (
                                  <p key={i} className="novel-paragraph">{para}</p>
                                ) : (
                                  <div key={i} className="h-4" />
                                )
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
                              <p className="text-sm text-gray-500 font-medium">{scene.title}</p>
                              <p className="mt-1 text-xs text-gray-400">{scene.summary}</p>
                              <p className="mt-2 text-[10px] text-gray-400">
                                <Link href="/timeline" className="text-seojin hover:underline">타임라인</Link>에서 세밀 장면을 생성하세요
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-16 text-center text-sm" style={{ color: '#999' }}>
                  좌측에서 장면을 이 챕터로 드래그하세요
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center bg-base-primary">
            <div className="text-center">
              <p className="text-sm text-text-muted">챕터를 선택하세요</p>
              {project.chapters.length === 0 && (
                <p className="mt-2 text-xs text-text-muted">
                  먼저 &quot;새 챕터&quot; 버튼으로 챕터를 만드세요
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 내보내기 모달 */}
      {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}

      {/* ===== 우측 패널: 편집 도구 ===== */}
      <div className={`shrink-0 border-l border-base-border bg-base-secondary flex flex-col transition-all ${rightCollapsed ? 'w-10' : 'w-64'}`}>
        {rightCollapsed ? (
          <button onClick={() => setRightCollapsed(false)} className="p-2 text-text-muted hover:text-text-primary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M10 3L5 8l5 5V3z" /></svg>
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-base-border">
              <h3 className="text-xs font-medium uppercase tracking-widest text-text-muted">편집 도구</h3>
              <button onClick={() => setRightCollapsed(true)} className="text-text-muted hover:text-text-primary">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6 3l5 5-5 5V3z" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {activeChapter ? (
                <>
                  {/* 챕터 설정 */}
                  <div>
                    <h4 className="text-xs font-medium text-text-muted mb-2">챕터 설정</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] text-text-muted">제목</label>
                        <input
                          value={editingChapterId === activeChapter.id ? editingTitle : activeChapter.title}
                          onChange={(e) => { setEditingChapterId(activeChapter.id); setEditingTitle(e.target.value); }}
                          onBlur={() => { if (editingChapterId === activeChapter.id) commitRename(); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' && editingChapterId === activeChapter.id) commitRename(); }}
                          onFocus={() => { setEditingChapterId(activeChapter.id); setEditingTitle(activeChapter.title); }}
                          className="w-full mt-0.5 rounded-md border border-base-border bg-base-card px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:border-seojin/50"
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('이 챕터를 삭제하시겠습니까? 장면은 미배치로 이동합니다.')) {
                            deleteChapter(activeChapter.id);
                          }
                        }}
                        className="w-full rounded-md border border-base-border px-3 py-1.5 text-xs text-text-muted hover:text-yeonhwa hover:border-yeonhwa/30 transition-colors"
                      >
                        챕터 삭제
                      </button>
                    </div>
                  </div>

                  {/* 분량 */}
                  <div>
                    <h4 className="text-xs font-medium text-text-muted mb-2">분량</h4>
                    <div className="rounded-md bg-base-card border border-base-border p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">이 챕터</span>
                        <span className="text-xs font-medium text-text-primary">
                          {getChapterWordCount(activeChapter.id).toLocaleString()}자
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">전체 소설</span>
                        <span className="text-xs font-medium text-text-primary">
                          {getTotalWordCount().toLocaleString()}자
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">장면 수</span>
                        <span className="text-xs font-medium text-text-primary">{activeChapter.scenes.length}개</span>
                      </div>
                    </div>
                  </div>

                  {/* 편집자 메모 */}
                  <div>
                    <h4 className="text-xs font-medium text-text-muted mb-2">편집 메모</h4>
                    <textarea
                      value={activeChapter.notes}
                      onChange={(e) => updateChapterNotes(activeChapter.id, e.target.value)}
                      placeholder="이 챕터에 대한 메모..."
                      className="w-full rounded-md border border-base-border bg-base-card p-3 text-xs text-text-secondary placeholder:text-text-muted resize-none focus:outline-none focus:border-seojin/50"
                      rows={5}
                    />
                  </div>

                  {/* 장면 관리 */}
                  <div>
                    <h4 className="text-xs font-medium text-text-muted mb-2">장면 관리</h4>
                    <div className="space-y-1">
                      {activeChapter.scenes.map((scene) => (
                        <div key={scene.id} className="flex items-center justify-between rounded-md bg-base-card border border-base-border px-2.5 py-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colorMap[scene.characterId] }} />
                            <span className="text-xs text-text-secondary truncate">{scene.title}</span>
                          </div>
                          <button
                            onClick={() => removeSceneFromChapter(activeChapter.id, scene.id)}
                            className="ml-1 text-text-muted hover:text-yeonhwa transition-colors shrink-0"
                            title="챕터에서 제거 (미배치로 이동)"
                          >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2.354 2.354a.5.5 0 0 1 .707 0L5 4.293l1.939-1.94a.5.5 0 0 1 .707.708L5.707 5l1.94 1.939a.5.5 0 0 1-.708.707L5 5.707l-1.939 1.94a.5.5 0 0 1-.707-.708L4.293 5 2.354 3.061a.5.5 0 0 1 0-.707z" /></svg>
                          </button>
                        </div>
                      ))}
                      {activeChapter.scenes.length === 0 && (
                        <p className="text-[10px] text-text-muted text-center py-2">배치된 장면 없음</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <p className="py-8 text-center text-xs text-text-muted">
                  챕터를 선택하면 편집 도구가 표시됩니다
                </p>
              )}

              {/* 내보내기 */}
              <div className="pt-3 border-t border-base-border">
                <button
                  onClick={() => setShowExportModal(true)}
                  className="w-full rounded-md border border-seojin/30 bg-seojin/10 px-3 py-2 text-xs text-seojin hover:bg-seojin/20 transition-colors"
                >
                  내보내기
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
