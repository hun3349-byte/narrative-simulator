'use client';

import { useState } from 'react';
import { Character, CharacterSeed, WorldSettings } from '@/lib/types';

interface CharacterBuilderProps {
  worldSettings: WorldSettings;
  value: Character[];
  onChange: (chars: Character[]) => void;
  onNext: () => void;
  onPrev: () => void;
  onSeedsChange?: (seeds: CharacterSeed[]) => void;
}

const PERSONALITY_KEYWORDS = ['과묵', '활발', '냉철', '온화', '광기', '교활', '순수', '고독', '복수심', '유머'];
const MOTIVATION_OPTIONS = ['복수/원한', '수호/보호', '진실 탐구', '자아 탐색', '속죄/구원', '권력/야망'];
const ABILITY_OPTIONS = ['검술/무공', '의술/독술', '마법/주술', '변장/암살', '학문/지략', '요리/제작'];
const RACE_OPTIONS = ['인간', '반신반인', '요족', '마족'];

const CHARACTER_COLORS = ['#7B6BA8', '#C74B50', '#D4D0E0', '#4A9B7F', '#D4A843'];

function createEmptyCharacter(index: number): Character {
  return {
    id: `custom-char-${index}`,
    name: '',
    alias: '',
    age: 0,
    birthYear: -3,
    status: 'childhood',
    stats: { combat: 3, intellect: 3, willpower: 3, social: 3, specialStat: { name: '', value: 3 } },
    emotionalState: { primary: '호기심', intensity: 50, trigger: '' },
    profile: {
      background: '',
      personality: '',
      motivation: '',
      abilities: [],
      weakness: '',
      secretGoal: '',
    },
  };
}

const SEED_COLORS = ['#7B6BA8', '#C74B50', '#D4D0E0', '#4A9B7F', '#D4A843'];

function createEmptySeed(index: number): CharacterSeed {
  return {
    id: `custom-seed-${index}`,
    codename: '',
    birthYear: -3,
    initialCondition: '',
    temperament: '',
    latentAbility: '',
    physicalTrait: '',
    wound: '',
    color: SEED_COLORS[index] || '#888',
  };
}

export default function CharacterBuilder({ worldSettings, value, onChange, onNext, onPrev, onSeedsChange }: CharacterBuilderProps) {
  const [charCount, setCharCount] = useState(Math.max(value.length, 3));
  const [chars, setChars] = useState<Character[]>(
    value.length > 0
      ? value
      : Array.from({ length: 3 }, (_, i) => createEmptyCharacter(i))
  );
  const [activeChar, setActiveChar] = useState(0);
  const [modes, setModes] = useState<('form' | 'freetext' | 'seed')[]>(Array(5).fill('form'));
  const [freeTexts, setFreeTexts] = useState<string[]>(Array(5).fill(''));
  const [structuring, setStructuring] = useState(false);
  const [seedChars, setSeedChars] = useState<CharacterSeed[]>(
    Array.from({ length: 5 }, (_, i) => createEmptySeed(i))
  );

  const updateCharCount = (n: number) => {
    setCharCount(n);
    if (n > chars.length) {
      const newChars = [...chars];
      for (let i = chars.length; i < n; i++) {
        newChars.push(createEmptyCharacter(i));
      }
      setChars(newChars);
    }
    if (activeChar >= n) setActiveChar(n - 1);
  };

  const updateChar = (field: string, value: unknown) => {
    const updated = [...chars];
    const c = { ...updated[activeChar] };

    if (field.startsWith('profile.')) {
      const pField = field.replace('profile.', '');
      c.profile = { ...c.profile, [pField]: value };
    } else if (field.startsWith('stats.')) {
      const sField = field.replace('stats.', '');
      if (sField === 'specialStat.name') {
        c.stats = { ...c.stats, specialStat: { ...c.stats.specialStat, name: value as string } };
      } else if (sField === 'specialStat.value') {
        c.stats = { ...c.stats, specialStat: { ...c.stats.specialStat, value: value as number } };
      } else {
        c.stats = { ...c.stats, [sField]: value };
      }
    } else if (field.startsWith('emotionalState.')) {
      const eField = field.replace('emotionalState.', '');
      c.emotionalState = { ...c.emotionalState, [eField]: value };
    } else {
      (c as Record<string, unknown>)[field] = value;
    }

    updated[activeChar] = c;
    setChars(updated);
  };

  const toggleAbility = (ability: string) => {
    const current = chars[activeChar].profile.abilities;
    if (current.includes(ability)) {
      updateChar('profile.abilities', current.filter((a: string) => a !== ability));
    } else {
      updateChar('profile.abilities', [...current, ability]);
    }
  };

  const updateSeed = (field: keyof CharacterSeed, value: unknown) => {
    const updated = [...seedChars];
    updated[activeChar] = { ...updated[activeChar], [field]: value };
    setSeedChars(updated);
  };

  const handleStructure = async () => {
    const text = freeTexts[activeChar];
    if (!text || text.length < 30) return;
    setStructuring(true);
    try {
      const res = await fetch('/api/structure-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freeText: text,
          worldContext: `${worldSettings.worldName} - ${worldSettings.genre} - ${worldSettings.coreRule}`,
        }),
      });
      const result = await res.json();
      if (result.success && result.data) {
        const d = result.data;
        const updated = [...chars];
        updated[activeChar] = {
          id: `custom-char-${activeChar}`,
          name: d.name || '',
          alias: d.alias || '',
          age: d.age || 0,
          birthYear: d.birthYear || -3,
          status: d.status || 'childhood',
          stats: d.stats || chars[activeChar].stats,
          emotionalState: d.emotionalState || chars[activeChar].emotionalState,
          profile: {
            background: d.profile?.background || '',
            personality: d.profile?.personality || '',
            motivation: d.profile?.motivation || '',
            abilities: d.profile?.abilities || [],
            weakness: d.profile?.weakness || '',
            secretGoal: d.profile?.secretGoal || '',
          },
        };
        setChars(updated);
        const newModes = [...modes];
        newModes[activeChar] = 'form';
        setModes(newModes);
      }
    } catch {
      // silent
    } finally {
      setStructuring(false);
    }
  };

  const handleNext = () => {
    // Check if any char is in seed mode
    const anySeed = modes.slice(0, charCount).some(m => m === 'seed');

    if (anySeed && onSeedsChange) {
      const validSeeds = seedChars.slice(0, charCount).filter(s => s.codename.trim());
      if (validSeeds.length === 0) return;
      const finalSeeds = validSeeds.map((s, i) => ({
        ...s,
        id: s.id || `custom-seed-${i}`,
        color: SEED_COLORS[i] || '#888',
      }));
      onSeedsChange(finalSeeds);

      // Also create placeholder characters for downstream compatibility
      const placeholderChars: Character[] = finalSeeds.map(s => ({
        id: s.id,
        name: s.codename,
        alias: '',
        age: 0,
        birthYear: s.birthYear,
        status: 'childhood' as const,
        stats: { combat: 1, intellect: 1, willpower: 1, social: 1, specialStat: { name: s.latentAbility.split('—')[0]?.trim() || '', value: 0 } },
        emotionalState: { primary: '평온', intensity: 20, trigger: s.wound },
        profile: {
          background: s.initialCondition,
          personality: s.temperament,
          motivation: '자아 탐색',
          abilities: [s.latentAbility],
          weakness: s.wound,
          secretGoal: '',
        },
      }));
      onChange(placeholderChars);
    } else {
      const validChars = chars.slice(0, charCount).filter(c => c.name.trim());
      if (validChars.length === 0) return;
      const finalChars = validChars.map((c, i) => ({
        ...c,
        id: c.id || `custom-char-${i}`,
      }));
      onChange(finalChars);
    }
    onNext();
  };

  const char = chars[activeChar];
  const currentMode = modes[activeChar];

  return (
    <div className="rounded-xl border border-base-border bg-base-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-lg font-bold text-text-primary">캐릭터 생성</h2>
        <span className="text-xs text-text-muted">Step 3/6</span>
      </div>

      {/* 캐릭터 수 */}
      <div className="mb-4">
        <label className="text-xs font-medium text-text-muted uppercase tracking-widest mb-1.5 block">캐릭터 수</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => updateCharCount(n)}
              className={`w-9 h-9 rounded-md border text-sm font-medium transition-colors ${
                charCount === n ? 'border-seojin bg-seojin/15 text-seojin' : 'border-base-border text-text-secondary hover:border-text-muted'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* 캐릭터 탭 */}
      <div className="flex gap-1 mb-4 border-b border-base-border pb-2">
        {Array.from({ length: charCount }, (_, i) => (
          <button
            key={i}
            onClick={() => setActiveChar(i)}
            className={`px-3 py-1.5 rounded-t-md text-xs font-medium transition-colors ${
              activeChar === i
                ? 'text-white'
                : 'text-text-muted hover:text-text-secondary'
            }`}
            style={activeChar === i ? { backgroundColor: CHARACTER_COLORS[i] } : undefined}
          >
            {chars[i]?.name || `캐릭터 ${i + 1}`}
          </button>
        ))}
      </div>

      {/* 모드 전환 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { const m = [...modes]; m[activeChar] = 'form'; setModes(m); }}
          className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
            currentMode === 'form' ? 'bg-seojin/20 text-seojin' : 'bg-base-tertiary text-text-muted'
          }`}
        >
          선택형
        </button>
        <button
          onClick={() => { const m = [...modes]; m[activeChar] = 'freetext'; setModes(m); }}
          className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
            currentMode === 'freetext' ? 'bg-seojin/20 text-seojin' : 'bg-base-tertiary text-text-muted'
          }`}
        >
          직접 작성
        </button>
        <button
          onClick={() => { const m = [...modes]; m[activeChar] = 'seed'; setModes(m); }}
          className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
            currentMode === 'seed' ? 'bg-yeonhwa/20 text-yeonhwa' : 'bg-base-tertiary text-text-muted'
          }`}
        >
          씨앗 모드
        </button>
      </div>

      {currentMode === 'seed' ? (
        <div className="space-y-4">
          <p className="text-xs text-text-secondary">
            캐릭터의 &quot;씨앗&quot;만 정의합니다. 이름, 성격, 능력은 시뮬레이션 중 경험을 통해 자연 발현됩니다.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-text-muted mb-1 block">코드명 *</label>
              <input value={seedChars[activeChar].codename} onChange={e => updateSeed('codename', e.target.value)}
                placeholder="예: 저주받은 아이"
                className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-yeonhwa/50" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted mb-1 block">출생 연도</label>
              <input type="number" value={seedChars[activeChar].birthYear} onChange={e => updateSeed('birthYear', Number(e.target.value))}
                className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-sm text-text-primary focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-text-muted mb-1 block">초기 상황</label>
            <textarea value={seedChars[activeChar].initialCondition} onChange={e => updateSeed('initialCondition', e.target.value)}
              rows={2} placeholder="캐릭터가 처음 발견되는/시작하는 상황"
              className="w-full rounded-md border border-base-border bg-base-primary px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-yeonhwa/50 resize-none" />
          </div>

          <div>
            <label className="text-[10px] text-text-muted mb-1 block">기질</label>
            <input value={seedChars[activeChar].temperament} onChange={e => updateSeed('temperament', e.target.value)}
              placeholder="예: 과묵, 관찰형"
              className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-yeonhwa/50" />
          </div>

          <div>
            <label className="text-[10px] text-text-muted mb-1 block">잠재 능력</label>
            <input value={seedChars[activeChar].latentAbility} onChange={e => updateSeed('latentAbility', e.target.value)}
              placeholder="예: 잠재된 능력과 대가"
              className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-yeonhwa/50" />
          </div>

          <div>
            <label className="text-[10px] text-text-muted mb-1 block">신체 특성</label>
            <input value={seedChars[activeChar].physicalTrait} onChange={e => updateSeed('physicalTrait', e.target.value)}
                placeholder="예: 신체적 특징"
              className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-yeonhwa/50" />
          </div>

          <div>
            <label className="text-[10px] text-text-muted mb-1 block">선천 외모</label>
            <input value={seedChars[activeChar].innateAppearance || ''} onChange={e => updateSeed('innateAppearance', e.target.value)}
              placeholder="예: 검은 눈동자, 마른 체형, 짧은 머리"
              className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-yeonhwa/50" />
          </div>

          <div>
            <label className="text-[10px] text-text-muted mb-1 block">근원 상처</label>
            <textarea value={seedChars[activeChar].wound} onChange={e => updateSeed('wound', e.target.value)}
              rows={2} placeholder="캐릭터의 가장 깊은 내면의 상처"
              className="w-full rounded-md border border-base-border bg-base-primary px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-yeonhwa/50 resize-none" />
          </div>

          <div className="rounded-lg border border-yeonhwa/20 bg-yeonhwa/5 p-3">
            <p className="text-[10px] text-yeonhwa/80">
              씨앗 모드에서는 이름, 성격, 능력이 하드코딩되지 않습니다.
              시뮬레이션 중 AI가 경험에 기반해 자연스럽게 이름을 부여하고,
              성격을 형성하며, 능력을 발현시킵니다.
            </p>
          </div>
        </div>
      ) : currentMode === 'form' ? (
        <div className="space-y-4">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-text-muted mb-1 block">이름 *</label>
              <input value={char.name} onChange={e => updateChar('name', e.target.value)}
                placeholder="캐릭터 이름"
                className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-seojin/50" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted mb-1 block">이명(별칭)</label>
              <input value={char.alias} onChange={e => updateChar('alias', e.target.value)}
                placeholder="예: 그림자"
                className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-seojin/50" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-text-muted mb-1 block">출생 연도</label>
              <input type="number" value={char.birthYear} onChange={e => updateChar('birthYear', Number(e.target.value))}
                className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-sm text-text-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-text-muted mb-1 block">종족</label>
              <div className="flex flex-wrap gap-1">
                {RACE_OPTIONS.map(r => (
                  <button key={r} onClick={() => updateChar('profile.background', char.profile.background.includes(r) ? char.profile.background : `${r}. ${char.profile.background}`)}
                    className="rounded border border-base-border px-2 py-0.5 text-[10px] text-text-secondary hover:border-seojin/50">{r}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-text-muted mb-1 block">초기 감정</label>
              <input value={char.emotionalState.primary} onChange={e => updateChar('emotionalState.primary', e.target.value)}
                placeholder="예: 호기심"
                className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-seojin/50" />
            </div>
          </div>

          {/* 성격 키워드 */}
          <div>
            <label className="text-[10px] text-text-muted mb-1.5 block">성격 키워드 (최대 3개)</label>
            <div className="flex flex-wrap gap-1.5">
              {PERSONALITY_KEYWORDS.map(kw => {
                const isSelected = char.profile.personality.includes(kw);
                return (
                  <button key={kw}
                    onClick={() => {
                      const parts = char.profile.personality.split(', ').filter(Boolean);
                      if (isSelected) {
                        updateChar('profile.personality', parts.filter(p => p !== kw).join(', '));
                      } else if (parts.length < 3) {
                        updateChar('profile.personality', [...parts, kw].join(', '));
                      }
                    }}
                    className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                      isSelected ? 'border-seojin bg-seojin/15 text-seojin' : 'border-base-border text-text-secondary hover:border-text-muted'
                    }`}
                  >
                    {kw}
                  </button>
                );
              })}
            </div>
            <input value={char.profile.personality} onChange={e => updateChar('profile.personality', e.target.value)}
              placeholder="직접 입력 또는 위에서 선택"
              className="mt-1.5 w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-seojin/50" />
          </div>

          {/* 핵심 동기 */}
          <div>
            <label className="text-[10px] text-text-muted mb-1.5 block">핵심 동기</label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {MOTIVATION_OPTIONS.map(m => (
                <button key={m}
                  onClick={() => updateChar('profile.motivation', m)}
                  className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                    char.profile.motivation === m ? 'border-seojin bg-seojin/15 text-seojin' : 'border-base-border text-text-secondary hover:border-text-muted'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <input value={char.profile.motivation} onChange={e => updateChar('profile.motivation', e.target.value)}
              placeholder="직접 입력"
              className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-seojin/50" />
          </div>

          {/* 능력 체계 */}
          <div>
            <label className="text-[10px] text-text-muted mb-1.5 block">능력 체계</label>
            <div className="flex flex-wrap gap-1.5">
              {ABILITY_OPTIONS.map(a => {
                const isSelected = char.profile.abilities.includes(a);
                return (
                  <button key={a} onClick={() => toggleAbility(a)}
                    className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                      isSelected ? 'border-seojin bg-seojin/15 text-seojin' : 'border-base-border text-text-secondary hover:border-text-muted'
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 능력치 슬라이더 */}
          <div>
            <label className="text-[10px] text-text-muted mb-1.5 block">초기 능력치</label>
            <div className="space-y-2">
              {(['combat', 'intellect', 'willpower', 'social'] as const).map(stat => {
                const labels: Record<string, string> = { combat: '무공', intellect: '지력', willpower: '의지력', social: '사교성' };
                return (
                  <div key={stat} className="flex items-center gap-2">
                    <span className="w-12 text-[10px] text-text-muted">{labels[stat]}</span>
                    <input type="range" min={1} max={10} value={char.stats[stat]}
                      onChange={e => updateChar(`stats.${stat}`, Number(e.target.value))}
                      className="flex-1 h-1 accent-seojin" />
                    <span className="w-6 text-xs text-text-secondary text-right">{char.stats[stat]}</span>
                  </div>
                );
              })}
              <div className="flex items-center gap-2">
                <input value={char.stats.specialStat.name} onChange={e => updateChar('stats.specialStat.name', e.target.value)}
                  placeholder="고유 스탯명" className="w-12 text-[10px] rounded border border-base-border bg-base-primary px-1 py-0.5 text-text-primary focus:outline-none" />
                <input type="range" min={0} max={10} value={char.stats.specialStat.value}
                  onChange={e => updateChar('stats.specialStat.value', Number(e.target.value))}
                  className="flex-1 h-1 accent-seojin" />
                <span className="w-6 text-xs text-text-secondary text-right">{char.stats.specialStat.value}</span>
              </div>
            </div>
          </div>

          {/* 텍스트 필드들 */}
          <div>
            <label className="text-[10px] text-text-muted mb-1 block">배경 스토리</label>
            <textarea value={char.profile.background} onChange={e => updateChar('profile.background', e.target.value)}
              rows={2} placeholder="출신 배경 설명"
              className="w-full rounded-md border border-base-border bg-base-primary px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-seojin/50 resize-none" />
          </div>
          <div>
            <label className="text-[10px] text-text-muted mb-1 block">약점</label>
            <input value={char.profile.weakness} onChange={e => updateChar('profile.weakness', e.target.value)}
              placeholder="예: 과거의 기억에 집착"
              className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-seojin/50" />
          </div>
          <div>
            <label className="text-[10px] text-text-muted mb-1 block">숨겨진 목표</label>
            <input value={char.profile.secretGoal} onChange={e => updateChar('profile.secretGoal', e.target.value)}
              placeholder="다른 캐릭터가 모르는 진짜 목적"
              className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-seojin/50" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-text-secondary">
            캐릭터를 자유롭게 설명해주세요. 이름, 성격, 능력, 배경 등 원하는 만큼 상세하게.
          </p>
          <textarea
            value={freeTexts[activeChar]}
            onChange={e => { const t = [...freeTexts]; t[activeChar] = e.target.value; setFreeTexts(t); }}
            rows={8}
            placeholder={`예시:\n"캐릭터를 자유롭게 설명해주세요.\n이름, 성격, 능력, 배경 등을 원하는 만큼 상세하게 작성하면\nAI가 구조화하여 시뮬레이션에 반영합니다."`}
            className="w-full rounded-md border border-base-border bg-base-primary px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-seojin/50 resize-none leading-relaxed"
          />
          <div className="flex justify-end">
            <button onClick={handleStructure}
              disabled={!freeTexts[activeChar] || freeTexts[activeChar].length < 30 || structuring}
              className="rounded-lg border border-seojin/50 bg-seojin/10 px-4 py-2 text-sm text-seojin hover:bg-seojin/20 transition-colors disabled:opacity-30">
              {structuring ? 'AI 구조화 중...' : 'AI로 구조화하기'}
            </button>
          </div>
        </div>
      )}

      {/* 네비게이션 */}
      <div className="flex justify-between pt-5 mt-5 border-t border-base-border">
        <button onClick={onPrev}
          className="rounded-lg border border-base-border px-4 py-2 text-sm text-text-secondary hover:bg-base-tertiary transition-colors">
          이전
        </button>
        <button onClick={handleNext}
          disabled={
            modes.slice(0, charCount).some(m => m === 'seed')
              ? seedChars.slice(0, charCount).every(s => !s.codename.trim())
              : chars.slice(0, charCount).every(c => !c.name.trim())
          }
          className="rounded-lg bg-seojin px-6 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-30">
          다음
        </button>
      </div>
    </div>
  );
}
