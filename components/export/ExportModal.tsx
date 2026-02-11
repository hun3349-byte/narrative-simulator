'use client';

import { useState, useMemo } from 'react';
import { useEditorStore } from '@/lib/store/editor-store';
import { useTimelineStore } from '@/lib/store/timeline-store';
import { useSimulationStore } from '@/lib/store/simulation-store';
import { buildColorMap } from '@/lib/utils/character-display';

type ExportFormat = 'txt' | 'html' | 'docx';

interface ExportModalProps {
  onClose: () => void;
}

export default function ExportModal({ onClose }: ExportModalProps) {
  const { project, getTotalWordCount } = useEditorStore();
  const { detailScenes } = useTimelineStore();
  const { characters, seeds } = useSimulationStore();
  const colorMap = useMemo(() => buildColorMap(characters, seeds), [characters, seeds]);
  const [format, setFormat] = useState<ExportFormat>('html');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!project) return null;

  const totalWords = getTotalWordCount();
  const totalPages = Math.ceil(totalWords / 400);
  const chaptersWithScenes = project.chapters.filter((ch) => ch.scenes.length > 0);

  const handleExport = async () => {
    if (chaptersWithScenes.length === 0) {
      setError('내보낼 장면이 있는 챕터가 없습니다.');
      return;
    }

    setExporting(true);
    setError(null);

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          project,
          chapters: chaptersWithScenes,
          detailScenes,
          colorMap,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '내보내기 실패');
      }

      const blob = await response.blob();
      const ext = format;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '내보내기 중 오류가 발생했습니다.');
    } finally {
      setExporting(false);
    }
  };

  const formats: { key: ExportFormat; label: string; icon: string; desc: string }[] = [
    { key: 'txt', label: 'TXT', icon: '📄', desc: '순수 텍스트' },
    { key: 'html', label: 'HTML', icon: '🌐', desc: '웹 뷰어 포함' },
    { key: 'docx', label: 'DOCX', icon: '📝', desc: 'Word 문서' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-base-border bg-base-secondary p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-lg font-bold text-text-primary">웹소설 내보내기</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <path d="M5.146 5.146a.5.5 0 0 1 .708 0L9 8.293l3.146-3.147a.5.5 0 0 1 .708.708L9.707 9l3.147 3.146a.5.5 0 0 1-.708.708L9 9.707l-3.146 3.147a.5.5 0 0 1-.708-.708L8.293 9 5.146 5.854a.5.5 0 0 1 0-.708z" />
            </svg>
          </button>
        </div>

        {/* 소설 정보 */}
        <div className="mb-5 rounded-lg bg-base-card border border-base-border p-3">
          <p className="text-sm font-medium text-text-primary">{project.title}</p>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-text-muted">
            <span>{chaptersWithScenes.length}개 챕터</span>
            <span>{totalWords.toLocaleString()}자</span>
            <span>약 {totalPages}매</span>
          </div>
        </div>

        {/* 형식 선택 */}
        <div className="mb-5">
          <label className="text-xs font-medium text-text-muted mb-2 block">형식 선택</label>
          <div className="grid grid-cols-3 gap-2">
            {formats.map((f) => (
              <button
                key={f.key}
                onClick={() => setFormat(f.key)}
                className={`rounded-lg border p-3 text-center transition-colors ${
                  format === f.key
                    ? 'border-seojin bg-seojin/10 text-text-primary'
                    : 'border-base-border bg-base-card text-text-secondary hover:border-base-border/80'
                }`}
              >
                <div className="text-xl mb-1">{f.icon}</div>
                <div className="text-sm font-medium">{f.label}</div>
                <div className="text-[10px] text-text-muted mt-0.5">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div className="mb-4 rounded-lg border border-yeonhwa/30 bg-yeonhwa/10 px-3 py-2 text-xs text-yeonhwa">
            {error}
          </div>
        )}

        {/* 다운로드 버튼 */}
        <button
          onClick={handleExport}
          disabled={exporting || chaptersWithScenes.length === 0}
          className="w-full rounded-lg bg-seojin px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {exporting ? '내보내는 중...' : '다운로드 시작'}
        </button>
      </div>
    </div>
  );
}
