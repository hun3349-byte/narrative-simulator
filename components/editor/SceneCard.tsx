'use client';

import { NarrativeEvent } from '@/lib/types';
import { getSeasonLabel } from '@/lib/utils/timeline-utils';
import { getCharacterName, getCharacterColor } from '@/lib/utils/character-display';
import { useSimulationStore } from '@/lib/store/simulation-store';

interface SceneCardProps {
  event: NarrativeEvent;
  index: number;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onRemove?: (eventId: string) => void;
}

export default function SceneCard({ event, index, draggable = false, onDragStart, onDragEnd, onRemove }: SceneCardProps) {
  const { characters, seeds } = useSimulationStore();
  const color = getCharacterColor(event.characterId, characters, seeds);

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`rounded-lg border border-base-border bg-base-card p-3 transition-colors hover:border-opacity-60 ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-base-tertiary text-[10px] text-text-muted">
            {index + 1}
          </span>
          <span className="text-xs font-medium" style={{ color }}>
            {getCharacterName(event.characterId, characters)}
          </span>
          <span className="text-[10px] text-text-muted">
            {event.year}년 {getSeasonLabel(event.season)}
          </span>
        </div>
        {onRemove && (
          <button
            onClick={() => onRemove(event.id)}
            className="text-text-muted hover:text-yeonhwa transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M3.354 3.354a.5.5 0 0 1 .707 0L6 5.293l1.939-1.94a.5.5 0 1 1 .707.708L6.707 6l1.94 1.939a.5.5 0 0 1-.708.707L6 6.707l-1.939 1.94a.5.5 0 0 1-.707-.708L5.293 6 3.354 4.061a.5.5 0 0 1 0-.707z" />
            </svg>
          </button>
        )}
      </div>

      <h4 className="mt-2 text-sm font-medium text-text-primary">{event.title}</h4>
      <p className="mt-1 text-xs text-text-secondary leading-relaxed">{event.summary}</p>

      <div className="mt-2 flex flex-wrap gap-1">
        {event.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded px-1.5 py-0.5 text-[10px] text-text-muted border border-base-border"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
