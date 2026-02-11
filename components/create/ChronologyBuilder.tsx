'use client';

import { useState } from 'react';
import { WorldSettings, WorldChronology, ChronologyEra, ChronologyEvent, ChronologyEventCategory } from '@/lib/types';

interface ChronologyBuilderProps {
  worldSettings: WorldSettings;
  value: WorldChronology | null;
  onChange: (chronology: WorldChronology) => void;
  onNext: () => void;
  onPrev: () => void;
}

const CATEGORY_LABELS: Record<ChronologyEventCategory, string> = {
  war: '전쟁',
  discovery: '발견',
  catastrophe: '재앙',
  founding: '건국/창설',
  cultural: '문화',
  political: '정치',
  mystery: '미스터리',
};

const CATEGORY_COLORS: Record<ChronologyEventCategory, string> = {
  war: '#C74B50',
  discovery: '#4A9B7F',
  catastrophe: '#D4A843',
  founding: '#7B6BA8',
  cultural: '#6BA8A8',
  political: '#A87B6B',
  mystery: '#8B5CF6',
};

const SIGNIFICANCE_LABELS: Record<string, string> = {
  minor: '소규모',
  major: '대규모',
  critical: '결정적',
};

export default function ChronologyBuilder({ worldSettings, value, onChange, onNext, onPrev }: ChronologyBuilderProps) {
  const [chronology, setChronology] = useState<WorldChronology | null>(value);
  const [generating, setGenerating] = useState(false);
  const [editingEra, setEditingEra] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-chronology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worldSettings }),
      });
      const result = await res.json();
      if (result.success && result.data) {
        const chron: WorldChronology = result.data;
        setChronology(chron);
        onChange(chron);
      }
    } catch {
      // silent fail
    } finally {
      setGenerating(false);
    }
  };

  const updateAndPropagate = (updated: WorldChronology) => {
    setChronology(updated);
    onChange(updated);
  };

  // Era CRUD
  const addEra = () => {
    if (!chronology) return;
    const newEra: ChronologyEra = {
      id: `era-${Date.now()}`,
      name: '새 시대',
      years: [0, 100],
      description: '',
      mood: '',
    };
    updateAndPropagate({ ...chronology, eras: [...chronology.eras, newEra] });
    setEditingEra(newEra.id);
  };

  const updateEra = (id: string, updates: Partial<ChronologyEra>) => {
    if (!chronology) return;
    updateAndPropagate({
      ...chronology,
      eras: chronology.eras.map(e => e.id === id ? { ...e, ...updates } : e),
    });
  };

  const deleteEra = (id: string) => {
    if (!chronology) return;
    updateAndPropagate({
      ...chronology,
      eras: chronology.eras.filter(e => e.id !== id),
    });
    if (editingEra === id) setEditingEra(null);
  };

  // Event CRUD
  const addEvent = () => {
    if (!chronology) return;
    const newEvt: ChronologyEvent = {
      id: `evt-${Date.now()}`,
      year: 0,
      title: '새 사건',
      description: '',
      impact: '',
      category: 'political',
      isMystery: false,
      significance: 'minor',
    };
    updateAndPropagate({ ...chronology, events: [...chronology.events, newEvt] });
    setEditingEvent(newEvt.id);
  };

  const updateEvent = (id: string, updates: Partial<ChronologyEvent>) => {
    if (!chronology) return;
    updateAndPropagate({
      ...chronology,
      events: chronology.events.map(e => e.id === id ? { ...e, ...updates } : e),
    });
  };

  const deleteEvent = (id: string) => {
    if (!chronology) return;
    updateAndPropagate({
      ...chronology,
      events: chronology.events.filter(e => e.id !== id),
    });
    if (editingEvent === id) setEditingEvent(null);
  };

  const toggleMystery = (id: string) => {
    if (!chronology) return;
    const evt = chronology.events.find(e => e.id === id);
    if (!evt) return;
    const newIsMystery = !evt.isMystery;
    updateEvent(id, {
      isMystery: newIsMystery,
      category: newIsMystery ? 'mystery' : 'political',
      hiddenTruth: newIsMystery ? { truth: '', revealCondition: '' } : undefined,
    });
  };

  // Sort events by year
  const sortedEvents = chronology?.events.slice().sort((a, b) => a.year - b.year) || [];
  const sortedEras = chronology?.eras.slice().sort((a, b) => a.years[0] - b.years[0]) || [];

  return (
    <div className="rounded-xl border border-base-border bg-base-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-lg font-bold text-text-primary">세계 연대기</h2>
        <span className="text-xs text-text-muted">Step 2/6</span>
      </div>

      <p className="text-xs text-text-secondary mb-4">
        세계의 역사를 시대와 사건으로 구성합니다. AI로 자동 생성하거나 직접 편집할 수 있습니다.
      </p>

      {/* Generate button */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-lg bg-seojin px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-30"
        >
          {generating ? 'AI 연대기 생성 중...' : chronology ? '연대기 재생성' : '연대기 자동 생성'}
        </button>
        {chronology && (
          <span className="flex items-center text-[10px] text-text-muted">
            {chronology.eras.length}개 시대, {chronology.events.length}개 사건
          </span>
        )}
      </div>

      {/* Timeline visualization */}
      {chronology && (
        <div className="space-y-6">
          {/* World State */}
          {chronology.worldState && (
            <div className="rounded-lg bg-seojin/5 border border-seojin/20 px-4 py-2">
              <span className="text-[10px] text-text-muted uppercase tracking-wider">현재 세계 상태</span>
              <p className="text-xs text-text-primary mt-1">{chronology.worldState}</p>
            </div>
          )}

          {/* Eras section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-text-muted uppercase tracking-widest">시대</h3>
              <button onClick={addEra} className="text-xs text-seojin hover:text-seojin-light">+ 시대 추가</button>
            </div>

            <div className="space-y-2">
              {sortedEras.map((era) => (
                <div
                  key={era.id}
                  className={`rounded-lg border p-3 transition-colors cursor-pointer ${
                    editingEra === era.id ? 'border-seojin bg-seojin/5' : 'border-base-border hover:border-seojin/30'
                  }`}
                  onClick={() => setEditingEra(editingEra === era.id ? null : era.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-seojin/40" />
                      <span className="text-sm font-medium text-text-primary">{era.name}</span>
                      <span className="text-[10px] text-text-muted">
                        ({era.years[0]}~{era.years[1]}년)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {era.mood && (
                        <span className="rounded-full bg-base-tertiary px-2 py-0.5 text-[10px] text-text-muted">{era.mood}</span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteEra(era.id); }}
                        className="text-text-muted hover:text-yeonhwa text-xs px-1"
                      >x</button>
                    </div>
                  </div>
                  {era.description && <p className="text-[11px] text-text-secondary mt-1 ml-5">{era.description}</p>}

                  {/* Inline editor */}
                  {editingEra === era.id && (
                    <div className="mt-3 space-y-2 border-t border-base-border pt-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        value={era.name}
                        onChange={e => updateEra(era.id, { name: e.target.value })}
                        placeholder="시대 이름"
                        className="w-full rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-seojin/50"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={era.years[0]}
                          onChange={e => updateEra(era.id, { years: [Number(e.target.value), era.years[1]] })}
                          className="w-20 rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none"
                          placeholder="시작"
                        />
                        <span className="text-text-muted self-center">~</span>
                        <input
                          type="number"
                          value={era.years[1]}
                          onChange={e => updateEra(era.id, { years: [era.years[0], Number(e.target.value)] })}
                          className="w-20 rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none"
                          placeholder="종료"
                        />
                        <input
                          value={era.mood}
                          onChange={e => updateEra(era.id, { mood: e.target.value })}
                          placeholder="분위기"
                          className="flex-1 rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-seojin/50"
                        />
                      </div>
                      <textarea
                        value={era.description}
                        onChange={e => updateEra(era.id, { description: e.target.value })}
                        placeholder="시대 설명"
                        rows={2}
                        className="w-full rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-seojin/50 resize-none"
                      />
                      <input
                        value={era.dominantFaction || ''}
                        onChange={e => updateEra(era.id, { dominantFaction: e.target.value || undefined })}
                        placeholder="지배 세력 (선택)"
                        className="w-full rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-seojin/50"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Events section - vertical timeline */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-text-muted uppercase tracking-widest">사건 타임라인</h3>
              <button onClick={addEvent} className="text-xs text-seojin hover:text-seojin-light">+ 사건 추가</button>
            </div>

            <div className="relative ml-4">
              {/* Vertical line */}
              <div className="absolute left-0 top-0 bottom-0 w-px bg-base-border" />

              <div className="space-y-3">
                {sortedEvents.map((evt) => {
                  const catColor = CATEGORY_COLORS[evt.category] || '#888';
                  return (
                    <div
                      key={evt.id}
                      className={`relative pl-6 ${editingEvent === evt.id ? '' : 'cursor-pointer'}`}
                      onClick={() => { if (editingEvent !== evt.id) setEditingEvent(evt.id); }}
                    >
                      {/* Node dot */}
                      <div
                        className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full -translate-x-1/2 border-2 border-base-card"
                        style={{ backgroundColor: catColor }}
                      />

                      <div className={`rounded-lg border p-3 transition-colors ${
                        editingEvent === evt.id ? 'border-seojin bg-seojin/5' : 'border-base-border hover:border-seojin/20'
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] text-text-muted font-mono">{evt.year}년</span>
                              <span
                                className="rounded-full px-1.5 py-0.5 text-[9px] font-medium text-white"
                                style={{ backgroundColor: catColor }}
                              >
                                {CATEGORY_LABELS[evt.category]}
                              </span>
                              <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                                evt.significance === 'critical' ? 'bg-yeonhwa/20 text-yeonhwa' :
                                evt.significance === 'major' ? 'bg-seojin/20 text-seojin' :
                                'bg-base-tertiary text-text-muted'
                              }`}>
                                {SIGNIFICANCE_LABELS[evt.significance]}
                              </span>
                              {evt.isMystery && (
                                <span className="rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[9px] text-purple-400">미스터리</span>
                              )}
                            </div>
                            <p className="text-xs font-medium text-text-primary mt-1">{evt.title}</p>
                            {evt.description && <p className="text-[11px] text-text-secondary mt-0.5">{evt.description}</p>}
                            {evt.impact && <p className="text-[10px] text-text-muted mt-0.5">영향: {evt.impact}</p>}
                            {evt.isMystery && evt.hiddenTruth && (
                              <div className="mt-1 rounded bg-purple-500/10 px-2 py-1 border border-purple-500/20">
                                <p className="text-[10px] text-purple-400">숨겨진 진실: {evt.hiddenTruth.truth || '(미설정)'}</p>
                                <p className="text-[10px] text-purple-300/70">공개 조건: {evt.hiddenTruth.revealCondition || '(미설정)'}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleMystery(evt.id); }}
                              className={`text-[10px] px-1.5 py-0.5 rounded ${evt.isMystery ? 'bg-purple-500/20 text-purple-400' : 'bg-base-tertiary text-text-muted hover:text-purple-400'}`}
                              title="미스터리 토글"
                            >?</button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteEvent(evt.id); }}
                              className="text-text-muted hover:text-yeonhwa text-xs px-1"
                            >x</button>
                          </div>
                        </div>

                        {/* Inline editor */}
                        {editingEvent === evt.id && (
                          <div className="mt-3 space-y-2 border-t border-base-border pt-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                value={evt.year}
                                onChange={e => updateEvent(evt.id, { year: Number(e.target.value) })}
                                className="w-20 rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none"
                                placeholder="연도"
                              />
                              <input
                                value={evt.title}
                                onChange={e => updateEvent(evt.id, { title: e.target.value })}
                                placeholder="사건 제목"
                                className="flex-1 rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-seojin/50"
                              />
                            </div>
                            <textarea
                              value={evt.description}
                              onChange={e => updateEvent(evt.id, { description: e.target.value })}
                              placeholder="사건 설명"
                              rows={2}
                              className="w-full rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-seojin/50 resize-none"
                            />
                            <div className="flex gap-2">
                              <input
                                value={evt.impact}
                                onChange={e => updateEvent(evt.id, { impact: e.target.value })}
                                placeholder="영향"
                                className="flex-1 rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-seojin/50"
                              />
                              <select
                                value={evt.category}
                                onChange={e => updateEvent(evt.id, { category: e.target.value as ChronologyEventCategory })}
                                className="rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none"
                              >
                                {(Object.keys(CATEGORY_LABELS) as ChronologyEventCategory[]).map(cat => (
                                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                                ))}
                              </select>
                              <select
                                value={evt.significance}
                                onChange={e => updateEvent(evt.id, { significance: e.target.value as 'minor' | 'major' | 'critical' })}
                                className="rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none"
                              >
                                <option value="minor">소규모</option>
                                <option value="major">대규모</option>
                                <option value="critical">결정적</option>
                              </select>
                            </div>
                            <input
                              value={evt.relatedFactions?.join(', ') || ''}
                              onChange={e => updateEvent(evt.id, { relatedFactions: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                              placeholder="관련 세력 (콤마 구분)"
                              className="w-full rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-seojin/50"
                            />
                            {evt.isMystery && (
                              <div className="space-y-1 rounded-lg border border-purple-500/20 bg-purple-500/5 p-2">
                                <span className="text-[10px] text-purple-400 font-medium">미스터리 설정</span>
                                <input
                                  value={evt.hiddenTruth?.truth || ''}
                                  onChange={e => updateEvent(evt.id, { hiddenTruth: { ...evt.hiddenTruth!, truth: e.target.value } })}
                                  placeholder="숨겨진 진실"
                                  className="w-full rounded-md border border-purple-500/20 bg-base-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-purple-500/50"
                                />
                                <input
                                  value={evt.hiddenTruth?.revealCondition || ''}
                                  onChange={e => updateEvent(evt.id, { hiddenTruth: { ...evt.hiddenTruth!, revealCondition: e.target.value } })}
                                  placeholder="공개 조건"
                                  className="w-full rounded-md border border-purple-500/20 bg-base-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-purple-500/50"
                                />
                              </div>
                            )}
                            <button
                              onClick={() => setEditingEvent(null)}
                              className="text-xs text-seojin hover:text-seojin-light"
                            >편집 닫기</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No chronology yet */}
      {!chronology && !generating && (
        <div className="rounded-lg border border-dashed border-base-border p-8 text-center">
          <p className="text-sm text-text-muted mb-2">연대기가 아직 없습니다.</p>
          <p className="text-xs text-text-muted">위 버튼을 눌러 AI로 자동 생성하세요.</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <button
          onClick={onPrev}
          className="rounded-lg border border-base-border px-6 py-2 text-sm text-text-secondary hover:bg-base-tertiary transition-colors"
        >
          이전
        </button>
        <div className="flex gap-2">
          {!chronology && (
            <button
              onClick={onNext}
              className="rounded-lg border border-base-border px-6 py-2 text-sm text-text-muted hover:bg-base-tertiary transition-colors"
            >
              건너뛰기
            </button>
          )}
          <button
            onClick={onNext}
            disabled={!chronology && generating}
            className="rounded-lg bg-seojin px-6 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            {chronology ? '확정 & 다음' : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
}
