'use client';

import { CharacterStats, EmotionalState } from '@/lib/types';
import { getCharacterColor } from '@/lib/utils/character-display';
import { useSimulationStore } from '@/lib/store/simulation-store';

interface StatusBarProps {
  characterId: string;
  stats: CharacterStats;
  emotionalState: EmotionalState;
}

const statLabels: Record<string, string> = {
  combat: '무공',
  intellect: '지력',
  willpower: '의지력',
  social: '사교성',
};

export default function StatusBar({ characterId, stats, emotionalState }: StatusBarProps) {
  const { characters, seeds } = useSimulationStore();
  const color = getCharacterColor(characterId, characters, seeds);
  const statEntries = Object.entries(statLabels);

  return (
    <div className="space-y-3">
      {/* 능력치 바 */}
      <div className="space-y-1.5">
        {statEntries.map(([key, label]) => {
          const value = stats[key as keyof CharacterStats];
          if (typeof value !== 'number') return null;
          const percentage = Math.min((value / 10) * 100, 100);
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="w-12 text-xs text-text-muted">{label}</span>
              <div className="h-1.5 flex-1 rounded-full bg-base-tertiary">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color,
                    opacity: 0.8,
                  }}
                />
              </div>
              <span className="w-4 text-right text-xs text-text-secondary">{value}</span>
            </div>
          );
        })}
        {/* 고유 스탯 */}
        <div className="flex items-center gap-2">
          <span className="w-12 truncate text-xs text-text-muted" title={stats.specialStat.name}>
            {stats.specialStat.name.slice(0, 4)}
          </span>
          <div className="h-1.5 flex-1 rounded-full bg-base-tertiary">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((stats.specialStat.value / 10) * 100, 100)}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <span className="w-4 text-right text-xs text-text-secondary">{stats.specialStat.value}</span>
        </div>
      </div>

      {/* 감정 상태 */}
      <div className="rounded-md border border-base-border bg-base-primary/50 p-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">감정</span>
          <span className="text-xs font-medium" style={{ color }}>
            {emotionalState.primary}
          </span>
        </div>
        <div className="mt-1 h-1 rounded-full bg-base-tertiary">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${emotionalState.intensity}%`,
              backgroundColor: color,
            }}
          />
        </div>
        <p className="mt-1 text-[10px] text-text-muted">{emotionalState.trigger}</p>
      </div>
    </div>
  );
}
