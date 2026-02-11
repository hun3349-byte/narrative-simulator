'use client';

import { useState } from 'react';
import { useSimulationStore } from '@/lib/store/simulation-store';
import { AuthorNarrativeArc, ArcPhase } from '@/lib/types';
import { getCharacterName, getCharacterColor } from '@/lib/utils/character-display';

export default function ArcEditor() {
  const { seeds, narrativeArcs, updateNarrativeArc, profiles, characters } = useSimulationStore();
  const [editingPhase, setEditingPhase] = useState<{ characterId: string; phaseIndex: number } | null>(null);
  const [editForm, setEditForm] = useState<ArcPhase | null>(null);

  if (!seeds || seeds.length === 0 || Object.keys(narrativeArcs).length === 0) {
    return null;
  }

  const handleEditPhase = (characterId: string, phaseIndex: number) => {
    const arc = narrativeArcs[characterId];
    if (!arc) return;
    setEditingPhase({ characterId, phaseIndex });
    setEditForm({ ...arc.phases[phaseIndex] });
  };

  const handleSavePhase = () => {
    if (!editingPhase || !editForm) return;
    const arc = narrativeArcs[editingPhase.characterId];
    if (!arc) return;

    const updatedPhases = [...arc.phases];
    updatedPhases[editingPhase.phaseIndex] = editForm;

    updateNarrativeArc(editingPhase.characterId, {
      ...arc,
      phases: updatedPhases,
      revisions: [
        ...arc.revisions,
        {
          year: 0,
          reason: '수동 편집',
          changes: `페이즈 "${editForm.name}" 수정`,
        },
      ],
    });

    setEditingPhase(null);
    setEditForm(null);
  };

  const handleCancelEdit = () => {
    setEditingPhase(null);
    setEditForm(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
        <span className="text-base">{'📖'}</span>
        서사 아크 (Author AI)
      </h3>

      {seeds.map(seed => {
        const arc = narrativeArcs[seed.id];
        if (!arc) return null;

        const name = getCharacterName(seed.id, characters);
        const color = getCharacterColor(seed.id, characters, seeds);

        return (
          <div key={seed.id} className="rounded-lg bg-base-secondary p-3 border border-base-border">
            {/* 캐릭터 헤더 */}
            <div className="flex items-center gap-2 mb-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm font-medium text-text-primary">{name}</span>
              <span className="text-xs text-text-muted">
                {arc.phases.length}개 페이즈
              </span>
              {arc.revisions.length > 0 && (
                <span className="text-xs text-amber-400">
                  {arc.revisions.length}회 수정
                </span>
              )}
            </div>

            {/* 페이즈 타임라인 */}
            <div className="flex gap-1 mb-2">
              {arc.phases.map((phase, idx) => (
                <div
                  key={phase.id}
                  className={`flex-1 h-1.5 rounded-full transition-colors ${
                    idx < arc.currentPhaseIndex
                      ? 'bg-green-500/60'
                      : idx === arc.currentPhaseIndex
                        ? 'bg-seojin'
                        : 'bg-base-border'
                  }`}
                  title={`${phase.name} (${phase.estimatedAgeRange})`}
                />
              ))}
            </div>

            {/* 페이즈 목록 */}
            <div className="space-y-1.5">
              {arc.phases.map((phase, idx) => {
                const isEditing = editingPhase?.characterId === seed.id && editingPhase?.phaseIndex === idx;
                const isCurrent = idx === arc.currentPhaseIndex;
                const isPast = idx < arc.currentPhaseIndex;

                if (isEditing && editForm) {
                  return (
                    <div key={phase.id} className="rounded bg-base-primary p-2 border border-seojin/40 space-y-2">
                      <input
                        className="w-full bg-base-secondary text-sm text-text-primary px-2 py-1 rounded border border-base-border"
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="페이즈 이름"
                      />
                      <input
                        className="w-full bg-base-secondary text-xs text-text-secondary px-2 py-1 rounded border border-base-border"
                        value={editForm.estimatedAgeRange}
                        onChange={e => setEditForm({ ...editForm, estimatedAgeRange: e.target.value })}
                        placeholder="예상 나이 범위"
                      />
                      <textarea
                        className="w-full bg-base-secondary text-xs text-text-secondary px-2 py-1 rounded border border-base-border resize-none"
                        rows={2}
                        value={editForm.intent}
                        onChange={e => setEditForm({ ...editForm, intent: e.target.value })}
                        placeholder="이 시기의 의도"
                      />
                      <textarea
                        className="w-full bg-base-secondary text-xs text-text-secondary px-2 py-1 rounded border border-base-border resize-none"
                        rows={1}
                        value={editForm.emotionalArc}
                        onChange={e => setEditForm({ ...editForm, emotionalArc: e.target.value })}
                        placeholder="감정 흐름"
                      />
                      <input
                        className="w-full bg-base-secondary text-xs text-text-secondary px-2 py-1 rounded border border-base-border"
                        value={editForm.endCondition}
                        onChange={e => setEditForm({ ...editForm, endCondition: e.target.value })}
                        placeholder="종료 조건"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={handleCancelEdit}
                          className="text-xs px-2 py-1 rounded bg-base-secondary text-text-muted hover:text-text-primary"
                        >
                          취소
                        </button>
                        <button
                          onClick={handleSavePhase}
                          className="text-xs px-2 py-1 rounded bg-seojin/20 text-seojin hover:bg-seojin/30"
                        >
                          저장
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={phase.id}
                    onClick={() => handleEditPhase(seed.id, idx)}
                    className={`w-full text-left rounded px-2 py-1.5 transition-colors ${
                      isCurrent
                        ? 'bg-seojin/10 border border-seojin/30'
                        : isPast
                          ? 'bg-base-primary/50 opacity-60'
                          : 'bg-base-primary hover:bg-base-primary/80'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] ${isCurrent ? 'text-seojin' : 'text-text-muted'}`}>
                        {isPast ? '\u2713' : isCurrent ? '\u25B6' : `${idx + 1}`}
                      </span>
                      <span className={`text-xs font-medium ${isCurrent ? 'text-seojin' : 'text-text-primary'}`}>
                        {phase.name}
                      </span>
                      <span className="text-[10px] text-text-muted ml-auto">{phase.estimatedAgeRange}</span>
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5 line-clamp-1 pl-5">
                      {phase.intent}
                    </div>
                    {isCurrent && (
                      <div className="text-[10px] text-text-muted mt-0.5 pl-5">
                        {phase.emotionalArc}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 수정 이력 (최근 2건) */}
            {arc.revisions.length > 0 && (
              <div className="mt-2 pt-2 border-t border-base-border">
                <div className="text-[10px] text-text-muted">
                  {arc.revisions.slice(-2).map((rev, i) => (
                    <div key={i}>{rev.year > 0 ? `${rev.year}년: ` : ''}{rev.changes}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
