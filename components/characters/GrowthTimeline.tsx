'use client';

import { Memory, EmergentProfile, ImprintType } from '@/lib/types';
import { IMPRINT_ICONS } from '@/lib/prompts/simulation-prompt-v2';

interface GrowthTimelineProps {
  memories: Memory[];
  profile: EmergentProfile;
  color: string;
}

const SEASON_LABELS: Record<string, string> = {
  spring: '봄',
  summer: '여름',
  autumn: '가을',
  winter: '겨울',
};

export default function GrowthTimeline({ memories, profile, color }: GrowthTimelineProps) {
  const sorted = [...memories].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    const order = { spring: 0, summer: 1, autumn: 2, winter: 3 };
    return (order[a.season] ?? 0) - (order[b.season] ?? 0);
  });

  // Group by year
  const yearGroups = new Map<number, Memory[]>();
  for (const mem of sorted) {
    const existing = yearGroups.get(mem.year) || [];
    existing.push(mem);
    yearGroups.set(mem.year, existing);
  }

  return (
    <div className="rounded-xl border border-base-border bg-base-card p-5 mt-2">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="font-serif text-sm font-bold text-text-primary">
          {profile.displayName} — 성장 타임라인
        </h3>
        <span className="text-[10px] text-text-muted">({memories.length}개 기억)</span>
      </div>

      {/* 수직 타임라인 */}
      <div className="relative pl-6">
        {/* 수직 선 */}
        <div
          className="absolute left-2.5 top-0 bottom-0 w-px"
          style={{ backgroundColor: `${color}30` }}
        />

        {Array.from(yearGroups.entries()).map(([year, yearMemories]) => (
          <div key={year} className="mb-4">
            {/* 연도 마커 */}
            <div className="relative flex items-center mb-2">
              <div
                className="absolute -left-[14px] h-2.5 w-2.5 rounded-full border-2"
                style={{ borderColor: color, backgroundColor: `${color}40` }}
              />
              <span className="font-serif text-xs font-bold" style={{ color }}>
                {year}년
              </span>
            </div>

            {/* 해당 연도의 기억들 */}
            <div className="space-y-2 ml-2">
              {yearMemories.map((mem) => (
                <div
                  key={mem.id}
                  className="rounded-lg border border-base-border bg-base-primary/50 p-3"
                >
                  <div className="flex items-start gap-2">
                    {/* 각인 아이콘들 */}
                    <div className="flex flex-wrap gap-0.5 shrink-0">
                      {mem.imprints.map((imp, i) => (
                        <span key={i} className="text-sm" title={`${imp.type}: ${imp.content}`}>
                          {IMPRINT_ICONS[imp.type as ImprintType] || '?'}
                        </span>
                      ))}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-text-muted">
                          {SEASON_LABELS[mem.season] || mem.season}
                        </span>
                        <span className="text-[10px] text-text-muted">·</span>
                        <span className="text-[10px] text-text-muted">
                          감정 비중 {mem.emotionalWeight}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                        {mem.content}
                      </p>

                      {/* 각인 상세 */}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {mem.imprints.map((imp, i) => (
                          <span
                            key={i}
                            className="rounded border border-base-border px-1.5 py-0.5 text-[9px] text-text-muted"
                            title={imp.source}
                          >
                            {IMPRINT_ICONS[imp.type as ImprintType]} {imp.content}
                            <span className="ml-0.5 opacity-60">({imp.intensity})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 프로필 요약 */}
      <div className="mt-4 border-t border-base-border pt-3 grid grid-cols-2 gap-3">
        {/* 신념 */}
        {profile.beliefs.length > 0 && (
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-wider">신념</span>
            <div className="mt-1 space-y-0.5">
              {profile.beliefs.slice(0, 3).map((b, i) => (
                <p key={i} className="text-[10px] text-text-secondary">
                  {IMPRINT_ICONS.belief} {b.content}
                  <span className="text-text-muted ml-1">({b.conviction}%{b.challenged ? ', 도전받음' : ''})</span>
                </p>
              ))}
            </div>
          </div>
        )}

        {/* 이름 이력 */}
        <div>
          <span className="text-[10px] text-text-muted uppercase tracking-wider">이름 이력</span>
          <div className="mt-1 space-y-0.5">
            {profile.displayName && (
              <p className="text-[10px] text-text-secondary">
                {IMPRINT_ICONS.name} {profile.displayName}
                {profile.currentAlias && ` (${profile.currentAlias})`}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
