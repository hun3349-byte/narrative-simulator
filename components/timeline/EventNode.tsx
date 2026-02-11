'use client';

import { NarrativeEvent } from '@/lib/types';
import { getCharacterColor } from '@/lib/utils/character-display';
import { useSimulationStore } from '@/lib/store/simulation-store';
import { getImportanceSize } from '@/lib/utils/timeline-utils';

interface EventNodeProps {
  event: NarrativeEvent;
  onClick: (event: NarrativeEvent) => void;
  isSelected: boolean;
}

export default function EventNode({ event, onClick, isSelected }: EventNodeProps) {
  const { characters, seeds } = useSimulationStore();
  const color = getCharacterColor(event.characterId, characters, seeds);
  const size = getImportanceSize(event.importance);

  return (
    <button
      onClick={() => onClick(event)}
      className={`group relative flex items-center justify-center transition-all duration-200 ${
        isSelected ? 'scale-125' : 'hover:scale-110'
      }`}
      title={event.title}
    >
      <div
        className="rounded-full transition-shadow duration-200"
        style={{
          width: size.width,
          height: size.height,
          backgroundColor: color,
          boxShadow: isSelected
            ? `0 0 12px ${color}80, 0 0 24px ${color}40`
            : 'none',
        }}
      />

      {/* 교차 이벤트 표시 */}
      {event.relatedCharacters && event.relatedCharacters.length > 0 && (
        <div
          className="absolute -top-1 -right-1 h-2 w-2 rounded-full animate-pulse"
          style={{ backgroundColor: '#FFD700' }}
        />
      )}

      {/* 호버 툴팁 */}
      <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-base-card px-2 py-1 text-[10px] text-text-primary opacity-0 shadow-lg transition-opacity group-hover:opacity-100 border border-base-border">
        {event.title}
      </div>
    </button>
  );
}
