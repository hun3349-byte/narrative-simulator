'use client';

import React, { useState, useEffect } from 'react';
import type { WorldHistoryEra, DetailedDecade } from '@/lib/types';

interface TimelineEditorProps {
  eras: WorldHistoryEra[];
  detailedDecades: DetailedDecade[];
  onSave: (data: {
    eras: WorldHistoryEra[];
    detailedDecades: DetailedDecade[];
  }) => void;
  onClose: () => void;
}

type Tab = 'eras' | 'decades';

export default function TimelineEditor({
  eras: initialEras,
  detailedDecades: initialDecades,
  onSave,
  onClose,
}: TimelineEditorProps) {
  const [activeTab, setActiveTab] = useState<Tab>('eras');
  const [eras, setEras] = useState<WorldHistoryEra[]>(initialEras || []);
  const [decades, setDecades] = useState<DetailedDecade[]>(initialDecades || []);
  const [expandedEra, setExpandedEra] = useState<string | null>(null);
  const [expandedDecade, setExpandedDecade] = useState<string | null>(null);

  // 시대 필드 업데이트
  const updateEra = (id: string, field: keyof WorldHistoryEra, value: unknown) => {
    setEras(prev => prev.map(era =>
      era.id === id ? { ...era, [field]: value } : era
    ));
  };

  // 시대 키 이벤트 업데이트
  const updateEraKeyEvent = (eraId: string, index: number, value: string) => {
    setEras(prev => prev.map(era => {
      if (era.id !== eraId) return era;
      const newKeyEvents = [...era.keyEvents];
      newKeyEvents[index] = value;
      return { ...era, keyEvents: newKeyEvents };
    }));
  };

  // 시대 키 이벤트 추가
  const addEraKeyEvent = (eraId: string) => {
    setEras(prev => prev.map(era => {
      if (era.id !== eraId) return era;
      return { ...era, keyEvents: [...era.keyEvents, ''] };
    }));
  };

  // 시대 키 이벤트 삭제
  const removeEraKeyEvent = (eraId: string, index: number) => {
    setEras(prev => prev.map(era => {
      if (era.id !== eraId) return era;
      const newKeyEvents = era.keyEvents.filter((_, i) => i !== index);
      return { ...era, keyEvents: newKeyEvents };
    }));
  };

  // 시대 주요 인물 업데이트 (문자열 배열 형태)
  const updateEraNotableFigure = (eraId: string, index: number, value: string) => {
    setEras(prev => prev.map(era => {
      if (era.id !== eraId) return era;
      const figures = era.notableFigures;
      if (Array.isArray(figures) && typeof figures[0] === 'string') {
        const newFigures = [...figures] as string[];
        newFigures[index] = value;
        return { ...era, notableFigures: newFigures };
      }
      return era;
    }));
  };

  // 시대 주요 인물 추가
  const addEraNotableFigure = (eraId: string) => {
    setEras(prev => prev.map(era => {
      if (era.id !== eraId) return era;
      const figures = era.notableFigures;
      if (Array.isArray(figures)) {
        if (typeof figures[0] === 'string' || figures.length === 0) {
          return { ...era, notableFigures: [...figures as string[], ''] };
        }
      }
      return { ...era, notableFigures: [''] };
    }));
  };

  // 시대 주요 인물 삭제
  const removeEraNotableFigure = (eraId: string, index: number) => {
    setEras(prev => prev.map(era => {
      if (era.id !== eraId) return era;
      const figures = era.notableFigures;
      if (Array.isArray(figures)) {
        // 문자열 배열인 경우
        if (figures.length === 0 || typeof figures[0] === 'string') {
          const newFigures = (figures as string[]).filter((_, i) => i !== index);
          return { ...era, notableFigures: newFigures };
        }
        // 객체 배열인 경우
        const newFigures = (figures as { name: string; description: string }[]).filter((_, i) => i !== index);
        return { ...era, notableFigures: newFigures };
      }
      return era;
    }));
  };

  // 시대 미스터리 힌트 업데이트
  const updateEraMysteryHint = (eraId: string, index: number, value: string) => {
    setEras(prev => prev.map(era => {
      if (era.id !== eraId) return era;
      const newHints = [...era.mysteryHints];
      newHints[index] = value;
      return { ...era, mysteryHints: newHints };
    }));
  };

  // 시대 미스터리 힌트 추가
  const addEraMysteryHint = (eraId: string) => {
    setEras(prev => prev.map(era => {
      if (era.id !== eraId) return era;
      return { ...era, mysteryHints: [...era.mysteryHints, ''] };
    }));
  };

  // 시대 미스터리 힌트 삭제
  const removeEraMysteryHint = (eraId: string, index: number) => {
    setEras(prev => prev.map(era => {
      if (era.id !== eraId) return era;
      const newHints = era.mysteryHints.filter((_, i) => i !== index);
      return { ...era, mysteryHints: newHints };
    }));
  };

  // 새 시대 추가
  const addNewEra = () => {
    const newEra: WorldHistoryEra = {
      id: `era_${Date.now()}`,
      name: '새 시대',
      yearRange: [0, 100],
      period: '',
      description: '',
      keyEvents: [],
      events: [],
      factionChanges: '',
      worldMood: '',
      notableFigures: [],
      mysteryHints: [],
      mood: '',
      legacy: '',
    };
    setEras(prev => [...prev, newEra]);
    setExpandedEra(newEra.id);
  };

  // 시대 삭제
  const removeEra = (id: string) => {
    if (confirm('이 시대를 삭제하시겠습니까?')) {
      setEras(prev => prev.filter(era => era.id !== id));
    }
  };

  // 10년 단위 필드 업데이트
  const updateDecade = (id: string, field: keyof DetailedDecade, value: unknown) => {
    setDecades(prev => prev.map(decade =>
      decade.id === id ? { ...decade, [field]: value } : decade
    ));
  };

  // 10년 단위 주요 이벤트 업데이트
  const updateDecadeMajorEvent = (decadeId: string, index: number, value: string) => {
    setDecades(prev => prev.map(decade => {
      if (decade.id !== decadeId) return decade;
      const newEvents = [...decade.majorEvents];
      newEvents[index] = value;
      return { ...decade, majorEvents: newEvents };
    }));
  };

  // 10년 단위 주요 이벤트 추가
  const addDecadeMajorEvent = (decadeId: string) => {
    setDecades(prev => prev.map(decade => {
      if (decade.id !== decadeId) return decade;
      return { ...decade, majorEvents: [...decade.majorEvents, ''] };
    }));
  };

  // 10년 단위 주요 이벤트 삭제
  const removeDecadeMajorEvent = (decadeId: string, index: number) => {
    setDecades(prev => prev.map(decade => {
      if (decade.id !== decadeId) return decade;
      const newEvents = decade.majorEvents.filter((_, i) => i !== index);
      return { ...decade, majorEvents: newEvents };
    }));
  };

  // 10년 단위 힌트 업데이트
  const updateDecadeHint = (decadeId: string, index: number, value: string) => {
    setDecades(prev => prev.map(decade => {
      if (decade.id !== decadeId) return decade;
      const newHints = [...decade.hints];
      newHints[index] = value;
      return { ...decade, hints: newHints };
    }));
  };

  // 10년 단위 힌트 추가
  const addDecadeHint = (decadeId: string) => {
    setDecades(prev => prev.map(decade => {
      if (decade.id !== decadeId) return decade;
      return { ...decade, hints: [...decade.hints, ''] };
    }));
  };

  // 10년 단위 힌트 삭제
  const removeDecadeHint = (decadeId: string, index: number) => {
    setDecades(prev => prev.map(decade => {
      if (decade.id !== decadeId) return decade;
      const newHints = decade.hints.filter((_, i) => i !== index);
      return { ...decade, hints: newHints };
    }));
  };

  // 새 10년 단위 추가
  const addNewDecade = () => {
    const newDecade: DetailedDecade = {
      id: `decade_${Date.now()}`,
      yearRange: [0, 10],
      period: '',
      factionStates: [],
      factionStatus: {},
      cityStates: [],
      worldTension: 50,
      tension: 50,
      worldState: '',
      majorEvents: [],
      events: [],
      hints: [],
    };
    setDecades(prev => [...prev, newDecade]);
    setExpandedDecade(newDecade.id);
  };

  // 10년 단위 삭제
  const removeDecade = (id: string) => {
    if (confirm('이 10년 단위를 삭제하시겠습니까?')) {
      setDecades(prev => prev.filter(decade => decade.id !== id));
    }
  };

  // 저장
  const handleSave = () => {
    onSave({ eras, detailedDecades: decades });
    onClose();
  };

  // 연도 범위 표시
  const formatYearRange = (range: [number, number]) => {
    const [start, end] = range;
    if (start < 0 && end < 0) {
      return `${Math.abs(start)}년 전 ~ ${Math.abs(end)}년 전`;
    } else if (start < 0) {
      return `${Math.abs(start)}년 전 ~ ${end}년`;
    } else {
      return `${start}년 ~ ${end}년`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h2 className="text-lg font-bold text-white">세계 역사 타임라인 편집</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-zinc-700">
          <button
            onClick={() => setActiveTab('eras')}
            className={`flex-1 py-3 text-center transition-colors ${
              activeTab === 'eras'
                ? 'bg-zinc-800 text-white border-b-2 border-amber-500'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            시대 (Era) - {eras.length}개
          </button>
          <button
            onClick={() => setActiveTab('decades')}
            className={`flex-1 py-3 text-center transition-colors ${
              activeTab === 'decades'
                ? 'bg-zinc-800 text-white border-b-2 border-amber-500'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            10년 단위 - {decades.length}개
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'eras' && (
            <>
              <p className="text-sm text-zinc-400 mb-4">
                세계의 역사를 시대별로 구분합니다. 천년 전 인물이 현재의 주인공일 수도 있고, 현재 태어난 주인공일 수도 있습니다.
              </p>

              {eras.map(era => (
                <div key={era.id} className="bg-zinc-800 rounded-lg overflow-hidden">
                  {/* 시대 헤더 */}
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-700/50"
                    onClick={() => setExpandedEra(expandedEra === era.id ? null : era.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-amber-400">{expandedEra === era.id ? '▼' : '▶'}</span>
                      <div>
                        <div className="text-white font-medium">{era.name || '(이름 없음)'}</div>
                        <div className="text-xs text-zinc-400">
                          {formatYearRange(era.yearRange)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeEra(era.id); }}
                      className="text-red-400 hover:text-red-300 text-sm px-2"
                    >
                      삭제
                    </button>
                  </div>

                  {/* 시대 상세 */}
                  {expandedEra === era.id && (
                    <div className="p-4 border-t border-zinc-700 space-y-4">
                      {/* 기본 정보 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">시대 이름</label>
                          <input
                            type="text"
                            value={era.name}
                            onChange={(e) => updateEra(era.id, 'name', e.target.value)}
                            className="w-full bg-zinc-700 text-white px-3 py-2 rounded text-sm"
                            placeholder="예: 신들의 시대"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">기간 텍스트</label>
                          <input
                            type="text"
                            value={era.period || ''}
                            onChange={(e) => updateEra(era.id, 'period', e.target.value)}
                            className="w-full bg-zinc-700 text-white px-3 py-2 rounded text-sm"
                            placeholder="예: 1000년 전 ~ 500년 전"
                          />
                        </div>
                      </div>

                      {/* 연도 범위 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">시작 연도</label>
                          <input
                            type="number"
                            value={era.yearRange[0]}
                            onChange={(e) => updateEra(era.id, 'yearRange', [parseInt(e.target.value) || 0, era.yearRange[1]])}
                            className="w-full bg-zinc-700 text-white px-3 py-2 rounded text-sm"
                            placeholder="음수는 과거"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">종료 연도</label>
                          <input
                            type="number"
                            value={era.yearRange[1]}
                            onChange={(e) => updateEra(era.id, 'yearRange', [era.yearRange[0], parseInt(e.target.value) || 0])}
                            className="w-full bg-zinc-700 text-white px-3 py-2 rounded text-sm"
                          />
                        </div>
                      </div>

                      {/* 설명 */}
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">시대 설명</label>
                        <textarea
                          value={era.description}
                          onChange={(e) => updateEra(era.id, 'description', e.target.value)}
                          className="w-full bg-zinc-700 text-white px-3 py-2 rounded text-sm h-20 resize-none"
                          placeholder="이 시대의 특징, 분위기, 주요 사건 등"
                        />
                      </div>

                      {/* 세력 변화 */}
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">세력 변화</label>
                        <textarea
                          value={era.factionChanges}
                          onChange={(e) => updateEra(era.id, 'factionChanges', e.target.value)}
                          className="w-full bg-zinc-700 text-white px-3 py-2 rounded text-sm h-16 resize-none"
                          placeholder="이 시대의 주요 세력 변화"
                        />
                      </div>

                      {/* 세계 분위기 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">세계 분위기</label>
                          <input
                            type="text"
                            value={era.worldMood || ''}
                            onChange={(e) => updateEra(era.id, 'worldMood', e.target.value)}
                            className="w-full bg-zinc-700 text-white px-3 py-2 rounded text-sm"
                            placeholder="예: 혼돈, 평화, 전쟁"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">무드</label>
                          <input
                            type="text"
                            value={era.mood}
                            onChange={(e) => updateEra(era.id, 'mood', e.target.value)}
                            className="w-full bg-zinc-700 text-white px-3 py-2 rounded text-sm"
                            placeholder="예: 암흑기, 황금기"
                          />
                        </div>
                      </div>

                      {/* 유산 */}
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">다음 시대에 미친 영향 (유산)</label>
                        <textarea
                          value={era.legacy || ''}
                          onChange={(e) => updateEra(era.id, 'legacy', e.target.value)}
                          className="w-full bg-zinc-700 text-white px-3 py-2 rounded text-sm h-16 resize-none"
                          placeholder="이 시대가 후대에 남긴 것"
                        />
                      </div>

                      {/* 핵심 사건들 */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs text-zinc-400">핵심 사건들</label>
                          <button
                            onClick={() => addEraKeyEvent(era.id)}
                            className="text-xs text-amber-400 hover:text-amber-300"
                          >
                            + 추가
                          </button>
                        </div>
                        <div className="space-y-2">
                          {era.keyEvents.map((event, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input
                                type="text"
                                value={event}
                                onChange={(e) => updateEraKeyEvent(era.id, idx, e.target.value)}
                                className="flex-1 bg-zinc-700 text-white px-3 py-2 rounded text-sm"
                                placeholder="핵심 사건"
                              />
                              <button
                                onClick={() => removeEraKeyEvent(era.id, idx)}
                                className="text-red-400 hover:text-red-300 px-2"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 주요 인물들 */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs text-zinc-400">주요 인물들</label>
                          <button
                            onClick={() => addEraNotableFigure(era.id)}
                            className="text-xs text-amber-400 hover:text-amber-300"
                          >
                            + 추가
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(Array.isArray(era.notableFigures) ? era.notableFigures : []).map((figure, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input
                                type="text"
                                value={typeof figure === 'string' ? figure : (figure as {name: string}).name}
                                onChange={(e) => updateEraNotableFigure(era.id, idx, e.target.value)}
                                className="flex-1 bg-zinc-700 text-white px-3 py-2 rounded text-sm"
                                placeholder="인물 이름 또는 설명"
                              />
                              <button
                                onClick={() => removeEraNotableFigure(era.id, idx)}
                                className="text-red-400 hover:text-red-300 px-2"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 미스터리 힌트 */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs text-zinc-400">미스터리 힌트 (떡밥)</label>
                          <button
                            onClick={() => addEraMysteryHint(era.id)}
                            className="text-xs text-amber-400 hover:text-amber-300"
                          >
                            + 추가
                          </button>
                        </div>
                        <div className="space-y-2">
                          {era.mysteryHints.map((hint, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input
                                type="text"
                                value={hint}
                                onChange={(e) => updateEraMysteryHint(era.id, idx, e.target.value)}
                                className="flex-1 bg-zinc-700 text-white px-3 py-2 rounded text-sm"
                                placeholder="이 시대에 심어진 미스터리"
                              />
                              <button
                                onClick={() => removeEraMysteryHint(era.id, idx)}
                                className="text-red-400 hover:text-red-300 px-2"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* 새 시대 추가 버튼 */}
              <button
                onClick={addNewEra}
                className="w-full py-3 border-2 border-dashed border-zinc-600 text-zinc-400 hover:text-white hover:border-zinc-500 rounded-lg transition-colors"
              >
                + 새 시대 추가
              </button>
            </>
          )}

          {activeTab === 'decades' && (
            <>
              <p className="text-sm text-zinc-400 mb-4">
                주인공 시대의 10년 단위 상세 역사입니다. 세력 상태, 도시 상태, 긴장도 등을 편집할 수 있습니다.
              </p>

              {decades.map(decade => (
                <div key={decade.id} className="bg-zinc-800 rounded-lg overflow-hidden">
                  {/* 10년 단위 헤더 */}
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-700/50"
                    onClick={() => setExpandedDecade(expandedDecade === decade.id ? null : decade.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-amber-400">{expandedDecade === decade.id ? '▼' : '▶'}</span>
                      <div>
                        <div className="text-white font-medium">
                          {decade.period || formatYearRange(decade.yearRange)}
                        </div>
                        <div className="text-xs text-zinc-400">
                          긴장도: {decade.worldTension || decade.tension || 0}%
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeDecade(decade.id); }}
                      className="text-red-400 hover:text-red-300 text-sm px-2"
                    >
                      삭제
                    </button>
                  </div>

                  {/* 10년 단위 상세 */}
                  {expandedDecade === decade.id && (
                    <div className="p-4 border-t border-zinc-700 space-y-4">
                      {/* 기간 */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">시작 연도</label>
                          <input
                            type="number"
                            value={decade.yearRange[0]}
                            onChange={(e) => updateDecade(decade.id, 'yearRange', [parseInt(e.target.value) || 0, decade.yearRange[1]])}
                            className="w-full bg-zinc-700 text-white px-3 py-2 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">종료 연도</label>
                          <input
                            type="number"
                            value={decade.yearRange[1]}
                            onChange={(e) => updateDecade(decade.id, 'yearRange', [decade.yearRange[0], parseInt(e.target.value) || 0])}
                            className="w-full bg-zinc-700 text-white px-3 py-2 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">기간 텍스트</label>
                          <input
                            type="text"
                            value={decade.period || ''}
                            onChange={(e) => updateDecade(decade.id, 'period', e.target.value)}
                            className="w-full bg-zinc-700 text-white px-3 py-2 rounded text-sm"
                            placeholder="예: 1500~1510년"
                          />
                        </div>
                      </div>

                      {/* 긴장도 */}
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">
                          세계 긴장도: {decade.worldTension || decade.tension || 0}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={decade.worldTension || decade.tension || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            updateDecade(decade.id, 'worldTension', val);
                            updateDecade(decade.id, 'tension', val);
                          }}
                          className="w-full"
                        />
                      </div>

                      {/* 세계 상태 */}
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">세계 상태</label>
                        <textarea
                          value={decade.worldState || ''}
                          onChange={(e) => updateDecade(decade.id, 'worldState', e.target.value)}
                          className="w-full bg-zinc-700 text-white px-3 py-2 rounded text-sm h-16 resize-none"
                          placeholder="이 기간의 세계 상태 설명"
                        />
                      </div>

                      {/* 주요 이벤트 */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs text-zinc-400">주요 이벤트</label>
                          <button
                            onClick={() => addDecadeMajorEvent(decade.id)}
                            className="text-xs text-amber-400 hover:text-amber-300"
                          >
                            + 추가
                          </button>
                        </div>
                        <div className="space-y-2">
                          {decade.majorEvents.map((event, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input
                                type="text"
                                value={event}
                                onChange={(e) => updateDecadeMajorEvent(decade.id, idx, e.target.value)}
                                className="flex-1 bg-zinc-700 text-white px-3 py-2 rounded text-sm"
                                placeholder="주요 이벤트"
                              />
                              <button
                                onClick={() => removeDecadeMajorEvent(decade.id, idx)}
                                className="text-red-400 hover:text-red-300 px-2"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 복선/힌트 */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs text-zinc-400">복선/힌트</label>
                          <button
                            onClick={() => addDecadeHint(decade.id)}
                            className="text-xs text-amber-400 hover:text-amber-300"
                          >
                            + 추가
                          </button>
                        </div>
                        <div className="space-y-2">
                          {decade.hints.map((hint, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input
                                type="text"
                                value={hint}
                                onChange={(e) => updateDecadeHint(decade.id, idx, e.target.value)}
                                className="flex-1 bg-zinc-700 text-white px-3 py-2 rounded text-sm"
                                placeholder="복선 또는 힌트"
                              />
                              <button
                                onClick={() => removeDecadeHint(decade.id, idx)}
                                className="text-red-400 hover:text-red-300 px-2"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* 새 10년 단위 추가 버튼 */}
              <button
                onClick={addNewDecade}
                className="w-full py-3 border-2 border-dashed border-zinc-600 text-zinc-400 hover:text-white hover:border-zinc-500 rounded-lg transition-colors"
              >
                + 새 10년 단위 추가
              </button>
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-3 p-4 border-t border-zinc-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
