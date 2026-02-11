'use client';

import { NarrativeEvent, WorldEvent } from '@/lib/types';
import { getCharacterColor } from '@/lib/utils/character-display';
import { useSimulationStore } from '@/lib/store/simulation-store';
import EventNode from './EventNode';

interface YearCardProps {
  year: number;
  events: NarrativeEvent[];
  worldEvent?: WorldEvent;
  selectedEvent: NarrativeEvent | null;
  onEventClick: (event: NarrativeEvent) => void;
}

export default function YearCard({ year, events, worldEvent, selectedEvent, onEventClick }: YearCardProps) {
  const { characters, seeds } = useSimulationStore();

  return (
    <div className="flex shrink-0 flex-col items-center">
      {/* 연도 헤더 */}
      <div className="mb-3 text-center">
        <span className="font-serif text-sm font-bold text-text-primary">{year}년</span>
        {worldEvent && (
          <p className="mt-0.5 max-w-[120px] text-[10px] text-yeonhwa leading-tight">
            {worldEvent.event}
          </p>
        )}
      </div>

      {/* 캐릭터별 레인 이벤트 */}
      <div className="flex flex-col gap-6">
        {characters.map((char) => {
          const charId = char.id;
          const charEvents = events.filter(e => e.characterId === charId);
          const color = getCharacterColor(charId, characters, seeds);

          return (
            <div key={charId} className="relative flex items-center gap-2">
              {/* 레인 라인 */}
              <div
                className="absolute left-0 right-0 h-px"
                style={{ backgroundColor: `${color}30` }}
              />

              {/* 이벤트 노드들 */}
              <div className="relative flex items-center gap-2 px-2">
                {charEvents.length > 0 ? (
                  charEvents.map((event) => (
                    <EventNode
                      key={event.id}
                      event={event}
                      onClick={onEventClick}
                      isSelected={selectedEvent?.id === event.id}
                    />
                  ))
                ) : (
                  <div className="h-3 w-16" /> // 빈 공간
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
