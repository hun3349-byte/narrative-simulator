'use client';

import { useState } from 'react';
import { WorldSettings, Faction, WorldCoreRule, WorldHistoricalWound, WorldCurrentTension } from '@/lib/types';

interface WorldBuilderProps {
  value: WorldSettings | null;
  onChange: (ws: WorldSettings) => void;
  onNext: () => void;
}

const GENRES = ['무협', '판타지', 'SF', '현대', '역사', '로맨스', '스릴러', '혼합'];
const CORE_RULES = ['마법/기 체계', '혈통/유전', '계약/소환', '기술/기계', '신/종교', '직접 입력'];
const ERA_MOODS = ['평화로운', '전란 중', '멸망 직후', '재건기'];
const ALIGNMENTS: Faction['alignment'][] = ['light', 'gray', 'dark', 'chaotic', 'neutral'];
const ALIGNMENT_LABELS: Record<string, string> = {
  light: '정파', gray: '회색', dark: '사파', chaotic: '혼돈', neutral: '중립',
};

export default function WorldBuilder({ value, onChange, onNext }: WorldBuilderProps) {
  const [mode, setMode] = useState<'form' | 'freetext'>('form');
  const [freeText, setFreeText] = useState('');
  const [structuring, setStructuring] = useState(false);

  // Form state
  const [worldName, setWorldName] = useState(value?.worldName || '');
  const [description, setDescription] = useState(value?.description || '');
  const [genre, setGenre] = useState(value?.genre || '');
  const [coreRule, setCoreRule] = useState(value?.coreRule || '');
  const [customCoreRule, setCustomCoreRule] = useState('');
  const [era, setEra] = useState(value?.era || '');
  const [factions, setFactions] = useState<Faction[]>(value?.factions || [{ name: '', alignment: 'neutral', description: '' }]);
  const [worldEvents, setWorldEvents] = useState<{ year: number; event: string; impact: string }[]>(
    value?.timeline?.worldEvents || [{ year: 0, event: '', impact: '' }]
  );
  const [showLayers, setShowLayers] = useState(!!value?.worldLayers);
  const [layerCoreRule, setLayerCoreRule] = useState<WorldCoreRule>(
    value?.worldLayers?.coreRule || { law: '', cost: '', implication: '' }
  );
  const [layerWound, setLayerWound] = useState<WorldHistoricalWound>(
    value?.worldLayers?.historicalWound || { event: '', underlyingConflict: '', unresolvedTension: '' }
  );
  const [layerTension, setLayerTension] = useState<WorldCurrentTension>(
    value?.worldLayers?.currentTension || { powerStructure: '', oppressionDetail: '', emergingThreat: '' }
  );
  const [sensoryDetails, setSensoryDetails] = useState<string[]>(
    value?.worldLayers?.sensoryDetails || ['']
  );
  const [socialNorms, setSocialNorms] = useState<string[]>(
    value?.worldLayers?.socialNorms || ['']
  );
  const [dailyLife, setDailyLife] = useState<string[]>(
    value?.worldLayers?.dailyLife || ['']
  );

  const addFaction = () => {
    if (factions.length < 5) {
      setFactions([...factions, { name: '', alignment: 'neutral', description: '' }]);
    }
  };

  const updateFaction = (idx: number, field: keyof Faction, val: string) => {
    const updated = [...factions];
    updated[idx] = { ...updated[idx], [field]: val };
    setFactions(updated);
  };

  const removeFaction = (idx: number) => {
    setFactions(factions.filter((_, i) => i !== idx));
  };

  const addWorldEvent = () => {
    setWorldEvents([...worldEvents, { year: 0, event: '', impact: '' }]);
  };

  const updateWorldEvent = (idx: number, field: string, val: string | number) => {
    const updated = [...worldEvents];
    (updated[idx] as Record<string, string | number>)[field] = val;
    setWorldEvents(updated);
  };

  const removeWorldEvent = (idx: number) => {
    setWorldEvents(worldEvents.filter((_, i) => i !== idx));
  };

  const buildFromForm = (): WorldSettings => {
    const base: WorldSettings = {
      worldName,
      description,
      genre,
      coreRule: customCoreRule || coreRule,
      era,
      factions: factions.filter(f => f.name.trim()),
      timeline: {
        startYear: -10,
        currentYear: 0,
        majorEras: [],
        worldEvents: worldEvents.filter(e => e.event.trim()),
      },
    };
    if (showLayers && layerCoreRule.law.trim()) {
      base.worldLayers = {
        coreRule: layerCoreRule,
        historicalWound: layerWound,
        currentTension: layerTension,
        sensoryDetails: sensoryDetails.filter(s => s.trim()),
        socialNorms: socialNorms.filter(s => s.trim()),
        dailyLife: dailyLife.filter(s => s.trim()),
      };
    }
    return base;
  };

  const handleFormNext = () => {
    if (!worldName.trim()) return;
    onChange(buildFromForm());
    onNext();
  };

  const handleStructure = async () => {
    if (!freeText.trim() || freeText.length < 50) return;
    setStructuring(true);
    try {
      const res = await fetch('/api/structure-world', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freeText }),
      });
      const result = await res.json();
      if (result.success && result.data) {
        const d = result.data;
        setWorldName(d.worldName || '');
        setDescription(d.description || '');
        setGenre(d.genre || '');
        setCoreRule(d.coreRule || '');
        setEra(d.era || '');
        if (d.factions?.length) setFactions(d.factions);
        if (d.timeline?.worldEvents?.length) setWorldEvents(d.timeline.worldEvents);
        setMode('form');
      }
    } catch {
      // silent fail
    } finally {
      setStructuring(false);
    }
  };

  const handleFreeTextNext = async () => {
    await handleStructure();
    // After structuring, user can review in form mode
  };

  return (
    <div className="rounded-xl border border-base-border bg-base-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-lg font-bold text-text-primary">세계관 설정</h2>
        <span className="text-xs text-text-muted">Step 1/6</span>
      </div>

      {/* 모드 전환 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('form')}
          className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
            mode === 'form' ? 'bg-seojin/20 text-seojin' : 'bg-base-tertiary text-text-muted'
          }`}
        >
          선택형
        </button>
        <button
          onClick={() => setMode('freetext')}
          className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
            mode === 'freetext' ? 'bg-seojin/20 text-seojin' : 'bg-base-tertiary text-text-muted'
          }`}
        >
          직접 작성
        </button>
      </div>

      {mode === 'form' ? (
        <div className="space-y-5">
          {/* 세계관 이름 */}
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-widest mb-1.5 block">세계관 이름 *</label>
            <input
              value={worldName}
              onChange={e => setWorldName(e.target.value)}
              placeholder="예: 아카디아 대륙"
              className="w-full rounded-md border border-base-border bg-base-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50"
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-widest mb-1.5 block">세계관 설명</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="이 세계를 한 문단으로 설명"
              className="w-full rounded-md border border-base-border bg-base-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50 resize-none"
            />
          </div>

          {/* 장르 */}
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-widest mb-1.5 block">장르 베이스</label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map(g => (
                <button
                  key={g}
                  onClick={() => setGenre(g)}
                  className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                    genre === g ? 'border-seojin bg-seojin/15 text-seojin' : 'border-base-border text-text-secondary hover:border-text-muted'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* 핵심 규칙 */}
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-widest mb-1.5 block">핵심 세계 규칙</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {CORE_RULES.map(r => (
                <button
                  key={r}
                  onClick={() => { setCoreRule(r); setCustomCoreRule(''); }}
                  className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                    coreRule === r && !customCoreRule ? 'border-seojin bg-seojin/15 text-seojin' : 'border-base-border text-text-secondary hover:border-text-muted'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              value={customCoreRule}
              onChange={e => setCustomCoreRule(e.target.value)}
              placeholder="직접 입력"
              className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50"
            />
          </div>

          {/* 시대 분위기 */}
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-widest mb-1.5 block">시대 분위기</label>
            <div className="flex flex-wrap gap-2">
              {ERA_MOODS.map(m => (
                <button
                  key={m}
                  onClick={() => setEra(m)}
                  className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                    era === m ? 'border-seojin bg-seojin/15 text-seojin' : 'border-base-border text-text-secondary hover:border-text-muted'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* 세력 */}
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-widest mb-1.5 block">주요 세력 (최대 5개)</label>
            <div className="space-y-2">
              {factions.map((f, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <input
                    value={f.name}
                    onChange={e => updateFaction(idx, 'name', e.target.value)}
                    placeholder="세력명"
                    className="w-28 rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-seojin/50"
                  />
                  <select
                    value={f.alignment}
                    onChange={e => updateFaction(idx, 'alignment', e.target.value)}
                    className="w-20 rounded-md border border-base-border bg-base-primary px-1 py-1.5 text-xs text-text-primary focus:outline-none"
                  >
                    {ALIGNMENTS.map(a => (
                      <option key={a} value={a}>{ALIGNMENT_LABELS[a]}</option>
                    ))}
                  </select>
                  <input
                    value={f.description}
                    onChange={e => updateFaction(idx, 'description', e.target.value)}
                    placeholder="한 줄 설명"
                    className="flex-1 rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-seojin/50"
                  />
                  {factions.length > 1 && (
                    <button onClick={() => removeFaction(idx)} className="text-text-muted hover:text-yeonhwa text-xs px-1">x</button>
                  )}
                </div>
              ))}
              {factions.length < 5 && (
                <button onClick={addFaction} className="text-xs text-seojin hover:text-seojin-light">+ 세력 추가</button>
              )}
            </div>
          </div>

          {/* 핵심 대사건 */}
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-widest mb-1.5 block">핵심 대사건</label>
            <div className="space-y-2">
              {worldEvents.map((ev, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <input
                    type="number"
                    value={ev.year}
                    onChange={e => updateWorldEvent(idx, 'year', Number(e.target.value))}
                    placeholder="연도"
                    className="w-16 rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none"
                  />
                  <input
                    value={ev.event}
                    onChange={e => updateWorldEvent(idx, 'event', e.target.value)}
                    placeholder="사건"
                    className="flex-1 rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-seojin/50"
                  />
                  <input
                    value={ev.impact}
                    onChange={e => updateWorldEvent(idx, 'impact', e.target.value)}
                    placeholder="영향"
                    className="flex-1 rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-seojin/50"
                  />
                  {worldEvents.length > 1 && (
                    <button onClick={() => removeWorldEvent(idx)} className="text-text-muted hover:text-yeonhwa text-xs px-1">x</button>
                  )}
                </div>
              ))}
              <button onClick={addWorldEvent} className="text-xs text-seojin hover:text-seojin-light">+ 사건 추가</button>
            </div>
          </div>

          {/* 4레이어 세계관 확장 */}
          <div className="border-t border-base-border pt-5">
            <button
              onClick={() => setShowLayers(!showLayers)}
              className="flex items-center gap-2 text-xs font-medium text-seojin hover:text-seojin-light transition-colors"
            >
              <span className={`transition-transform ${showLayers ? 'rotate-90' : ''}`}>▶</span>
              세계관 깊이 설정 (4레이어)
              <span className="rounded-full bg-seojin/15 px-1.5 py-0.5 text-[9px]">NEW</span>
            </button>
            <p className="mt-1 text-[10px] text-text-muted">세계관에 깊이를 더하면 시뮬레이션의 서사가 풍성해집니다.</p>
          </div>

          {showLayers && (
            <div className="space-y-5 rounded-lg border border-seojin/20 bg-seojin/5 p-4">
              {/* Layer 1: 핵심 법칙 */}
              <div>
                <h4 className="text-xs font-medium text-seojin mb-2">Layer 1: 핵심 법칙</h4>
                <p className="text-[10px] text-text-muted mb-2">이 세계만의 고유한 규칙. 모든 캐릭터의 운명을 결정하는 하나의 법칙.</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-text-muted block mb-0.5">법칙</label>
                    <input
                      value={layerCoreRule.law}
                      onChange={e => setLayerCoreRule({ ...layerCoreRule, law: e.target.value })}
                      placeholder="예: 이 세계의 고유한 법칙"
                      className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted block mb-0.5">대가</label>
                    <input
                      value={layerCoreRule.cost}
                      onChange={e => setLayerCoreRule({ ...layerCoreRule, cost: e.target.value })}
                      placeholder="예: 그 법칙을 사용할 때의 대가"
                      className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted block mb-0.5">함의</label>
                    <input
                      value={layerCoreRule.implication}
                      onChange={e => setLayerCoreRule({ ...layerCoreRule, implication: e.target.value })}
                      placeholder="예: 세계관의 핵심 의미"
                      className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50"
                    />
                  </div>
                </div>
              </div>

              {/* Layer 2: 역사적 상처 */}
              <div>
                <h4 className="text-xs font-medium text-seojin mb-2">Layer 2: 역사적 상처</h4>
                <p className="text-[10px] text-text-muted mb-2">세계가 품고 있는 해결 안 된 문제. 캐릭터 갈등의 뿌리.</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-text-muted block mb-0.5">사건</label>
                    <input
                      value={layerWound.event}
                      onChange={e => setLayerWound({ ...layerWound, event: e.target.value })}
                      placeholder="예: 과거의 대사건"
                      className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted block mb-0.5">근본 갈등</label>
                    <input
                      value={layerWound.underlyingConflict}
                      onChange={e => setLayerWound({ ...layerWound, underlyingConflict: e.target.value })}
                      placeholder="예: 근본적인 이념 갈등"
                      className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted block mb-0.5">미해결 긴장</label>
                    <input
                      value={layerWound.unresolvedTension}
                      onChange={e => setLayerWound({ ...layerWound, unresolvedTension: e.target.value })}
                      placeholder="예: 아직 해결되지 않은 긴장"
                      className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50"
                    />
                  </div>
                </div>
              </div>

              {/* Layer 3: 현재 긴장 */}
              <div>
                <h4 className="text-xs font-medium text-seojin mb-2">Layer 3: 현재의 긴장</h4>
                <p className="text-[10px] text-text-muted mb-2">지금 이 세계에서 벌어지고 있는 갈등.</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-text-muted block mb-0.5">권력 구조</label>
                    <input
                      value={layerTension.powerStructure}
                      onChange={e => setLayerTension({ ...layerTension, powerStructure: e.target.value })}
                      placeholder="예: 현재의 권력 구조"
                      className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted block mb-0.5">억압의 구체적 모습</label>
                    <input
                      value={layerTension.oppressionDetail}
                      onChange={e => setLayerTension({ ...layerTension, oppressionDetail: e.target.value })}
                      placeholder="예: 억압의 구체적 모습"
                      className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted block mb-0.5">떠오르는 위협</label>
                    <input
                      value={layerTension.emergingThreat}
                      onChange={e => setLayerTension({ ...layerTension, emergingThreat: e.target.value })}
                      placeholder="예: 새롭게 떠오르는 위협"
                      className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50"
                    />
                  </div>
                </div>
              </div>

              {/* Layer 4: 일상의 질감 */}
              <div>
                <h4 className="text-xs font-medium text-seojin mb-2">Layer 4: 일상의 질감</h4>
                <p className="text-[10px] text-text-muted mb-2">독자가 &ldquo;거기 가보고 싶다&rdquo;고 느끼는 감각 디테일.</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-text-muted block mb-1">감각 디테일</label>
                    {sensoryDetails.map((s, idx) => (
                      <div key={idx} className="flex gap-1 mb-1">
                        <input
                          value={s}
                          onChange={e => { const u = [...sensoryDetails]; u[idx] = e.target.value; setSensoryDetails(u); }}
                          placeholder="예: 이 세계의 특징적인 감각"
                          className="flex-1 rounded-md border border-base-border bg-base-primary px-2 py-1 text-[11px] text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50"
                        />
                        {sensoryDetails.length > 1 && (
                          <button onClick={() => setSensoryDetails(sensoryDetails.filter((_, i) => i !== idx))} className="text-text-muted hover:text-yeonhwa text-xs px-1">x</button>
                        )}
                      </div>
                    ))}
                    {sensoryDetails.length < 10 && (
                      <button onClick={() => setSensoryDetails([...sensoryDetails, ''])} className="text-[10px] text-seojin hover:text-seojin-light">+ 추가</button>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted block mb-1">사회 규범</label>
                    {socialNorms.map((s, idx) => (
                      <div key={idx} className="flex gap-1 mb-1">
                        <input
                          value={s}
                          onChange={e => { const u = [...socialNorms]; u[idx] = e.target.value; setSocialNorms(u); }}
                          placeholder="예: 이 세계의 사회 규범"
                          className="flex-1 rounded-md border border-base-border bg-base-primary px-2 py-1 text-[11px] text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50"
                        />
                        {socialNorms.length > 1 && (
                          <button onClick={() => setSocialNorms(socialNorms.filter((_, i) => i !== idx))} className="text-text-muted hover:text-yeonhwa text-xs px-1">x</button>
                        )}
                      </div>
                    ))}
                    {socialNorms.length < 5 && (
                      <button onClick={() => setSocialNorms([...socialNorms, ''])} className="text-[10px] text-seojin hover:text-seojin-light">+ 추가</button>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted block mb-1">일상의 모습</label>
                    {dailyLife.map((s, idx) => (
                      <div key={idx} className="flex gap-1 mb-1">
                        <input
                          value={s}
                          onChange={e => { const u = [...dailyLife]; u[idx] = e.target.value; setDailyLife(u); }}
                          placeholder="예: 이 세계의 일상 모습"
                          className="flex-1 rounded-md border border-base-border bg-base-primary px-2 py-1 text-[11px] text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50"
                        />
                        {dailyLife.length > 1 && (
                          <button onClick={() => setDailyLife(dailyLife.filter((_, i) => i !== idx))} className="text-text-muted hover:text-yeonhwa text-xs px-1">x</button>
                        )}
                      </div>
                    ))}
                    {dailyLife.length < 5 && (
                      <button onClick={() => setDailyLife([...dailyLife, ''])} className="text-[10px] text-seojin hover:text-seojin-light">+ 추가</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 다음 */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleFormNext}
              disabled={!worldName.trim()}
              className="rounded-lg bg-seojin px-6 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              다음
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-text-secondary">
            아래에 자유롭게 세계관을 설명해주세요. AI가 구조화하여 시뮬레이션에 반영합니다.
          </p>
          <textarea
            value={freeText}
            onChange={e => setFreeText(e.target.value)}
            rows={10}
            placeholder={`예시:\n"당신만의 세계관을 자유롭게 설명해주세요.\n세계의 특징, 역사, 권력 구조, 갈등 등을 작성하면\nAI가 구조화하여 시뮬레이션에 반영합니다."\n\n(최소 50자 이상 권장)`}
            className="w-full rounded-md border border-base-border bg-base-primary px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-seojin/50 resize-none leading-relaxed"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-text-muted">{freeText.length}자</span>
            <div className="flex gap-2">
              <button
                onClick={handleStructure}
                disabled={freeText.length < 50 || structuring}
                className="rounded-lg border border-seojin/50 bg-seojin/10 px-4 py-2 text-sm text-seojin hover:bg-seojin/20 transition-colors disabled:opacity-30"
              >
                {structuring ? 'AI 구조화 중...' : 'AI로 구조화하기'}
              </button>
              <button
                onClick={handleFreeTextNext}
                disabled={freeText.length < 50 || structuring}
                className="rounded-lg bg-seojin px-6 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-30"
              >
                다음
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
