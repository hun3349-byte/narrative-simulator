'use client';

import { useState } from 'react';
import { SimulationConfig, WorldEvent, NarrativeArcType, NarrativeGrammarConfig, PreviewFrequency } from '@/lib/types';
import { getCharacterColor } from '@/lib/utils/character-display';
import { ARC_LABELS } from '@/lib/grammar/arc-templates';
import { useSimulationStore } from '@/lib/store/simulation-store';
import worldSettings from '@/data/world-settings.json';

interface SimulationConfigModalProps {
  onStart: (config: SimulationConfig) => void;
  onClose: () => void;
  hasExistingData: boolean;
}

export default function SimulationConfigModal({ onStart, onClose, hasExistingData }: SimulationConfigModalProps) {
  const { characters, seeds, setGrammarConfig, monitorConfig, setMonitorConfig } = useSimulationStore();

  const [startYear, setStartYear] = useState(-3);
  const [endYear, setEndYear] = useState(25);
  const [eventsPerYear, setEventsPerYear] = useState(3);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>(characters.map(c => c.id));
  const [continueFromExisting, setContinueFromExisting] = useState(false);
  const [batchMode, setBatchMode] = useState(true);

  // Monitor settings
  const [previewFrequency, setPreviewFrequency] = useState<PreviewFrequency>(monitorConfig.previewFrequency);
  const [autoPauseOnCritical, setAutoPauseOnCritical] = useState(monitorConfig.autoPauseOnCritical);
  const [integratedAnalysisEnabled, setIntegratedAnalysisEnabled] = useState(monitorConfig.integratedAnalysisEnabled);

  // Grammar settings
  const [grammarEnabled, setGrammarEnabled] = useState(false);
  const [masterArcType, setMasterArcType] = useState<NarrativeArcType>('heroes_journey');
  const [tensionCurve, setTensionCurve] = useState<NarrativeGrammarConfig['tensionCurve']>('standard');
  const [actCount, setActCount] = useState<3 | 4 | 5>(3);

  const densityLabels: Record<number, string> = { 2: '낮음 (1~2개/년)', 3: '보통 (2~4개/년)', 5: '높음 (4~6개/년)' };

  const toggleCharacter = (id: string) => {
    setSelectedCharacters(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleStart = () => {
    // Save monitor config to store before starting
    setMonitorConfig({ previewFrequency, autoPauseOnCritical, integratedAnalysisEnabled });

    // Save grammar config to store before starting
    if (grammarEnabled) {
      setGrammarConfig({
        enabled: true,
        masterArcType,
        tensionCurve,
        actCount,
      });
    } else {
      setGrammarConfig(undefined);
    }

    onStart({
      startYear,
      endYear,
      eventsPerYear,
      detailLevel: 'overview',
      worldEvents: worldSettings.timeline.worldEvents as WorldEvent[],
      selectedCharacters,
      continueFromExisting,
      batchMode,
    });
  };

  const totalYears = endYear - startYear + 1;
  const estimatedCalls = batchMode
    ? Math.ceil(totalYears / 3) + (totalYears - Math.ceil(totalYears / 3) * 3 + Math.ceil(totalYears / 3))
    : totalYears * selectedCharacters.length;
  // 간단한 추산: 고속 모드 ~29회, 정밀 모드 ~87회 (29년 기준)
  const batchEstimate = Math.max(1, Math.ceil(totalYears * 0.9));
  const preciseEstimate = totalYears * selectedCharacters.length;
  const displayCalls = batchMode ? batchEstimate : preciseEstimate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-base-border bg-base-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-lg font-bold text-text-primary">시뮬레이션 설정</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <path d="M5.146 5.146a.5.5 0 0 1 .708 0L9 8.293l3.146-3.147a.5.5 0 0 1 .708.708L9.707 9l3.147 3.146a.5.5 0 0 1-.708.708L9 9.707l-3.146 3.147a.5.5 0 0 1-.708-.708L8.293 9 5.146 5.854a.5.5 0 0 1 0-.708z" />
            </svg>
          </button>
        </div>

        {/* 연도 범위 */}
        <div className="mb-4">
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
                min={-10}
                max={24}
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
                min={startYear + 1}
                max={30}
                className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-seojin/50"
              />
            </div>
          </div>
        </div>

        {/* 이벤트 밀도 */}
        <div className="mb-4">
          <label className="text-xs font-medium text-text-muted uppercase tracking-widest mb-2 block">
            이벤트 밀도
          </label>
          <div className="flex gap-2">
            {[2, 3, 5].map(density => (
              <button
                key={density}
                onClick={() => setEventsPerYear(density)}
                className={`flex-1 rounded-md border px-3 py-2 text-xs transition-colors ${
                  eventsPerYear === density
                    ? 'border-seojin bg-seojin/15 text-seojin'
                    : 'border-base-border text-text-secondary hover:border-text-muted'
                }`}
              >
                {densityLabels[density]}
              </button>
            ))}
          </div>
        </div>

        {/* API 호출 모드 */}
        <div className="mb-4">
          <label className="text-xs font-medium text-text-muted uppercase tracking-widest mb-2 block">
            API 호출 모드
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setBatchMode(true)}
              className={`rounded-md border p-3 text-left transition-colors ${
                batchMode
                  ? 'border-seojin bg-seojin/15'
                  : 'border-base-border hover:border-text-muted'
              }`}
            >
              <div className={`text-xs font-medium mb-1 ${batchMode ? 'text-seojin' : 'text-text-secondary'}`}>
                고속 모드 (권장)
              </div>
              <div className="text-[10px] text-text-muted leading-relaxed">
                캐릭터 묶음 호출<br />
                1회/년 x Haiku<br />
                빠르고 저렴<br />
                ~{batchEstimate}회 호출
              </div>
            </button>
            <button
              onClick={() => setBatchMode(false)}
              className={`rounded-md border p-3 text-left transition-colors ${
                !batchMode
                  ? 'border-seojin bg-seojin/15'
                  : 'border-base-border hover:border-text-muted'
              }`}
            >
              <div className={`text-xs font-medium mb-1 ${!batchMode ? 'text-seojin' : 'text-text-secondary'}`}>
                정밀 모드
              </div>
              <div className="text-[10px] text-text-muted leading-relaxed">
                캐릭터별 개별 호출<br />
                {selectedCharacters.length}회/년 x Haiku<br />
                더 세밀한 개별 서사<br />
                ~{preciseEstimate}회 호출
              </div>
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-text-muted">
            ※ 세밀 장면 생성은 두 모드 모두 Sonnet 사용 (고품질 유지)
          </p>
        </div>

        {/* 서사 문법 */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={grammarEnabled}
              onChange={e => setGrammarEnabled(e.target.checked)}
              className="rounded border-base-border"
            />
            <span className="text-xs font-medium text-text-muted uppercase tracking-widest">서사 문법 엔진</span>
            <span className="text-[10px] text-amber-500/70">NEW</span>
          </label>

          {grammarEnabled && (
            <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3 space-y-3">
              {/* 서사 아크 유형 */}
              <div>
                <label className="text-[10px] text-text-muted block mb-1.5">서사 구조</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.entries(ARC_LABELS) as [NarrativeArcType, string][]).map(([type, label]) => (
                    <button
                      key={type}
                      onClick={() => setMasterArcType(type)}
                      className={`rounded-md border px-2 py-1.5 text-[11px] transition-colors ${
                        masterArcType === type
                          ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                          : 'border-base-border text-text-muted hover:border-text-muted'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 긴장도 커브 */}
              <div>
                <label className="text-[10px] text-text-muted block mb-1.5">긴장도 커브</label>
                <div className="flex gap-1.5">
                  {([['standard', '표준'], ['slow_burn', '서서히'], ['explosive', '폭발적']] as const).map(([curve, label]) => (
                    <button
                      key={curve}
                      onClick={() => setTensionCurve(curve)}
                      className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] transition-colors ${
                        tensionCurve === curve
                          ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                          : 'border-base-border text-text-muted hover:border-text-muted'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 막 수 */}
              <div>
                <label className="text-[10px] text-text-muted block mb-1.5">막 구성</label>
                <div className="flex gap-1.5">
                  {([3, 4, 5] as const).map(count => (
                    <button
                      key={count}
                      onClick={() => setActCount(count)}
                      className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] transition-colors ${
                        actCount === count
                          ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                          : 'border-base-border text-text-muted hover:border-text-muted'
                      }`}
                    >
                      {count}막
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-text-muted leading-relaxed">
                서사 문법은 AI가 이야기 구조(영웅의 여정, 비극 등)를 따르도록 유도합니다.
                각 캐릭터에 서사 단계가 자동 배정되고, 필수 비트(반전, 위기 등)가 추적됩니다.
              </p>
            </div>
          )}
        </div>

        {/* 스토리라인 모니터링 */}
        <div className="mb-4">
          <label className="text-xs font-medium text-text-muted uppercase tracking-widest mb-2 block">
            스토리라인 모니터링
          </label>
          <div className="rounded-md border border-base-border bg-base-primary/30 p-3 space-y-2">
            <div className="flex gap-1.5">
              {([
                { val: 'auto' as const, label: '자동' },
                { val: 'semi_auto' as const, label: '반자동' },
                { val: 'manual' as const, label: '수동' },
                { val: 'off' as const, label: '끄기' },
              ]).map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setPreviewFrequency(opt.val)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] transition-colors ${
                    previewFrequency === opt.val
                      ? 'border-seojin bg-seojin/15 text-seojin'
                      : 'border-base-border text-text-muted hover:border-text-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPauseOnCritical}
                  onChange={e => setAutoPauseOnCritical(e.target.checked)}
                  className="rounded border-base-border"
                />
                <span className="text-[10px] text-text-secondary">위험 시 자동 정지</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={integratedAnalysisEnabled}
                  onChange={e => setIntegratedAnalysisEnabled(e.target.checked)}
                  className="rounded border-base-border"
                />
                <span className="text-[10px] text-text-secondary">통합 분석</span>
              </label>
            </div>
          </div>
        </div>

        {/* 캐릭터 선택 */}
        <div className="mb-4">
          <label className="text-xs font-medium text-text-muted uppercase tracking-widest mb-2 block">
            캐릭터 선택
          </label>
          <div className="flex gap-2">
            {characters.map(char => {
              const isSelected = selectedCharacters.includes(char.id);
              const color = getCharacterColor(char.id, characters, seeds);
              return (
                <button
                  key={char.id}
                  onClick={() => toggleCharacter(char.id)}
                  className={`flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                    isSelected
                      ? 'border-opacity-60'
                      : 'border-base-border text-text-muted opacity-40'
                  }`}
                  style={isSelected ? {
                    borderColor: color,
                    backgroundColor: `${color}15`,
                    color,
                  } : undefined}
                >
                  {char.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 이어서 실행 옵션 */}
        {hasExistingData && (
          <div className="mb-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={continueFromExisting}
                onChange={e => setContinueFromExisting(e.target.checked)}
                className="rounded border-base-border"
              />
              <span className="text-xs text-text-secondary">이전 시뮬레이션 이어서 실행</span>
            </label>
          </div>
        )}

        {/* 예상 정보 */}
        <div className="mb-5 rounded-md bg-base-primary/50 p-3">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>예상 API 호출</span>
            <span className="text-text-secondary">{displayCalls}회</span>
          </div>
          <div className="flex items-center justify-between text-xs text-text-muted mt-1">
            <span>예상 소요 시간</span>
            <span className="text-text-secondary">~{Math.ceil(displayCalls * 5 / 60)}분</span>
          </div>
          <div className="flex items-center justify-between text-xs text-text-muted mt-1">
            <span>모델</span>
            <span className="text-text-secondary">Haiku (시뮬레이션) + Sonnet (세밀 장면)</span>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-base-border px-4 py-2.5 text-sm text-text-secondary hover:bg-base-tertiary transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleStart}
            disabled={selectedCharacters.length === 0}
            className="flex-1 rounded-lg bg-seojin px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            시뮬레이션 시작
          </button>
        </div>
      </div>
    </div>
  );
}
