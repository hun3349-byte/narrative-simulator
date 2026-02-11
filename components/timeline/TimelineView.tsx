'use client';

import { useMemo } from 'react';
import { useSimulationStore } from '@/lib/store/simulation-store';
import { useTimelineStore } from '@/lib/store/timeline-store';
import { useEditorStore } from '@/lib/store/editor-store';
import { getCharacterColor } from '@/lib/utils/character-display';
import { groupEventsByYear, getYearRange, getWorldEventForYear, getSeasonLabel } from '@/lib/utils/timeline-utils';
import { NarrativeEvent, ImprintType, AnchorEvent } from '@/lib/types';
import { IMPRINT_ICONS } from '@/lib/prompts/simulation-prompt-v2';
import DetailPanel from './DetailPanel';

function getNodeSize(importance: string) {
  switch (importance) {
    case 'turning_point': return { size: 18, ring: 28 };
    case 'major': return { size: 14, ring: 22 };
    default: return { size: 10, ring: 18 };
  }
}

export default function TimelineView() {
  const { events, worldEvents, memoryStacks, characters, seeds } = useSimulationStore();
  const { selectedEvent, setSelectedEvent } = useTimelineStore();
  const { isEventAdopted } = useEditorStore();

  // Load anchor events from project config
  const anchorEvents = useMemo(() => {
    try {
      const configStr = typeof window !== 'undefined' ? localStorage.getItem('narrative-project-config') : null;
      if (configStr) {
        const config = JSON.parse(configStr);
        return (config.worldSettings?.anchorEvents || []) as AnchorEvent[];
      }
    } catch { /* ignore */ }
    return [] as AnchorEvent[];
  }, []);

  // Build event-to-imprints lookup from memoryStacks
  const eventImprints = useMemo(() => {
    const map = new Map<string, ImprintType[]>();
    for (const memories of Object.values(memoryStacks)) {
      for (const mem of memories) {
        const existing = map.get(mem.eventId) || [];
        for (const imp of mem.imprints) {
          if (!existing.includes(imp.type as ImprintType)) {
            existing.push(imp.type as ImprintType);
          }
        }
        map.set(mem.eventId, existing);
      }
    }
    return map;
  }, [memoryStacks]);

  const groupedEvents = groupEventsByYear(events);
  const minBirthYear = characters.length > 0 ? Math.min(...characters.map(c => c.birthYear)) : -3;
  const years = getYearRange(minBirthYear, 25);

  // 이벤트가 있는 연도만 하이라이트
  const yearsWithEvents = useMemo(() => {
    const set = new Set<number>();
    events.forEach(e => set.add(e.year));
    return set;
  }, [events]);

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        {/* 캐릭터 레인 라벨 (좌측 고정) */}
        <div className="sticky top-0 z-20 bg-base-secondary pb-2 mb-2 border-b border-base-border">
          <div className="flex items-center gap-6 pl-2">
            {characters.map((char) => (
              <div key={char.id} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: getCharacterColor(char.id, characters, seeds) }}
                />
                <span className="text-sm font-medium text-text-primary">{char.name}</span>
                <span className="text-xs text-text-muted">({char.alias})</span>
              </div>
            ))}
          </div>
        </div>

        {/* 타임라인 본체 */}
        <div className="relative min-w-max px-2">
          {/* 연도 헤더 행 */}
          <div className="flex mb-1">
            {years.map((year) => {
              const hasEvents = yearsWithEvents.has(year);
              const worldEvent = getWorldEventForYear(worldEvents, year);
              return (
                <div
                  key={year}
                  className={`flex flex-col items-center shrink-0 ${hasEvents ? 'w-36' : 'w-14'}`}
                >
                  <span className={`font-serif text-xs font-bold ${hasEvents ? 'text-text-primary' : 'text-text-muted/40'}`}>
                    {year}년
                  </span>
                  {worldEvent && (
                    <span className="mt-0.5 max-w-[130px] text-center text-[10px] leading-tight text-yeonhwa">
                      {worldEvent.event}
                    </span>
                  )}
                  {anchorEvents.filter(a => a.triggerYear === year).map(a => (
                    <span key={a.id} className="mt-0.5 max-w-[130px] text-center text-[10px] leading-tight text-amber-400 font-medium" title={a.worldImpact}>
                      &#9875; {a.event}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>

          {/* 캐릭터별 레인 */}
          {characters.map((char) => {
            const charId = char.id;
            const color = getCharacterColor(charId, characters, seeds);
            return (
              <div key={charId} className="relative flex items-center h-20">
                {/* 연속 레인 라인 */}
                <div
                  className="absolute left-0 right-0 h-px top-1/2"
                  style={{ backgroundColor: `${color}25` }}
                />

                {/* 연도별 셀 */}
                {years.map((year) => {
                  const hasEvents = yearsWithEvents.has(year);
                  const charEvents = (groupedEvents[year] ?? []).filter(
                    (e) => e.characterId === charId
                  );

                  return (
                    <div
                      key={year}
                      className={`relative flex items-center justify-center shrink-0 h-full ${hasEvents ? 'w-36' : 'w-14'}`}
                    >
                      {/* 이벤트가 있는 연도 배경 하이라이트 */}
                      {hasEvents && charEvents.length > 0 && (
                        <div
                          className="absolute inset-0 rounded-md"
                          style={{ backgroundColor: `${color}06` }}
                        />
                      )}

                      {/* 이벤트 노드들 */}
                      <div className="relative flex items-center gap-3">
                        {charEvents.map((event) => (
                          <EventNodeInline
                            key={event.id}
                            event={event}
                            color={color}
                            isSelected={selectedEvent?.id === event.id}
                            isAdopted={isEventAdopted(event.id)}
                            onClick={setSelectedEvent}
                            imprints={eventImprints.get(event.id)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* 디테일 패널 */}
      {selectedEvent && (
        <DetailPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}

function EventNodeInline({
  event,
  color,
  isSelected,
  isAdopted,
  onClick,
  imprints,
}: {
  event: NarrativeEvent;
  color: string;
  isSelected: boolean;
  isAdopted: boolean;
  onClick: (e: NarrativeEvent) => void;
  imprints?: ImprintType[];
}) {
  const { size, ring } = getNodeSize(event.importance);
  const hasRelated = event.relatedCharacters && event.relatedCharacters.length > 0;
  const isTurningPoint = event.importance === 'turning_point';

  return (
    <button
      onClick={() => onClick(event)}
      className={`group relative flex flex-col items-center transition-all duration-200 ${
        isSelected ? 'scale-110' : 'hover:scale-105'
      }`}
    >
      {/* 외부 링 */}
      <div
        className="flex items-center justify-center rounded-full transition-all duration-200"
        style={{
          width: ring,
          height: ring,
          border: `2px solid ${isSelected ? color : isTurningPoint ? '#FFD700' : `${color}50`}`,
          backgroundColor: isSelected ? `${color}30` : isTurningPoint ? `${color}15` : 'transparent',
          boxShadow: isSelected
            ? `0 0 16px ${color}60, 0 0 32px ${color}20`
            : isTurningPoint
            ? `0 0 12px #FFD70050, 0 0 24px ${color}30`
            : hasRelated
            ? `0 0 8px #FFD70040`
            : 'none',
        }}
      >
        {/* 내부 노드 — turning_point는 ★ 형태 */}
        {isTurningPoint ? (
          <span className="text-sm font-bold" style={{ color: '#FFD700' }}>★</span>
        ) : (
          <div
            className="rounded-full"
            style={{
              width: size,
              height: size,
              backgroundColor: color,
            }}
          />
        )}
      </div>

      {/* 채택 표시 ★ */}
      {isAdopted && !isTurningPoint && (
        <div
          className="absolute -top-1 -left-1 text-[10px]"
          style={{ color: '#FFD700' }}
        >
          ★
        </div>
      )}

      {/* TURNING POINT 라벨 */}
      {isTurningPoint && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[7px] font-bold text-amber-400 whitespace-nowrap tracking-wider">
          TURNING POINT
        </div>
      )}

      {/* 교차 이벤트 골드 표시 */}
      {hasRelated && !isAdopted && !isTurningPoint && (
        <div
          className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-base-card animate-pulse"
          style={{ backgroundColor: '#FFD700' }}
        />
      )}

      {/* 이벤트 제목 (항상 표시) */}
      <span
        className={`mt-1.5 max-w-[120px] text-center text-[10px] leading-tight transition-colors ${
          isSelected ? 'font-medium' : ''
        }`}
        style={{ color: isSelected ? color : `${color}B0` }}
      >
        {event.title}
      </span>

      {/* 시즌 태그 */}
      <span className="text-[9px] text-text-muted/60">
        {getSeasonLabel(event.season)}
      </span>

      {/* 각인 아이콘 배지 */}
      {imprints && imprints.length > 0 && (
        <div className="flex gap-0 mt-0.5">
          {imprints.slice(0, 4).map((type, i) => (
            <span key={i} className="text-[8px] leading-none">
              {IMPRINT_ICONS[type]}
            </span>
          ))}
        </div>
      )}

      {/* 호버 요약 툴팁 */}
      <div className="pointer-events-none absolute -top-16 left-1/2 z-30 -translate-x-1/2 w-48 rounded-md bg-base-card px-3 py-2 text-[10px] text-text-secondary opacity-0 shadow-xl transition-opacity group-hover:opacity-100 border border-base-border leading-relaxed">
        <span className="font-medium text-text-primary block mb-0.5">{event.title}</span>
        {event.summary.slice(0, 60)}...
      </div>
    </button>
  );
}
