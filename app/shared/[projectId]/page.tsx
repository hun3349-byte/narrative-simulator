'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getSharedProject, type SharedProjectData } from '@/lib/supabase';

export default function SharedProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<SharedProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);

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
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">프로젝트를 찾을 수 없습니다</h1>
          <p className="text-gray-400">{error || '존재하지 않거나 비공개 프로젝트입니다.'}</p>
        </div>
      </div>
    );
  }

  const selectedEpisodeData = project.episodes.find(ep => ep.number === selectedEpisode);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 헤더 */}
      <header className="border-b border-gray-800 bg-gray-900/95 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">{project.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
            <span className="px-2 py-0.5 bg-purple-900/50 rounded text-purple-300">
              {project.genre}
            </span>
            <span>{project.tone}</span>
            <span>by {project.authorPersona.name}</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 사이드바 - 세계관 정보 */}
          <aside className="lg:col-span-1">
            {/* 세계관 */}
            {project.world && (
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <h2 className="font-bold mb-3 text-purple-300">세계관</h2>
                {project.world.continentName && (
                  <p className="text-sm mb-2">
                    <span className="text-gray-400">대륙:</span> {project.world.continentName}
                  </p>
                )}
                {project.world.geography && (
                  <p className="text-sm text-gray-300">{project.world.geography}</p>
                )}
                {project.world.cities && project.world.cities.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-400 mb-1">주요 도시</p>
                    <div className="space-y-1">
                      {project.world.cities.slice(0, 3).map((city, idx) => (
                        <div key={idx} className="text-sm">
                          <span className="text-purple-300">{city.name}</span>
                          <span className="text-gray-400 text-xs ml-2">{city.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 주인공 */}
            {project.hero && (
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <h2 className="font-bold mb-3 text-purple-300">주인공</h2>
                {project.hero.name && (
                  <p className="text-lg font-bold mb-2">{project.hero.name}</p>
                )}
                {project.hero.origin && (
                  <p className="text-sm text-gray-300 mb-2">{project.hero.origin}</p>
                )}
                {project.hero.coreNarrative && (
                  <p className="text-sm text-gray-400 italic">"{project.hero.coreNarrative}"</p>
                )}
              </div>
            )}

            {/* 에피소드 목록 */}
            {project.episodes.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h2 className="font-bold mb-3 text-purple-300">에피소드</h2>
                <div className="space-y-1">
                  {project.episodes.map(ep => (
                    <button
                      key={ep.number}
                      onClick={() => setSelectedEpisode(ep.number)}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                        selectedEpisode === ep.number
                          ? 'bg-purple-600 text-white'
                          : 'hover:bg-gray-700 text-gray-300'
                      }`}
                    >
                      <span className="font-bold">{ep.number}화</span>
                      <span className="ml-2 text-xs opacity-75">{ep.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* 메인 콘텐츠 - 에피소드 본문 */}
          <main className="lg:col-span-3">
            {selectedEpisodeData ? (
              <div className="bg-gray-800 rounded-lg p-8">
                <div className="mb-6">
                  <span className="text-purple-400 text-sm">Episode {selectedEpisodeData.number}</span>
                  <h2 className="text-2xl font-bold mt-1">{selectedEpisodeData.title}</h2>
                  <p className="text-sm text-gray-400 mt-2">
                    {selectedEpisodeData.charCount.toLocaleString()}자
                  </p>
                </div>

                <div className="prose prose-invert max-w-none">
                  {selectedEpisodeData.content.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="mb-4 leading-relaxed text-gray-200">
                      {paragraph}
                    </p>
                  ))}
                </div>

                {/* 네비게이션 */}
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-700">
                  {selectedEpisode && selectedEpisode > 1 && (
                    <button
                      onClick={() => setSelectedEpisode(selectedEpisode - 1)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                    >
                      ← 이전 화
                    </button>
                  )}
                  <div className="flex-1" />
                  {selectedEpisode && project.episodes.some(ep => ep.number === selectedEpisode + 1) && (
                    <button
                      onClick={() => setSelectedEpisode(selectedEpisode + 1)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded transition-colors"
                    >
                      다음 화 →
                    </button>
                  )}
                </div>
              </div>
            ) : project.episodes.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center">
                <h2 className="text-xl font-bold mb-2">아직 공개된 에피소드가 없습니다</h2>
                <p className="text-gray-400">작가가 에피소드를 완성하면 여기에 표시됩니다.</p>
              </div>
            ) : null}
          </main>
        </div>
      </div>

      {/* 푸터 */}
      <footer className="border-t border-gray-800 mt-16 py-8 text-center text-gray-500 text-sm">
        <p>Narrative Simulator로 생성된 이야기입니다</p>
      </footer>
    </div>
  );
}
