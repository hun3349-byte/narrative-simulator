'use client';

import { useState, useRef, useEffect } from 'react';
import { useSimulationStore } from '@/lib/store/simulation-store';
import { useEditorStore } from '@/lib/store/editor-store';
import { useTimelineStore } from '@/lib/store/timeline-store';

export default function DataManager() {
  const simStore = useSimulationStore();
  const editorStore = useEditorStore();
  const timelineStore = useTimelineStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [dataSize, setDataSize] = useState<string>('...');

  const handleJsonExport = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      simulation: {
        events: simStore.events,
        characters: simStore.characters,
        currentYear: simStore.currentYear,
        progress: simStore.progress,
      },
      editor: {
        project: editorStore.project,
        activeChapterId: editorStore.activeChapterId,
        unassignedScenes: editorStore.unassignedScenes,
      },
      timeline: {
        detailScenes: timelineStore.detailScenes,
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `narrative-simulator-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.version !== 1) {
          alert('지원하지 않는 백업 버전입니다.');
          return;
        }

        // Restore simulation store
        if (data.simulation) {
          const { events, characters, currentYear, progress } = data.simulation;
          useSimulationStore.setState({ events, characters, currentYear, progress });
        }

        // Restore editor store
        if (data.editor) {
          const { project, activeChapterId, unassignedScenes } = data.editor;
          useEditorStore.setState({ project, activeChapterId, unassignedScenes });
        }

        // Restore timeline store
        if (data.timeline) {
          const { detailScenes } = data.timeline;
          useTimelineStore.setState({ detailScenes });
        }

        alert('데이터가 복원되었습니다.');
      } catch {
        alert('잘못된 백업 파일입니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleReset = () => {
    localStorage.removeItem('narrative-simulation-data');
    localStorage.removeItem('narrative-editor-data');
    localStorage.removeItem('narrative-timeline-data');
    localStorage.removeItem('onboarding-done');
    window.location.reload();
  };

  const handleSimulationReset = () => {
    useSimulationStore.setState({ events: [], currentYear: 0, progress: 0 });
    useTimelineStore.setState({ detailScenes: {}, selectedEvent: null });
  };

  // 데이터 크기 계산 (클라이언트 전용)
  useEffect(() => {
    let size = 0;
    ['narrative-simulator-data', 'narrative-editor-data', 'narrative-timeline-data'].forEach((key) => {
      const val = localStorage.getItem(key);
      if (val) size += val.length * 2;
    });
    if (size < 1024) setDataSize(`${size}B`);
    else if (size < 1024 * 1024) setDataSize(`${(size / 1024).toFixed(1)}KB`);
    else setDataSize(`${(size / (1024 * 1024)).toFixed(1)}MB`);
  }, [simStore.events, editorStore.project, timelineStore.detailScenes]);

  return (
    <div className="rounded-lg border border-base-border bg-base-card p-5">
      <h3 className="text-sm font-medium text-text-primary mb-4">데이터 관리</h3>

      <div className="space-y-2">
        <button
          onClick={handleJsonExport}
          className="w-full rounded-md border border-base-border px-4 py-2 text-xs text-text-secondary hover:bg-base-tertiary transition-colors text-left"
        >
          JSON 내보내기 (전체 백업)
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-md border border-base-border px-4 py-2 text-xs text-text-secondary hover:bg-base-tertiary transition-colors text-left"
        >
          JSON 가져오기 (복원)
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleJsonImport}
          className="hidden"
        />

        <button
          onClick={handleSimulationReset}
          className="w-full rounded-md border border-base-border px-4 py-2 text-xs text-text-secondary hover:bg-base-tertiary transition-colors text-left"
        >
          시뮬레이션 리셋 (이벤트만 삭제)
        </button>

        <button
          onClick={() => setShowResetConfirm(true)}
          className="w-full rounded-md border border-yeonhwa/30 px-4 py-2 text-xs text-yeonhwa/70 hover:bg-yeonhwa/10 transition-colors text-left"
        >
          전체 초기화
        </button>
      </div>

      <p className="mt-3 text-[10px] text-text-muted">
        데이터 크기: {dataSize}
      </p>

      {/* 초기화 확인 모달 */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowResetConfirm(false)} />
          <div className="relative rounded-xl border border-base-border bg-base-secondary p-6 shadow-2xl max-w-sm">
            <h3 className="font-serif text-base font-bold text-text-primary mb-2">전체 초기화</h3>
            <p className="text-sm text-text-secondary mb-4">
              모든 시뮬레이션 데이터, 채택 장면, 편집기 프로젝트가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 rounded-md border border-base-border px-4 py-2 text-sm text-text-secondary hover:bg-base-tertiary transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleReset}
                className="flex-1 rounded-md bg-yeonhwa px-4 py-2 text-sm text-white hover:opacity-90 transition-opacity"
              >
                초기화
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
