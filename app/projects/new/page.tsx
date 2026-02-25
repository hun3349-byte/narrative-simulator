'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store/project-store';
import {
  GENRE_OPTIONS,
  TONE_DENSITY_OPTIONS,
  MOOD_OPTIONS,
  DIALOGUE_STYLE_OPTIONS,
  DESCRIPTION_DENSITY_OPTIONS,
} from '@/lib/presets/genre-personas';
import type { AuthorConfig, GenreType, ToneDensity, MoodType, DialogueStyle, DescriptionDensity } from '@/lib/types';

export default function NewProjectPage() {
  const router = useRouter();
  const { createProject, selectProject } = useProjectStore();

  // Form state
  const [viewpoint, setViewpoint] = useState<'first_person' | 'third_person' | 'custom'>('third_person');
  const [customViewpoint, setCustomViewpoint] = useState('');
  const [direction, setDirection] = useState('');

  // AuthorConfig state
  const [authorConfig, setAuthorConfig] = useState<AuthorConfig>({
    genre: 'fantasy',
    toneDensity: 'medium',
    moods: [],
    dialogueStyle: 'mixed',
    descriptionDensity: 'balanced',
  });
  const [customGenre, setCustomGenre] = useState('');

  const handleGenreChange = (genre: GenreType) => {
    setAuthorConfig(prev => ({ ...prev, genre }));
  };

  const handleToneDensityChange = (toneDensity: ToneDensity) => {
    setAuthorConfig(prev => ({ ...prev, toneDensity }));
  };

  const handleMoodToggle = (mood: MoodType) => {
    setAuthorConfig(prev => ({
      ...prev,
      moods: prev.moods.includes(mood)
        ? prev.moods.filter(m => m !== mood)
        : [...prev.moods, mood],
    }));
  };

  const handleDialogueStyleChange = (dialogueStyle: DialogueStyle) => {
    setAuthorConfig(prev => ({ ...prev, dialogueStyle }));
  };

  const handleDescriptionDensityChange = (descriptionDensity: DescriptionDensity) => {
    setAuthorConfig(prev => ({ ...prev, descriptionDensity }));
  };

  const handleStart = () => {
    const finalViewpoint = viewpoint === 'custom' ? customViewpoint : viewpoint;

    // AuthorConfig에 customGenre 반영
    const finalAuthorConfig: AuthorConfig = {
      ...authorConfig,
      customGenre: authorConfig.genre === 'custom' ? customGenre : undefined,
    };

    const projectId = createProject({
      genre: authorConfig.genre === 'custom' ? customGenre : authorConfig.genre,
      tone: authorConfig.toneDensity,
      viewpoint: finalViewpoint,
      authorConfig: finalAuthorConfig,
      direction: direction.trim() || undefined,
    });

    selectProject(projectId);
    router.push(`/projects/${projectId}`);
  };

  // 선택된 장르 정보
  const selectedGenre = GENRE_OPTIONS.find(g => g.id === authorConfig.genre);

  return (
    <div className="min-h-screen bg-base-primary p-4 md:p-8">
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
            장르와 톤을 선택하면 작가가 맞춤형 문체로 글을 씁니다
          </p>
        </div>

        <div className="space-y-6">
          {/* 장르 선택 */}
          <section className="rounded-lg border border-base-border bg-base-secondary p-6">
            <h2 className="mb-4 font-medium text-text-primary">장르</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {GENRE_OPTIONS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleGenreChange(g.id)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    authorConfig.genre === g.id
                      ? 'border-seojin bg-seojin/10'
                      : 'border-base-border bg-base-primary hover:border-base-border/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{g.icon}</span>
                    <span className="font-medium text-text-primary">{g.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{g.description}</p>
                </button>
              ))}
            </div>
            {authorConfig.genre === 'custom' && (
              <input
                type="text"
                value={customGenre}
                onChange={(e) => setCustomGenre(e.target.value)}
                placeholder="장르를 입력하세요"
                className="mt-3 w-full rounded-lg border border-base-border bg-base-primary px-4 py-2 text-text-primary placeholder:text-text-muted focus:border-seojin focus:outline-none"
              />
            )}
          </section>

          {/* 톤 밀도 */}
          <section className="rounded-lg border border-base-border bg-base-secondary p-6">
            <h2 className="mb-4 font-medium text-text-primary">톤 밀도</h2>
            <div className="flex flex-wrap gap-3">
              {TONE_DENSITY_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleToneDensityChange(t.id)}
                  className={`flex-1 rounded-lg border p-3 text-center transition-colors ${
                    authorConfig.toneDensity === t.id
                      ? 'border-seojin bg-seojin/10'
                      : 'border-base-border bg-base-primary hover:border-base-border/80'
                  }`}
                >
                  <span className="font-medium text-text-primary">{t.label}</span>
                  <p className="mt-1 text-xs text-text-muted">{t.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* 분위기 (복수 선택) */}
          <section className="rounded-lg border border-base-border bg-base-secondary p-6">
            <h2 className="mb-2 font-medium text-text-primary">
              분위기 <span className="text-text-muted text-sm">(복수 선택 가능)</span>
            </h2>
            <p className="mb-4 text-xs text-text-muted">
              원하는 분위기를 여러 개 선택할 수 있어요. 선택하지 않으면 장르 기본 분위기가 적용됩니다.
            </p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleMoodToggle(m.id)}
                  className={`rounded-lg border p-2 text-left transition-colors ${
                    authorConfig.moods.includes(m.id)
                      ? 'border-seojin bg-seojin/10'
                      : 'border-base-border bg-base-primary hover:border-base-border/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-4 w-4 rounded border ${
                      authorConfig.moods.includes(m.id)
                        ? 'border-seojin bg-seojin'
                        : 'border-base-border'
                    }`}>
                      {authorConfig.moods.includes(m.id) && (
                        <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm font-medium text-text-primary">{m.label}</span>
                  </div>
                  <p className="mt-1 pl-6 text-xs text-text-muted">{m.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* 대사 스타일 */}
          <section className="rounded-lg border border-base-border bg-base-secondary p-6">
            <h2 className="mb-4 font-medium text-text-primary">대사 스타일</h2>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {DIALOGUE_STYLE_OPTIONS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => handleDialogueStyleChange(d.id)}
                  className={`rounded-lg border p-2 text-center transition-colors ${
                    authorConfig.dialogueStyle === d.id
                      ? 'border-seojin bg-seojin/10'
                      : 'border-base-border bg-base-primary hover:border-base-border/80'
                  }`}
                >
                  <span className="text-sm font-medium text-text-primary">{d.label}</span>
                  <p className="mt-1 text-xs text-text-muted">{d.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* 묘사 밀도 */}
          <section className="rounded-lg border border-base-border bg-base-secondary p-6">
            <h2 className="mb-4 font-medium text-text-primary">묘사 밀도</h2>
            <div className="flex flex-wrap gap-3">
              {DESCRIPTION_DENSITY_OPTIONS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => handleDescriptionDensityChange(d.id)}
                  className={`flex-1 rounded-lg border p-3 text-center transition-colors ${
                    authorConfig.descriptionDensity === d.id
                      ? 'border-seojin bg-seojin/10'
                      : 'border-base-border bg-base-primary hover:border-base-border/80'
                  }`}
                >
                  <span className="font-medium text-text-primary">{d.label}</span>
                  <p className="mt-1 text-xs text-text-muted">{d.description}</p>
                </button>
              ))}
            </div>
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

          {/* 설정 미리보기 */}
          <div className="rounded-lg bg-base-tertiary p-4">
            <h3 className="mb-2 text-sm font-medium text-text-primary">현재 설정</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-seojin/20 px-2 py-1 text-seojin">
                {selectedGenre?.icon} {selectedGenre?.label || '장르'}
              </span>
              <span className="rounded-full bg-base-secondary px-2 py-1 text-text-muted">
                {TONE_DENSITY_OPTIONS.find(t => t.id === authorConfig.toneDensity)?.label}
              </span>
              {authorConfig.moods.map(m => (
                <span key={m} className="rounded-full bg-base-secondary px-2 py-1 text-text-muted">
                  {MOOD_OPTIONS.find(mo => mo.id === m)?.label}
                </span>
              ))}
              <span className="rounded-full bg-base-secondary px-2 py-1 text-text-muted">
                대사: {DIALOGUE_STYLE_OPTIONS.find(d => d.id === authorConfig.dialogueStyle)?.label}
              </span>
              <span className="rounded-full bg-base-secondary px-2 py-1 text-text-muted">
                묘사: {DESCRIPTION_DENSITY_OPTIONS.find(d => d.id === authorConfig.descriptionDensity)?.label}
              </span>
            </div>
          </div>

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
              작가와 대화하며 6단계로 세계를 구축합니다
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
