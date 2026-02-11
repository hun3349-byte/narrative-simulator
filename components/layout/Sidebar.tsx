'use client';

import { useSimulationStore } from '@/lib/store/simulation-store';
import { getCharacterColor } from '@/lib/utils/character-display';
import { getStatusLabel } from '@/lib/utils/timeline-utils';

export default function Sidebar() {
  const { characters, seeds, currentYear } = useSimulationStore();

  return (
    <aside className="w-60 shrink-0 border-r border-base-border bg-base-secondary p-4">
      <div className="mb-6">
        <h2 className="font-serif text-sm font-bold text-text-secondary uppercase tracking-widest">
          세계관 연도
        </h2>
        <p className="mt-1 font-serif text-3xl font-bold text-text-primary">
          {currentYear}년
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="font-serif text-sm font-bold text-text-secondary uppercase tracking-widest">
          캐릭터
        </h2>
        {characters.map((char) => (
          <div
            key={char.id}
            className="rounded-lg border border-base-border bg-base-card p-3"
          >
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: getCharacterColor(char.id, characters, seeds) }}
              />
              <span className="text-sm font-medium text-text-primary">
                {char.name}
              </span>
            </div>
            <p className="mt-1 text-xs text-text-muted">{char.alias}</p>
            <p className="mt-1 text-xs text-text-secondary">
              {getStatusLabel(char.status)} · {char.emotionalState.primary}
            </p>
          </div>
        ))}
      </div>
    </aside>
  );
}
