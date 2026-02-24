'use client';

import { useState, useEffect } from 'react';
import type { HeroArcLayer, VillainArcLayer, SeedsLayer, NPCSeedInfo } from '@/lib/types';

interface WorldSettingsEditorProps {
  heroArc: HeroArcLayer | null;
  villainArc: VillainArcLayer | null;
  seedsLayer: SeedsLayer | null;
  onSave: (data: {
    heroArc?: Partial<HeroArcLayer>;
    villainArc?: Partial<VillainArcLayer>;
    seedsLayer?: Partial<SeedsLayer>;
  }) => void;
  onClose: () => void;
}

type EditorTab = 'hero' | 'villain' | 'npcs';

export default function WorldSettingsEditor({
  heroArc,
  villainArc,
  seedsLayer,
  onSave,
  onClose,
}: WorldSettingsEditorProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('hero');
  const [editedHero, setEditedHero] = useState<Partial<HeroArcLayer>>({});
  const [editedVillain, setEditedVillain] = useState<Partial<VillainArcLayer>>({});
  const [editedNpcs, setEditedNpcs] = useState<NPCSeedInfo[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // 초기 데이터 로드
  useEffect(() => {
    if (heroArc) {
      setEditedHero({ ...heroArc });
    }
    if (villainArc) {
      setEditedVillain({ ...villainArc });
    }
    if (seedsLayer?.npcs) {
      setEditedNpcs([...seedsLayer.npcs]);
    }
  }, [heroArc, villainArc, seedsLayer]);

  const updateHero = (field: keyof HeroArcLayer, value: unknown) => {
    setEditedHero(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updateVillain = (field: keyof VillainArcLayer, value: unknown) => {
    setEditedVillain(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updateNpc = (index: number, field: keyof NPCSeedInfo, value: unknown) => {
    setEditedNpcs(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    const data: {
      heroArc?: Partial<HeroArcLayer>;
      villainArc?: Partial<VillainArcLayer>;
      seedsLayer?: Partial<SeedsLayer>;
    } = {};

    if (Object.keys(editedHero).length > 0) {
      data.heroArc = editedHero;
    }
    if (Object.keys(editedVillain).length > 0) {
      data.villainArc = editedVillain;
    }
    if (editedNpcs.length > 0) {
      data.seedsLayer = { ...seedsLayer, npcs: editedNpcs };
    }

    onSave(data);
  };

  const tabs: { id: EditorTab; label: string; icon: string }[] = [
    { id: 'hero', label: '주인공', icon: '⭐' },
    { id: 'villain', label: '빌런', icon: '👿' },
    { id: 'npcs', label: 'NPC', icon: '👥' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-w-3xl w-full bg-base-secondary rounded-xl shadow-xl border border-base-border max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-base-border px-4 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="font-medium text-text-primary">🛠️ 세계관 편집</h3>
            {hasChanges && (
              <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                수정됨
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary"
          >
            ✕
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-base-border shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2 text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-seojin/10 text-seojin border-b-2 border-seojin'
                  : 'text-text-muted hover:text-text-primary hover:bg-base-tertiary'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* 주인공 탭 */}
          {activeTab === 'hero' && (
            <div className="space-y-4">
              {heroArc ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">이름</label>
                      <input
                        type="text"
                        value={editedHero.name || ''}
                        onChange={(e) => updateHero('name', e.target.value)}
                        className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">나이</label>
                      <input
                        type="number"
                        value={editedHero.age || ''}
                        onChange={(e) => updateHero('age', parseInt(e.target.value) || 0)}
                        className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">태생/출신</label>
                    <textarea
                      value={editedHero.origin || ''}
                      onChange={(e) => updateHero('origin', e.target.value)}
                      rows={2}
                      className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">소속 세력</label>
                      <input
                        type="text"
                        value={editedHero.faction || ''}
                        onChange={(e) => updateHero('faction', e.target.value)}
                        className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">성장 환경</label>
                      <input
                        type="text"
                        value={editedHero.environment || ''}
                        onChange={(e) => updateHero('environment', e.target.value)}
                        className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">현재 상태</label>
                    <textarea
                      value={editedHero.currentStatus || ''}
                      onChange={(e) => updateHero('currentStatus', e.target.value)}
                      rows={2}
                      className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">핵심 서사</label>
                    <textarea
                      value={editedHero.coreNarrative || ''}
                      onChange={(e) => updateHero('coreNarrative', e.target.value)}
                      rows={3}
                      className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">시작 시점 상태</label>
                    <textarea
                      value={editedHero.initialState || ''}
                      onChange={(e) => updateHero('initialState', e.target.value)}
                      rows={2}
                      className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">궁극적 목표</label>
                    <textarea
                      value={editedHero.ultimateGoal || ''}
                      onChange={(e) => updateHero('ultimateGoal', e.target.value)}
                      rows={2}
                      className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin resize-none"
                    />
                  </div>

                  <hr className="border-base-border" />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">표면적 욕망</label>
                      <textarea
                        value={editedHero.desire || ''}
                        onChange={(e) => updateHero('desire', e.target.value)}
                        rows={2}
                        className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">내면적 결핍</label>
                      <textarea
                        value={editedHero.deficiency || ''}
                        onChange={(e) => updateHero('deficiency', e.target.value)}
                        rows={2}
                        className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin resize-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">치명적 약점</label>
                    <input
                      type="text"
                      value={editedHero.fatalWeakness || ''}
                      onChange={(e) => updateHero('fatalWeakness', e.target.value)}
                      className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin"
                    />
                  </div>
                </>
              ) : (
                <div className="text-center text-text-muted py-8">
                  주인공이 아직 설정되지 않았습니다.
                </div>
              )}
            </div>
          )}

          {/* 빌런 탭 */}
          {activeTab === 'villain' && (
            <div className="space-y-4">
              {villainArc ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">이름</label>
                      <input
                        type="text"
                        value={editedVillain.name || ''}
                        onChange={(e) => updateVillain('name', e.target.value)}
                        className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">나이</label>
                      <input
                        type="number"
                        value={editedVillain.age || ''}
                        onChange={(e) => updateVillain('age', parseInt(e.target.value) || 0)}
                        className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">태생/출신</label>
                    <textarea
                      value={editedVillain.origin || ''}
                      onChange={(e) => updateVillain('origin', e.target.value)}
                      rows={2}
                      className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">소속 세력</label>
                    <input
                      type="text"
                      value={editedVillain.faction || ''}
                      onChange={(e) => updateVillain('faction', e.target.value)}
                      className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">표면적 목표</label>
                    <textarea
                      value={editedVillain.surfaceGoal || ''}
                      onChange={(e) => updateVillain('surfaceGoal', e.target.value)}
                      rows={2}
                      className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      동기 <span className="text-text-muted">(왜 이렇게 되었나)</span>
                    </label>
                    <textarea
                      value={editedVillain.motivation || ''}
                      onChange={(e) => updateVillain('motivation', e.target.value)}
                      rows={3}
                      className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      자기 정당화 <span className="text-text-muted">(빌런 관점에서)</span>
                    </label>
                    <textarea
                      value={editedVillain.selfJustification || ''}
                      onChange={(e) => updateVillain('selfJustification', e.target.value)}
                      rows={2}
                      className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      세계가 나를 만들었다 <span className="text-text-muted">(환경적 원인)</span>
                    </label>
                    <textarea
                      value={editedVillain.worldMadeMe || ''}
                      onChange={(e) => updateVillain('worldMadeMe', e.target.value)}
                      rows={2}
                      className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">핵심 서사</label>
                    <textarea
                      value={editedVillain.coreNarrative || ''}
                      onChange={(e) => updateVillain('coreNarrative', e.target.value)}
                      rows={3}
                      className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">주인공과의 관계</label>
                    <textarea
                      value={editedVillain.relationship || ''}
                      onChange={(e) => updateVillain('relationship', e.target.value)}
                      rows={2}
                      className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin resize-none"
                    />
                  </div>

                  <hr className="border-base-border" />

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      주인공 vs 빌런 <span className="text-text-muted">(충돌 지점)</span>
                    </label>
                    <textarea
                      value={editedVillain.vsHero || ''}
                      onChange={(e) => updateVillain('vsHero', e.target.value)}
                      rows={2}
                      className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      화해 불가능한 이유
                    </label>
                    <textarea
                      value={editedVillain.whyNoReconcile || ''}
                      onChange={(e) => updateVillain('whyNoReconcile', e.target.value)}
                      rows={2}
                      className="w-full rounded-lg bg-base-tertiary border border-base-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-seojin resize-none"
                    />
                  </div>
                </>
              ) : (
                <div className="text-center text-text-muted py-8">
                  빌런이 아직 설정되지 않았습니다.
                </div>
              )}
            </div>
          )}

          {/* NPC 탭 */}
          {activeTab === 'npcs' && (
            <div className="space-y-4">
              {editedNpcs.length > 0 ? (
                editedNpcs.map((npc, index) => (
                  <details key={npc.id || index} className="rounded-lg bg-base-tertiary border border-base-border">
                    <summary className="px-4 py-3 cursor-pointer flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{npc.name}</span>
                        <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                          {npc.role}
                        </span>
                        {npc.importance && (
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            npc.importance === 'major'
                              ? 'bg-yellow-500/20 text-yellow-300'
                              : npc.importance === 'minor'
                              ? 'bg-gray-500/20 text-gray-400'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {npc.importance === 'major' ? '주연' : npc.importance === 'minor' ? '단역' : '조연'}
                          </span>
                        )}
                      </div>
                    </summary>
                    <div className="px-4 pb-4 space-y-3 border-t border-base-border mt-2 pt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-text-muted mb-1">이름</label>
                          <input
                            type="text"
                            value={npc.name}
                            onChange={(e) => updateNpc(index, 'name', e.target.value)}
                            className="w-full rounded bg-base-secondary border border-base-border px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-seojin"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-text-muted mb-1">역할</label>
                          <input
                            type="text"
                            value={npc.role}
                            onChange={(e) => updateNpc(index, 'role', e.target.value)}
                            className="w-full rounded bg-base-secondary border border-base-border px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-seojin"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-text-muted mb-1">위치</label>
                          <input
                            type="text"
                            value={npc.location || ''}
                            onChange={(e) => updateNpc(index, 'location', e.target.value)}
                            className="w-full rounded bg-base-secondary border border-base-border px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-seojin"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-text-muted mb-1">소속</label>
                          <input
                            type="text"
                            value={npc.faction || ''}
                            onChange={(e) => updateNpc(index, 'faction', e.target.value)}
                            className="w-full rounded bg-base-secondary border border-base-border px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-seojin"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted mb-1">성격</label>
                        <textarea
                          value={npc.personality || ''}
                          onChange={(e) => updateNpc(index, 'personality', e.target.value)}
                          rows={2}
                          className="w-full rounded bg-base-secondary border border-base-border px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-seojin resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted mb-1">배경 스토리</label>
                        <textarea
                          value={npc.backstory || ''}
                          onChange={(e) => updateNpc(index, 'backstory', e.target.value)}
                          rows={2}
                          className="w-full rounded bg-base-secondary border border-base-border px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-seojin resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted mb-1">관계</label>
                        <input
                          type="text"
                          value={npc.relationships || ''}
                          onChange={(e) => updateNpc(index, 'relationships', e.target.value)}
                          className="w-full rounded bg-base-secondary border border-base-border px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-seojin"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted mb-1">말투</label>
                        <input
                          type="text"
                          value={npc.speechPattern || ''}
                          onChange={(e) => updateNpc(index, 'speechPattern', e.target.value)}
                          className="w-full rounded bg-base-secondary border border-base-border px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-seojin"
                        />
                      </div>
                    </div>
                  </details>
                ))
              ) : (
                <div className="text-center text-text-muted py-8">
                  등록된 NPC가 없습니다.
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between border-t border-base-border px-4 py-3 shrink-0 bg-base-secondary">
          <div className="text-xs text-text-muted">
            변경사항은 다음 화 집필부터 자동 반영됩니다.
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-base-tertiary text-sm text-text-secondary hover:bg-base-border"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="px-4 py-2 rounded-lg bg-seojin text-sm text-white hover:bg-seojin/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
