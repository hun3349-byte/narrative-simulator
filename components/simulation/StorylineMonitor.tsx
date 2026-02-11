'use client';

import { useSimulationStore } from '@/lib/store/simulation-store';
import { StorylinePreview, StoryHealth } from '@/lib/types';

const HEALTH_CONFIG: Record<StoryHealth, { label: string; color: string; bg: string }> = {
  excellent: { label: '우수', color: 'text-emerald-400', bg: 'bg-emerald-500' },
  good: { label: '양호', color: 'text-seojin', bg: 'bg-seojin' },
  concerning: { label: '주의', color: 'text-amber-400', bg: 'bg-amber-500' },
  critical: { label: '위험', color: 'text-yeonhwa', bg: 'bg-yeonhwa' },
};

const METRIC_LABELS: Record<string, string> = {
  themeAlignment: '주제 정합',
  coherence: '일관성',
  interest: '흥미도',
  characterDepth: '캐릭터 깊이',
  awakeningPotential: '각성 잠재력',
};

const WARNING_ICONS: Record<string, string> = {
  low: '!',
  medium: '!!',
  high: '!!!',
  critical: '!!!!',
};

export default function StorylineMonitor() {
  const {
    storylinePreviews,
    integratedStoryline,
    simulationStatus,
    sessionId,
    characters,
    seeds,
  } = useSimulationStore();

  const previews = Object.values(storylinePreviews);
  const hasPreviews = previews.length > 0;

  if (!hasPreviews && !integratedStoryline) return null;

  const health = integratedStoryline?.storyHealth || 'good';
  const cfg = HEALTH_CONFIG[health];

  const sendControl = async (action: 'pause' | 'resume' | 'abort') => {
    if (!sessionId) return;
    try {
      await fetch('/api/simulate/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action }),
      });
      if (action === 'pause') {
        useSimulationStore.getState().setSimulationStatus('paused');
      } else if (action === 'resume') {
        useSimulationStore.getState().setSimulationStatus('running');
      } else if (action === 'abort') {
        useSimulationStore.getState().setSimulationStatus('aborted');
      }
    } catch (err) {
      console.error('Control action failed:', err);
    }
  };

  return (
    <div className="rounded-lg border border-base-border bg-base-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-medium text-text-muted uppercase tracking-widest">
            스토리라인 모니터
          </h3>
          {integratedStoryline && (
            <span className={`text-[10px] font-medium ${cfg.color}`}>
              {cfg.label}
            </span>
          )}
        </div>

        {/* Control buttons */}
        {simulationStatus === 'running' && sessionId && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => sendControl('pause')}
              className="rounded px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
            >
              일시정지
            </button>
            <button
              onClick={() => sendControl('abort')}
              className="rounded px-2 py-0.5 text-[10px] bg-yeonhwa/20 text-yeonhwa hover:bg-yeonhwa/30"
            >
              중단
            </button>
          </div>
        )}
        {simulationStatus === 'paused' && sessionId && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => sendControl('resume')}
              className="rounded px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
            >
              재개
            </button>
            <button
              onClick={() => sendControl('abort')}
              className="rounded px-2 py-0.5 text-[10px] bg-yeonhwa/20 text-yeonhwa hover:bg-yeonhwa/30"
            >
              중단
            </button>
          </div>
        )}
      </div>

      {/* Overall health bar */}
      {integratedStoryline && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-1.5 rounded-full bg-base-tertiary">
              <div
                className={`h-full rounded-full transition-all duration-500 ${cfg.bg}`}
                style={{ width: `${integratedStoryline.overallInterest}%` }}
              />
            </div>
            <span className="text-[10px] text-text-muted w-8 text-right">
              {integratedStoryline.overallInterest}
            </span>
          </div>
        </div>
      )}

      {/* Per-character metrics */}
      {hasPreviews && (
        <div className="space-y-3 mb-3">
          {previews.map(preview => (
            <CharacterMetrics key={preview.characterId} preview={preview} />
          ))}
        </div>
      )}

      {/* Warnings */}
      {hasPreviews && (
        <WarningsList previews={previews} />
      )}

      {/* Integrated analysis */}
      {integratedStoryline && (
        <div className="mt-3 pt-3 border-t border-base-border space-y-1.5">
          <div className="text-[10px] text-text-muted">
            <span className="font-medium text-text-secondary">수렴 현황:</span>{' '}
            {integratedStoryline.convergenceStatus}
          </div>
          <div className="text-[10px] text-text-muted">
            <span className="font-medium text-text-secondary">배신 예측:</span>{' '}
            {integratedStoryline.betrayalPrediction}
          </div>
          <div className="text-[10px] text-text-muted">
            <span className="font-medium text-text-secondary">권장사항:</span>{' '}
            {integratedStoryline.recommendation}
          </div>
        </div>
      )}
    </div>
  );
}

function CharacterMetrics({ preview }: { preview: StorylinePreview }) {
  const { characters, seeds } = useSimulationStore();
  const char = characters.find(c => c.id === preview.characterId);
  const seed = seeds.find(s => s.id === preview.characterId);
  const name = char?.name || seed?.codename || preview.characterId;
  const color = seed?.color || '#888';

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[11px] font-medium" style={{ color }}>{name}</span>
        <span className="text-[9px] text-text-muted ml-auto">{preview.year}년</span>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {(Object.entries(preview.metrics) as [string, number][]).map(([key, value]) => (
          <div key={key}>
            <div className="text-[8px] text-text-muted mb-0.5">{METRIC_LABELS[key] || key}</div>
            <div className="h-1 rounded-full bg-base-tertiary">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${value}%`,
                  backgroundColor: value >= 70 ? '#4ADE80' : value >= 40 ? '#FBBF24' : '#EF4444',
                }}
              />
            </div>
          </div>
        ))}
      </div>
      {preview.projectedDirection && (
        <div className="text-[9px] text-text-muted mt-1 italic">
          {preview.projectedDirection}
        </div>
      )}
    </div>
  );
}

function WarningsList({ previews }: { previews: StorylinePreview[] }) {
  const allWarnings = previews.flatMap(p =>
    p.warnings.map(w => ({ ...w, characterId: p.characterId }))
  );

  if (allWarnings.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="text-[9px] font-medium text-text-muted uppercase tracking-wider">경고</div>
      {allWarnings.map((w, idx) => (
        <div
          key={idx}
          className={`flex items-start gap-1.5 text-[10px] rounded px-2 py-1 ${
            w.severity === 'critical' ? 'bg-yeonhwa/10 text-yeonhwa' :
            w.severity === 'high' ? 'bg-amber-500/10 text-amber-400' :
            'bg-base-tertiary text-text-secondary'
          }`}
        >
          <span className="font-bold shrink-0">{WARNING_ICONS[w.severity]}</span>
          <span>{w.message}</span>
        </div>
      ))}
    </div>
  );
}
