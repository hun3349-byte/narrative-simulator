'use client';

import { useState, useEffect } from 'react';
import type { NPCSeedInfo } from '@/lib/types';

interface CharacterEditModalProps {
  character: NPCSeedInfo;
  characterType: 'hero' | 'villain' | 'npc';
  episodeAppearances?: number[]; // 이미 등장한 에피소드 번호들
  onSave: (updated: NPCSeedInfo, oldName: string) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export default function CharacterEditModal({
  character,
  characterType,
  episodeAppearances = [],
  onSave,
  onDelete,
  onClose,
}: CharacterEditModalProps) {
  const [formData, setFormData] = useState<NPCSeedInfo>({ ...character });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [nameChanged, setNameChanged] = useState(false);

  useEffect(() => {
    setFormData({ ...character });
    setNameChanged(false);
  }, [character]);

  const handleChange = (field: keyof NPCSeedInfo, value: string) => {
    if (field === 'name' && value !== character.name) {
      setNameChanged(true);
    } else if (field === 'name' && value === character.name) {
      setNameChanged(false);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImportanceChange = (value: 'major' | 'supporting' | 'minor') => {
    setFormData(prev => ({ ...prev, importance: value }));
  };

  const handleSave = () => {
    onSave(formData, character.name);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
  };

  const typeLabel = characterType === 'hero' ? '주인공' : characterType === 'villain' ? '빌런' : 'NPC';
  const typeColor = characterType === 'hero' ? 'text-seojin' : characterType === 'villain' ? 'text-red-400' : 'text-blue-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-base-secondary p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <span className={typeColor}>{typeLabel}</span>
            캐릭터 편집
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary"
          >
            ✕
          </button>
        </div>

        {/* 삭제 확인 모달 */}
        {showDeleteConfirm && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-sm text-red-400 mb-2">
              이 캐릭터를 삭제하시겠습니까?
            </p>
            {episodeAppearances.length > 0 && (
              <p className="text-xs text-yellow-400 mb-3">
                이미 {episodeAppearances.join(', ')}화에 등장했습니다. 삭제하면 일관성이 깨질 수 있습니다.
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                삭제
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-sm rounded-lg bg-base-tertiary text-text-muted hover:text-text-primary"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 이름 변경 경고 */}
        {nameChanged && episodeAppearances.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <p className="text-xs text-yellow-400">
              이름을 변경하면 World Bible과 Episode Log에 반영됩니다.
              이미 집필된 에피소드({episodeAppearances.join(', ')}화) 본문은 변경되지 않습니다.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* 이름 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">이름</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-base-primary border border-base-border text-text-primary focus:border-seojin focus:outline-none"
            />
          </div>

          {/* 역할 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">역할</label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              placeholder="예: 상인, 현자, 기사단장"
              className="w-full px-3 py-2 rounded-lg bg-base-primary border border-base-border text-text-primary focus:border-seojin focus:outline-none"
            />
          </div>

          {/* 비중 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">비중</label>
            <div className="flex gap-2">
              {(['major', 'supporting', 'minor'] as const).map((imp) => (
                <button
                  key={imp}
                  onClick={() => handleImportanceChange(imp)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    formData.importance === imp
                      ? imp === 'major' ? 'bg-seojin text-white' :
                        imp === 'supporting' ? 'bg-blue-500 text-white' :
                        'bg-gray-500 text-white'
                      : 'bg-base-tertiary text-text-muted hover:text-text-primary'
                  }`}
                >
                  {imp === 'major' ? '주연' : imp === 'supporting' ? '조연' : '단역'}
                </button>
              ))}
            </div>
          </div>

          {/* 위치 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">위치/거주지</label>
            <input
              type="text"
              value={formData.location || ''}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="예: 왕도 외곽, 마탑 3층"
              className="w-full px-3 py-2 rounded-lg bg-base-primary border border-base-border text-text-primary focus:border-seojin focus:outline-none"
            />
          </div>

          {/* 소속 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">소속 세력</label>
            <input
              type="text"
              value={formData.faction || ''}
              onChange={(e) => handleChange('faction', e.target.value)}
              placeholder="예: 왕국 기사단, 마법사 길드"
              className="w-full px-3 py-2 rounded-lg bg-base-primary border border-base-border text-text-primary focus:border-seojin focus:outline-none"
            />
          </div>

          {/* 성격 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">성격</label>
            <textarea
              value={formData.personality || ''}
              onChange={(e) => handleChange('personality', e.target.value)}
              placeholder="예: 과묵하지만 정의감이 강함"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-base-primary border border-base-border text-text-primary focus:border-seojin focus:outline-none resize-none"
            />
          </div>

          {/* 숨겨진 동기 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">숨겨진 동기</label>
            <textarea
              value={formData.hiddenMotivation || ''}
              onChange={(e) => handleChange('hiddenMotivation', e.target.value)}
              placeholder="이 캐릭터가 숨기고 있는 진짜 목적"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-base-primary border border-base-border text-text-primary focus:border-seojin focus:outline-none resize-none"
            />
          </div>

          {/* 외모 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">외모</label>
            <textarea
              value={formData.appearance || ''}
              onChange={(e) => handleChange('appearance', e.target.value)}
              placeholder="외모 묘사"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-base-primary border border-base-border text-text-primary focus:border-seojin focus:outline-none resize-none"
            />
          </div>

          {/* 말투 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">말투</label>
            <input
              type="text"
              value={formData.speechPattern || ''}
              onChange={(e) => handleChange('speechPattern', e.target.value)}
              placeholder="예: 존댓말 사용, 고어체, 사투리"
              className="w-full px-3 py-2 rounded-lg bg-base-primary border border-base-border text-text-primary focus:border-seojin focus:outline-none"
            />
          </div>

          {/* 배경 스토리 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">배경 스토리</label>
            <textarea
              value={formData.backstory || ''}
              onChange={(e) => handleChange('backstory', e.target.value)}
              placeholder="이 캐릭터의 과거, 어떻게 지금의 역할을 맡게 되었는지"
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-base-primary border border-base-border text-text-primary focus:border-seojin focus:outline-none resize-none"
            />
          </div>

          {/* 관계 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">다른 인물과의 관계</label>
            <textarea
              value={formData.relationships || ''}
              onChange={(e) => handleChange('relationships', e.target.value)}
              placeholder="예: 주인공의 스승, 빌런의 부하"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-base-primary border border-base-border text-text-primary focus:border-seojin focus:outline-none resize-none"
            />
          </div>

          {/* 서사 아크 */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">서사 아크</label>
            <textarea
              value={formData.arc || ''}
              onChange={(e) => handleChange('arc', e.target.value)}
              placeholder="이 캐릭터의 성장/변화 방향"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-base-primary border border-base-border text-text-primary focus:border-seojin focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="flex justify-between mt-6">
          <div>
            {onDelete && characterType === 'npc' && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-sm rounded-lg text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1"
              >
                <span>🗑️</span>
                삭제
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg bg-base-tertiary text-text-muted hover:text-text-primary transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.name.trim()}
              className="px-4 py-2 text-sm rounded-lg bg-seojin text-white hover:bg-seojin/90 transition-colors disabled:opacity-50"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
