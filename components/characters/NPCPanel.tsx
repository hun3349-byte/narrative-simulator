'use client';

import { useState } from 'react';
import { NPC, NPCLifecycle } from '@/lib/types';
import { useSimulationStore } from '@/lib/store/simulation-store';

const LIFECYCLE_LABELS: Record<NPCLifecycle, string> = {
  mention: '언급',
  encounter: '조우',
  recurring: '반복',
  significant: '중요',
  core: '핵심',
};

const LIFECYCLE_STYLES: Record<NPCLifecycle, { opacity: string; border: string; bg: string }> = {
  mention: { opacity: 'opacity-30', border: 'border-base-border', bg: 'bg-base-primary/20' },
  encounter: { opacity: 'opacity-60', border: 'border-base-border', bg: 'bg-base-primary/40' },
  recurring: { opacity: '', border: 'border-base-border', bg: 'bg-base-card' },
  significant: { opacity: '', border: 'border-amber-500/30', bg: 'bg-amber-500/5' },
  core: { opacity: '', border: 'border-seojin/30', bg: 'bg-seojin/5' },
};

interface NPCPanelProps {
  npcs: NPC[];
  compact?: boolean;
}

export default function NPCPanel({ npcs, compact = false }: NPCPanelProps) {
  const [filter, setFilter] = useState<NPCLifecycle | 'all'>('all');
  const { promoteNPCToCore } = useSimulationStore();

  const filteredNPCs = filter === 'all'
    ? npcs.filter(n => n.lifecycle !== 'mention') // 언급은 기본 숨김
    : npcs.filter(n => n.lifecycle === filter);

  const sortedNPCs = [...filteredNPCs].sort((a, b) => b.totalAppearances - a.totalAppearances);

  if (npcs.length === 0) return null;

  if (compact) {
    return (
      <div className="rounded-lg border border-base-border bg-base-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-sm font-bold uppercase tracking-widest text-text-muted">활성 NPC</h3>
          <span className="text-[10px] text-text-muted">{npcs.filter(n => n.lifecycle !== 'mention').length}명</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sortedNPCs.slice(0, 8).map(npc => (
            <span
              key={npc.id}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] border ${LIFECYCLE_STYLES[npc.lifecycle].border} ${LIFECYCLE_STYLES[npc.lifecycle].bg} ${LIFECYCLE_STYLES[npc.lifecycle].opacity}`}
              title={`${npc.name || npc.alias} (${npc.role}) - ${npc.totalAppearances}회 등장`}
            >
              <span className="text-text-secondary">{npc.name || npc.alias}</span>
              <span className="text-text-muted">({npc.role})</span>
            </span>
          ))}
          {sortedNPCs.length > 8 && (
            <span className="text-[10px] text-text-muted">+{sortedNPCs.length - 8}명</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-base-border bg-base-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-sm font-bold uppercase tracking-widest text-text-muted">NPC 목록</h3>
        <span className="text-[10px] text-text-muted">{npcs.length}명 (활성 {npcs.filter(n => n.lifecycle !== 'mention').length}명)</span>
      </div>

      {/* 필터 */}
      <div className="flex gap-1 mb-4">
        {(['all', 'encounter', 'recurring', 'significant', 'core'] as const).map(lc => (
          <button
            key={lc}
            onClick={() => setFilter(lc)}
            className={`rounded-md px-2 py-1 text-[10px] transition-colors ${
              filter === lc
                ? 'bg-seojin/15 text-seojin border border-seojin/30'
                : 'text-text-muted hover:text-text-secondary border border-transparent'
            }`}
          >
            {lc === 'all' ? '전체' : LIFECYCLE_LABELS[lc]}
          </button>
        ))}
      </div>

      {/* NPC 카드 목록 */}
      <div className="space-y-2">
        {sortedNPCs.map(npc => (
          <NPCCard key={npc.id} npc={npc} onPromote={promoteNPCToCore} />
        ))}
        {sortedNPCs.length === 0 && (
          <p className="text-xs text-text-muted text-center py-4">해당 등급의 NPC가 없습니다</p>
        )}
      </div>
    </div>
  );
}

function NPCCard({ npc, onPromote }: { npc: NPC; onPromote: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const style = LIFECYCLE_STYLES[npc.lifecycle];
  const displayName = npc.name || npc.alias;

  return (
    <div
      className={`rounded-md border p-3 cursor-pointer transition-colors hover:bg-base-primary/50 ${style.border} ${style.bg} ${style.opacity}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-primary">{displayName}</span>
          <span className="text-[10px] text-text-muted">({npc.role})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-1.5 py-0.5 text-[9px] border ${
            npc.lifecycle === 'significant' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' :
            npc.lifecycle === 'core' ? 'border-seojin/30 text-seojin bg-seojin/10' :
            'border-base-border text-text-muted'
          }`}>
            {LIFECYCLE_LABELS[npc.lifecycle]}
          </span>
          <span className="text-[10px] text-text-muted">{npc.totalAppearances}회</span>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 space-y-1.5">
          <p className="text-[11px] text-text-secondary">{npc.description}</p>

          {npc.faction && (
            <p className="text-[10px] text-text-muted">소속: {npc.faction}</p>
          )}

          <p className="text-[10px] text-text-muted">
            첫 등장: {npc.firstSeenYear}년 · 마지막: {npc.lastSeenYear}년
          </p>

          {/* 관계 */}
          {npc.relatedCharacters.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {npc.relatedCharacters.map((rel, idx) => (
                <span
                  key={idx}
                  className={`rounded-full px-2 py-0.5 text-[9px] border border-base-border ${
                    rel.sentiment > 0 ? 'text-green-400' : rel.sentiment < 0 ? 'text-red-400' : 'text-text-muted'
                  }`}
                >
                  {rel.characterId}: {rel.relationship} ({rel.sentiment > 0 ? '+' : ''}{rel.sentiment})
                </span>
              ))}
            </div>
          )}

          {/* Core 승격 버튼 */}
          {npc.lifecycle === 'significant' && (
            <button
              onClick={(e) => { e.stopPropagation(); onPromote(npc.id); }}
              className="mt-1 rounded-md bg-seojin/20 px-3 py-1 text-[10px] text-seojin hover:bg-seojin/30 transition-colors"
            >
              Core로 승격 (주인공급)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
