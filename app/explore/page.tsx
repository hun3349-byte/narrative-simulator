'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loadPublicProjects, type PublicProjectSummary } from '@/lib/supabase';

export default function ExplorePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<PublicProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      setLoading(true);
      const result = await loadPublicProjects();
      if (result.error) {
        setError(result.error);
      } else {
        setProjects(result.projects);
      }
      setLoading(false);
    }

    fetchProjects();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  const getProgressText = (layersCompleted: number, episodeCount: number) => {
    if (layersCompleted === 0) {
      return '세계 구축 시작 전';
    } else if (layersCompleted < 6) {
      return `레이어 ${layersCompleted}/6 완료`;
    } else if (episodeCount === 0) {
      return '시뮬레이션 대기';
    } else {
      return `${episodeCount}화 완성`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-primary p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="font-serif text-2xl md:text-3xl text-text-primary">탐색</h1>
            <p className="text-text-muted mt-2">다른 사용자들의 프로젝트를 둘러보세요</p>
          </div>
          <div className="text-center py-12 text-text-muted">불러오는 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-primary p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="font-serif text-2xl md:text-3xl text-text-primary">탐색</h1>
          </div>
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <p className="text-red-400">{error}</p>
            <p className="text-text-muted mt-2 text-sm">Supabase 연결을 확인해주세요.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-primary p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        {/* 헤더 */}
        <div className="mb-6 md:mb-8 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl text-text-primary">탐색</h1>
            <p className="text-text-muted mt-1 text-sm">다른 사용자들의 프로젝트를 둘러보세요</p>
          </div>
          <Link
            href="/projects"
            className="rounded-lg border border-base-border px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-base-tertiary hover:text-text-primary"
          >
            내 프로젝트
          </Link>
        </div>

        {/* 프로젝트 목록 */}
        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-base-border bg-base-secondary p-8 md:p-12 text-center">
            <div className="mb-4 text-4xl md:text-5xl">📚</div>
            <div className="mb-2 text-base md:text-lg text-text-primary">아직 공개된 프로젝트가 없습니다</div>
            <div className="text-sm md:text-base text-text-muted">
              첫 번째로 프로젝트를 공개해보세요
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
            {projects.map(project => (
              <div
                key={project.id}
                onClick={() => router.push(`/shared/${project.id}`)}
                className="group cursor-pointer rounded-xl border border-base-border bg-base-secondary p-4 md:p-6 transition-all hover:border-seojin hover:shadow-lg active:scale-[0.98]"
              >
                {/* 제목 */}
                <div className="mb-3 font-serif text-base md:text-lg text-text-primary line-clamp-2">
                  {project.title}
                </div>

                {/* 장르/톤 */}
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-seojin/20 px-3 py-1 text-sm text-seojin">
                    {project.genre}
                  </span>
                  <span className="rounded-full bg-base-tertiary px-3 py-1 text-sm text-text-secondary">
                    {project.tone}
                  </span>
                </div>

                {/* 작가/진행 상태 */}
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-text-secondary">by {project.authorPersonaName}</span>
                  <span className="text-text-primary">
                    {getProgressText(project.layersCompleted, project.episodeCount)}
                  </span>
                </div>

                {/* 마지막 수정 */}
                <div className="text-xs text-text-muted">
                  마지막 수정: {formatDate(project.updatedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
