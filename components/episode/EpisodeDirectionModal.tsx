'use client';

import { useState, useEffect } from 'react';
import type {
  EpisodeDirection,
  EmotionalTone,
  ForcedScene,
  ForcedSceneType,
  CharacterDirective,
  BreadcrumbDirective,
  CliffhangerType,
  NPCSeedInfo,
  SeedsLayer,
  HeroArcLayer,
  VillainArcLayer,
} from '@/lib/types';

interface EpisodeDirectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (direction: EpisodeDirection) => void;
  episodeNumber: number;
  // 캐릭터 목록 (선택 옵션용)
  heroArc?: HeroArcLayer | null;
  villainArc?: VillainArcLayer | null;
  seedsLayer?: SeedsLayer | null;
  // 기존 디렉션 (편집 시)
  existingDirection?: EpisodeDirection | null;
}

const EMOTIONAL_TONES: { value: EmotionalTone; label: string; emoji: string }[] = [
  { value: 'tension', label: '긴장감', emoji: '😰' },
  { value: 'relief', label: '해소/안도', emoji: '😌' },
  { value: 'excitement', label: '흥분/고조', emoji: '🔥' },
  { value: 'melancholy', label: '우울/슬픔', emoji: '😢' },
  { value: 'warmth', label: '따뜻함/감동', emoji: '🥰' },
  { value: 'fear', label: '공포/두려움', emoji: '😱' },
  { value: 'anger', label: '분노', emoji: '😠' },
  { value: 'mystery', label: '미스터리', emoji: '🔮' },
  { value: 'romance', label: '로맨스/설렘', emoji: '💕' },
  { value: 'comedy', label: '코믹/유머', emoji: '😂' },
  { value: 'epic', label: '서사적/웅장', emoji: '⚔️' },
  { value: 'dark', label: '어둠/암울', emoji: '🌑' },
];

const SCENE_TYPES: { value: ForcedSceneType; label: string }[] = [
  { value: 'action', label: '액션/전투' },
  { value: 'dialogue', label: '대화/대립' },
  { value: 'revelation', label: '진실 폭로' },
  { value: 'flashback', label: '과거 회상' },
  { value: 'dream', label: '꿈/환상' },
  { value: 'training', label: '수련/성장' },
  { value: 'travel', label: '이동/여행' },
  { value: 'reunion', label: '재회' },
  { value: 'separation', label: '이별' },
  { value: 'death', label: '죽음/상실' },
  { value: 'awakening', label: '각성' },
  { value: 'betrayal', label: '배신' },
  { value: 'confession', label: '고백/털어놓음' },
  { value: 'discovery', label: '발견' },
];

const CLIFFHANGER_TYPES: { value: CliffhangerType; label: string }[] = [
  { value: 'crisis', label: '위기 직전' },
  { value: 'revelation', label: '비밀 폭로' },
  { value: 'choice', label: '선택 강요' },
  { value: 'reversal', label: '예상 뒤집기' },
  { value: 'awakening', label: '능력 각성 힌트' },
  { value: 'past_connection', label: '과거 연결' },
  { value: 'character_entrance', label: '인물 등장' },
];

export default function EpisodeDirectionModal({
  isOpen,
  onClose,
  onConfirm,
  episodeNumber,
  heroArc,
  villainArc,
  seedsLayer,
  existingDirection,
}: EpisodeDirectionModalProps) {
  // 상태 초기화
  const [primaryTone, setPrimaryTone] = useState<EmotionalTone>('tension');
  const [secondaryTone, setSecondaryTone] = useState<EmotionalTone | undefined>();
  const [emotionArc, setEmotionArc] = useState('');
  const [forcedScenes, setForcedScenes] = useState<ForcedScene[]>([]);
  const [characterDirectives, setCharacterDirectives] = useState<CharacterDirective[]>([]);
  const [pacing, setPacing] = useState<'fast' | 'normal' | 'slow'>('normal');
  const [cliffhangerType, setCliffhangerType] = useState<CliffhangerType | undefined>();
  const [cliffhangerHint, setCliffhangerHint] = useState('');
  const [viewpointCharacter, setViewpointCharacter] = useState('');
  const [freeDirectives, setFreeDirectives] = useState<string[]>([]);
  const [avoid, setAvoid] = useState<string[]>([]);
  const [newFreeDirective, setNewFreeDirective] = useState('');
  const [newAvoid, setNewAvoid] = useState('');

  // 기존 디렉션이 있으면 로드
  useEffect(() => {
    if (existingDirection) {
      setPrimaryTone(existingDirection.primaryTone);
      setSecondaryTone(existingDirection.secondaryTone);
      setEmotionArc(existingDirection.emotionArc || '');
      setForcedScenes(existingDirection.forcedScenes || []);
      setCharacterDirectives(existingDirection.characterDirectives || []);
      setPacing(existingDirection.pacing || 'normal');
      setCliffhangerType(existingDirection.cliffhangerType);
      setCliffhangerHint(existingDirection.cliffhangerHint || '');
      setViewpointCharacter(existingDirection.viewpointCharacter || '');
      setFreeDirectives(existingDirection.freeDirectives || []);
      setAvoid(existingDirection.avoid || []);
    }
  }, [existingDirection]);

  // 캐릭터 목록 구성
  const availableCharacters: { id: string; name: string; type: 'hero' | 'villain' | 'npc' }[] = [];
  if (heroArc) {
    availableCharacters.push({ id: 'hero', name: heroArc.name, type: 'hero' });
  }
  if (villainArc) {
    availableCharacters.push({ id: 'villain', name: villainArc.name, type: 'villain' });
  }
  if (seedsLayer?.npcs) {
    for (const npc of seedsLayer.npcs) {
      if (npc.importance === 'major' || npc.importance === 'supporting') {
        availableCharacters.push({ id: npc.id || npc.name, name: npc.name, type: 'npc' });
      }
    }
  }

  // 강제 장면 추가
  const addForcedScene = () => {
    setForcedScenes([
      ...forcedScenes,
      { type: 'dialogue', description: '' },
    ]);
  };

  // 강제 장면 삭제
  const removeForcedScene = (index: number) => {
    setForcedScenes(forcedScenes.filter((_, i) => i !== index));
  };

  // 강제 장면 업데이트
  const updateForcedScene = (index: number, updates: Partial<ForcedScene>) => {
    setForcedScenes(forcedScenes.map((scene, i) =>
      i === index ? { ...scene, ...updates } : scene
    ));
  };

  // 캐릭터 지시 추가
  const addCharacterDirective = (characterId: string, characterName: string) => {
    if (characterDirectives.some(d => d.characterId === characterId)) return;
    setCharacterDirectives([
      ...characterDirectives,
      { characterId, characterName, directive: 'must_appear' },
    ]);
  };

  // 캐릭터 지시 삭제
  const removeCharacterDirective = (characterId: string) => {
    setCharacterDirectives(characterDirectives.filter(d => d.characterId !== characterId));
  };

  // 캐릭터 지시 업데이트
  const updateCharacterDirective = (characterId: string, updates: Partial<CharacterDirective>) => {
    setCharacterDirectives(characterDirectives.map(d =>
      d.characterId === characterId ? { ...d, ...updates } : d
    ));
  };

  // 자유 지시 추가
  const addFreeDirective = () => {
    if (!newFreeDirective.trim()) return;
    setFreeDirectives([...freeDirectives, newFreeDirective.trim()]);
    setNewFreeDirective('');
  };

  // 금지 사항 추가
  const addAvoid = () => {
    if (!newAvoid.trim()) return;
    setAvoid([...avoid, newAvoid.trim()]);
    setNewAvoid('');
  };

  // 확인 핸들러
  const handleConfirm = () => {
    const direction: EpisodeDirection = {
      episodeNumber,
      primaryTone,
      secondaryTone,
      emotionArc: emotionArc || undefined,
      forcedScenes: forcedScenes.length > 0 ? forcedScenes : undefined,
      characterDirectives: characterDirectives.length > 0 ? characterDirectives : undefined,
      pacing,
      cliffhangerType,
      cliffhangerHint: cliffhangerHint || undefined,
      viewpointCharacter: viewpointCharacter || undefined,
      freeDirectives: freeDirectives.length > 0 ? freeDirectives : undefined,
      avoid: avoid.length > 0 ? avoid : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onConfirm(direction);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-base-secondary rounded-lg shadow-xl">
        {/* 헤더 */}
        <div className="sticky top-0 bg-base-secondary border-b border-base-border p-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-text-primary">
            {episodeNumber}화 디렉팅 설정
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 본문 */}
        <div className="p-4 space-y-6">
          {/* 감정 톤 */}
          <section>
            <h3 className="text-sm font-medium text-text-primary mb-2">감정 톤</h3>
            <div className="grid grid-cols-4 gap-2">
              {EMOTIONAL_TONES.map((tone) => (
                <button
                  key={tone.value}
                  onClick={() => setPrimaryTone(tone.value)}
                  className={`p-2 rounded text-sm flex flex-col items-center gap-1 transition-colors ${
                    primaryTone === tone.value
                      ? 'bg-seojin/20 text-seojin border border-seojin'
                      : 'bg-base-tertiary text-text-muted hover:bg-base-primary'
                  }`}
                >
                  <span>{tone.emoji}</span>
                  <span className="text-xs">{tone.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-3">
              <label className="text-xs text-text-muted">감정 변화 흐름 (선택)</label>
              <input
                type="text"
                value={emotionArc}
                onChange={(e) => setEmotionArc(e.target.value)}
                placeholder="예: 긴장 → 폭발 → 허무함"
                className="mt-1 w-full p-2 bg-base-tertiary rounded text-sm text-text-primary placeholder:text-text-muted/50"
              />
            </div>
          </section>

          {/* 강제 장면 */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-text-primary">강제 장면</h3>
              <button
                onClick={addForcedScene}
                className="text-xs px-2 py-1 bg-seojin/20 text-seojin rounded hover:bg-seojin/30 transition-colors"
              >
                + 장면 추가
              </button>
            </div>
            {forcedScenes.length === 0 ? (
              <p className="text-xs text-text-muted">반드시 포함할 장면을 추가하세요</p>
            ) : (
              <div className="space-y-2">
                {forcedScenes.map((scene, idx) => (
                  <div key={idx} className="p-3 bg-base-tertiary rounded space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={scene.type}
                        onChange={(e) => updateForcedScene(idx, { type: e.target.value as ForcedSceneType })}
                        className="flex-1 p-2 bg-base-primary rounded text-sm text-text-primary"
                      >
                        {SCENE_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <select
                        value={scene.timing || ''}
                        onChange={(e) => updateForcedScene(idx, {
                          timing: e.target.value as ForcedScene['timing'] || undefined
                        })}
                        className="w-24 p-2 bg-base-primary rounded text-sm text-text-primary"
                      >
                        <option value="">위치</option>
                        <option value="opening">오프닝</option>
                        <option value="middle">중반</option>
                        <option value="climax">클라이맥스</option>
                        <option value="ending">엔딩</option>
                      </select>
                      <button
                        onClick={() => removeForcedScene(idx)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      type="text"
                      value={scene.description}
                      onChange={(e) => updateForcedScene(idx, { description: e.target.value })}
                      placeholder="장면 설명 (예: 주인공이 스승과 재회)"
                      className="w-full p-2 bg-base-primary rounded text-sm text-text-primary placeholder:text-text-muted/50"
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 등장인물 지시 */}
          <section>
            <h3 className="text-sm font-medium text-text-primary mb-2">등장인물 지시</h3>
            {availableCharacters.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2 mb-3">
                  {availableCharacters.map((char) => {
                    const isAdded = characterDirectives.some(d => d.characterId === char.id);
                    return (
                      <button
                        key={char.id}
                        onClick={() => !isAdded && addCharacterDirective(char.id, char.name)}
                        disabled={isAdded}
                        className={`px-2 py-1 rounded text-xs ${
                          isAdded
                            ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                            : char.type === 'hero'
                            ? 'bg-seojin/20 text-seojin hover:bg-seojin/30'
                            : char.type === 'villain'
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                        }`}
                      >
                        {char.name}
                      </button>
                    );
                  })}
                </div>
                {characterDirectives.length > 0 && (
                  <div className="space-y-2">
                    {characterDirectives.map((d) => (
                      <div key={d.characterId} className="p-3 bg-base-tertiary rounded flex items-center gap-3">
                        <span className="text-sm text-text-primary font-medium">{d.characterName}</span>
                        <select
                          value={d.directive}
                          onChange={(e) => updateCharacterDirective(d.characterId, {
                            directive: e.target.value as CharacterDirective['directive']
                          })}
                          className="flex-1 p-2 bg-base-primary rounded text-sm text-text-primary"
                        >
                          <option value="must_appear">반드시 등장</option>
                          <option value="must_not_appear">등장 금지</option>
                          <option value="spotlight">주요 인물로 부각</option>
                          <option value="background">배경/언급 정도</option>
                        </select>
                        <button
                          onClick={() => removeCharacterDirective(d.characterId)}
                          className="text-red-400 hover:text-red-300"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-text-muted">캐릭터가 설정되지 않았습니다</p>
            )}
          </section>

          {/* 페이스 & 클리프행어 */}
          <section className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-text-primary mb-2">전개 속도</h3>
              <div className="flex gap-2">
                {(['slow', 'normal', 'fast'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPacing(p)}
                    className={`flex-1 p-2 rounded text-sm transition-colors ${
                      pacing === p
                        ? 'bg-seojin/20 text-seojin border border-seojin'
                        : 'bg-base-tertiary text-text-muted hover:bg-base-primary'
                    }`}
                  >
                    {p === 'slow' ? '느리게' : p === 'normal' ? '보통' : '빠르게'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-primary mb-2">클리프행어</h3>
              <select
                value={cliffhangerType || ''}
                onChange={(e) => setCliffhangerType(e.target.value as CliffhangerType || undefined)}
                className="w-full p-2 bg-base-tertiary rounded text-sm text-text-primary"
              >
                <option value="">자동 (작가 재량)</option>
                {CLIFFHANGER_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </section>

          {/* 추가 지시 */}
          <section>
            <h3 className="text-sm font-medium text-text-primary mb-2">추가 지시</h3>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newFreeDirective}
                onChange={(e) => setNewFreeDirective(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addFreeDirective()}
                placeholder="추가 지시사항 입력 후 Enter"
                className="flex-1 p-2 bg-base-tertiary rounded text-sm text-text-primary placeholder:text-text-muted/50"
              />
              <button
                onClick={addFreeDirective}
                className="px-3 py-2 bg-seojin/20 text-seojin rounded hover:bg-seojin/30 transition-colors text-sm"
              >
                추가
              </button>
            </div>
            {freeDirectives.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {freeDirectives.map((d, i) => (
                  <span key={i} className="px-2 py-1 bg-base-tertiary rounded text-xs text-text-muted flex items-center gap-1">
                    {d}
                    <button onClick={() => setFreeDirectives(freeDirectives.filter((_, idx) => idx !== i))} className="text-red-400">✕</button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* 금지 사항 */}
          <section>
            <h3 className="text-sm font-medium text-text-primary mb-2">금지 사항</h3>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newAvoid}
                onChange={(e) => setNewAvoid(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addAvoid()}
                placeholder="피해야 할 것 입력 후 Enter"
                className="flex-1 p-2 bg-base-tertiary rounded text-sm text-text-primary placeholder:text-text-muted/50"
              />
              <button
                onClick={addAvoid}
                className="px-3 py-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors text-sm"
              >
                추가
              </button>
            </div>
            {avoid.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {avoid.map((a, i) => (
                  <span key={i} className="px-2 py-1 bg-red-500/10 rounded text-xs text-red-400 flex items-center gap-1">
                    {a}
                    <button onClick={() => setAvoid(avoid.filter((_, idx) => idx !== i))} className="text-red-300">✕</button>
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* 푸터 */}
        <div className="sticky bottom-0 bg-base-secondary border-t border-base-border p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-seojin text-black rounded text-sm font-medium hover:bg-seojin/90 transition-colors"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
}
