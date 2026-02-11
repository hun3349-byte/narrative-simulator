'use client';

import { useSimulationStore } from '@/lib/store/simulation-store';

export default function StorylineWarningPopup() {
  const { pendingWarning, sessionId, setPendingWarning, setSimulationStatus } = useSimulationStore();

  if (!pendingWarning) return null;

  const sendControl = async (action: 'pause' | 'resume' | 'abort') => {
    if (!sessionId) return;
    try {
      await fetch('/api/simulate/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action }),
      });
    } catch (err) {
      console.error('Control action failed:', err);
    }
  };

  const handleIgnore = async () => {
    // Resume and dismiss
    await sendControl('resume');
    setSimulationStatus('running');
    setPendingWarning(null);
  };

  const handlePause = () => {
    // Already paused, just dismiss popup
    setPendingWarning(null);
  };

  const handleAbort = async () => {
    await sendControl('abort');
    setSimulationStatus('aborted');
    setPendingWarning(null);
  };

  const characterWarnings = pendingWarning.characters.flatMap(c =>
    c.warnings.map(w => ({
      characterId: c.characterId,
      ...w,
    }))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-yeonhwa/30 bg-base-card p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="h-3 w-3 rounded-full bg-yeonhwa animate-pulse" />
          <h2 className="font-serif text-lg font-bold text-yeonhwa">스토리라인 위험 감지</h2>
        </div>

        {/* Health status */}
        <div className="rounded-lg bg-yeonhwa/10 border border-yeonhwa/20 p-3 mb-4">
          <div className="text-xs text-yeonhwa font-medium mb-1">
            건강도: Critical
          </div>
          <div className="text-[11px] text-text-secondary">
            {pendingWarning.recommendation}
          </div>
        </div>

        {/* Overall metrics */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="rounded-md bg-base-primary/50 p-2 text-center">
            <div className="text-[9px] text-text-muted">주제 정합</div>
            <div className={`text-sm font-bold ${pendingWarning.overallThemeAlignment < 40 ? 'text-yeonhwa' : 'text-text-primary'}`}>
              {pendingWarning.overallThemeAlignment}%
            </div>
          </div>
          <div className="rounded-md bg-base-primary/50 p-2 text-center">
            <div className="text-[9px] text-text-muted">흥미도</div>
            <div className={`text-sm font-bold ${pendingWarning.overallInterest < 40 ? 'text-yeonhwa' : 'text-text-primary'}`}>
              {pendingWarning.overallInterest}%
            </div>
          </div>
        </div>

        {/* Character warnings */}
        {characterWarnings.length > 0 && (
          <div className="mb-4 max-h-32 overflow-y-auto space-y-1">
            <div className="text-[9px] font-medium text-text-muted uppercase tracking-wider mb-1">
              감지된 경고 ({characterWarnings.length}건)
            </div>
            {characterWarnings.map((w, idx) => (
              <div
                key={idx}
                className={`text-[10px] rounded px-2 py-1 ${
                  w.severity === 'critical' ? 'bg-yeonhwa/10 text-yeonhwa' :
                  w.severity === 'high' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-base-tertiary text-text-secondary'
                }`}
              >
                <span className="font-medium">[{w.type}]</span> {w.message}
              </div>
            ))}
          </div>
        )}

        {/* Convergence/Betrayal */}
        <div className="text-[10px] text-text-muted space-y-1 mb-4">
          <div>
            <span className="font-medium text-text-secondary">수렴:</span>{' '}
            {pendingWarning.convergenceStatus}
          </div>
          <div>
            <span className="font-medium text-text-secondary">배신 예측:</span>{' '}
            {pendingWarning.betrayalPrediction}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleIgnore}
            className="rounded-lg border border-base-border px-3 py-2 text-xs text-text-secondary hover:bg-base-tertiary transition-colors"
          >
            무시하고 계속
          </button>
          <button
            onClick={handlePause}
            className="rounded-lg bg-amber-500/20 px-3 py-2 text-xs text-amber-400 hover:bg-amber-500/30 transition-colors"
          >
            일시정지 유지
          </button>
          <button
            onClick={handleAbort}
            className="col-span-2 rounded-lg bg-yeonhwa/20 px-3 py-2 text-xs text-yeonhwa hover:bg-yeonhwa/30 transition-colors"
          >
            전체 중단
          </button>
        </div>
      </div>
    </div>
  );
}
