'use client';

import { useState } from 'react';
import { Character, EmergentProfile, Memory, CharacterSeed, SeedEditType } from '@/lib/types';
import { getCharacterColor } from '@/lib/utils/character-display';
import { useSimulationStore } from '@/lib/store/simulation-store';
import { getStatusLabel } from '@/lib/utils/timeline-utils';
import CharacterAvatar from './CharacterAvatar';
import StatusBar from './StatusBar';
import GrowthTimeline from './GrowthTimeline';
import SeedEditModal from './SeedEditModal';
import { IMPRINT_ICONS } from '@/lib/prompts/simulation-prompt-v2';

interface CharacterPanelProps {
  character: Character;
  currentYear: number;
  profile?: EmergentProfile;
  memories?: Memory[];
  seedCodename?: string;
  role?: 'protagonist' | 'antagonist' | 'neutral';
}

const ROLE_LABELS: Record<string, string> = {
  protagonist: 'A 주인공',
  antagonist: 'B 빌런',
  neutral: 'C 중립',
};

const ROLE_COLORS: Record<string, string> = {
  protagonist: 'bg-seojin/20 text-seojin',
  antagonist: 'bg-yeonhwa/20 text-yeonhwa',
  neutral: 'bg-muhan/20 text-muhan',
};

export default function CharacterPanel({ character, currentYear, profile, memories, seedCodename, role }: CharacterPanelProps) {
  const { characters, seeds, editSeed, seedEditHistory, memoryStacks } = useSimulationStore();
  const color = getCharacterColor(character.id, characters, seeds);
  const age = currentYear - character.birthYear;
  const [showGrowth, setShowGrowth] = useState(false);
  const [showSeedEdit, setShowSeedEdit] = useState(false);

  const seed = seeds.find(s => s.id === character.id);
  const charMemories = memories || memoryStacks[character.id] || [];
  const charEditHistory = seedEditHistory.filter(h => h.characterId === character.id);

  const handleSeedSave = (editType: SeedEditType, newSeed: CharacterSeed, rewindToAge?: number) => {
    editSeed(character.id, editType, newSeed, rewindToAge);
  };

  return (
    <>
      <div
        className="rounded-xl border border-base-border bg-base-card p-5 transition-all hover:border-opacity-60 cursor-pointer"
        style={{ borderColor: `${color}30` }}
        onClick={() => { if (profile && memories) setShowGrowth(!showGrowth); }}
      >
        {/* 헤더 */}
        <div className="flex items-start gap-4">
          <CharacterAvatar
            characterId={character.id}
            name={character.name}
            alias={character.alias}
            size="lg"
          />
          <div className="flex-1">
            <h3 className="font-serif text-lg font-bold text-text-primary flex items-center gap-2">
              {character.name}
              {seedCodename && character.name === seedCodename && (
                <span className="text-xs font-normal text-text-muted">(씨앗)</span>
              )}
              {role && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ROLE_COLORS[role]}`}>
                  {ROLE_LABELS[role]}
                </span>
              )}
            </h3>
            <p className="text-sm" style={{ color }}>
              {character.alias || (profile?.currentAlias ? profile.currentAlias : '')}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-text-muted">
                {age > 0 ? `${age}세` : '미출생'}
              </span>
              <span className="text-xs text-text-muted">·</span>
              <span
                className="rounded-full px-2 py-0.5 text-xs"
                style={{ backgroundColor: `${color}15`, color }}
              >
                {getStatusLabel(character.status)}
              </span>
              {profile && (
                <>
                  <span className="text-xs text-text-muted">·</span>
                  <span className="text-[10px] text-seojin/70">경험 레이어</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 능력치 */}
        <div className="mt-4">
          <StatusBar
            characterId={character.id}
            stats={character.stats}
            emotionalState={character.emotionalState}
          />
        </div>

        {/* 기존 프로필 요약 */}
        <div className="mt-4 space-y-2 border-t border-base-border pt-3">
          <p className="text-xs text-text-secondary leading-relaxed">
            {character.profile.background}
          </p>
          <div className="flex flex-wrap gap-1">
            {character.profile.abilities.map((ability) => (
              <span
                key={ability}
                className="rounded-md border border-base-border px-1.5 py-0.5 text-[10px] text-text-muted"
              >
                {ability}
              </span>
            ))}
          </div>
        </div>

        {/* 발현 프로필 (V2) */}
        {profile && (
          <div className="mt-3 space-y-2 border-t border-base-border pt-3">
            {/* 성격 형성 */}
            {profile.personality.length > 0 && (
              <div>
                <span className="text-[10px] text-text-muted uppercase tracking-wider">성격</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {profile.personality.slice(0, 4).map((p) => (
                    <span
                      key={p.trait}
                      className="rounded-md px-1.5 py-0.5 text-[10px]"
                      style={{
                        backgroundColor: `${color}${Math.round(p.strength * 0.3).toString(16).padStart(2, '0')}`,
                        color,
                      }}
                    >
                      {p.trait} ({p.strength})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 능력 마일스톤 */}
            {profile.abilities.length > 0 && (
              <div>
                <span className="text-[10px] text-text-muted uppercase tracking-wider">능력</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {profile.abilities.map((a) => {
                    const levelColors = { discovered: '#FFD700', practicing: '#4ADE80', mastered: '#C74B50' };
                    const levelLabels = { discovered: '발견', practicing: '수련', mastered: '숙달' };
                    return (
                      <span
                        key={a.name}
                        className="rounded-md border px-1.5 py-0.5 text-[10px]"
                        style={{ borderColor: levelColors[a.level], color: levelColors[a.level] }}
                      >
                        {IMPRINT_ICONS.skill} {a.name} [{levelLabels[a.level]}]
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 말투 패턴 */}
            {profile.speechPatterns.length > 0 && (
              <div>
                <span className="text-[10px] text-text-muted uppercase tracking-wider">말투</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {profile.speechPatterns.slice(0, 3).map((sp) => (
                    <span key={sp} className="text-[10px] text-text-secondary">
                      {IMPRINT_ICONS.speech} &quot;{sp}&quot;
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 내적 갈등 */}
            {profile.innerConflicts.length > 0 && (
              <div>
                <span className="text-[10px] text-text-muted uppercase tracking-wider">내적 갈등</span>
                <div className="mt-1 space-y-0.5">
                  {profile.innerConflicts.slice(0, 2).map((c, i) => (
                    <p key={i} className="text-[10px] text-yeonhwa/80">
                      {IMPRINT_ICONS.trauma} {c}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* 씨앗 편집 버튼 */}
            {seed && (
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowSeedEdit(true); }}
                  className="rounded-md border border-seojin/30 bg-seojin/10 px-2.5 py-1 text-[10px] text-seojin hover:bg-seojin/20 transition-colors"
                >
                  씨앗 편집
                </button>
                {charEditHistory.length > 0 && (
                  <span className="text-[9px] text-text-muted">
                    편집 {charEditHistory.length}회
                  </span>
                )}
              </div>
            )}

            {/* 편집 이력 */}
            {charEditHistory.length > 0 && (
              <div className="pt-1">
                <span className="text-[9px] text-text-muted uppercase tracking-wider">최근 편집</span>
                <div className="mt-0.5 space-y-0.5">
                  {charEditHistory.slice(-2).map((log) => (
                    <p key={log.id} className="text-[9px] text-text-muted/70">
                      {log.editType === 'pre_simulation' ? '사전' : log.editType === 'soft_edit' ? '소프트' : '하드'}
                      {log.rewindToAge !== undefined ? ` (→${log.rewindToAge}세)` : ''}
                      {log.deletedMemoryCount > 0 ? ` -${log.deletedMemoryCount}기억` : ''}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* 클릭 안내 */}
            {memories && memories.length > 0 && (
              <p className="text-[9px] text-text-muted/50 text-center pt-1">
                클릭하여 성장 타임라인 {showGrowth ? '닫기' : '보기'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 성장 타임라인 (확장) */}
      {showGrowth && profile && memories && memories.length > 0 && (
        <div className="col-span-full">
          <GrowthTimeline
            memories={memories}
            profile={profile}
            color={color}
          />
        </div>
      )}

      {/* 씨앗 편집 모달 */}
      {seed && showSeedEdit && (
        <SeedEditModal
          seed={seed}
          memories={charMemories}
          isOpen={showSeedEdit}
          onClose={() => setShowSeedEdit(false)}
          onSave={handleSeedSave}
        />
      )}
    </>
  );
}
