'use client';

import { useState } from 'react';
import { useSimulationStore } from '@/lib/store/simulation-store';
import { SimulationRun, SimulationStatus, StoryHealth } from '@/lib/types';

const STATUS_BADGES: Record<SimulationStatus, { label: string; className: string }> = {
  idle: { label: '대기', className: 'bg-base-tertiary text-text-muted' },
  running: { label: '실행중', className: 'bg-emerald-500/20 text-emerald-400' },
  paused: { label: '일시정지', className: 'bg-amber-500/20 text-amber-400' },
  completed: { label: '완료', className: 'bg-seojin/20 text-seojin' },
  aborted: { label: '중단', className: 'bg-yeonhwa/20 text-yeonhwa' },
};

const HEALTH_COLORS: Record<StoryHealth, string> = {
  excellent: 'text-emerald-400',
  good: 'text-seojin',
  concerning: 'text-amber-400',
  critical: 'text-yeonhwa',
};

export default function SimulationHistory() {
  const { simulationHistory, clearSimulationHistory } = useSimulationStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (simulationHistory.length === 0) return null;

  return (
    <div className="rounded-lg border border-base-border bg-base-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-medium text-text-muted uppercase tracking-widest">
          시뮬레이션 이력 ({simulationHistory.length})
        </h3>
        <button
          onClick={clearSimulationHistory}
          className="text-[9px] text-text-muted hover:text-yeonhwa transition-colors"
        >
          전체 삭제
        </button>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {[...simulationHistory].reverse().map((run, idx) => (
          <RunItem
            key={run.runId}
            run={run}
            index={simulationHistory.length - idx}
            expanded={expandedId === run.runId}
            onToggle={() => setExpandedId(expandedId === run.runId ? null : run.runId)}
          />
        ))}
      </div>
    </div>
  );
}

function RunItem({
  run,
  index,
  expanded,
  onToggle,
}: {
  run: SimulationRun;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const badge = STATUS_BADGES[run.status] || STATUS_BADGES.idle;
  const startDate = new Date(run.startedAt);
  const dateStr = `${startDate.getMonth() + 1}/${startDate.getDate()} ${startDate.getHours()}:${String(startDate.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="rounded-md border border-base-border bg-base-primary/30">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-base-tertiary/50 transition-colors"
      >
        <span className="text-[10px] text-text-muted font-mono w-4">#{index}</span>
        <span className="text-[10px] text-text-muted">{dateStr}</span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded ${badge.className}`}>
          {badge.label}
        </span>
        <span className="text-[10px] text-text-secondary ml-auto">
          ~{run.finalYear}년
        </span>
        {run.integratedStoryline && (
          <span className={`text-[9px] font-medium ${HEALTH_COLORS[run.integratedStoryline.storyHealth]}`}>
            {run.integratedStoryline.storyHealth}
          </span>
        )}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="currentColor"
          className={`text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {run.abortReason && (
            <div className="text-[10px] text-yeonhwa bg-yeonhwa/10 rounded px-2 py-1">
              중단 사유: {run.abortReason}
            </div>
          )}

          {/* Character snapshots */}
          {Object.keys(run.characterSnapshots).length > 0 && (
            <div className="space-y-1">
              <div className="text-[9px] text-text-muted font-medium">캐릭터 프리뷰</div>
              {Object.values(run.characterSnapshots).map(preview => (
                <div key={preview.characterId} className="text-[10px] text-text-secondary bg-base-tertiary/50 rounded px-2 py-1">
                  <div className="font-medium">{preview.characterId}</div>
                  <div className="text-text-muted">{preview.narrativeSoFar}</div>
                  <div className="flex gap-2 mt-0.5">
                    <span>주제 {preview.metrics.themeAlignment}</span>
                    <span>일관 {preview.metrics.coherence}</span>
                    <span>흥미 {preview.metrics.interest}</span>
                    <span>깊이 {preview.metrics.characterDepth}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Integrated analysis */}
          {run.integratedStoryline && (
            <div className="text-[10px] text-text-muted space-y-0.5">
              <div><span className="text-text-secondary">수렴:</span> {run.integratedStoryline.convergenceStatus}</div>
              <div><span className="text-text-secondary">권장:</span> {run.integratedStoryline.recommendation}</div>
            </div>
          )}

          {/* Config summary */}
          <div className="text-[9px] text-text-muted">
            {run.config.startYear}~{run.config.endYear}년 | {run.config.batchMode ? '고속' : '정밀'} 모드
          </div>
        </div>
      )}
    </div>
  );
}
