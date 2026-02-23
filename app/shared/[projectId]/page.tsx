'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getSharedProject, type SharedProjectData } from '@/lib/supabase';

export default function SharedProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<SharedProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'story' | 'world' | 'hero'>('story');

  useEffect(() => {
    async function loadProject() {
      setLoading(true);
      const result = await getSharedProject(projectId);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setProject(result.data);
        if (result.data.episodes.length > 0) {
          setSelectedEpisode(result.data.episodes[0].number);
        }
      } else {
        setError('프로젝트를 찾을 수 없습니다.');
      }
      setLoading(false);
    }

    loadProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-primary text-text-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-seojin border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-base-primary text-text-primary flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">프로젝트를 찾을 수 없습니다</h1>
          <p className="text-text-muted mb-6">{error || '존재하지 않거나 비공개 프로젝트입니다.'}</p>
          <Link
            href="/explore"
            className="inline-block rounded-lg bg-seojin px-6 py-3 font-medium text-white transition-colors hover:bg-seojin/90"
          >
            탐색으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const selectedEpisodeData = project.episodes.find(ep => ep.number === selectedEpisode);

  return (
    <div className="min-h-screen bg-base-primary text-text-primary">
      {/* 헤더 */}
      <header className="border-b border-base-border bg-base-primary/95 sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{project.title}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-text-muted">
                <span className="px-2 py-0.5 bg-seojin/20 rounded text-seojin">
                  {project.genre}
                </span>
                <span>{project.tone}</span>
                <span>by {project.authorPersona.name}</span>
              </div>
            </div>
            <Link
              href="/explore"
              className="rounded-lg border border-base-border px-4 py-2 text-sm text-text-secondary hover:bg-base-tertiary hover:text-text-primary transition-colors"
            >
              탐색으로 돌아가기
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 사이드바 */}
          <aside className="lg:col-span-1 space-y-4">
            {/* 탭 */}
            <div className="flex lg:flex-col gap-2">
              <button
                onClick={() => setActiveTab('story')}
                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'story'
                    ? 'bg-seojin text-white'
                    : 'bg-base-secondary text-text-secondary hover:text-text-primary'
                }`}
              >
                에피소드
              </button>
              <button
                onClick={() => setActiveTab('world')}
                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'world'
                    ? 'bg-seojin text-white'
                    : 'bg-base-secondary text-text-secondary hover:text-text-primary'
                }`}
              >
                세계관
              </button>
              <button
                onClick={() => setActiveTab('hero')}
                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'hero'
                    ? 'bg-seojin text-white'
                    : 'bg-base-secondary text-text-secondary hover:text-text-primary'
                }`}
              >
                주인공
              </button>
            </div>

            {/* 탭 내용 */}
            {activeTab === 'story' && project.episodes.length > 0 && (
              <div className="bg-base-secondary rounded-lg p-4">
                <h2 className="font-bold mb-3 text-seojin">에피소드 목록</h2>
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {project.episodes.map(ep => (
                    <button
                      key={ep.number}
                      onClick={() => setSelectedEpisode(ep.number)}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                        selectedEpisode === ep.number
                          ? 'bg-seojin text-white'
                          : 'hover:bg-base-tertiary text-text-secondary'
                      }`}
                    >
                      <span className="font-bold">{ep.number}화</span>
                      <span className="ml-2 text-xs opacity-75">{ep.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'world' && project.world && (
              <div className="bg-base-secondary rounded-lg p-4">
                <h2 className="font-bold mb-3 text-seojin">세계관</h2>
                {project.world.continentName && (
                  <p className="text-sm mb-2">
                    <span className="text-text-muted">대륙:</span> {project.world.continentName}
                  </p>
                )}
                {project.world.geography && (
                  <p className="text-sm text-text-secondary mb-3">{project.world.geography}</p>
                )}
                {project.world.cities && project.world.cities.length > 0 && (
                  <div>
                    <p className="text-xs text-text-muted mb-2">주요 도시</p>
                    <div className="space-y-2">
                      {project.world.cities.map((city, idx) => (
                        <div key={idx} className="text-sm">
                          <span className="text-seojin font-medium">{city.name}</span>
                          <p className="text-text-muted text-xs mt-0.5">{city.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'hero' && project.hero && (
              <div className="bg-base-secondary rounded-lg p-4">
                <h2 className="font-bold mb-3 text-seojin">주인공</h2>
                {project.hero.name && (
                  <p className="text-lg font-bold mb-2">{project.hero.name}</p>
                )}
                {project.hero.origin && (
                  <p className="text-sm text-text-secondary mb-3">{project.hero.origin}</p>
                )}
                {project.hero.coreNarrative && (
                  <p className="text-sm text-text-muted italic border-l-2 border-seojin/50 pl-3">
                    &ldquo;{project.hero.coreNarrative}&rdquo;
                  </p>
                )}
              </div>
            )}
          </aside>

          {/* 메인 콘텐츠 - 에피소드 본문 */}
          <main className="lg:col-span-3">
            {selectedEpisodeData ? (
              <div className="bg-base-secondary rounded-lg p-6 md:p-8">
                <div className="mb-6">
                  <span className="text-seojin text-sm">Episode {selectedEpisodeData.number}</span>
                  <h2 className="text-2xl font-bold mt-1">{selectedEpisodeData.title}</h2>
                  <p className="text-sm text-text-muted mt-2">
                    {selectedEpisodeData.charCount.toLocaleString()}자
                  </p>
                </div>

                <div className="prose prose-invert max-w-none">
                  {selectedEpisodeData.content.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="mb-4 leading-relaxed text-text-secondary">
                      {paragraph}
                    </p>
                  ))}
                </div>

                {/* 네비게이션 */}
                <div className="flex justify-between mt-8 pt-6 border-t border-base-border">
                  {selectedEpisode && selectedEpisode > 1 && (
                    <button
                      onClick={() => setSelectedEpisode(selectedEpisode - 1)}
                      className="px-4 py-2 bg-base-tertiary hover:bg-base-border rounded-lg transition-colors"
                    >
                      ← 이전 화
                    </button>
                  )}
                  <div className="flex-1" />
                  {selectedEpisode && project.episodes.some(ep => ep.number === selectedEpisode + 1) && (
                    <button
                      onClick={() => setSelectedEpisode(selectedEpisode + 1)}
                      className="px-4 py-2 bg-seojin hover:bg-seojin/90 text-white rounded-lg transition-colors"
                    >
                      다음 화 →
                    </button>
                  )}
                </div>
              </div>
            ) : project.episodes.length === 0 ? (
              <div className="bg-base-secondary rounded-lg p-8 text-center">
                <div className="text-4xl mb-4">📝</div>
                <h2 className="text-xl font-bold mb-2">아직 공개된 에피소드가 없습니다</h2>
                <p className="text-text-muted">작가가 에피소드를 완성하면 여기에 표시됩니다.</p>
              </div>
            ) : null}
          </main>
        </div>
      </div>

      {/* 푸터 */}
      <footer className="border-t border-base-border mt-16 py-8 text-center text-text-muted text-sm">
        <p>Narrative Simulator로 생성된 이야기입니다</p>
      </footer>
    </div>
  );
}
