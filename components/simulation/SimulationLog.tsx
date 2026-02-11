'use client';

import { useSimulationStore } from '@/lib/store/simulation-store';
import { getSeasonLabel } from '@/lib/utils/timeline-utils';
import { getCharacterName, getCharacterColor } from '@/lib/utils/character-display';

export default function SimulationLog() {
  const { events, characters, seeds } = useSimulationStore();

  const recentEvents = [...events].reverse().slice(0, 20);

  return (
    <div className="rounded-lg border border-base-border bg-[#0D0D14] p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-500/50" />
        <h3 className="text-[10px] font-medium uppercase tracking-widest text-text-muted">
          Event History ({events.length})
        </h3>
      </div>

      <div className="terminal-log max-h-64 overflow-y-auto">
        {recentEvents.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-xs text-text-muted">시뮬레이션을 시작하면 서사 이벤트가 표시됩니다</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentEvents.map((event, idx) => {
              const color = getCharacterColor(event.characterId, characters, seeds);
              const name = getCharacterName(event.characterId, characters);
              return (
                <div
                  key={event.id}
                  className="log-entry flex items-start gap-2 text-xs"
                  style={{ animationDelay: `${idx * 0.03}s` }}
                >
                  <span className="shrink-0 text-text-muted">
                    [{event.year}년 {getSeasonLabel(event.season)}]
                  </span>
                  <span className="shrink-0 font-medium" style={{ color }}>
                    {name}
                  </span>
                  <span className="text-text-secondary">{event.title}</span>
                  {event.importance === 'turning_point' && (
                    <span className="shrink-0 rounded bg-yeonhwa/20 px-1 text-[10px] text-yeonhwa">
                      전환점
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
