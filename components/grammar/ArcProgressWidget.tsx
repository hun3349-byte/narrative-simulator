'use client';

import { CharacterArc, MasterArc } from '@/lib/types';
import { ARC_LABELS } from '@/lib/grammar/arc-templates';

interface ArcProgressWidgetProps {
  characterArcs: CharacterArc[];
  masterArc?: MasterArc;
  characterNames: Record<string, string>;
}

export default function ArcProgressWidget({ characterArcs, masterArc, characterNames }: ArcProgressWidgetProps) {
  if (characterArcs.length === 0 && !masterArc) return null;

  return (
    <div className="rounded-lg border border-amber-500/20 bg-base-card p-4">
      <h3 className="font-serif text-sm font-bold uppercase tracking-widest text-amber-500/70 mb-3">
        서사 아크 진행도
      </h3>

      {/* 마스터 아크 */}
      {masterArc && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-text-muted">전체 이야기</span>
            <span className="text-[10px] text-amber-400">
              {masterArc.acts[masterArc.currentAct]?.name || '?'}
              {' '}({masterArc.currentAct + 1}/{masterArc.acts.length}막)
            </span>
          </div>
          {/* 마스터 긴장도 */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-muted w-10">긴장도</span>
            <div className="h-1.5 flex-1 rounded-full bg-base-tertiary">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${masterArc.overallTension}%`,
                  backgroundColor: tensionColor(masterArc.overallTension),
                }}
              />
            </div>
            <span className="text-[10px] text-text-muted w-6 text-right">{masterArc.overallTension}</span>
          </div>
          {/* 막 진행 바 */}
          <div className="flex gap-0.5 mt-2">
            {masterArc.acts.map((act, idx) => (
              <div
                key={idx}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  idx < masterArc.currentAct
                    ? 'bg-amber-500'
                    : idx === masterArc.currentAct
                    ? 'bg-amber-500/50'
                    : 'bg-base-tertiary'
                }`}
                title={`${act.name} (${act.yearRange[0]}~${act.yearRange[1]}년)`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 캐릭터별 아크 */}
      <div className="space-y-3">
        {characterArcs.map(arc => (
          <CharacterArcRow
            key={arc.characterId}
            arc={arc}
            name={characterNames[arc.characterId] || arc.characterId}
          />
        ))}
      </div>
    </div>
  );
}

function CharacterArcRow({ arc, name }: { arc: CharacterArc; name: string }) {
  const phase = arc.phases[arc.currentPhase];

  return (
    <div className="rounded-md border border-base-border bg-base-primary/30 p-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-text-primary">{name}</span>
        <span className="text-[10px] text-text-muted">{ARC_LABELS[arc.archetype]}</span>
      </div>

      {/* 현재 단계 */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[10px] text-amber-400">{phase?.name}</span>
        <span className="text-[10px] text-text-muted">
          ({arc.currentPhase + 1}/{arc.phases.length})
        </span>
      </div>

      {/* 진행도 바 */}
      <div className="flex gap-0.5 mb-1.5">
        {arc.phases.map((p, idx) => {
          const requiredCount = p.requiredBeats.length;
          const fulfilledCount = p.requiredBeats.filter(b => b.fulfilled).length;
          const phaseProgress = requiredCount > 0 ? fulfilledCount / requiredCount : 0;

          return (
            <div
              key={idx}
              className="h-1 flex-1 rounded-full bg-base-tertiary overflow-hidden"
              title={`${p.name}: ${fulfilledCount}/${requiredCount} 비트`}
            >
              <div
                className={`h-full rounded-full transition-all ${
                  idx < arc.currentPhase ? 'bg-amber-500' : 'bg-amber-500/60'
                }`}
                style={{
                  width: idx < arc.currentPhase ? '100%' : `${phaseProgress * 100}%`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* 텐션 + 완성도 */}
      <div className="flex items-center gap-3 text-[10px] text-text-muted">
        <span>긴장 <span style={{ color: tensionColor(arc.tension) }}>{arc.tension}</span></span>
        <span>완성도 {arc.fulfillment}%</span>
        {phase && (
          <span>
            미이행: {phase.requiredBeats.filter(b => !b.fulfilled).length}비트
          </span>
        )}
      </div>
    </div>
  );
}

function tensionColor(tension: number): string {
  if (tension < 30) return '#4ADE80';
  if (tension < 60) return '#FBBF24';
  if (tension < 80) return '#F97316';
  return '#EF4444';
}
