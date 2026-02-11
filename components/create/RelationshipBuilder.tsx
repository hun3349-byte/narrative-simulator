'use client';

import { useState } from 'react';
import { Character, Relationship } from '@/lib/types';

interface RelationshipBuilderProps {
  characters: Character[];
  value: Relationship[];
  onChange: (rels: Relationship[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

const RELATIONSHIP_TYPES = ['동료', '연인', '라이벌', '스승/제자', '원수', '형제/자매', '주종'];

function generatePairs(characters: Character[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < characters.length; i++) {
    for (let j = i + 1; j < characters.length; j++) {
      pairs.push([characters[i].id, characters[j].id]);
    }
  }
  return pairs;
}

export default function RelationshipBuilder({ characters, value, onChange, onNext, onPrev }: RelationshipBuilderProps) {
  const pairs = generatePairs(characters);
  const [relationships, setRelationships] = useState<Relationship[]>(
    value.length > 0
      ? value
      : pairs.map(([a, b]) => ({
          characterIds: [a, b],
          type: '',
          description: '',
          tensionPoint: '',
        }))
  );
  const [commonTheme, setCommonTheme] = useState('');

  const getCharName = (id: string) => characters.find(c => c.id === id)?.name || id;

  const updateRelationship = (idx: number, field: keyof Relationship, val: string) => {
    const updated = [...relationships];
    if (field === 'characterIds') return;
    updated[idx] = { ...updated[idx], [field]: val };
    setRelationships(updated);
  };

  const handleNext = () => {
    onChange(relationships.filter(r => r.type.trim() || r.description.trim()));
    onNext();
  };

  return (
    <div className="rounded-xl border border-base-border bg-base-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-lg font-bold text-text-primary">캐릭터 관계 설정</h2>
        <span className="text-xs text-text-muted">Step 4/6</span>
      </div>

      {/* 관계 다이어그램 (간단 시각화) */}
      {characters.length >= 2 && (
        <div className="mb-6 flex items-center justify-center gap-4 py-4">
          {characters.map((c, i) => (
            <div key={c.id} className="flex items-center gap-2">
              <div
                className="flex h-10 items-center justify-center rounded-full px-3 text-xs font-medium text-white"
                style={{ backgroundColor: ['#7B6BA8', '#C74B50', '#D4D0E0', '#4A9B7F', '#D4A843'][i] }}
              >
                {c.name}
              </div>
              {i < characters.length - 1 && (
                <div className="h-px w-8 bg-base-border" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 각 관계 쌍 */}
      <div className="space-y-5">
        {relationships.map((rel, idx) => (
          <div key={idx} className="rounded-lg border border-base-border bg-base-primary/30 p-4">
            <h3 className="text-sm font-medium text-text-primary mb-3">
              {getCharName(rel.characterIds[0])} ↔ {getCharName(rel.characterIds[1])}
            </h3>

            {/* 관계 유형 */}
            <div className="mb-3">
              <label className="text-[10px] text-text-muted mb-1.5 block">관계 유형</label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {RELATIONSHIP_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => updateRelationship(idx, 'type', t)}
                    className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                      rel.type === t ? 'border-seojin bg-seojin/15 text-seojin' : 'border-base-border text-text-secondary hover:border-text-muted'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <input
                value={rel.type}
                onChange={e => updateRelationship(idx, 'type', e.target.value)}
                placeholder="직접 입력"
                className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-seojin/50"
              />
            </div>

            {/* 관계 설명 */}
            <div className="mb-3">
              <label className="text-[10px] text-text-muted mb-1 block">관계 설명</label>
              <textarea
                value={rel.description}
                onChange={e => updateRelationship(idx, 'description', e.target.value)}
                rows={2}
                placeholder="두 캐릭터의 관계를 설명하세요"
                className="w-full rounded-md border border-base-border bg-base-primary px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-seojin/50 resize-none"
              />
            </div>

            {/* 갈등 포인트 */}
            <div>
              <label className="text-[10px] text-text-muted mb-1 block">핵심 긴장/갈등 포인트</label>
              <input
                value={rel.tensionPoint}
                onChange={e => updateRelationship(idx, 'tensionPoint', e.target.value)}
                placeholder="예: 서로의 목표가 충돌할 수밖에 없는 이유"
                className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-seojin/50"
              />
            </div>
          </div>
        ))}
      </div>

      {/* 공통 테마 */}
      <div className="mt-5">
        <label className="text-[10px] text-text-muted mb-1 block">공통 테마 (선택)</label>
        <input
          value={commonTheme}
          onChange={e => setCommonTheme(e.target.value)}
          placeholder="예: 정체성의 상실과 회복"
          className="w-full rounded-md border border-base-border bg-base-primary px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-seojin/50"
        />
      </div>

      {/* 네비게이션 */}
      <div className="flex justify-between pt-5 mt-5 border-t border-base-border">
        <button onClick={onPrev}
          className="rounded-lg border border-base-border px-4 py-2 text-sm text-text-secondary hover:bg-base-tertiary transition-colors">
          이전
        </button>
        <button onClick={handleNext}
          className="rounded-lg bg-seojin px-6 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
          다음
        </button>
      </div>
    </div>
  );
}
