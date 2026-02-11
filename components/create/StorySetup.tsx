'use client';

import { useState } from 'react';
import { AuthorPersona, StoryDirectorConfig, Character, WorldSettings, AnchorEvent } from '@/lib/types';
import { AUTHOR_PERSONA_PRESETS, PERSONA_ICONS } from '@/lib/presets/author-personas';

interface StorySetupProps {
  characters: Character[];
  value: StoryDirectorConfig | null;
  onChange: (config: StoryDirectorConfig) => void;
  worldSettings: WorldSettings;
  onWorldSettingsChange: (ws: WorldSettings) => void;
  onNext: () => void;
  onPrev: () => void;
}

const SENTENCE_LENGTH_LABELS: Record<string, string> = {
  short_punchy: '짧고 강렬',
  medium_flow: '중간 흐름',
  long_literary: '길고 문학적',
};

export default function StorySetup({ characters, value, onChange, worldSettings, onWorldSettingsChange, onNext, onPrev }: StorySetupProps) {
  const [protagonistId, setProtagonistId] = useState(value?.protagonistId || characters[0]?.id || '');
  const [logline, setLogline] = useState(value?.logline || '');
  const [selectedPersonaId, setSelectedPersonaId] = useState(value?.authorPersona?.id || '');
  const [customPersona, setCustomPersona] = useState(false);
  const [persona, setPersona] = useState<AuthorPersona | null>(value?.authorPersona || null);
  const [ratioA, setRatioA] = useState(value?.ratio?.protagonist || 60);
  const [ratioB, setRatioB] = useState(value?.ratio?.antagonist || 20);
  const [characterRoles, setCharacterRoles] = useState<Record<string, 'protagonist' | 'antagonist' | 'neutral'>>(
    value?.characterRoles || {}
  );
  const [anchorEvents, setAnchorEvents] = useState<AnchorEvent[]>(worldSettings.anchorEvents || []);
  const [showAnchorForm, setShowAnchorForm] = useState(false);
  const [newAnchor, setNewAnchor] = useState({ triggerYear: 0, event: '', worldImpact: '' });
  const [newAnchorSituations, setNewAnchorSituations] = useState<Record<string, string>>({});

  const selectPersona = (p: AuthorPersona) => {
    setSelectedPersonaId(p.id);
    setPersona(p);
    setCustomPersona(false);
  };

  const updateRole = (charId: string, role: 'protagonist' | 'antagonist' | 'neutral') => {
    setCharacterRoles(prev => ({ ...prev, [charId]: role }));
  };

  const ratioC = Math.max(0, 100 - ratioA - ratioB);

  const addAnchorEvent = () => {
    const anchor: AnchorEvent = {
      id: `anchor-${Date.now()}`,
      triggerYear: newAnchor.triggerYear,
      event: newAnchor.event,
      worldImpact: newAnchor.worldImpact,
      characterSituations: characters.map(c => ({
        characterId: c.id,
        situation: newAnchorSituations[c.id] || '직접 영향 없음',
      })),
      scope: 'all',
      mandatory: true,
    };
    const updated = [...anchorEvents, anchor];
    setAnchorEvents(updated);
    onWorldSettingsChange({ ...worldSettings, anchorEvents: updated });
    setNewAnchor({ triggerYear: 0, event: '', worldImpact: '' });
    setNewAnchorSituations({});
    setShowAnchorForm(false);
  };

  const removeAnchorEvent = (id: string) => {
    const updated = anchorEvents.filter(a => a.id !== id);
    setAnchorEvents(updated);
    onWorldSettingsChange({ ...worldSettings, anchorEvents: updated });
  };

  const handleNext = () => {
    const config: StoryDirectorConfig = {
      enabled: true,
      protagonistId,
      ratio: { protagonist: ratioA, antagonist: ratioB, neutral: ratioC },
      logline,
      authorPersona: persona || undefined,
      characterRoles: {
        ...characterRoles,
        [protagonistId]: 'protagonist',
      },
    };
    onChange(config);
    onNext();
  };

  return (
    <div className="rounded-xl border border-base-border bg-base-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-lg font-bold text-text-primary">스토리 디렉터</h2>
        <span className="text-xs text-text-muted">Step 5/6</span>
      </div>

      <div className="space-y-6">
        {/* 로그라인 */}
        <div>
          <label className="text-xs font-medium text-text-muted uppercase tracking-widest mb-1.5 block">로그라인</label>
          <p className="text-[10px] text-text-muted mb-2">이 소설을 한 문장으로 설명해주세요.</p>
          <input
            value={logline}
            onChange={e => setLogline(e.target.value)}
            placeholder="예: 기억을 잃으며 강해지는 소년이, 세상의 진실과 자신의 과거를 찾아가는 이야기"
            className="w-full rounded-md border border-base-border bg-base-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50"
          />
        </div>

        {/* 주인공 선택 + 역할 배정 */}
        <div>
          <label className="text-xs font-medium text-text-muted uppercase tracking-widest mb-1.5 block">캐릭터 역할</label>
          <p className="text-[10px] text-text-muted mb-2">주인공(A), 빌런/라이벌(B), 중립/서브(C) 역할을 지정하세요.</p>
          <div className="space-y-2">
            {characters.map(char => (
              <div key={char.id} className="flex items-center gap-3 rounded-md border border-base-border bg-base-primary px-3 py-2">
                <span className="text-sm font-medium text-text-primary min-w-[60px]">{char.name || char.id}</span>
                <div className="flex gap-1.5">
                  {(['protagonist', 'antagonist', 'neutral'] as const).map(role => {
                    const isSelected = char.id === protagonistId
                      ? role === 'protagonist'
                      : (characterRoles[char.id] || 'neutral') === role;
                    const labels = { protagonist: 'A 주인공', antagonist: 'B 빌런', neutral: 'C 중립' };
                    const colors = {
                      protagonist: 'border-seojin bg-seojin/15 text-seojin',
                      antagonist: 'border-yeonhwa/50 bg-yeonhwa/10 text-yeonhwa',
                      neutral: 'border-muhan/50 bg-muhan/10 text-muhan',
                    };
                    return (
                      <button
                        key={role}
                        onClick={() => {
                          if (role === 'protagonist') {
                            setProtagonistId(char.id);
                          } else {
                            updateRole(char.id, role);
                          }
                        }}
                        disabled={char.id === protagonistId && role !== 'protagonist'}
                        className={`rounded-md border px-2.5 py-1 text-[10px] font-medium transition-colors ${
                          isSelected ? colors[role] : 'border-base-border text-text-muted hover:border-text-muted'
                        } disabled:opacity-30`}
                      >
                        {labels[role]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 비중 조절 */}
        <div>
          <label className="text-xs font-medium text-text-muted uppercase tracking-widest mb-1.5 block">시점 비중</label>
          <p className="text-[10px] text-text-muted mb-2">A:B:C 비중을 조절하세요. 권장: 6:2:2</p>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-seojin font-medium">A 주인공</span>
                <span className="text-[10px] text-text-muted">{ratioA}%</span>
              </div>
              <input type="range" min={30} max={80} value={ratioA} onChange={e => setRatioA(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none bg-base-tertiary accent-seojin" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-yeonhwa font-medium">B 빌런</span>
                <span className="text-[10px] text-text-muted">{ratioB}%</span>
              </div>
              <input type="range" min={5} max={40} value={ratioB} onChange={e => setRatioB(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none bg-base-tertiary accent-yeonhwa" />
            </div>
            <div className="text-center">
              <span className="text-[10px] text-muhan font-medium block">C 중립</span>
              <span className="text-[10px] text-text-muted">{ratioC}%</span>
            </div>
          </div>
          <div className="mt-2 h-2 flex rounded-full overflow-hidden">
            <div className="bg-seojin" style={{ width: `${ratioA}%` }} />
            <div className="bg-yeonhwa" style={{ width: `${ratioB}%` }} />
            <div className="bg-muhan" style={{ width: `${ratioC}%` }} />
          </div>
        </div>

        {/* 작가 페르소나 */}
        <div>
          <label className="text-xs font-medium text-text-muted uppercase tracking-widest mb-1.5 block">작가 페르소나</label>
          <p className="text-[10px] text-text-muted mb-3">세밀 장면 생성 시 적용될 문체와 서술 스타일입니다.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {AUTHOR_PERSONA_PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => selectPersona(p)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  selectedPersonaId === p.id
                    ? 'border-seojin bg-seojin/10'
                    : 'border-base-border hover:border-text-muted'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">{PERSONA_ICONS[p.id]}</span>
                  <span className="text-xs font-medium text-text-primary">{p.name}</span>
                </div>
                <p className="text-[10px] text-text-muted leading-relaxed">
                  {SENTENCE_LENGTH_LABELS[p.style.sentenceLength]} · {p.references[0]?.split('의')[0] || ''}
                </p>
              </button>
            ))}
            <button
              onClick={() => { setCustomPersona(true); setSelectedPersonaId('custom'); }}
              className={`rounded-lg border p-3 text-left transition-colors ${
                customPersona ? 'border-seojin bg-seojin/10' : 'border-base-border hover:border-text-muted'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">&#9998;&#65039;</span>
                <span className="text-xs font-medium text-text-primary">직접 설정</span>
              </div>
              <p className="text-[10px] text-text-muted leading-relaxed">문체/리듬/철학을 자유롭게 정의</p>
            </button>
          </div>

          {/* 선택된 페르소나 상세 */}
          {persona && !customPersona && (
            <div className="mt-3 rounded-md border border-seojin/20 bg-seojin/5 p-3 space-y-1.5">
              <p className="text-[10px] text-text-secondary"><span className="text-text-muted">리듬:</span> {persona.style.rhythm}</p>
              <p className="text-[10px] text-text-secondary"><span className="text-text-muted">시그니처:</span> {persona.style.signature}</p>
              <p className="text-[10px] text-text-secondary"><span className="text-text-muted">페이싱:</span> {persona.narrative.pacing}</p>
              <p className="text-[10px] text-text-secondary"><span className="text-text-muted">강점:</span> {persona.strengths.join(' / ')}</p>
            </div>
          )}

          {/* 커스텀 페르소나 입력 */}
          {customPersona && (
            <div className="mt-3 space-y-2 rounded-md border border-seojin/20 bg-seojin/5 p-3">
              <div>
                <label className="text-[10px] text-text-muted block mb-0.5">문장 리듬</label>
                <textarea
                  value={persona?.style.rhythm || ''}
                  onChange={e => setPersona(prev => ({
                    id: 'custom', name: '커스텀', style: { ...prev?.style || { sentenceLength: 'medium_flow', signature: '', avoidance: [] }, rhythm: e.target.value },
                    narrative: prev?.narrative || { showDontTell: '', dialogueStyle: '', descriptionStyle: '', pacing: '' },
                    strengths: prev?.strengths || [], deliberateQuirks: prev?.deliberateQuirks || [], references: prev?.references || [],
                  }))}
                  placeholder="예: 짧은 문장 3개 → 긴 문장 1개로 호흡 조절"
                  rows={2}
                  className="w-full rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-[11px] text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50 resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-muted block mb-0.5">대사 스타일</label>
                <input
                  value={persona?.narrative.dialogueStyle || ''}
                  onChange={e => setPersona(prev => prev ? { ...prev, narrative: { ...prev.narrative, dialogueStyle: e.target.value } } : prev)}
                  placeholder="예: 대사는 짧다. 가장 중요한 말은 가장 짧게."
                  className="w-full rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-[11px] text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-muted block mb-0.5">페이싱</label>
                <input
                  value={persona?.narrative.pacing || ''}
                  onChange={e => setPersona(prev => prev ? { ...prev, narrative: { ...prev.narrative, pacing: e.target.value } } : prev)}
                  placeholder="예: 느릿하게 쌓다가 한 방에 터뜨린다"
                  className="w-full rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-[11px] text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-muted block mb-0.5">참고 작품/작가</label>
                <input
                  value={persona?.references.join(', ') || ''}
                  onChange={e => setPersona(prev => prev ? { ...prev, references: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : prev)}
                  placeholder="예: 전지적 독자 시점, 나 혼자만 레벨업"
                  className="w-full rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-[11px] text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50"
                />
              </div>
            </div>
          )}
        </div>

        {/* 마일스톤 (Anchor Events) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-text-muted uppercase tracking-widest">마일스톤 (Anchor Events)</label>
            <button
              onClick={() => setShowAnchorForm(!showAnchorForm)}
              className="text-[10px] text-seojin hover:underline"
            >
              + 추가
            </button>
          </div>
          <p className="text-[10px] text-text-muted mb-3">
            시뮬레이션 중 반드시 발생해야 하는 세계 사건. 캐릭터의 반응은 시뮬레이션이 결정합니다.
          </p>

          {/* 기존 앵커 이벤트 목록 */}
          {anchorEvents.length > 0 && (
            <div className="space-y-2 mb-3">
              {anchorEvents.map(a => (
                <div key={a.id} className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-amber-400">{a.triggerYear}년 &#9875; {a.event}</span>
                    <button onClick={() => removeAnchorEvent(a.id)} className="text-[10px] text-text-muted hover:text-yeonhwa">삭제</button>
                  </div>
                  <p className="text-[10px] text-text-muted mb-1">영향: {a.worldImpact}</p>
                  <div className="space-y-0.5">
                    {a.characterSituations.map(cs => {
                      const char = characters.find(c => c.id === cs.characterId);
                      return (
                        <p key={cs.characterId} className="text-[10px] text-text-muted">
                          <span className="text-text-secondary">{char?.name || cs.characterId}:</span> {cs.situation}
                        </p>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 새 앵커 이벤트 폼 */}
          {showAnchorForm && (
            <div className="rounded-md border border-seojin/20 bg-seojin/5 p-3 space-y-2">
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] text-text-muted block mb-0.5">발생 연도</label>
                  <input
                    type="number"
                    value={newAnchor.triggerYear}
                    onChange={e => setNewAnchor(p => ({ ...p, triggerYear: Number(e.target.value) }))}
                    className="w-full rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-[11px] text-text-primary focus:outline-none focus:border-seojin/50"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] text-text-muted block mb-0.5">사건 (세계 사건)</label>
                  <input
                    value={newAnchor.event}
                    onChange={e => setNewAnchor(p => ({ ...p, event: e.target.value }))}
                    placeholder="예: 제국과 마교의 전쟁 발발"
                    className="w-full rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-[11px] text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-text-muted block mb-0.5">세계 영향</label>
                <input
                  value={newAnchor.worldImpact}
                  onChange={e => setNewAnchor(p => ({ ...p, worldImpact: e.target.value }))}
                  placeholder="예: 전국이 전장이 됨. 민간인 징집 시작."
                  className="w-full rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-[11px] text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-muted block mb-1">캐릭터별 상황</label>
                <div className="space-y-1.5">
                  {characters.map(char => (
                    <div key={char.id} className="flex items-center gap-2">
                      <span className="text-[10px] text-text-secondary min-w-[50px]">{char.name || char.id}</span>
                      <input
                        value={newAnchorSituations[char.id] || ''}
                        onChange={e => setNewAnchorSituations(p => ({ ...p, [char.id]: e.target.value }))}
                        placeholder="예: 전장 한가운데에 있다"
                        className="flex-1 rounded-md border border-base-border bg-base-primary px-2 py-1 text-[10px] text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-seojin/50"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={addAnchorEvent}
                  disabled={!newAnchor.event}
                  className="rounded-md bg-seojin px-3 py-1 text-[10px] text-white hover:opacity-90 disabled:opacity-40"
                >
                  추가
                </button>
                <button
                  onClick={() => setShowAnchorForm(false)}
                  className="rounded-md border border-base-border px-3 py-1 text-[10px] text-text-muted hover:bg-base-tertiary"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 네비게이션 */}
        <div className="flex justify-between pt-2">
          <button onClick={onPrev} className="rounded-lg border border-base-border px-4 py-2 text-sm text-text-secondary hover:bg-base-tertiary transition-colors">
            이전
          </button>
          <button
            onClick={handleNext}
            className="rounded-lg bg-seojin px-6 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
}
