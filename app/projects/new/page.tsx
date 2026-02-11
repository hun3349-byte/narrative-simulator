'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store/project-store';
import { AUTHOR_PERSONA_PRESETS, PERSONA_ICONS } from '@/lib/presets/author-personas';

const GENRES = [
  { id: 'fantasy', label: '판타지' },
  { id: 'romance', label: '로맨스' },
  { id: 'wuxia', label: '무협' },
  { id: 'modern', label: '현대' },
  { id: 'sf', label: 'SF' },
  { id: 'horror', label: '공포' },
];

const TONES = [
  { id: 'emotional', label: '감성적' },
  { id: 'hot', label: '열혈' },
  { id: 'dark', label: '어둡고 무거운' },
  { id: 'humor', label: '유머' },
];

export default function NewProjectPage() {
  const router = useRouter();
  const { createProject, selectProject } = useProjectStore();

  // Form state
  const [genre, setGenre] = useState('fantasy');
  const [customGenre, setCustomGenre] = useState('');
  const [tone, setTone] = useState('emotional');
  const [customTone, setCustomTone] = useState('');
  const [viewpoint, setViewpoint] = useState<'first_person' | 'third_person' | 'custom'>('third_person');
  const [customViewpoint, setCustomViewpoint] = useState('');
  const [authorPersonaId, setAuthorPersonaId] = useState('lyrical');
  const [direction, setDirection] = useState('');

  const handleStart = () => {
    const finalGenre = genre === 'custom' ? customGenre : genre;
    const finalTone = tone === 'custom' ? customTone : tone;
    const finalViewpoint = viewpoint === 'custom' ? customViewpoint : viewpoint;

    const projectId = createProject({
      genre: finalGenre,
      tone: finalTone,
      viewpoint: finalViewpoint,
      authorPersonaId,
      direction: direction.trim() || undefined,
    });

    selectProject(projectId);
    router.push(`/projects/${projectId}`);
  };

  const selectedPersona = AUTHOR_PERSONA_PRESETS.find(p => p.id === authorPersonaId);

  return (
    <div className="min-h-screen bg-base-primary p-8">
      <div className="mx-auto max-w-2xl">
        {/* 헤더 */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/projects')}
            className="mb-4 text-text-muted hover:text-text-primary"
          >
            ← 프로젝트 목록
          </button>
          <h1 className="mb-2 text-center font-serif text-3xl text-text-primary">
            새 프로젝트
          </h1>
          <p className="text-center text-text-muted">
            세계를 함께 만들어가요. 작가와 대화하며 이야기를 구축합니다.
          </p>
        </div>

        <div className="space-y-8">
          {/* 장르 */}
          <section className="rounded-lg border border-base-border bg-base-secondary p-6">
            <h2 className="mb-4 font-medium text-text-primary">장르</h2>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGenre(g.id)}
                  className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                    genre === g.id
                      ? 'bg-seojin text-white'
                      : 'bg-base-primary text-text-secondary hover:bg-base-tertiary'
                  }`}
                >
                  {g.label}
                </button>
              ))}
              <button
                onClick={() => setGenre('custom')}
                className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                  genre === 'custom'
                    ? 'bg-seojin text-white'
                    : 'bg-base-primary text-text-secondary hover:bg-base-tertiary'
                }`}
              >
                직접 입력
              </button>
            </div>
            {genre === 'custom' && (
              <input
                type="text"
                value={customGenre}
                onChange={(e) => setCustomGenre(e.target.value)}
                placeholder="장르를 입력하세요"
                className="mt-3 w-full rounded-lg border border-base-border bg-base-primary px-4 py-2 text-text-primary placeholder:text-text-muted focus:border-seojin focus:outline-none"
              />
            )}
          </section>

          {/* 톤 */}
          <section className="rounded-lg border border-base-border bg-base-secondary p-6">
            <h2 className="mb-4 font-medium text-text-primary">톤</h2>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                    tone === t.id
                      ? 'bg-seojin text-white'
                      : 'bg-base-primary text-text-secondary hover:bg-base-tertiary'
                  }`}
                >
                  {t.label}
                </button>
              ))}
              <button
                onClick={() => setTone('custom')}
                className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                  tone === 'custom'
                    ? 'bg-seojin text-white'
                    : 'bg-base-primary text-text-secondary hover:bg-base-tertiary'
                }`}
              >
                직접 입력
              </button>
            </div>
            {tone === 'custom' && (
              <input
                type="text"
                value={customTone}
                onChange={(e) => setCustomTone(e.target.value)}
                placeholder="톤을 입력하세요"
                className="mt-3 w-full rounded-lg border border-base-border bg-base-primary px-4 py-2 text-text-primary placeholder:text-text-muted focus:border-seojin focus:outline-none"
              />
            )}
          </section>

          {/* 시점 */}
          <section className="rounded-lg border border-base-border bg-base-secondary p-6">
            <h2 className="mb-4 font-medium text-text-primary">시점</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setViewpoint('first_person')}
                className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                  viewpoint === 'first_person'
                    ? 'bg-seojin text-white'
                    : 'bg-base-primary text-text-secondary hover:bg-base-tertiary'
                }`}
              >
                1인칭 주인공
              </button>
              <button
                onClick={() => setViewpoint('third_person')}
                className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                  viewpoint === 'third_person'
                    ? 'bg-seojin text-white'
                    : 'bg-base-primary text-text-secondary hover:bg-base-tertiary'
                }`}
              >
                3인칭 작가
              </button>
              <button
                onClick={() => setViewpoint('custom')}
                className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                  viewpoint === 'custom'
                    ? 'bg-seojin text-white'
                    : 'bg-base-primary text-text-secondary hover:bg-base-tertiary'
                }`}
              >
                직접 입력
              </button>
            </div>
            {viewpoint === 'custom' && (
              <input
                type="text"
                value={customViewpoint}
                onChange={(e) => setCustomViewpoint(e.target.value)}
                placeholder="시점을 입력하세요"
                className="mt-3 w-full rounded-lg border border-base-border bg-base-primary px-4 py-2 text-text-primary placeholder:text-text-muted focus:border-seojin focus:outline-none"
              />
            )}
          </section>

          {/* 작가 선택 */}
          <section className="rounded-lg border border-base-border bg-base-secondary p-6">
            <h2 className="mb-4 font-medium text-text-primary">작가 선택</h2>
            <div className="grid grid-cols-2 gap-4">
              {AUTHOR_PERSONA_PRESETS.map((persona) => (
                <button
                  key={persona.id}
                  onClick={() => setAuthorPersonaId(persona.id)}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    authorPersonaId === persona.id
                      ? 'border-seojin bg-seojin/10'
                      : 'border-base-border bg-base-primary hover:border-base-border/80'
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">{PERSONA_ICONS[persona.id]}</span>
                    <span className="font-medium text-text-primary">{persona.name}</span>
                  </div>
                  <p className="text-sm text-text-muted">
                    {persona.strengths[0]}
                  </p>
                </button>
              ))}
            </div>
          </section>

          {/* 방향 (선택) */}
          <section className="rounded-lg border border-base-border bg-base-secondary p-6">
            <h2 className="mb-2 font-medium text-text-primary">
              방향 <span className="text-text-muted">(선택)</span>
            </h2>
            <p className="mb-3 text-sm text-text-muted">
              대략적인 세계관이나 이야기 방향이 있다면 적어주세요. 없으면 작가가 제안합니다.
            </p>
            <textarea
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              placeholder="예: 마법이 금지된 세계, 비밀리에 마법을 쓰는 주인공의 이야기..."
              rows={4}
              className="w-full resize-none rounded-lg border border-base-border bg-base-primary px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-seojin focus:outline-none"
            />
          </section>

          {/* 시작 버튼 */}
          <button
            onClick={handleStart}
            className="w-full rounded-lg bg-seojin py-4 text-lg font-medium text-white transition-colors hover:bg-seojin/90"
          >
            세계 만들기 시작
          </button>

          {/* 안내 */}
          <div className="rounded-lg bg-base-tertiary p-4 text-center">
            <p className="text-sm text-text-muted">
              {selectedPersona?.name || '작가'}와 대화하며 6단계로 세계를 구축합니다
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs text-text-muted">
              <span className="rounded bg-base-secondary px-2 py-1">세계</span>
              <span>→</span>
              <span className="rounded bg-base-secondary px-2 py-1">규칙</span>
              <span>→</span>
              <span className="rounded bg-base-secondary px-2 py-1">씨앗</span>
              <span>→</span>
              <span className="rounded bg-base-secondary px-2 py-1">주인공</span>
              <span>→</span>
              <span className="rounded bg-base-secondary px-2 py-1">빌런</span>
              <span>→</span>
              <span className="rounded bg-base-secondary px-2 py-1">떡밥</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
