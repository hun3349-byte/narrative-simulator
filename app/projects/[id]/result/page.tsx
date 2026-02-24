'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useProjectStore } from '@/lib/store/project-store';

export default function ProjectResultPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const { getCurrentProject, selectProject } = useProjectStore();

  // Hydration 상태 - localStorage 로드 완료 전까지 로딩 표시
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // 프로젝트 선택
  useEffect(() => {
    if (projectId && isHydrated) {
      selectProject(projectId);
    }
  }, [projectId, isHydrated, selectProject]);

  // hydration 전에는 null 반환
  const project = isHydrated ? getCurrentProject() : null;

  // Hydration 중
  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-primary">
        <div className="text-center">
          <div className="text-text-muted">불러오는 중...</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-primary">
        <div className="text-center">
          <div className="mb-4 text-text-muted">프로젝트를 찾을 수 없습니다</div>
          <button
            onClick={() => router.push('/projects')}
            className="text-seojin hover:underline"
          >
            프로젝트 목록으로
          </button>
        </div>
      </div>
    );
  }

  const currentEpisode = project.episodes[currentEpisodeIndex];

  const handleExport = async (format: 'txt' | 'html' | 'docx') => {
    setShowExportMenu(false);

    // 에피소드 확인
    if (!project.episodes || project.episodes.length === 0) {
      alert('내보낼 에피소드가 없습니다. 먼저 에피소드를 작성해주세요.');
      return;
    }

    try {
      console.log('[Export] Requesting:', format, 'Episodes:', project.episodes.length);

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          episodes: project.episodes,
          projectInfo: {
            title: project.direction || `${project.genre} 웹소설`,
            genre: project.genre,
            tone: project.tone,
            authorName: project.authorPersona?.name || '작가',
          },
        }),
      });

      console.log('[Export] Response status:', response.status);

      if (!response.ok) {
        // JSON 에러 응답 파싱
        try {
          const errData = await response.json();
          throw new Error(errData.error || `서버 오류 (${response.status})`);
        } catch {
          throw new Error(`서버 오류 (${response.status})`);
        }
      }

      const blob = await response.blob();
      console.log('[Export] Blob size:', blob.size);

      if (blob.size === 0) {
        throw new Error('다운로드 파일이 비어있습니다.');
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.direction || 'narrative'}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('[Export] Download triggered successfully');
    } catch (error) {
      console.error('[Export] Error:', error);
      const message = error instanceof Error ? error.message : '알 수 없는 오류';

      if (message.includes('fetch') || message.includes('network')) {
        alert('네트워크 연결을 확인해주세요.');
      } else {
        alert(`내보내기 실패: ${message}`);
      }
    }
  };

  return (
    <div className="flex h-screen flex-col bg-base-primary">
      {/* 헤더 */}
      <header className="flex items-center justify-between border-b border-base-border bg-base-secondary px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="text-text-muted hover:text-text-primary"
          >
            ← 작가 대화
          </button>
          <span className="font-medium text-text-primary">결과물</span>
          <span className="rounded-full bg-base-tertiary px-3 py-1 text-sm text-text-muted">
            {project.episodes.length}화
          </span>
        </div>

        {/* 내보내기 */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="rounded-lg bg-seojin px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-seojin/90"
          >
            내보내기 ▾
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 w-32 rounded-lg border border-base-border bg-base-secondary py-1 shadow-lg">
              <button
                onClick={() => handleExport('txt')}
                className="block w-full px-4 py-2 text-left text-sm text-text-secondary hover:bg-base-tertiary"
              >
                TXT
              </button>
              <button
                onClick={() => handleExport('html')}
                className="block w-full px-4 py-2 text-left text-sm text-text-secondary hover:bg-base-tertiary"
              >
                HTML
              </button>
              <button
                onClick={() => handleExport('docx')}
                className="block w-full px-4 py-2 text-left text-sm text-text-secondary hover:bg-base-tertiary"
              >
                DOCX
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 메인 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 에피소드 네비게이션 */}
        <div className="w-64 overflow-y-auto border-r border-base-border bg-base-secondary p-4">
          <div className="space-y-2">
            {project.episodes.length > 0 ? (
              project.episodes.map((ep, idx) => (
                <button
                  key={ep.id}
                  onClick={() => setCurrentEpisodeIndex(idx)}
                  className={`block w-full rounded-lg p-3 text-left transition-colors ${
                    idx === currentEpisodeIndex
                      ? 'bg-seojin/10 border border-seojin'
                      : 'bg-base-primary hover:bg-base-tertiary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${idx === currentEpisodeIndex ? 'font-medium text-text-primary' : 'text-text-secondary'}`}>
                      {ep.number}화
                    </span>
                    <span className={`text-xs ${ep.status === 'final' ? 'text-green-400' : 'text-text-muted'}`}>
                      {ep.status === 'final' ? '✓' : ep.status === 'drafted' ? '📝' : '📋'}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-xs text-text-muted">
                    {ep.title}
                  </div>
                  <div className="mt-1 text-xs text-text-muted">
                    {ep.charCount.toLocaleString()}자
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-text-muted">
                아직 작성된 에피소드가 없습니다
              </div>
            )}
          </div>
        </div>

        {/* 에피소드 리더 */}
        <div className="flex-1 overflow-y-auto p-8">
          {currentEpisode ? (
            <div className="mx-auto max-w-2xl">
              {/* 제목 */}
              <div className="mb-8 text-center">
                <div className="mb-2 text-sm text-text-muted">
                  제{currentEpisode.number}화
                </div>
                <h1 className="font-serif text-2xl text-text-primary">
                  {currentEpisode.title}
                </h1>
              </div>

              {/* 본문 */}
              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap font-serif leading-relaxed text-text-primary">
                  {currentEpisode.content}
                </div>
              </div>

              {/* 메타 정보 */}
              <div className="mt-12 border-t border-base-border pt-6 text-sm text-text-muted">
                <div>글자수: {currentEpisode.charCount.toLocaleString()}자</div>
                {currentEpisode.endHook && (
                  <div className="mt-2">
                    <span className="font-medium">다음 화 훅:</span> {currentEpisode.endHook}
                  </div>
                )}
              </div>

              {/* 이전/다음 */}
              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setCurrentEpisodeIndex(Math.max(0, currentEpisodeIndex - 1))}
                  disabled={currentEpisodeIndex === 0}
                  className="rounded-lg bg-base-secondary px-4 py-2 text-sm text-text-secondary hover:bg-base-tertiary disabled:opacity-50"
                >
                  ← 이전 화
                </button>
                <button
                  onClick={() => setCurrentEpisodeIndex(Math.min(project.episodes.length - 1, currentEpisodeIndex + 1))}
                  disabled={currentEpisodeIndex === project.episodes.length - 1}
                  className="rounded-lg bg-base-secondary px-4 py-2 text-sm text-text-secondary hover:bg-base-tertiary disabled:opacity-50"
                >
                  다음 화 →
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-text-muted">
                <div className="mb-4 text-4xl">📖</div>
                <div>작성된 에피소드가 없습니다</div>
                <button
                  onClick={() => router.push(`/projects/${projectId}`)}
                  className="mt-4 text-seojin hover:underline"
                >
                  작가 대화로 돌아가기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
