'use client';

import { useState } from 'react';
import { WorldSettings, Character, Relationship, WorldEvent, StoryDirectorConfig, CharacterSeed, PreviewFrequency, StorylineMonitorConfig } from '@/lib/types';
import { useSimulationStore } from '@/lib/store/simulation-store';

interface TimelineSetupProps {
  worldSettings: WorldSettings;
  characters: Character[];
  relationships: Relationship[];
  seeds?: CharacterSeed[];
  storyDirectorConfig?: StoryDirectorConfig | null;
  onPrev: () => void;
  onComplete: () => void;
}

export default function TimelineSetup({ worldSettings, characters, relationships, seeds, storyDirectorConfig, onPrev, onComplete }: TimelineSetupProps) {
  // 자동 추천 연도 범위
  const minBirthYear = Math.min(...characters.map(c => c.birthYear));
  const [startYear, setStartYear] = useState(minBirthYear);
  const [endYear, setEndYear] = useState(minBirthYear + 28);
  const [batchMode, setBatchMode] = useState(true);
  const [density, setDensity] = useState(3);
  const [saving, setSaving] = useState(false);
  const [previewFrequency, setPreviewFrequency] = useState<PreviewFrequency>('semi_auto');
  const [autoPauseOnCritical, setAutoPauseOnCritical] = useState(true);
  const [integratedAnalysisEnabled, setIntegratedAnalysisEnabled] = useState(true);

  const { setCharacters, reset, setSeeds, setWorldEvents, setStoryDirectorConfig, setMonitorConfig } = useSimulationStore();

  const totalYears = endYear - startYear + 1;
  const batchEstimate = Math.max(1, Math.ceil(totalYears * 0.9));
  const preciseEstimate = totalYears * characters.length;
  const displayCalls = batchMode ? batchEstimate : preciseEstimate;

  const worldEvents: WorldEvent[] = worldSettings.timeline.worldEvents.map(we => ({
    year: we.year,
    event: we.event,
    impact: we.impact,
  }));

  const monitorCfg: StorylineMonitorConfig = { previewFrequency, autoPauseOnCritical, integratedAnalysisEnabled };

  const handleSaveOnly = () => {
    setSaving(true);
    // Reset and set custom characters + world data
    reset();
    setCharacters(characters);
    if (seeds && seeds.length > 0) {
      setSeeds(seeds);
    }
    if (worldEvents.length > 0) {
      setWorldEvents(worldEvents);
    }
    if (storyDirectorConfig) {
      setStoryDirectorConfig(storyDirectorConfig);
    }
    setMonitorConfig(monitorCfg);
    // Save project config to localStorage
    const projectConfig = {
      id: `project-${Date.now()}`,
      name: worldSettings.worldName,
      worldSettings,
      characters,
      relationships,
      simulationConfig: {
        startYear,
        endYear,
        eventsPerYear: density,
        detailLevel: 'overview' as const,
        worldEvents,
        batchMode,
      },
      storyDirectorConfig: storyDirectorConfig || undefined,
      monitorConfig: monitorCfg,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('narrative-project-config', JSON.stringify(projectConfig));
    setTimeout(() => {
      setSaving(false);
      onComplete();
    }, 500);
  };

  const handleStartSimulation = () => {
    // Save config + redirect to dashboard where simulation will auto-trigger
    reset();
    setCharacters(characters);
    if (seeds && seeds.length > 0) {
      setSeeds(seeds);
    }
    if (worldEvents.length > 0) {
      setWorldEvents(worldEvents);
    }
    if (storyDirectorConfig) {
      setStoryDirectorConfig(storyDirectorConfig);
    }
    setMonitorConfig(monitorCfg);
    const projectConfig = {
      id: `project-${Date.now()}`,
      name: worldSettings.worldName,
      worldSettings,
      characters,
      relationships,
      simulationConfig: {
        startYear,
        endYear,
        eventsPerYear: density,
        detailLevel: 'overview' as const,
        worldEvents,
        batchMode,
      },
      storyDirectorConfig: storyDirectorConfig || undefined,
      monitorConfig: monitorCfg,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('narrative-project-config', JSON.stringify(projectConfig));
    localStorage.setItem('narrative-auto-start', 'true');
    onComplete();
  };

  return (
    <div className="rounded-xl border border-base-border bg-base-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-lg font-bold text-text-primary">타임라인 설정</h2>
        <span className="text-xs text-text-muted">Step 6/6</span>
      </div>

      {/* 시뮬레이션 범위 */}
      <div className="mb-5">
        <label className="text-xs font-medium text-text-muted uppercase tracking-widest mb-2 block">
          시뮬레이션 범위
        </label>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-[10px] text-text-muted">시작 연도</label>
            <input
              type="number"
              value={startYear}
              onChange={e => setStartYear(Number(e.target.value))}
              className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-seojin/50"
            />
          </div>
          <span className="text-text-muted mt-4">~</span>
          <div className="flex-1">
            <label className="text-[10px] text-text-muted">종료 연도</label>
            <input
              type="number"
              value={endYear}
              onChange={e => setEndYear(Number(e.target.value))}
              className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-seojin/50"
            />
          </div>
        </div>
        <p className="mt-1 text-[10px] text-text-muted">
          세계관 사건 기준으로 자동 추천됨 ({totalYears}년간)
        </p>
      </div>

      {/* 이벤트 밀도 */}
      <div className="mb-5">
        <label className="text-xs font-medium text-text-muted uppercase tracking-widest mb-2 block">이벤트 밀도</label>
        <div className="flex gap-2">
          {([
            { val: 2, label: '낮음', desc: '1~2개/년' },
            { val: 3, label: '보통', desc: '2~4개/년' },
            { val: 5, label: '높음', desc: '4~6개/년' },
          ] as const).map(d => (
            <button
              key={d.val}
              onClick={() => setDensity(d.val)}
              className={`flex-1 rounded-md border p-2 text-center transition-colors ${
                density === d.val ? 'border-seojin bg-seojin/15' : 'border-base-border hover:border-text-muted'
              }`}
            >
              <div className={`text-xs font-medium ${density === d.val ? 'text-seojin' : 'text-text-secondary'}`}>{d.label}</div>
              <div className="text-[10px] text-text-muted">{d.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* API 모드 */}
      <div className="mb-5">
        <label className="text-xs font-medium text-text-muted uppercase tracking-widest mb-2 block">API 모드</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setBatchMode(true)}
            className={`rounded-md border p-3 text-left transition-colors ${
              batchMode ? 'border-seojin bg-seojin/15' : 'border-base-border hover:border-text-muted'
            }`}
          >
            <div className={`text-xs font-medium mb-1 ${batchMode ? 'text-seojin' : 'text-text-secondary'}`}>
              고속 (권장)
            </div>
            <div className="text-[10px] text-text-muted">묶음 호출 ~{batchEstimate}회</div>
          </button>
          <button
            onClick={() => setBatchMode(false)}
            className={`rounded-md border p-3 text-left transition-colors ${
              !batchMode ? 'border-seojin bg-seojin/15' : 'border-base-border hover:border-text-muted'
            }`}
          >
            <div className={`text-xs font-medium mb-1 ${!batchMode ? 'text-seojin' : 'text-text-secondary'}`}>
              정밀
            </div>
            <div className="text-[10px] text-text-muted">개별 호출 ~{preciseEstimate}회</div>
          </button>
        </div>
      </div>

      {/* 스토리라인 모니터링 */}
      <div className="mb-5">
        <label className="text-xs font-medium text-text-muted uppercase tracking-widest mb-2 block">
          스토리라인 모니터링
        </label>
        <div className="rounded-md border border-base-border bg-base-primary/30 p-3 space-y-3">
          {/* 프리뷰 갱신 빈도 */}
          <div>
            <div className="text-[10px] text-text-muted mb-1.5">프리뷰 갱신 빈도</div>
            <div className="grid grid-cols-4 gap-1.5">
              {([
                { val: 'auto' as const, label: '자동', desc: '터닝포인트마다' },
                { val: 'semi_auto' as const, label: '반자동', desc: '5년마다' },
                { val: 'manual' as const, label: '수동', desc: '직접 요청' },
                { val: 'off' as const, label: '끄기', desc: '비용 절약' },
              ]).map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setPreviewFrequency(opt.val)}
                  className={`rounded-md border p-2 text-center transition-colors ${
                    previewFrequency === opt.val ? 'border-seojin bg-seojin/15' : 'border-base-border hover:border-text-muted'
                  }`}
                >
                  <div className={`text-[10px] font-medium ${previewFrequency === opt.val ? 'text-seojin' : 'text-text-secondary'}`}>{opt.label}</div>
                  <div className="text-[8px] text-text-muted">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
          {/* 체크박스 옵션 */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPauseOnCritical}
                onChange={e => setAutoPauseOnCritical(e.target.checked)}
                className="rounded border-base-border"
              />
              <span className="text-[10px] text-text-secondary">위험 감지 시 자동 일시정지</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={integratedAnalysisEnabled}
                onChange={e => setIntegratedAnalysisEnabled(e.target.checked)}
                className="rounded border-base-border"
              />
              <span className="text-[10px] text-text-secondary">통합 스토리라인 분석 활성화</span>
            </label>
          </div>
          <p className="text-[9px] text-text-muted">
            모니터링은 Haiku 추가 호출 (프리뷰당 ~1회). 끄면 추가 비용 없음.
          </p>
        </div>
      </div>

      {/* 최종 확인 */}
      <div className="mb-6 rounded-lg border border-base-border bg-base-primary/50 p-4 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">세계관</span>
          <span className="text-text-secondary">{worldSettings.worldName}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">캐릭터</span>
          <span className="text-text-secondary">{characters.map(c => c.name).join(', ')}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">범위</span>
          <span className="text-text-secondary">{startYear}년 ~ {endYear}년 ({totalYears}년간)</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">예상 호출</span>
          <span className="text-text-secondary">~{displayCalls}회</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">예상 소요</span>
          <span className="text-text-secondary">~{Math.ceil(displayCalls * 5 / 60)}분</span>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="space-y-2">
        <button
          onClick={handleStartSimulation}
          className="w-full rounded-lg bg-seojin px-4 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          프로젝트 생성 & 시뮬레이션 시작
        </button>
        <button
          onClick={handleSaveOnly}
          disabled={saving}
          className="w-full rounded-lg border border-base-border px-4 py-3 text-sm text-text-secondary hover:bg-base-tertiary transition-colors disabled:opacity-50"
        >
          {saving ? '저장 중...' : '프로젝트만 저장 (나중에 실행)'}
        </button>
      </div>

      {/* 이전 */}
      <div className="flex justify-start pt-4 mt-4 border-t border-base-border">
        <button onClick={onPrev}
          className="rounded-lg border border-base-border px-4 py-2 text-sm text-text-secondary hover:bg-base-tertiary transition-colors">
          이전
        </button>
      </div>
    </div>
  );
}
