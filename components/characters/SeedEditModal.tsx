'use client';

import { useState, useMemo } from 'react';
import { CharacterSeed, Memory, SeedEditType, SOFT_EDIT_ALLOWED, SOFT_EDIT_LOCKED } from '@/lib/types';

interface SeedEditModalProps {
  seed: CharacterSeed;
  memories: Memory[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (editType: SeedEditType, newSeed: CharacterSeed, rewindToAge?: number) => void;
}

const FIELD_LABELS: Partial<Record<keyof CharacterSeed, string>> = {
  id: 'ID',
  codename: '코드명',
  name: '이름',
  birthYear: '출생년도',
  birthCondition: '출생 조건',
  initialCondition: '초기 상황',
  initialEnvironment: '초기 환경',
  temperament: '기질',
  innateTraits: '선천적 특성',
  latentAbility: '잠재 능력',
  latentPotentials: '잠재력',
  physicalTrait: '신체 특성',
  innateAppearance: '선천적 외모',
  wound: '근원 상처',
  roleTendency: '역할 경향',
  color: '테마 색상',
};

export default function SeedEditModal({ seed, memories, isOpen, onClose, onSave }: SeedEditModalProps) {
  const hasMemories = memories.length > 0;

  // Auto-select edit type
  const defaultEditType: SeedEditType = hasMemories ? 'soft_edit' : 'pre_simulation';
  const [editType, setEditType] = useState<SeedEditType>(defaultEditType);
  const [editedSeed, setEditedSeed] = useState<CharacterSeed>({ ...seed });
  const [rewindToAge, setRewindToAge] = useState<number | undefined>(undefined);
  const [showConfirm, setShowConfirm] = useState(false);

  // Compute max age from memories
  const maxAge = useMemo(() => {
    if (memories.length === 0) return 0;
    const maxYear = Math.max(...memories.map(m => m.year));
    return maxYear - seed.birthYear;
  }, [memories, seed.birthYear]);

  // Determine which fields are editable
  const isFieldEditable = (field: keyof CharacterSeed): boolean => {
    if (editType === 'pre_simulation') return true;
    if (editType === 'hard_reset') return true;
    // soft_edit: only allowed fields
    return SOFT_EDIT_ALLOWED.includes(field);
  };

  const isFieldLocked = (field: keyof CharacterSeed): boolean => {
    if (editType === 'soft_edit') return SOFT_EDIT_LOCKED.includes(field);
    return false;
  };

  // Count affected memories for hard_reset with rewind
  const affectedMemoryCount = useMemo(() => {
    if (editType !== 'hard_reset') return 0;
    if (rewindToAge !== undefined) {
      const cutoffYear = seed.birthYear + rewindToAge;
      return memories.filter(m => m.year > cutoffYear).length;
    }
    return memories.length;
  }, [editType, rewindToAge, memories, seed.birthYear]);

  const handleFieldChange = (field: keyof CharacterSeed, value: string | number) => {
    setEditedSeed({ ...editedSeed, [field]: value });
  };

  const handleSave = () => {
    if (editType === 'hard_reset' && memories.length > 0) {
      setShowConfirm(true);
      return;
    }
    onSave(editType, editedSeed, rewindToAge);
    onClose();
  };

  const handleConfirmedSave = () => {
    onSave(editType, editedSeed, rewindToAge);
    setShowConfirm(false);
    onClose();
  };

  if (!isOpen) return null;

  const editableFields: (keyof CharacterSeed)[] = [
    'codename', 'birthYear', 'initialCondition', 'temperament',
    'latentAbility', 'physicalTrait', 'innateAppearance', 'wound', 'color',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-base-border bg-base-card p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg font-bold text-text-primary">씨앗 편집</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg">x</button>
        </div>

        {/* Edit type selection */}
        {hasMemories && (
          <div className="mb-5">
            <span className="text-xs font-medium text-text-muted uppercase tracking-widest block mb-2">편집 모드</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setEditType('soft_edit'); setRewindToAge(undefined); }}
                className={`flex-1 rounded-lg border p-3 text-left transition-colors ${
                  editType === 'soft_edit' ? 'border-seojin bg-seojin/10' : 'border-base-border hover:border-seojin/30'
                }`}
              >
                <div className="text-xs font-medium text-text-primary">소프트 편집</div>
                <p className="text-[10px] text-text-muted mt-0.5">일부 필드만 수정, 기억 유지</p>
              </button>
              <button
                onClick={() => setEditType('hard_reset')}
                className={`flex-1 rounded-lg border p-3 text-left transition-colors ${
                  editType === 'hard_reset' ? 'border-yeonhwa bg-yeonhwa/10' : 'border-base-border hover:border-yeonhwa/30'
                }`}
              >
                <div className="text-xs font-medium text-text-primary">하드 리셋</div>
                <p className="text-[10px] text-text-muted mt-0.5">전체 수정, 기억 초기화</p>
              </button>
            </div>
          </div>
        )}

        {!hasMemories && (
          <div className="mb-4 rounded-lg bg-seojin/5 border border-seojin/20 px-3 py-2">
            <p className="text-xs text-seojin">시뮬레이션 전이므로 모든 필드를 자유롭게 수정할 수 있습니다.</p>
          </div>
        )}

        {/* Hard reset: rewind slider */}
        {editType === 'hard_reset' && hasMemories && maxAge > 0 && (
          <div className="mb-5 rounded-lg border border-yeonhwa/20 bg-yeonhwa/5 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-primary">되감기 (선택)</span>
              <span className="text-[10px] text-text-muted">
                {rewindToAge !== undefined ? `${rewindToAge}세까지 유지` : '전체 초기화'}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={maxAge}
              value={rewindToAge ?? 0}
              onChange={(e) => {
                const val = Number(e.target.value);
                setRewindToAge(val === 0 ? undefined : val);
              }}
              className="w-full accent-yeonhwa"
            />
            <div className="flex justify-between text-[9px] text-text-muted mt-1">
              <span>0세 (전체 초기화)</span>
              <span>{maxAge}세 (현재)</span>
            </div>
            <p className="text-[10px] text-yeonhwa mt-2">
              삭제될 기억: {affectedMemoryCount}개
            </p>
          </div>
        )}

        {/* Seed fields */}
        <div className="space-y-3">
          {editableFields.map((field) => {
            const locked = isFieldLocked(field);
            const editable = isFieldEditable(field);
            const value = editedSeed[field] ?? '';
            const isColor = field === 'color';
            const isNumber = field === 'birthYear';

            return (
              <div key={field}>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-[10px] font-medium text-text-muted uppercase tracking-widest">
                    {FIELD_LABELS[field] || field}
                  </label>
                  {locked && (
                    <span className="rounded-full bg-base-tertiary px-1.5 py-0.5 text-[8px] text-text-muted">잠김</span>
                  )}
                </div>
                {isColor ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={String(value)}
                      onChange={e => handleFieldChange(field, e.target.value)}
                      disabled={!editable}
                      className="w-8 h-8 rounded cursor-pointer disabled:opacity-40"
                    />
                    <input
                      value={String(value)}
                      onChange={e => handleFieldChange(field, e.target.value)}
                      disabled={!editable}
                      className="flex-1 rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-seojin/50 disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </div>
                ) : (
                  <input
                    type={isNumber ? 'number' : 'text'}
                    value={String(value)}
                    onChange={e => handleFieldChange(field, isNumber ? Number(e.target.value) : e.target.value)}
                    disabled={!editable}
                    className="w-full rounded-md border border-base-border bg-base-primary px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-seojin/50 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-base-border">
          <button
            onClick={onClose}
            className="rounded-lg border border-base-border px-4 py-2 text-sm text-text-secondary hover:bg-base-tertiary transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 ${
              editType === 'hard_reset' ? 'bg-yeonhwa' : 'bg-seojin'
            }`}
          >
            {editType === 'hard_reset' ? '리셋 & 적용' : '저장'}
          </button>
        </div>
      </div>

      {/* Confirmation modal for hard reset */}
      {showConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl border border-yeonhwa/30 bg-base-card p-5 shadow-2xl">
            <h4 className="text-sm font-bold text-yeonhwa mb-3">하드 리셋 확인</h4>
            <div className="space-y-2 text-xs text-text-secondary">
              <p>다음 변경이 적용됩니다:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>삭제될 기억: <span className="text-yeonhwa font-medium">{affectedMemoryCount}개</span></li>
                {rewindToAge !== undefined && (
                  <li>{rewindToAge}세 이후 기억이 모두 삭제됩니다</li>
                )}
                {rewindToAge === undefined && (
                  <li>모든 기억이 초기화됩니다</li>
                )}
                <li>관련 NPC가 삭제될 수 있습니다</li>
                <li>다른 캐릭터 기억에서 참조가 &apos;unknown_entity&apos;로 변경됩니다</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-base-border px-4 py-1.5 text-xs text-text-secondary hover:bg-base-tertiary"
              >
                취소
              </button>
              <button
                onClick={handleConfirmedSave}
                className="rounded-lg bg-yeonhwa px-4 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                확인 & 적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
